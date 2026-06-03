# AI News Verification System

A full-stack college project for verifying news claims using a React frontend and a FastAPI-based analysis backend. The system collects evidence, calculates analysis signals, and presents an explainable verdict with confidence and references.

## Project Structure

```text
.
+-- frontend/       # React + Vite frontend application
+-- backend/        # FastAPI backend and NLP analysis modules
+-- certificates/   # Certificates or approval documents
+-- reports/        # Project reports, screenshots, and submission files
+-- requirements.txt
+-- SETUP.md
+-- README.md
`-- .gitignore
```

## Main Features

- News claim verification workflow.
- Evidence collection from public sources.
- Verdict, confidence score, and reference display.
- Separate frontend and backend modules.
- Clean folder structure for project submission.

## Objective

The project is designed to help users verify news claims by comparing the input text with evidence collected from public sources.

## Main Modules

- `frontend/src`: React frontend, interface components, and styling.
- `backend/app`: FastAPI routes, schemas, evidence collection, scoring, and verdict logic.
- `backend/data`: Local data used by the backend during analysis.

## Design Approach

- Keep the interface focused on entering a claim, viewing evidence, and understanding the final verdict.
- Show confidence and source references clearly so the result is explainable.
- Keep frontend and backend responsibilities separate for easier testing and maintenance.

## Quick Start

See [SETUP.md](SETUP.md) for complete setup and running instructions.

## Attributions

This project uses UI components inspired by [shadcn/ui](https://ui.shadcn.com/), which is available under the MIT license.

Some visual assets may use images from [Unsplash](https://unsplash.com), used under the Unsplash license.
