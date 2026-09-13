import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

/**
 * Escapes special regex characters in a query string.
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Returns the canonical base URL for the site, respecting Vercel preview/production
 * domains and fallback to deenqna.vercel.app.
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'https://deenqna.vercel.app';
}

/**
 * Creates a clean, professional, SEO-friendly human readable URL slug from a fatwa title and ID.
 * Example:
 * Title: "প্রথম রাক্'আত শেষ করে উঠার আগে বৈঠকে বসা যাবে কি"
 * ID: "4ce328b7-4afb-8e56-bca4-f132692d7094"
 * Output: "প্রথম-রাক-আত-শেষ-করে-উঠার-আগে-বৈঠকে-বসা-যাবে-কি-4ce328b7"
 */
export function createFatwaSlug(title: string, id: string): string {
  if (!id) return "";
  const shortId = id.slice(0, 8);

  if (!title) return id;

  const cleanTitle = title
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const truncated = cleanTitle.slice(0, 75).replace(/-$/, "");

  return truncated ? `${truncated}-${shortId}` : id;
}

/**
 * Extracts candidate ID or short-ID from a URL slug or raw ID string.
 */
export function extractIdFromSlug(rawInput: string): string {
  if (!rawInput) return "";
  const decoded = decodeURIComponent(rawInput).trim();

  // If it's a full 36-char UUID or 64-char SHA-256 hash, return it directly
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(decoded)) {
    return decoded;
  }
  if (/^[a-f0-9]{64}$/i.test(decoded)) {
    return decoded;
  }

  // Extract last hyphenated token (e.g. 8-char short hex ID)
  const lastHyphenIdx = decoded.lastIndexOf("-");
  if (lastHyphenIdx !== -1) {
    const candidate = decoded.slice(lastHyphenIdx + 1);
    if (/^[a-f0-9]{8,32}$/i.test(candidate)) {
      return candidate;
    }
  }

  return decoded;
}
