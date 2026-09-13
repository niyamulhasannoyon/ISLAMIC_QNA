# -*- coding: utf-8 -*-
import hashlib
import unicodedata
import re
from typing import Optional

def normalize_text(text: Optional[str]) -> str:
    """
    Normalizes text for consistent hashing and indexing:
    - Normalizes Unicode to NFC (for Bengali and Arabic combining characters)
    - Replaces newlines, carriage returns, and tabs with a space
    - Collapses multiple whitespace characters
    - Trims edges
    """
    if not text:
        return ""
    normalized = unicodedata.normalize("NFC", text)
    cleaned = re.sub(r"[\r\n\t]+", " ", normalized)
    collapsed = re.sub(r"\s{2,}", " ", cleaned)
    return collapsed.strip()

def compute_fatwa_hash(question: str, answer: str, *args, **kwargs) -> str:
    """
    Computes a deterministic SHA-256 hash representing a Fatwa entry.
    Derived strictly from normalized question + answer text.
    Matches the exact hashing logic of the Next.js backend.
    """
    norm_question = normalize_text(question)
    norm_answer = normalize_text(answer)

    canonical = f"{norm_question}|{norm_answer}"
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

