from __future__ import annotations

import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

from .model_loaders import (
    FAKE_NEWS_MODEL,
    SENTIMENT_MODEL,
    get_fake_news_pipeline,
    get_sentiment_pipeline,
)
from .schemas import EvidenceItem, ModelSignal, SignalVerdict


TRUSTED_DOMAINS = (
    ".gov",
    ".edu",
    "apnews.com",
    "reuters.com",
    "bbc.com",
    "bbc.co.uk",
    "npr.org",
    "hindustantimes.com",
    "thehindu.com",
    "indianexpress.com",
)


def trusted_source_score(evidence: list[EvidenceItem]) -> float:
    if not evidence:
        return 0.0
    trusted = 0
    for item in evidence:
        url = item.url.lower()
        if any(domain in url for domain in TRUSTED_DOMAINS):
            trusted += 1
    return trusted / len(evidence)


def sensationalism_score(claim: str) -> float:
    hype_terms = {
        "shocking",
        "secret",
        "exposed",
        "miracle",
        "cure",
        "breaking",
        "banned",
        "urgent",
        "truth",
        "hoax",
        "scam",
        "destroyed",
        "unbelievable",
    }
    words = re.findall(r"\w+", claim.lower())
    if not words:
        return 0.0
    uppercase_ratio = sum(1 for char in claim if char.isupper()) / max(1, sum(1 for char in claim if char.isalpha()))
    punctuation_ratio = claim.count("!") / max(1, len(claim))
    hype_ratio = sum(1 for word in words if word in hype_terms) / max(1, len(words))
    return max(0.0, min(1.0, uppercase_ratio * 1.4 + punctuation_ratio * 12 + hype_ratio * 8))


