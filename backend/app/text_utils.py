from __future__ import annotations

import re

from bs4 import BeautifulSoup


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", BeautifulSoup(value or "", "html.parser").get_text(" ")).strip()


def make_query(text: str, categories: list[str]) -> str:
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9'-]{2,}", text)
    stop_words = {
        "the",
        "and",
        "that",
        "this",
        "with",
        "from",
        "have",
        "will",
        "about",
        "after",
        "before",
        "news",
        "says",
        "said",
    }
    keywords = [word for word in words if word.lower() not in stop_words][:14]
    prefix = " ".join(categories[:2])
    return " ".join([prefix, " ".join(keywords)]).strip()
