from __future__ import annotations
from typing import Sequence

SCHEMA_HINT = (
    "Return STRICT JSON ONLY. No prose, no markdown fences, no code blocks.\n"
    "Output MUST be exactly: {\"selections\": [ ... ] }\n"
    "Each selection item MUST include: {\"page_number\": int|null, \"x\": number, \"y\": number, \"width\": number, \"height\": number, \"confidence\": number}.\n"
    "All numbers MUST be decimals in [0,1] for x,y,width,height and [0,1] for confidence.\n"
    "If no detections, return {\"selections\": []}.\n"
)

MODEL_GUARDRAILS = (
    "You are an expert at identifying sensitive content for redaction in PDFs. Follow these rules precisely:\n"
    "- Output ONLY JSON as specified; NEVER include explanations, backticks, or extra fields.\n"
    "- Use all relevant user rules provided below (they describe what to find/redact).\n"
    "- Coordinates are normalized [0,1] relative to page width/height.\n"
    "- confidence is a float in [0,1] indicating how sure you are that the box contains sensitive content.\n"
    "- If a whole page must be redacted, return x=0,y=0,width=1,height=1 with that page_number.\n"
    "- Prefer tight boxes around the smallest region that covers the sensitive content.\n"
    "- If uncertain but there are strong hints (e.g., visible PII patterns like emails, SSNs, credit cards, phone numbers, names near signatures), still propose boxes with moderate confidence (0.4–0.6).\n"
    "- Examples of sensitive patterns: emails (user@example.com), SSNs (###-##-####), credit cards (#### #### #### ####), phone numbers, physical addresses, DOB, MRN/medical IDs, API keys/tokens.\n"
    "- Place boxes on likely areas given typical document structure when text context is limited: headers (top 15%), footers (bottom 15%), signature lines (bottom 25%), addresses (top-left quadrant), totals (top-right or near the end).\n"
    "- However, do NOT produce random boxes; always relate to the provided rules. If nothing matches, return an empty list.\n"
)

SEPARATOR = "\n\n---\n\n"


def compose_selection_instructions(system_prompt: str | None, rules: Sequence[str]) -> str:
    parts: list[str] = []
    if system_prompt:
        parts.append(system_prompt.strip())
    parts.append(MODEL_GUARDRAILS)
    parts.append(SCHEMA_HINT)
    # Append each rule as its own block
    for r in rules:
        if r and r.strip():
            parts.append(r.strip())
    return SEPARATOR.join(parts)

