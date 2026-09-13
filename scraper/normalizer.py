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

def hash_to_uuid(sha256_hash: str) -> str:
    """
    Deterministically converts a 64-character SHA-256 hash into an RFC-compliant UUID string.
    Identical to the Next.js TypeScript implementation.
    """
    h = re.sub(r"[^a-f0-9]", "", (sha256_hash or "").lower())
    if len(h) < 32:
        h = hashlib.sha256((h or "fatwa").encode("utf-8")).hexdigest()
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"

