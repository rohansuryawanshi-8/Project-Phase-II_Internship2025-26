from __future__ import annotations

import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from .evidence import cosine_similarity
from . import model_loaders


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DB_PATH = DATA_DIR / "news_dataset.db"
MIN_CONTRIBUTION_MATCH = 0.55


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_dataset() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS contributions (
                id TEXT PRIMARY KEY,
                content_type TEXT NOT NULL,
                text TEXT NOT NULL,
                category TEXT NOT NULL,
                label TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def save_contribution(
    *,
    content_type: str,
    text: str,
    category: str,
    label: str,
) -> dict:
    init_dataset()
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "id": str(uuid4()),
        "content_type": content_type,
        "text": text,
        "category": category,
        "label": label,
        "created_at": now,
    }
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO contributions (id, content_type, text, category, label, created_at)
            VALUES (:id, :content_type, :text, :category, :label, :created_at)
            """,
            record,
        )
    return record


def keyword_similarity(left: str, right: str) -> float:
    left_terms = set(re.findall(r"\w+", left.lower()))
    right_terms = set(re.findall(r"\w+", right.lower()))
    if not left_terms or not right_terms:
        return 0.0
    return len(left_terms & right_terms) / max(1, len(left_terms | right_terms))


def find_similar_contributions(claim: str, *, limit: int = 5) -> list[dict]:
    init_dataset()
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, text, category, label, created_at
            FROM contributions
            WHERE content_type = 'text'
            ORDER BY created_at DESC
            LIMIT 500
            """
        ).fetchall()

    records = [dict(row) for row in rows]
    if not records:
        return []

    try:
        if model_loaders._sbert_model is None:
            raise RuntimeError("SBERT model is not loaded")
        model = model_loaders.get_sbert_model()
        texts = [claim, *[record["text"] for record in records]]
        embeddings = model.encode(texts, normalize_embeddings=True).tolist()
        claim_embedding = embeddings[0]
        for record, embedding in zip(records, embeddings[1:]):
            record["similarity"] = round(cosine_similarity(claim_embedding, embedding), 3)
    except Exception:
        for record in records:
            record["similarity"] = round(keyword_similarity(claim, record["text"]), 3)

    matches = [record for record in records if record["similarity"] >= MIN_CONTRIBUTION_MATCH]
    matches.sort(key=lambda record: record["similarity"], reverse=True)
    return matches[:limit]
