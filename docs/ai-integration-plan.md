# AI Integration Plan

This document outlines the end-to-end plan for integrating AI capabilities to detect sensitive data in PDF files and turn them into staged selections in Sero.

## Overview

- Goal: use an LLM-guided “super prompt” to identify sensitive text on PDF documents and convert model output into selections (staged, AI-generated, with confidence and category).
- Tooling: LLM for reasoning; PyMuPDF for PDF parsing and text/box localization; backend endpoint for orchestration; frontend for triggering/reviewing.

## Architecture

1) Frontend
- Compose a unified super prompt from system prompt + selected user prompts (AI rules) + document metadata.
- Trigger backend: POST /ai/detect-sensitive payload includes document_id and prompt selection.
- Receive JSON detections; stage selections via SelectionProvider with ai_generated metadata.

2) Backend
- Endpoint: /ai/detect-sensitive
- Steps:
  - Load PDF (from storage/ref)
  - Call LLM with super prompt
  - Validate returned JSON schema
  - Map detections to page rectangles via PyMuPDF (text search; or use boxes if provided)
  - Coalesce overlapping boxes into selections
  - Normalize to [0..1] coordinates; mark as StagedCreation

3) Data flow
- Super prompt → LLM JSON → validate → localize → coalesce → selections → staged

## Super Prompt

- System prompt (template):
  - Role: “You are an expert at identifying sensitive text in documents. Return strict JSON with items containing page (0-based), category, confidence [0..1], text, and optional boxes (normalized coordinates). Do not output prose or commentary.”
  - Sensitivity taxonomy: PII (name, SSN, DOB, address, email, phone), PCI (credit cards), credentials (passwords, tokens), healthcare (MRNs), custom categories (from user rules).
  - Output requirement: JSON only (no markdown fences), matching schema (below).

- User prompts (AI Rules):
  - Domain-specific hints or patterns users define per project.

- Metadata:
  - Page count; optional sample text extracts if needed.

## JSON Schema (Model Output)

Array of objects:

- page: number (0-based)
- text: string
- category: string
- confidence: number [0..1]
- boxes?: Array<{ x: number; y: number; width: number; height: number }>
- context?: string

Validation strategy:
- Frontend: zod
- Backend: pydantic or jsonschema

## PyMuPDF Mapping

- If boxes present: assume normalized [0..1] and map to page widths/heights.
- If only text present: use PyMuPDF searchFor / get_text to find matches (case-insensitive, whitespace tolerance). Generate bounding boxes.

## Coalescing

- Per page, sort by y then x.
- Merge if IoU > 0.2 or edges within epsilon.
- Aggregate confidence via max or weighted average; retain dominant category or split by category if needed.

## Selection Lifecycle

- Create selections with normalized coords and meta: { ai_generated: true, category, confidence }.
- Stage as StagedCreation via SelectionProvider (frontend) or backend lifecycle endpoints.

## UI/UX

- Trigger: Apply AI button (already in Selection Manager).
- Options: choose AI rules, categories, min confidence, max items.
- Feedback: progress toast; summary message on completion; errors surfaced in messages panel.
- Display: AI badge, category, confidence; filters.
- Bulk actions: accept/reject AI selections.

## Errors and Retries

- Non-JSON / schema errors: automatic retry with strict instruction.
- Text localization misses: mark items as hints or re-prompt.

## Telemetry

- Track counts: total AI items, accepted/rejected, per category, avg confidence.
- Token usage if applicable.

## Milestones

- M1: Backend endpoint stub + frontend call; stage mocked detections + UI badges.
- M2: Real LLM call + JSON validation; PyMuPDF localization; coalescing.
- M3: Filters, bulk actions, telemetry.
- M4: Performance tuning, offline model option.

## Implementation Steps

1) Define frontend zod schema (types/ai.ts)
2) Scaffold backend endpoint /ai/detect-sensitive (stub)
3) Wire frontend Apply AI to call backend; stage mocked results
4) Implement LLM call + JSON validation
5) Add PyMuPDF mapping + coalescing utilities
6) Add UI badges/filters and review tools
7) Tests + telemetry

