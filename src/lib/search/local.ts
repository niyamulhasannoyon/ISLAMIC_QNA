import { FatwaQA, SearchQueryOptions, SearchResponse, SearchResultItem } from '@/types/fatwa';
import { getDb, getFacets } from '../db';
import { escapeRegExp } from '../utils';
import { normalizeBengaliText, stemBengaliToken, isStopWord } from './normalizer';
import { encodeBengaliPhonetic, extractPhoneticTokens } from './phonetic';
import { transliterateQuery } from './transliterate';
import { getSynonymsAndVariants, isAblutionTerm } from './synonyms';
import { SearchEngine } from './types';

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extracts a contextual window around matched search terms and highlights them via regex.
 */
export function generateHighlightedSnippet(
  text: string,
  matchedTerms: string[],
  maxLength: number = 220
): string {
  if (!text) return '';

  const cleanText = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!matchedTerms || matchedTerms.length === 0) {
    const truncated = cleanText.slice(0, maxLength);
    return escapeHtml(truncated) + (cleanText.length > maxLength ? '...' : '');
  }

  // Filter and sort terms by length descending for greedy matching
  const validTerms = Array.from(
    new Set(
      matchedTerms
        .filter((t) => t && t.trim().length >= 2 && !isStopWord(t))
        .map((t) => t.trim())
    )
  ).sort((a, b) => b.length - a.length);

  if (validTerms.length === 0) {
    const truncated = cleanText.slice(0, maxLength);
    return escapeHtml(truncated) + (cleanText.length > maxLength ? '...' : '');
  }

  // Find first occurrence of any matched term
  let earliestIdx = -1;
  let bestTerm = '';

  for (const term of validTerms) {
    const idx = cleanText.toLowerCase().indexOf(term.toLowerCase());
    if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
      earliestIdx = idx;
      bestTerm = term;
    }
  }

  let start = 0;
  let end = cleanText.length;

  if (earliestIdx !== -1) {
    const halfWindow = Math.floor(maxLength / 2);
    start = Math.max(0, earliestIdx - halfWindow);
    end = Math.min(cleanText.length, start + maxLength);

    if (start > 0) {
      const prevSpace = cleanText.indexOf(' ', start);
      if (prevSpace !== -1 && prevSpace < earliestIdx) {
        start = prevSpace + 1;
      }
    }

    if (end < cleanText.length) {
      const nextSpace = cleanText.lastIndexOf(' ', end);
      if (nextSpace !== -1 && nextSpace > earliestIdx + bestTerm.length) {
        end = nextSpace;
      }
    }
  } else {
    end = Math.min(cleanText.length, maxLength);
  }

  let snippetWindow = cleanText.slice(start, end);
  if (start > 0) snippetWindow = '...' + snippetWindow;
  if (end < cleanText.length) snippetWindow = snippetWindow + '...';

  let escaped = escapeHtml(snippetWindow);

  // Apply subtle editorial regex highlighting
  const escapedTerms = validTerms.map((t) => escapeHtml(t));
  const pattern = new RegExp(`(${escapedTerms.map(escapeRegExp).join('|')})`, 'gi');
  escaped = escaped.replace(
    pattern,
    '<mark class="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-semibold px-0.5 rounded">$1</mark>'
  );

  return escaped;
}

export class LocalBengaliSearchEngine implements SearchEngine {
  public name = 'Professional Bengali Phonetic Engine';

  public async init(): Promise<void> {
    getDb();
  }

