from __future__ import annotations
from typing import Sequence

SCHEMA_HINT = (
    "You must respond with JSON only. Schema: {\"selections\": ["
    "{\"page_number\": int|null, \"x\": float, \"y\": float, \"width\": float, \"height\": float, \"confidence\": float}"
    "]}"
)

MODEL_GUARDRAILS = (
    "Rules: \n"
    "- Use all relevant rules provided.\n"
    "- If unsure, be conservative with selections.\n"
    "- Confidence must be a float in [0,1].\n"
    "- Coordinates are normalized [0,1] relative to page dimensions.\n"
    "- If the entire page must be redacted, return width=1,height=1 and x=0,y=0 with page_number.\n"
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

