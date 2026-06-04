# AI News Verification System Backend

FastAPI backend for checking a news claim against Google News, Indian Express, Hindustan Times, and Reddit references.

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

The first request may take longer because SBERT/BERT models are downloaded and cached.

## API

`POST /analyze`

```json
{
  "text": "Claim or article text",
  "categories": ["politics"]
}
```

The response includes a true/false verdict, confidence score, accuracy estimate, evidence references, model notes, and an ensemble signal list.

## Notes

- Google evidence uses Google News RSS, so no API key is required.
- Indian Express evidence uses the official India RSS feed, so no API key is required.
- Hindustan Times evidence uses the official India RSS feed, so no API key is required.
- Reddit evidence uses Reddit public JSON search. For production use, replace it with official Reddit OAuth API access.
- The ensemble includes SBERT evidence matching, BERT/NLI stance, fake-news BERT, sentiment risk, source trust, recency, cross-source corroboration, and claim specificity signals.
- This is evidence-based claim support, not a legal/medical-grade fact checker. The UI shows references so users can inspect why a verdict was produced.
