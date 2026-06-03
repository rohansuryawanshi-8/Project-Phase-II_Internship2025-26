from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .dataset import find_similar_contributions, init_dataset, save_contribution
from .evidence import score_evidence
from .genre import detect_news_genre
from .references import collect_references
from .schemas import AnalyzeRequest, AnalyzeResponse, ContributionReference, ContributionRequest, ContributionResponse, ModelSignal
from .signals import build_model_signals
from .text_utils import clean_text, make_query
from .verdict import make_verdict


app = FastAPI(title="AI News Verification System Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_dataset()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    claim = clean_text(payload.text)
    if len(claim) < 8:
        raise HTTPException(status_code=400, detail="Please enter a longer news claim.")

    genre = detect_news_genre(claim)
    query_categories = [genre.id] if genre.id != "general" else payload.categories
    query = make_query(claim, query_categories)

    references = await collect_references(query)
    evidence, notes = score_evidence(claim, references)
    dataset_matches = find_similar_contributions(claim)
    notes.append(
        f"Genre detector: {genre.name} predicted with {genre.confidence}% confidence by {genre.matched_terms[0] if genre.matched_terms else 'the genre model'}."
    )
    if dataset_matches:
        fake_matches = sum(1 for item in dataset_matches if item["label"] == "fake")
        true_matches = sum(1 for item in dataset_matches if item["label"] == "true")
        best_match = dataset_matches[0]
        notes.append(
            f"Local dataset: found {len(dataset_matches)} similar saved submission(s); "
            f"{true_matches} true and {fake_matches} fake. Best match: {round(best_match['similarity'] * 100)}%."
        )
    else:
        notes.append("Local dataset: no similar saved submissions found.")
    notes.append("Reference channels: Google News RSS, Indian Express RSS, Hindustan Times RSS, and Reddit search.")
    notes.append(
        "Ensemble: fake-news BERT, sentiment risk, source trust, "
        "recency, corroboration, claim specificity, and local dataset signals."
    )

    model_signals = build_model_signals(claim, evidence)
    if dataset_matches:
        true_score = sum(item["similarity"] for item in dataset_matches if item["label"] == "true")
        fake_score = sum(item["similarity"] for item in dataset_matches if item["label"] == "fake")
        if true_score > fake_score:
            dataset_verdict = "true"
            dataset_score = true_score / max(0.01, true_score + fake_score)
        elif fake_score > true_score:
            dataset_verdict = "false"
            dataset_score = fake_score / max(0.01, true_score + fake_score)
        else:
            dataset_verdict = "uncertain"
            dataset_score = 0.0
        model_signals.append(
            ModelSignal(
                name="Local submitted dataset",
                verdict=dataset_verdict,
                score=round(dataset_score, 3),
                weight=0.35,
                explanation="Compares this claim with previously saved user-submitted examples.",
            )
        )
    contribution_references = [
        ContributionReference(
            id=item["id"],
            text=item["text"],
            category=item["category"],
            label=item["label"],
            created_at=item["created_at"],
            similarity=item["similarity"],
        )
        for item in dataset_matches
    ]
    verdict, confidence, accuracy, summary = make_verdict(evidence, model_signals)

    return AnalyzeResponse(
        verdict=verdict,
        confidence=confidence,
        accuracy=accuracy,
        genre=genre,
        summary=summary,
        evidence=evidence,
        contribution_references=contribution_references,
        model_signals=model_signals,
        model_notes=notes,
    )


@app.post("/contributions", response_model=ContributionResponse)
async def create_contribution(payload: ContributionRequest) -> ContributionResponse:
    if payload.content_type == "image":
        raise HTTPException(status_code=400, detail="Image dataset saving is not wired yet. Please submit text.")

    text = clean_text(payload.text)
    if len(text) < 8:
        raise HTTPException(status_code=400, detail="Please enter a longer news text.")

    record = save_contribution(
        content_type=payload.content_type,
        text=text,
        category=payload.category,
        label=payload.label,
    )
    return ContributionResponse(
        id=record["id"],
        message="Saved to local dataset. It will be used as a low-trust signal in future analysis.",
    )
