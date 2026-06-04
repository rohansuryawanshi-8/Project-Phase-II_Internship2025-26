from __future__ import annotations

import os


FAKE_NEWS_MODEL = os.getenv("FAKE_NEWS_MODEL", "jy46604790/Fake-News-Bert-Detect")
GENRE_MODEL = os.getenv("GENRE_MODEL", "Asphate/nanoclass-bbc")
SENTIMENT_MODEL = os.getenv("SENTIMENT_MODEL", "distilbert-base-uncased-finetuned-sst-2-english")

_sbert_model = None
_nli_pipeline = None
_fake_news_pipeline = None
_genre_pipeline = None
_sentiment_pipeline = None


def get_sbert_model():
    global _sbert_model
    if _sbert_model is None:
        from sentence_transformers import SentenceTransformer

        _sbert_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _sbert_model


def get_nli_pipeline():
    global _nli_pipeline
    if _nli_pipeline is None:
        from transformers import pipeline

        _nli_pipeline = pipeline(
            "text-classification",
            model="cross-encoder/nli-deberta-v3-small",
            top_k=None,
            truncation=True,
        )
    return _nli_pipeline


def get_fake_news_pipeline():
    global _fake_news_pipeline
    if _fake_news_pipeline is None:
        from transformers import pipeline

        _fake_news_pipeline = pipeline(
            "text-classification",
            model=FAKE_NEWS_MODEL,
            truncation=True,
            top_k=None,
        )
    return _fake_news_pipeline


def get_genre_pipeline():
    global _genre_pipeline
    if _genre_pipeline is None:
        from transformers import pipeline

        _genre_pipeline = pipeline(
            "text-classification",
            model=GENRE_MODEL,
            truncation=True,
            top_k=None,
        )
    return _genre_pipeline


def get_sentiment_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        from transformers import pipeline

        _sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model=SENTIMENT_MODEL,
            truncation=True,
        )
    return _sentiment_pipeline
