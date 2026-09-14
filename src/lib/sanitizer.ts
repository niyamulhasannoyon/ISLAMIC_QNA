/**
 * Utility for input sanitization and XSS mitigation
 */

/**
 * Strips script tags, iframe, object, embed, javascript: protocols, and inline event handlers
 */
export function sanitizeString(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';

  return input
    // Strip <script>...</script>
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Strip <iframe>...</iframe>
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Strip <object>...</object>
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    // Strip <embed>...</embed>
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    // Strip <style>...</style>
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Strip dangerous inline event handlers like onerror=, onload=, onclick=
    .replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    // Strip javascript: pseudo protocols
    .replace(/javascript:[^"'\s]*/gi, '')
    // Strip data:text/html protocols
    .replace(/data:text\/html[^"'\s]*/gi, '')
    .trim();
}

/**
 * Strips all HTML markup completely to plain text
 */
export function stripAllHtml(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';
  return sanitizeString(input).replace(/<[^>]*>/g, '').trim();
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
