from __future__ import annotations

import math
import re

from .model_loaders import get_nli_pipeline, get_sbert_model
from .schemas import EvidenceItem


def cosine_similarity(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    if not left_norm or not right_norm:
        return 0.0
    return max(0.0, min(1.0, dot / (left_norm * right_norm)))


def classify_stance(claim: str, reference_text: str, similarity: float) -> tuple[str, float]:
    try:
        nli = get_nli_pipeline()
        raw = nli({"text": reference_text, "text_pair": claim})
        rows = raw[0] if raw and isinstance(raw[0], list) else raw
        scores = {row["label"].lower(): float(row["score"]) for row in rows}
        entailment = max(scores.get("entailment", 0.0), scores.get("entails", 0.0))
        contradiction = max(scores.get("contradiction", 0.0), scores.get("contradicts", 0.0))
        neutral = scores.get("neutral", 0.0)

        if similarity < 0.3:
            return "neutral", max(neutral, 1.0 - similarity)
        if entailment >= contradiction and entailment >= neutral and similarity >= 0.32:
            return "supports", entailment
        if contradiction >= entailment + 0.08 and contradiction >= neutral and similarity >= 0.42:
            return "contradicts", contradiction
        return "neutral", neutral
    except Exception:
        if similarity >= 0.58:
            return "supports", similarity
        if similarity <= 0.18:
            return "neutral", 1.0 - similarity
        return "neutral", similarity


def score_evidence(claim: str, references: list[dict]) -> tuple[list[EvidenceItem], list[str]]:
    notes = ["SBERT: sentence-transformers/all-MiniLM-L6-v2 for semantic evidence similarity."]
    try:
        model = get_sbert_model()
        reference_texts = [f"{item['title']}. {item['snippet']}" for item in references]
        embeddings = model.encode([claim, *reference_texts], normalize_embeddings=True).tolist()
        claim_embedding = embeddings[0]
        evidence_embeddings = embeddings[1:]
    except Exception:
        notes.append("SBERT model unavailable; using keyword overlap fallback.")
        claim_terms = set(re.findall(r"\w+", claim.lower()))
        evidence_embeddings = []
        claim_embedding = []

    evidence: list[EvidenceItem] = []
    for index, item in enumerate(references):
        reference_text = f"{item['title']}. {item['snippet']}".strip()
        if evidence_embeddings:
            similarity = cosine_similarity(claim_embedding, evidence_embeddings[index])
        else:
            terms = set(re.findall(r"\w+", reference_text.lower()))
            similarity = len(claim_terms & terms) / max(1, len(claim_terms | terms))
        stance, stance_score = classify_stance(claim, reference_text[:1600], similarity)
        evidence.append(
            EvidenceItem(
                source=item["source"],
                title=item["title"] or "Untitled reference",
                url=item["url"],
                snippet=item["snippet"] or reference_text[:220],
                published=item["published"],
                similarity=round(similarity, 3),
                stance=stance,
                stance_score=round(stance_score, 3),
            )
        )

    evidence.sort(key=lambda item: (item.stance != "supports", -item.similarity, -item.stance_score))
    notes.append("BERT/NLI: cross-encoder/nli-deberta-v3-small when available; otherwise similarity fallback.")

    selected: list[EvidenceItem] = []
    for source in ("google_news", "indian_express", "hindustan_times", "reddit"):
        source_match = next((item for item in evidence if item.source == source), None)
        if source_match:
            selected.append(source_match)

    for item in evidence:
        if item not in selected:
            selected.append(item)
        if len(selected) >= 12:
            break

    return selected, notes