def parse_published(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError:
            return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def source_host(url: str) -> str:
    match = re.search(r"https?://(?:www\.)?([^/?#]+)", url.lower())
    return match.group(1) if match else url.lower()


def corroboration_score(evidence: list[EvidenceItem]) -> float:
    supporting_hosts = {
        source_host(item.url)
        for item in evidence
        if item.stance == "supports" and item.similarity >= 0.35
    }
    if not supporting_hosts:
        return 0.0
    return min(1.0, len(supporting_hosts) / 4)


def recency_score(evidence: list[EvidenceItem]) -> float:
    dated_items = [parse_published(item.published) for item in evidence]
    dated_items = [item for item in dated_items if item is not None]
    if not dated_items:
        return 0.0
    now = datetime.now(timezone.utc)
    freshest_days = min(max(0, (now - item).days) for item in dated_items)
    if freshest_days <= 7:
        return 1.0
    if freshest_days <= 30:
        return 0.75
    if freshest_days <= 180:
        return 0.45
    return 0.2


def claim_specificity_score(claim: str) -> float:
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9'-]*", claim)
    if not words:
        return 0.0
    numbers = len(re.findall(r"\b\d+(?:\.\d+)?%?\b", claim))
    capitalized = len(re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b", claim))
    date_words = len(re.findall(r"\b(?:today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|202\d|203\d)\b", claim.lower()))
    detail_score = (numbers * 0.16) + (capitalized * 0.08) + (date_words * 0.14) + min(0.32, len(words) / 90)
    return max(0.0, min(1.0, detail_score))


def run_fake_news_classifier(claim: str) -> ModelSignal:
    try:
        classifier = get_fake_news_pipeline()
        raw = classifier(claim[:1600])
        rows = raw[0] if raw and isinstance(raw[0], list) else raw
        best = max(rows, key=lambda row: float(row["score"]))
        label = str(best["label"]).lower()
        score = float(best["score"])
        if label == "label_0":
            verdict: SignalVerdict = "false"
        elif label == "label_1":
            verdict = "true"
        else:
            verdict = "false" if "fake" in label or "false" in label else "true"
        return ModelSignal(
            name="Fake-news BERT classifier",
            verdict=verdict,
            score=round(score, 3),
            weight=0.75,
            explanation=f"{FAKE_NEWS_MODEL} classified the text as {best['label']}.",
        )
    except Exception as exc:
        return ModelSignal(
            name="Fake-news BERT classifier",
            verdict="uncertain",
            score=0.0,
            weight=0.0,
            explanation=f"Model unavailable: {exc.__class__.__name__}.",
        )


def run_sentiment_risk_model(claim: str) -> ModelSignal:
    try:
        sentiment = get_sentiment_pipeline()
        result = sentiment(claim[:1200])[0]
        label = str(result["label"]).lower()
        score = float(result["score"])
        risk = score if label == "negative" else max(0.0, 1.0 - score)
        return ModelSignal(
            name="Sentiment risk model",
            verdict="risk" if risk >= 0.65 else "uncertain",
            score=round(risk, 3),
            weight=0.2,
            explanation=f"{SENTIMENT_MODEL} checks for emotionally loaded wording.",
        )
    except Exception as exc:
        return ModelSignal(
            name="Sentiment risk model",
            verdict="uncertain",
            score=0.0,
            weight=0.0,
            explanation=f"Model unavailable: {exc.__class__.__name__}.",
        )


def build_model_signals(claim: str, evidence: list[EvidenceItem]) -> list[ModelSignal]:
    supports = [item for item in evidence if item.stance == "supports"]
    contradicts = [item for item in evidence if item.stance == "contradicts"]
    support_score = sum(item.similarity * item.stance_score for item in supports)
    contradiction_score = sum(item.similarity * item.stance_score for item in contradicts)
    total = support_score + contradiction_score + 0.35
    avg_similarity = (
        sum(item.similarity for item in evidence) / len(evidence)
        if evidence
        else 0.0
    )

    if support_score > contradiction_score and support_score >= 0.35:
        evidence_verdict: SignalVerdict = "true"
        evidence_score = support_score / total
    elif contradiction_score > support_score and contradiction_score >= 0.35:
        evidence_verdict = "false"
        evidence_score = contradiction_score / total
    else:
        evidence_verdict = "uncertain"
        evidence_score = max(support_score, contradiction_score) / total

    trusted_score = trusted_source_score(evidence)
    style_score = sensationalism_score(claim)

    return [
        ModelSignal(
            name="SBERT semantic match model",
            verdict="true" if avg_similarity >= 0.45 else "uncertain",
            score=round(avg_similarity, 3),
            weight=0.55,
            explanation="Checks how closely the claim matches the meaning of fetched references.",
        ),
        ModelSignal(
            name="NLI stance model",
            verdict=evidence_verdict,
            score=round(evidence_score, 3),
            weight=0.45,
            explanation="Checks whether the fetched references support or contradict the claim.",
        ),
        run_fake_news_classifier(claim),
        run_sentiment_risk_model(claim),
        ModelSignal(
            name="Source credibility heuristic",
            verdict="true" if trusted_score >= 0.25 else "uncertain",
            score=round(trusted_score, 3),
            weight=0.35,
            explanation="Checks whether matching evidence includes known institutional or established news domains.",
        ),
        ModelSignal(
            name="Cross-source corroboration model",
            verdict="true" if corroboration_score(evidence) >= 0.5 else "uncertain",
            score=round(corroboration_score(evidence), 3),
            weight=0.45,
            explanation="Rewards claims supported by multiple independent source domains.",
        ),
        ModelSignal(
            name="Reference recency model",
            verdict="true" if recency_score(evidence) >= 0.75 else "uncertain",
            score=round(recency_score(evidence), 3),
            weight=0.25,
            explanation="Checks whether the supporting references are recent enough for current news.",
        ),
        ModelSignal(
            name="Sensational language heuristic",
            verdict="risk" if style_score >= 0.45 else "uncertain",
            score=round(style_score, 3),
            weight=0.25,
            explanation="Flags hype terms, excessive uppercase text, and exclamation-heavy writing.",
        ),
        ModelSignal(
            name="Claim specificity model",
            verdict="true" if claim_specificity_score(claim) >= 0.45 else "uncertain",
            score=round(claim_specificity_score(claim), 3),
            weight=0.15,
            explanation="Looks for concrete entities, dates, numbers, and details that make a claim easier to verify.",
        ),
    ]
