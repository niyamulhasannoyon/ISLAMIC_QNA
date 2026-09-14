import React from 'react';

interface SafeHighlightProps {
  text?: string | null;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

function decodeBasicHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/');
}

/**
 * Strips all HTML tags except when parsing structured tokens.
 */
function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * SafeHighlight renders text with highlighted search terms without using dangerouslySetInnerHTML.
 * Only `<mark>...</mark>` tags are recognized as highlight tokens.
 * All other content is safely rendered as pure React text nodes, neutralizing any XSS payloads.
 */
export function SafeHighlight({ text, className, as: Component = 'span' }: SafeHighlightProps) {
  if (!text) return null;

  // Split content by `<mark ...>...</mark>` tokens
  const parts = text.split(/(<mark[^>]*>[\s\S]*?<\/mark>)/gi);

  // If no mark tags were present, render plain text safely
  if (parts.length === 1 && !/<mark[^>]*>/i.test(parts[0])) {
    const clean = stripHtmlTags(parts[0]);
    return <Component className={className}>{decodeBasicHtmlEntities(clean)}</Component>;
  }

  return (
    <Component className={className}>
      {parts.map((part, index) => {
        const markMatch = part.match(/^<mark[^>]*>([\s\S]*?)<\/mark>$/i);

        if (markMatch) {
          // Extract text inside <mark>, strip any nested tags, decode entities
          const innerContent = stripHtmlTags(markMatch[1]);
          const decoded = decodeBasicHtmlEntities(innerContent);
          return (
            <mark
              key={index}
              className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-semibold px-0.5 rounded"
            >
              {decoded}
            </mark>
          );
        }

        // Text outside mark tags - strip any rogue tags and decode
        const cleanPart = stripHtmlTags(part);
        const decodedPart = decodeBasicHtmlEntities(cleanPart);
        return <React.Fragment key={index}>{decodedPart}</React.Fragment>;
      })}
    </Component>
  );
}

export default SafeHighlight;
