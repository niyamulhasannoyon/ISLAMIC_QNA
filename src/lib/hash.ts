import crypto from 'crypto';

/**
 * Normalizes text for consistent hashing and indexing:
 * - Normalizes Unicode to NFC (canonical decomposition, followed by canonical composition)
 * - Collapses consecutive whitespace characters into a single space
 * - Trims leading and trailing whitespace
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .normalize('NFC')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Generates a deterministic SHA-256 hash for a Fatwa Q&A entry to ensure idempotency.
 * Hashing combination: normalized question + normalized answer text.
 */
export function computeFatwaHash(params: {
  question: string;
  answer: string;
  title?: string;
  source?: string;
  source_url?: string;
}): string {
  const normQuestion = normalizeText(params.question);
  const normAnswer = normalizeText(params.answer);

  // Canonical representation derived strictly from question + answer text
  const canonicalString = `${normQuestion}|${normAnswer}`;

  return crypto
    .createHash('sha256')
    .update(canonicalString, 'utf8')
    .digest('hex');
}

/**
 * Validates whether a string is a valid 64-character hexadecimal SHA-256 hash.
 */
export function isValidSha256(hash: string | null | undefined): boolean {
  if (!hash) return false;
  return /^[a-f0-9]{64}$/i.test(hash.trim());
}

/**
 * Deterministically converts a 64-character SHA-256 hash into an RFC-compliant UUID string (8-4-4-4-12).
 * Guarantees 100% parity across serverless containers, cold starts, and database rebuilds.
 */
export function hashToUuid(sha256Hash: string): string {
  const clean = (sha256Hash || '').toLowerCase().replace(/[^a-f0-9]/g, '');
  if (clean.length < 32) {
    const pad = crypto.createHash('sha256').update(clean || 'fatwa').digest('hex');
    return `${pad.slice(0, 8)}-${pad.slice(8, 12)}-${pad.slice(12, 16)}-${pad.slice(16, 20)}-${pad.slice(20, 32)}`;
  }
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20, 32)}`;
}
