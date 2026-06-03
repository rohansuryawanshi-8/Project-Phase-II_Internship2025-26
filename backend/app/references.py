from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from urllib.parse import quote_plus

import feedparser
import httpx

from .text_utils import clean_text


async def fetch_google_news(client: httpx.AsyncClient, query: str) -> list[dict]:
    url = f"https://news.google.com/rss/search?q={quote_plus(query)}&hl=en-US&gl=US&ceid=US:en"
    response = await client.get(url)
    response.raise_for_status()
    feed = feedparser.parse(response.text)
    items = []
    for entry in feed.entries[:8]:
        items.append(
            {
                "source": "google_news",
                "title": clean_text(entry.get("title", "")),
                "url": entry.get("link", ""),
                "snippet": clean_text(entry.get("summary", "")),
                "published": entry.get("published", None),
            }
        )
    return items


async def fetch_reddit(client: httpx.AsyncClient, query: str) -> list[dict]:
    url = f"https://www.reddit.com/search.json?q={quote_plus(query)}&sort=relevance&t=month&limit=8"
    response = await client.get(url, headers={"User-Agent": "ai-news-verification-system/1.0"})
    response.raise_for_status()
    payload = response.json()
    items = []
    for child in payload.get("data", {}).get("children", []):
        data = child.get("data", {})
        permalink = data.get("permalink", "")
        created = data.get("created_utc")
        items.append(
            {
                "source": "reddit",
                "title": clean_text(data.get("title", "")),
                "url": f"https://www.reddit.com{permalink}" if permalink else data.get("url", ""),
                "snippet": clean_text(data.get("selftext", ""))[:500],
                "published": datetime.fromtimestamp(created, timezone.utc).isoformat() if created else None,
            }
        )
    return items


async def fetch_indian_express(client: httpx.AsyncClient, query: str) -> list[dict]:
    response = await client.get("https://indianexpress.com/section/india/feed/")
    response.raise_for_status()
    feed = feedparser.parse(response.text)
    items = []
    for entry in feed.entries[:8]:
        items.append(
            {
                "source": "indian_express",
                "title": clean_text(entry.get("title", "")),
                "url": entry.get("link", ""),
                "snippet": clean_text(entry.get("summary", "")),
                "published": entry.get("published", None),
            }
        )
    return items


async def fetch_hindustan_times(client: httpx.AsyncClient, query: str) -> list[dict]:
    response = await client.get("https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml")
    response.raise_for_status()
    feed = feedparser.parse(response.text)
    items = []
    for entry in feed.entries[:8]:
        items.append(
            {
                "source": "hindustan_times",
                "title": clean_text(entry.get("title", "")),
                "url": entry.get("link", ""),
                "snippet": clean_text(entry.get("summary", "")),
                "published": entry.get("published", None),
            }
        )
    return items


async def collect_references(query: str) -> list[dict]:
    timeout = httpx.Timeout(12.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        results = await asyncio.gather(
            fetch_google_news(client, query),
            fetch_indian_express(client, query),
            fetch_hindustan_times(client, query),
            fetch_reddit(client, query),
            return_exceptions=True,
        )
    references: list[dict] = []
    for result in results:
        if isinstance(result, list):
            references.extend(result)
    return references
