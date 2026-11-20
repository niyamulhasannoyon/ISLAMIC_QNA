/**
 * Utility for input sanitization, JSON-LD serialization, and XSS mitigation
 */

/**
 * Serializes data into a safe JSON string suitable for embedding inside
 * `<script type="application/ld+json">` tags without risking HTML script breakout XSS.
 * Escapes `<`, `>`, `&`, and line/paragraph separators (U+2028 / U+2029).
 */
export function serializeJsonLd(data: unknown): string {
  try {
    return JSON.stringify(data)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  } catch {
    return '{}';
  }
}

/**
 * Strips script tags, iframe, object, embed, svg, math, javascript: protocols,
 * and inline event handlers. Runs multiple passes to prevent nested tag evasion.
 */
export function sanitizeString(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';

  let sanitized = input;
  let previous = '';
  let passes = 0;
  const maxPasses = 5;

  // Multi-pass stripping to eliminate nested evasions (e.g. `<scr<script>ipt>`)
  while (sanitized !== previous && passes < maxPasses) {
    previous = sanitized;
    passes++;

    sanitized = sanitized
      // Strip <script>...</script> paired tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Strip solitary/orphaned <script> or </script> tags
      .replace(/<\/?script\b[^>]*>/gi, '')
      // Strip <iframe>...</iframe> paired and solitary tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<\/?iframe\b[^>]*>/gi, '')
      // Strip <object>, <embed>, <style>, <svg>, <math> (paired and solitary)
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<\/?object\b[^>]*>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<\/?embed\b[^>]*>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<\/?style\b[^>]*>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
      .replace(/<\/?svg\b[^>]*>/gi, '')
      .replace(/<math\b[^<]*(?:(?!<\/math>)<[^<]*)*<\/math>/gi, '')
      .replace(/<\/?math\b[^>]*>/gi, '')
      // Strip dangerous stand-alone elements
      .replace(/<\/?(?:base|meta|link|form|input|button|textarea|select)\b[^>]*>/gi, '')
      // Strip dangerous inline event handlers like onerror=, onload=, onclick=, ontoggle=
      .replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
      // Strip javascript: pseudo protocols
      .replace(/javascript:[^"'\s]*/gi, '')
      // Strip vbscript: pseudo protocols
      .replace(/vbscript:[^"'\s]*/gi, '')
      // Strip data:text/html or data:image/svg+xml protocols
      .replace(/data:(?:text\/html|image\/svg\+xml)[^"'\s]*/gi, '');
  }

  return sanitized.trim();
}

/**
 * Strips all HTML markup completely to plain text
 */
export function stripAllHtml(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';
  return sanitizeString(input)
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Sanitizes a fatwa input object before DB write
 */
export function sanitizeFatwaInput<T extends {
  title?: string;
  question?: string;
  answer?: string;
  category?: string;
  scholar?: string;
  tags?: string[];
  source_url?: string;
}>(item: T): T {
  return {
    ...item,
    title: sanitizeString(item.title),
    question: sanitizeString(item.question),
    answer: sanitizeString(item.answer),
    category: item.category ? stripAllHtml(item.category) : 'General',
    scholar: item.scholar ? stripAllHtml(item.scholar) : '',
    source_url: item.source_url ? sanitizeString(item.source_url) : '',
    tags: Array.isArray(item.tags)
      ? item.tags.map((t) => stripAllHtml(String(t))).filter(Boolean)
      : [],
  };
}

/**
 * Validates that a URL is a public HTTP/HTTPS URL and does not point
 * to private IP ranges, localhost, or cloud metadata endpoints (SSRF mitigation).
 */
export function isSafePublicUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    // Block localhost, loopback 127.0.0.0/8, ::1, and 0.0.0.0/8
    if (
      host === 'localhost' ||
      host === '::1' ||
      /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
    ) {
      return false;
    }
    // Block cloud metadata service (AWS/GCP/Azure)
    if (host === '169.254.169.254' || host === 'metadata.google.internal') {
      return false;
    }
    // Block private RFC 1918 IPv4 ranges
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
    // Block link-local IPv4 range
    if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

