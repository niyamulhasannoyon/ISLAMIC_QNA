#!/usr/bin/env tsx
/**
 * Vector Embedding Helpers & Script Forwarder
 */

export function cleanHtml(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatDocForEmbedding(doc: {
  title?: string;
  question?: string;
  content?: string;
  answer?: string;
}): string {
  const title = cleanHtml(doc.title || '');
  const question = cleanHtml(doc.question || '');
  const content = cleanHtml(doc.content || doc.answer || '');

  const MAX_CHARS_SAFE_8000_TOKENS = 24000;
  let combined = `${title} ${question} ${content}`.replace(/\s+/g, ' ').trim();
  if (combined.length > MAX_CHARS_SAFE_8000_TOKENS) {
    combined = combined.slice(0, MAX_CHARS_SAFE_8000_TOKENS);
  }
  return combined;
}
