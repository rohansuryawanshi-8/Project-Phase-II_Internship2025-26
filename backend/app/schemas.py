from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Verdict = Literal["true", "false", "uncertain"]
SourceKind = Literal["google_news", "reddit", "indian_express", "hindustan_times"]
SignalVerdict = Literal["true", "false", "uncertain", "risk"]


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=8, max_length=8000)
    categories: list[str] = Field(default_factory=list)


class ContributionRequest(BaseModel):
    content_type: Literal["text", "image"] = "text"
    text: str = Field(default="", max_length=8000)
    category: Literal["sports", "politics", "business", "entertainment"]
    label: Literal["fake", "true"]


class ContributionResponse(BaseModel):
    id: str
    message: str


class GenreAnalysis(BaseModel):
    id: str
    name: str
    confidence: int
    matched_terms: list[str]
    alternatives: list[str]


class EvidenceItem(BaseModel):
    source: SourceKind
    title: str
    url: str
    snippet: str
    published: str | None = None
    similarity: float
    stance: Literal["supports", "contradicts", "neutral"]
    stance_score: float


class ContributionReference(BaseModel):
    id: str
    text: str
    category: str
    label: Literal["fake", "true"]
    created_at: str
    similarity: float


class ModelSignal(BaseModel):
    name: str
    verdict: SignalVerdict
    score: float
    weight: float
    explanation: str


class AnalyzeResponse(BaseModel):
    verdict: Verdict
    confidence: int
    accuracy: int
    genre: GenreAnalysis
    summary: str
    evidence: list[EvidenceItem]
    contribution_references: list[ContributionReference] = Field(default_factory=list)
    model_signals: list[ModelSignal]
    model_notes: list[str]
