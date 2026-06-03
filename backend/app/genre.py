from __future__ import annotations

from .model_loaders import get_genre_pipeline
from .schemas import GenreAnalysis


LABEL_MAP = {
    "business": ("business", "Business"),
    "entertainment": ("entertainment", "Entertainment"),
    "health": ("general", "General News"),
    "news": ("general", "General News"),
    "politics": ("politics", "Politics"),
    "sport": ("sports", "Sports"),
    "tech": ("general", "General News"),
}

GENRE_CONFIDENCE_THRESHOLD = 0.5


def normalize_label(raw_label: str) -> tuple[str, str]:
    key = raw_label.strip().lower()
    return LABEL_MAP.get(key, ("general", "General News"))


def detect_news_genre(text: str) -> GenreAnalysis:
    try:
        classifier = get_genre_pipeline()
        raw = classifier(text[:1200])
        rows = raw[0] if raw and isinstance(raw[0], list) else raw
        if not isinstance(rows, list):
            rows = [rows]

        ranked = []
        for row in rows:
            raw_label = str(row.get("label", "news"))
            score = float(row.get("score", 0.0))
            genre_id, genre_name = normalize_label(raw_label)
            ranked.append((genre_id, genre_name, raw_label, score))

        ranked.sort(key=lambda item: item[3], reverse=True)
        top_id, top_name, top_raw_label, top_score = ranked[0]

        alternatives: list[str] = []
        for genre_id, genre_name, _, _ in ranked[1:]:
            if genre_name != top_name and genre_name not in alternatives:
                alternatives.append(genre_name)

        confidence = int(min(98, round(top_score * 100)))
        if top_score < GENRE_CONFIDENCE_THRESHOLD:
            if top_name != "General News":
                alternatives.insert(0, top_name)
            return GenreAnalysis(
                id="general",
                name="General News",
                confidence=confidence,
                matched_terms=[],
                alternatives=alternatives[:3],
            )

        return GenreAnalysis(
            id=top_id,
            name=top_name,
            confidence=confidence,
            matched_terms=[top_raw_label.lower()],
            alternatives=alternatives[:3],
        )
    except Exception:
        return GenreAnalysis(
            id="general",
            name="General News",
            confidence=35,
            matched_terms=[],
            alternatives=["Politics", "Business", "Sports"],
        )
