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
 * Preserves Unicode Bengali letters and combining marks (vowel signs, viramas), strips
 * repetitive question prefixes, and appends the 8-character ID prefix.
 *
 * Example:
 * Title: "প্রশ্ন (৩২/৪৭২) : কোন মাসবূক ব্যক্তি ইমামের সালাম ফেরানোর পর নিজের ছালাত পূর্ণ করার সময়..."
 * ID: "4ab1a108-6526-5dd7-89d8-52ca96f155a4"
 * Output: "কোন-মাসবূক-ব্যক্তি-ইমামের-সালাম-ফেরানোর-পর-নিজের-ছালাত-পূর্ণ-4ab1a108"
 */
export function createFatwaSlug(title: string, id: string): string {
  if (!id) return "";
  const shortId = id.slice(0, 8);

  if (!title) return id;

  // 1. NFC normalization & remove HTML tags
  let clean = title
    .normalize("NFC")
    .replace(/<[^>]*>/g, "")
    // 2. Strip leading question labels/numbering like "প্রশ্ন (৩২/৪৭২) :", "প্রশ্ন নং ১২৩:", "প্রশ্নঃ", "প্রশ্ন -"
    .replace(/^প্রশ্ন\s*(\([^\)]+\)|[০-৯0-9\/\s-]+)?\s*[:ঃ-]?\s*/u, "")
    .trim();

  // If stripping the prefix emptied the title, fallback to normalized title
  if (!clean) {
    clean = title.normalize("NFC").trim();
  }

  // 3. Keep all Unicode Letters (\p{L}), Marks (\p{M} e.g. Bengali vowel signs, viramas),
  // Numbers (\p{N}), spaces, and hyphens. Replace everything else with spaces.
  clean = clean
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!clean) return id;

  // 4. Truncate at word boundary (hyphen) around ~65-70 chars
  let truncated = clean;
  if (clean.length > 70) {
    const lastHyphen = clean.lastIndexOf("-", 70);
    if (lastHyphen > 20) {
      truncated = clean.slice(0, lastHyphen);
    } else {
      truncated = clean.slice(0, 70);
    }
  }

  // Remove any trailing hyphens
  truncated = truncated.replace(/-+$/g, "");

  return truncated ? `${truncated}-${shortId}` : id;
}

/**
 * Safely extracts candidate ID, short-ID prefix, or UUID from a URL slug or raw ID string.
 */
export function extractIdFromSlug(rawInput: string): string {
  if (!rawInput) return "";
  let decoded = rawInput.trim();
  try {
    decoded = decodeURIComponent(rawInput).trim();
  } catch {
    // Keep decoded as rawInput if malformed URI
  }

  // 1. If it is already a full 36-char UUID or 64-char SHA-256 hash, return it directly
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(decoded)) {
    return decoded;
  }
  if (/^[a-f0-9]{64}$/i.test(decoded)) {
    return decoded;
  }

  // 2. Slug ending with full 36-char UUID: e.g. "some-slug-4ab1a108-6526-5dd7-89d8-52ca96f155a4"
  const uuidMatch = decoded.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
  if (uuidMatch) {
    return uuidMatch[1];
  }

  // 3. Slug ending with short hex ID (4 to 32 hex chars): e.g. "some-slug-4ab1a108"
  const hexMatch = decoded.match(/-([a-f0-9]{4,32})$/i);
  if (hexMatch) {
    return hexMatch[1];
  }

  // 4. Standalone short hex ID (4 to 32 hex chars)
  if (/^[a-f0-9]{4,32}$/i.test(decoded)) {
    return decoded;
  }

  // 5. Fallback: extract last hyphen segment if alphanumeric
  const lastHyphenIdx = decoded.lastIndexOf("-");
  if (lastHyphenIdx !== -1) {
    const candidate = decoded.slice(lastHyphenIdx + 1);
    if (/^[a-f0-9]{4,36}$/i.test(candidate)) {
      return candidate;
    }
  }

  return decoded;
}