  public async indexDocuments(docs: FatwaQA[]): Promise<void> {
    const db = getDb();
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO fatwas_fts (id, title, question, answer, category, source, scholar)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (const d of docs) {
        insertStmt.run(d.id, d.title, d.question, d.answer, d.category, d.source, d.scholar);
      }
    })();
  }

  public async search(options: SearchQueryOptions): Promise<SearchResponse> {
    const startTime = Date.now();
    const db = getDb();

    const rawQuery = (options.q || '').trim();
    const sourceFilter = options.source && options.source !== 'All' ? options.source.toLowerCase() : undefined;
    const categoryFilter = options.category && options.category !== 'All' ? options.category.toLowerCase() : undefined;
    const scholarFilter = options.scholar && options.scholar !== 'All' ? options.scholar.toLowerCase() : undefined;
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const offset = (page - 1) * limit;

    // 1. Browse mode (empty query) - Instant direct SQLite indexed scan (~1-2 ms)
    if (!rawQuery) {
      const whereClauses: string[] = [];
      const params: any[] = [];

      if (sourceFilter) {
        whereClauses.push('LOWER(source) = ?');
        params.push(sourceFilter);
      }
      if (categoryFilter) {
        whereClauses.push('LOWER(category) = ?');
        params.push(categoryFilter);
      }
      if (scholarFilter) {
        whereClauses.push('LOWER(scholar) LIKE ?');
        params.push(`%${scholarFilter}%`);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countRow = db.prepare(`SELECT count(*) as count FROM fatwas ${whereSql}`).get(...params) as { count: number };
      const total = countRow.count;

      const rows = db.prepare(`
        SELECT id, source, source_url, title, question, answer, category, tags, scholar, published_date, sha256_hash, scraped_at, created_at, updated_at
        FROM fatwas
        ${whereSql}
        ORDER BY published_date DESC, created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset) as any[];

      const results: SearchResultItem[] = rows.map((r) => ({
        ...r,
        tags: JSON.parse(r.tags || '[]'),
        score: 1.0,
        snippet: generateHighlightedSnippet(r.answer || r.question, []),
        titleSnippet: escapeHtml(r.title),
        matchedTerms: [],
      }));

      return {
        results,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        tookMs: Date.now() - startTime,
        engine: this.name,
        facets: getFacets(),
      };
    }

    // 2. Full-Text Search Mode
    const transliterated = transliterateQuery(rawQuery);
    const primaryQuery = transliterated.primaryBengali || rawQuery;
    const normalizedQuery = normalizeBengaliText(primaryQuery);

    const rawTokens = normalizedQuery.split(/[\s,.;:!?"'()\-–—\/\\]+/).filter(Boolean);
    const nonStopTokens = rawTokens.filter((t) => !isStopWord(t));
    const queryTokens = nonStopTokens.length > 0 ? nonStopTokens : rawTokens;

    const expandedSynonyms = new Set<string>();
    const expandedPhonetics = new Set<string>();
    const expandedStems = new Set<string>();
    const highlightTerms = new Set<string>();

    transliterated.expandedTerms.forEach((t) => {
      highlightTerms.add(t);
      const synonyms = getSynonymsAndVariants(t);
      synonyms.forEach((s) => expandedSynonyms.add(s));
    });

    for (const token of queryTokens) {
      highlightTerms.add(token);
      const stemmed = stemBengaliToken(token);
      expandedStems.add(stemmed);

      const synonyms = getSynonymsAndVariants(token);
      synonyms.forEach((s) => {
        expandedSynonyms.add(s);
        highlightTerms.add(s);
      });

      const phonetic = encodeBengaliPhonetic(token);
      if (phonetic && phonetic.length >= 2) {
        expandedPhonetics.add(phonetic);
      }
    }

    const queryIsAblution =
      (transliterated.isBanglish && ['oju', 'ojoo', 'wudu', 'wuzu', 'wudhu'].some((w) => rawQuery.toLowerCase().includes(w)))
      || queryTokens.some((t) => isAblutionTerm(t));

    // Construct sanitized FTS5 MATCH query
    const cleanFtsTerm = (t: string) => t.replace(/["*^:()\-]/g, ' ').trim();
    const candidateTerms = Array.from(
      new Set([rawQuery, primaryQuery, ...queryTokens, ...Array.from(expandedSynonyms).slice(0, 10)])
    )
      .map(cleanFtsTerm)
      .filter((t) => t.length > 0);

    const ftsMatch = candidateTerms.map((t) => `"${t}"*`).join(' OR ');

    // Filter clauses
    const whereClauses: string[] = ['fatwas_fts MATCH ?'];
    const filterParams: any[] = [ftsMatch];

    if (sourceFilter) {
      whereClauses.push('LOWER(f.source) = ?');
      filterParams.push(sourceFilter);
    }
    if (categoryFilter) {
      whereClauses.push('LOWER(f.category) = ?');
      filterParams.push(categoryFilter);
    }
    if (scholarFilter) {
      whereClauses.push('LOWER(f.scholar) LIKE ?');
      filterParams.push(`%${scholarFilter}%`);
    }

    const whereSql = whereClauses.join(' AND ');
    const hasFilters = Boolean(sourceFilter || categoryFilter || scholarFilter);

    // Fast candidate retrieval: Fetch top candidate IDs and BM25 rank
    const candidateRows = db.prepare(`
      SELECT fts.id, bm25(fatwas_fts, 5.0, 3.0, 1.0, 1.0, 1.0, 1.5) as rank
      FROM fatwas_fts fts
      JOIN fatwas f ON f.id = fts.id
      WHERE ${whereSql}
      ORDER BY rank
      LIMIT 120
    `).all(...filterParams) as Array<{ id: string; rank: number }>;

    // Total count for pagination
    let total = 0;
    if (hasFilters) {
      const totalCountRow = db.prepare(`
        SELECT count(*) as count
        FROM fatwas_fts fts
        JOIN fatwas f ON f.id = fts.id
        WHERE ${whereSql}
      `).get(...filterParams) as { count: number };
      total = totalCountRow.count;
    } else {
      const totalCountRow = db.prepare(`
        SELECT count(*) as count
        FROM fatwas_fts
        WHERE fatwas_fts MATCH ?
      `).get(ftsMatch) as { count: number };
      total = totalCountRow.count;
    }

    if (candidateRows.length === 0) {
      return {
        results: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
        tookMs: Date.now() - startTime,
        engine: this.name,
        facets: getFacets(),
      };
    }

    // Fetch full documents for candidates
    const candidateIds = candidateRows.map((r) => r.id);
    const rankMap = new Map<string, number>(candidateRows.map((r) => [r.id, r.rank]));
    const placeholders = candidateIds.map(() => '?').join(',');

    const docs = db.prepare(`
      SELECT id, source, source_url, title, question, answer, category, tags, scholar, published_date, sha256_hash, scraped_at, created_at, updated_at
      FROM fatwas
      WHERE id IN (${placeholders})
    `).all(...candidateIds) as any[];

    // Re-ranking & Precision Relevance Scoring
    const scoredDocs: Array<{ doc: FatwaQA; finalScore: number; matchedTerms: string[] }> = [];

    for (const d of docs) {
      const doc: FatwaQA = {
        ...d,
        tags: JSON.parse(d.tags || '[]'),
      };
      const bm25Rank = rankMap.get(doc.id) || 0;
      let score = 100 - bm25Rank;

      const titleLower = (doc.title || '').toLowerCase();
      const questionLower = (doc.question || '').toLowerCase();
      const answerLower = (doc.answer || '').toLowerCase();
      const matchedForDoc = new Set<string>();

      // Exact phrase match in title boost
      if (titleLower.includes(normalizedQuery.toLowerCase())) {
        score += 80.0;
      }

      // Check token and synonym matches
      for (const token of queryTokens) {
        if (titleLower.includes(token)) {
          score += 35.0;
          matchedForDoc.add(token);
        }
        if (questionLower.includes(token)) {
          score += 15.0;
          matchedForDoc.add(token);
        }
      }

      for (const syn of expandedSynonyms) {
        if (titleLower.includes(syn)) {
          score += 30.0;
          matchedForDoc.add(syn);
        } else if (questionLower.includes(syn)) {
          score += 12.0;
          matchedForDoc.add(syn);
        } else if (answerLower.includes(syn)) {
          score += 3.0;
          matchedForDoc.add(syn);
        }
      }

      // Phonetic matching
      const docPhonetics = extractPhoneticTokens(doc.title + ' ' + (doc.question || '').slice(0, 100));
      for (const p of expandedPhonetics) {
        if (docPhonetics.includes(p)) {
          score += 18.0;
        }
      }

      // Ablution disambiguation & false-positive suppression
      if (queryIsAblution) {
        const ablutionWords = ['ওযু', 'অজু', 'উযু', 'উজু', 'ওজু', 'ওযূ', 'উযূ'];
        const hasAblutionInTitle = ablutionWords.some((w) =>
          new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, 'u').test(titleLower)
        );
        const hasAblutionInQuestion = ablutionWords.some((w) =>
          new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, 'u').test(questionLower)
        );
        const hasAblutionInAnswer = ablutionWords.some((w) =>
          new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, 'u').test(answerLower)
        );

        if (hasAblutionInTitle) {
          score += 100.0;
        } else if (hasAblutionInQuestion) {
          score += 50.0;
        } else if (hasAblutionInAnswer) {
          score += 20.0;
        } else {
          score = score * 0.05;
        }
      }

      scoredDocs.push({
        doc,
        finalScore: score,
        matchedTerms: Array.from(matchedForDoc),
      });
    }

    // Sort by final relevance score descending
    scoredDocs.sort((a, b) => b.finalScore - a.finalScore);

    const paginated = scoredDocs.slice(offset, offset + limit);

    const topSynonyms = Array.from(expandedSynonyms).slice(0, 8);
    const allHighlightPool = Array.from(
      new Set([...Array.from(highlightTerms), ...queryTokens, ...topSynonyms])
    );

    const results: SearchResultItem[] = paginated.map(({ doc, finalScore, matchedTerms }) => {
      const termsForDoc = Array.from(new Set([...matchedTerms, ...allHighlightPool]));
      const snippet = generateHighlightedSnippet(doc.answer || doc.question, termsForDoc, 240);
      const titleSnippet = generateHighlightedSnippet(doc.title, termsForDoc, 120);

      return {
        ...doc,
        score: finalScore,
        snippet,
        titleSnippet,
        matchedTerms: termsForDoc,
      };
    });

    return {
      results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      tookMs: Date.now() - startTime,
      engine: this.name,
      facets: getFacets(),
    };
  }
}
