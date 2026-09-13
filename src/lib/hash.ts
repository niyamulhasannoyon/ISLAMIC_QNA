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
