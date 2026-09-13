import { FatwaQA, SearchQueryOptions, SearchResponse, SearchResultItem } from '@/types/fatwa';
import { getDb, getFacets } from '../db';
import { escapeRegExp } from '../utils';
import { normalizeBengaliText, stemBengaliToken, isStopWord } from './normalizer';
import { encodeBengaliPhonetic, extractPhoneticTokens } from './phonetic';
import { transliterateQuery } from './transliterate';
import { getSynonymsAndVariants, isAblutionTerm } from './synonyms';
import { extractSemanticFiqhIntent } from '../ai/semantic';
import { SearchEngine } from './types';

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Bengali inflection suffixes regex covering case markers, articles, plurals, clitics, and vowel signs
const BENGALI_SUFFIX_PATTERN =
  '(?:গুলোর(?:ও|ই)?|গুলির(?:ও|ই)?|সমূহের?|গুলো(?:তে|য়|কে|র|ও|ই)?|গুলি(?:তে|কে|র|ও|ই)?|দের(?:কে|ও|ই)?|গণের?|খানা(?:র|য়)?|খানি(?:র)?|ভাবে|ধারী|কারী|সম্মত|টিতে|টাতে|টিকে|টাকে|টির|টার|টি(?:ও|ই)?|টা(?:ও|ই)?|য়ের(?:ও|ই)?|এর(?:ও|ই)?|\u09C7\u09B0(?:ও|ই)?|েতে|তে(?:ও|ই)?|য়ে|কে(?:ও|ই)?|র(?:ও|ই)?|ে(?:ও|ই)?|ায়(?:ও|ই)?|য়(?:ও|ই)?|ও|ই)?';

/**
 * Extracts a contextual window around matched search terms and highlights them safely.
 * Preserves Bengali script integrity: never cuts inside conjuncts (যুক্তাক্ষর),
 * never orphans dependent vowel signs (কার: ে, া, ি, ইত্যাদি), and never matches inside
 * preceding letters (e.g. 'পর' inside 'উপর' or 'স্পর্শ').
 */
export function generateHighlightedSnippet(
  text: string,
  matchedTerms: string[],
  maxLength: number = 220
): string {
  if (!text) return '';

  const cleanText = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!matchedTerms || matchedTerms.length === 0) {
    if (cleanText.length <= maxLength) return escapeHtml(cleanText);
    let end = maxLength;
    const spaceIdx = cleanText.lastIndexOf(' ', end);
    if (spaceIdx > Math.floor(maxLength * 0.6)) end = spaceIdx;
    return escapeHtml(cleanText.slice(0, end)) + '...';
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
    if (cleanText.length <= maxLength) return escapeHtml(cleanText);
    let end = maxLength;
    const spaceIdx = cleanText.lastIndexOf(' ', end);
    if (spaceIdx > Math.floor(maxLength * 0.6)) end = spaceIdx;
    return escapeHtml(cleanText.slice(0, end)) + '...';
  }

  // Build Unicode word-boundary-aware pattern:
  // 1. (?<![\p{L}\p{M}\p{N}\u200C\u200D]) asserts word boundary before the term (never mid-word, mid-conjunct, or after virama)
  // 2. (?:terms) matches one of the valid terms
  // 3. BENGALI_SUFFIX_PATTERN matches valid trailing Bengali inflections (e.g. -ে, -ের, -টি, -গুলো)
  // 4. (?![\p{L}\p{M}\p{N}\u200C\u200D]) asserts word boundary after the match
  const termsRegex = validTerms.map(escapeRegExp).join('|');
  const highlightRegex = new RegExp(
    `(?<![\\p{L}\\p{M}\\p{N}\\u200C\\u200D])(?:${termsRegex})${BENGALI_SUFFIX_PATTERN}(?![\\p{L}\\p{M}\\p{N}\\u200C\\u200D])`,
    'gu'
  );

  // Find first legitimate match index to center the snippet window
  let earliestIdx = -1;
  let bestMatchLen = 0;
  highlightRegex.lastIndex = 0;
  const firstMatch = highlightRegex.exec(cleanText);
  if (firstMatch) {
    earliestIdx = firstMatch.index;
    bestMatchLen = firstMatch[0].length;
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
      } else {
        // Prevent starting mid-combining mark
        while (start < earliestIdx && /[\p{M}\u200C\u200D]/u.test(cleanText[start])) {
          start++;
        }
      }
    }

    if (end < cleanText.length) {
      const nextSpace = cleanText.lastIndexOf(' ', end);
      if (nextSpace !== -1 && nextSpace > earliestIdx + bestMatchLen) {
        end = nextSpace;
      } else {
        // Prevent cutting mid-combining mark
        while (end < cleanText.length && /[\p{M}\u200C\u200D]/u.test(cleanText[end])) {
          end++;
        }
      }
    }
  } else {
    end = Math.min(cleanText.length, maxLength);
    if (end < cleanText.length) {
      const spaceIdx = cleanText.lastIndexOf(' ', end);
      if (spaceIdx > Math.floor(maxLength * 0.6)) end = spaceIdx;
    }
  }

  let snippetWindow = cleanText.slice(start, end);
  if (start > 0) snippetWindow = '...' + snippetWindow;
  if (end < cleanText.length) snippetWindow = snippetWindow + '...';

  // Perform highlighting directly on the clean plain text window,
  // HTML-escaping each chunk to ensure zero DOM entity corruption.
  highlightRegex.lastIndex = 0;
  let result = '';
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = highlightRegex.exec(snippetWindow)) !== null) {
    const matchStart = m.index;
    const matchEnd = m.index + m[0].length;

    result += escapeHtml(snippetWindow.slice(lastIndex, matchStart));
    result += `<mark class="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-semibold px-0.5 rounded">${escapeHtml(m[0])}</mark>`;
    lastIndex = matchEnd;
  }
  result += escapeHtml(snippetWindow.slice(lastIndex));

  return result;
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
      if (!isStopWord(t) && t.length >= 2) {
        highlightTerms.add(t);
        const synonyms = getSynonymsAndVariants(t);
        synonyms.forEach((s) => {
          if (!isStopWord(s)) expandedSynonyms.add(s);
        });
      }
    });

    for (const token of queryTokens) {
      if (isStopWord(token)) continue;
      highlightTerms.add(token);
      const stemmed = stemBengaliToken(token);
      expandedStems.add(stemmed);
      if (stemmed && stemmed.length >= 2 && !isStopWord(stemmed)) {
        highlightTerms.add(stemmed);
      }

      const synonyms = getSynonymsAndVariants(token);
      synonyms.forEach((s) => {
        if (!isStopWord(s)) {
          expandedSynonyms.add(s);
          highlightTerms.add(s);
        }
      });

      const phonetic = encodeBengaliPhonetic(token);
      if (phonetic && phonetic.length >= 2) {
        expandedPhonetics.add(phonetic);
      }
    }

    const queryIsAblution =
      (transliterated.isBanglish && ['oju', 'ojoo', 'wudu', 'wuzu', 'wudhu'].some((w) => rawQuery.toLowerCase().includes(w)))
      || queryTokens.some((t) => isAblutionTerm(t));

    // Extract AI Semantic Intent (cached in memory & safe 3.5s timeout)
    const aiIntent = await extractSemanticFiqhIntent(rawQuery);
    if (aiIntent?.fiqhConcepts) {
      aiIntent.fiqhConcepts.forEach((ft) => {
        expandedSynonyms.add(ft);
        highlightTerms.add(ft);
      });
    }
    if (aiIntent?.essentialKeywords) {
      aiIntent.essentialKeywords.forEach((ek) => {
        expandedSynonyms.add(ek);
        highlightTerms.add(ek);
      });
    }

    const cleanFtsTerm = (t: string) => t.replace(/["*^:()\-/\\]/g, ' ').trim();

    const rawSubject = cleanFtsTerm(aiIntent?.coreSubject || '');
    const subjectTokens = rawSubject
      ? rawSubject.split(/[\s,.;:!?"'()\-–—\/\\]+/).map(cleanFtsTerm).filter((t) => t.length >= 2 && !isStopWord(t))
      : [];
    const subjectPool = Array.from(
      new Set([
        ...subjectTokens,
        ...subjectTokens.flatMap((t) => getSynonymsAndVariants(t)),
        ...(!isStopWord(rawSubject) && rawSubject.length >= 2 ? [rawSubject, ...getSynonymsAndVariants(rawSubject)] : []),
      ])
    )
      .map(cleanFtsTerm)
      .filter((t) => t.length >= 2 && !isStopWord(t));

    const rawAspect = cleanFtsTerm(aiIntent?.coreAspect || '');
    const rawAspectTokens = rawAspect
      ? rawAspect.split(/[\s,.;:!?"'()\-–—\/\\]+/).map(cleanFtsTerm).filter((t) => t.length >= 2 && !isStopWord(t))
      : [];
    const essentialTokens = (aiIntent?.essentialKeywords || [])
      .map(cleanFtsTerm)
      .filter((k) => k.length >= 2 && !isStopWord(k) && !subjectPool.includes(k));

    const aspectPool = Array.from(
      new Set([
        ...rawAspectTokens,
        ...essentialTokens,
        ...rawAspectTokens.flatMap((t) => getSynonymsAndVariants(t)),
        ...essentialTokens.flatMap((t) => getSynonymsAndVariants(t)),
      ])
    )
      .map(cleanFtsTerm)
      .filter((t) => t.length >= 2 && !isStopWord(t));

    const fiqhConcepts = (aiIntent?.fiqhConcepts || []).map(cleanFtsTerm).filter(Boolean);

    // 2. High-Precision FTS5 Query Construction
    let ftsMatch = '';
    const phraseClauses: string[] = [];
    const conjunctions: string[] = [];

    if (queryTokens.length >= 2) {
      const phrases: string[] = [
        cleanFtsTerm(primaryQuery),
        cleanFtsTerm(rawQuery),
        ...(aiIntent?.canonicalBengali ? [cleanFtsTerm(aiIntent.canonicalBengali)] : []),
        ...fiqhConcepts,
      ].filter((p) => p && p.length >= 2);

      phraseClauses.push(...Array.from(new Set(phrases)).map((p) => `"${p}"*`));

      // AI Subject + Aspect Conjunction (The Primary Legal Intent Bridge)
      if (subjectPool.length > 0 && aspectPool.length > 0) {
        const subjClause = '(' + subjectPool.slice(0, 8).map((s) => `"${s}"*`).join(' OR ') + ')';
        const aspectClause = '(' + aspectPool.slice(0, 8).map((a) => `"${a}"*`).join(' OR ') + ')';
        conjunctions.push(`(${subjClause} AND ${aspectClause})`);
      }

      // Special handling for common posture / ritual queries (e.g. Sijda + Sitting)
      const hasSijdaWord = queryTokens.some((t) => t.includes('সিজদ'));
      const hasBosaWord = queryTokens.some((t) => t.includes('বস') || t.includes('বৈঠক'));

      if (hasSijdaWord && hasBosaWord) {
        conjunctions.push('("সিজদা"* AND "বসা"*)');
        conjunctions.push('("সিজদা"* AND "বৈঠক"*)');
        conjunctions.push('("সিজদার"* AND "পর"*)');
        conjunctions.push('("দুই"* AND "সিজদা"*)');
      }

      // Lexical multi-token conjunction
      const mainTokens = queryTokens.slice(0, 3).map(cleanFtsTerm).filter((t) => t.length >= 2);
      if (mainTokens.length >= 2) {
        const groupAnd = mainTokens
          .map((t) => {
            const syns = getSynonymsAndVariants(t).slice(0, 4).map(cleanFtsTerm).filter((s) => s.length >= 2);
            return '(' + syns.map((s) => `"${s}"*`).join(' OR ') + ')';
          })
          .join(' AND ');
        conjunctions.push(`(${groupAnd})`);
      }
    } else {
      const single = cleanFtsTerm(queryTokens[0] || primaryQuery);
      const syns = getSynonymsAndVariants(single).slice(0, 8).map(cleanFtsTerm).filter(Boolean);
      phraseClauses.push(...syns.map((s) => `"${s}"*`));
    }

    // Filter clauses
    const whereClauses: string[] = ['fatwas_fts MATCH ?'];
    const filterParams: any[] = [''];

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

    // Precision-First Candidate Retrieval
    let candidateRows: Array<{ id: string; rank: number }> = [];

    if (conjunctions.length > 0) {
      ftsMatch = conjunctions.join(' OR ');
      filterParams[0] = ftsMatch;

      candidateRows = db.prepare(`
        SELECT fts.id, bm25(fatwas_fts, 5.0, 3.0, 1.0, 1.0, 1.0, 1.5) as rank
        FROM fatwas_fts fts
        JOIN fatwas f ON f.id = fts.id
        WHERE ${whereSql}
        ORDER BY rank
        LIMIT 150
      `).all(...filterParams) as Array<{ id: string; rank: number }>;
    }

    // Tier 2: If conjunction yielded 0 candidates, try phrase and keyword expansion (strictly filtering out stop words)
    if (candidateRows.length === 0) {
      const nonStopQueryTokens = queryTokens.filter((t) => !isStopWord(t) && t.length >= 2);
      const fallbackTokens = (subjectPool.length > 0 && aspectPool.length > 0
        ? [...subjectPool.slice(0, 4), ...aspectPool.slice(0, 4)]
        : nonStopQueryTokens.length > 0 ? nonStopQueryTokens : queryTokens
      )
        .map(cleanFtsTerm)
        .filter((t) => !isStopWord(t) && t.length >= 2)
        .map((t) => `"${t}"*`);

      const fallbackPool = [...phraseClauses, ...fallbackTokens];
      ftsMatch = Array.from(new Set(fallbackPool.filter(Boolean))).join(' OR ');
      if (!ftsMatch) {
        const single = cleanFtsTerm(nonStopQueryTokens[0] || queryTokens[0] || primaryQuery);
        ftsMatch = getSynonymsAndVariants(single)
          .map(cleanFtsTerm)
          .filter((s) => !isStopWord(s) && s.length >= 2)
          .slice(0, 8)
          .map((s) => `"${s}"*`)
          .join(' OR ');
      }

      filterParams[0] = ftsMatch;

      candidateRows = db.prepare(`
        SELECT fts.id, bm25(fatwas_fts, 5.0, 3.0, 1.0, 1.0, 1.0, 1.5) as rank
        FROM fatwas_fts fts
        JOIN fatwas f ON f.id = fts.id
        WHERE ${whereSql}
        ORDER BY rank
        LIMIT 100
      `).all(...filterParams) as Array<{ id: string; rank: number }>;
    }

    // Deduplicate candidate rows by id in memory
    const seenCandidateIds = new Set<string>();
    const uniqueCandidateRows: Array<{ id: string; rank: number }> = [];
    for (const row of candidateRows) {
      if (!seenCandidateIds.has(row.id)) {
        seenCandidateIds.add(row.id);
        uniqueCandidateRows.push(row);
      }
    }
    candidateRows = uniqueCandidateRows;

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

    const allFiqhTerms = [
      'জালসায়ে ইস্তিরাহাত',
      'ইস্তিরাহাত',
      'দুই সিজদার মধ্যবর্তী বৈঠক',
      'দুই সিজদার মাঝে বসা',
      'সিজদার পর বসা',
      'দুই সিজদার পর',
      ...fiqhConcepts,
    ].map((t) => t.toLowerCase());

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
      const qCombined = titleLower + ' ' + questionLower;
      const aCombined = answerLower;
      const matchedForDoc = new Set<string>();

      // 1. Exact full query phrase match
      if (titleLower.includes(normalizedQuery.toLowerCase()) || titleLower.includes(primaryQuery.toLowerCase())) {
        score += 240.0;
        matchedForDoc.add(primaryQuery);
      } else if (questionLower.includes(normalizedQuery.toLowerCase()) || questionLower.includes(primaryQuery.toLowerCase())) {
        score += 160.0;
        matchedForDoc.add(primaryQuery);
      }

      if (aiIntent?.canonicalBengali) {
        const canL = aiIntent.canonicalBengali.toLowerCase();
        if (titleLower.includes(canL)) {
          score += 260.0;
          matchedForDoc.add(aiIntent.canonicalBengali);
        } else if (questionLower.includes(canL)) {
          score += 180.0;
          matchedForDoc.add(aiIntent.canonicalBengali);
        }
      }

      // 2. AI Fiqh Concept Matches
      for (const term of allFiqhTerms) {
        if (titleLower.includes(term)) {
          score += 220.0;
          matchedForDoc.add(term);
        } else if (questionLower.includes(term)) {
          score += 160.0;
          matchedForDoc.add(term);
        } else if (answerLower.includes(term)) {
          score += 80.0;
          matchedForDoc.add(term);
        }
      }

      // 3. AI Subject & Aspect Co-occurrence Scoring (The Core Fiqh Intent Engine)
      if (subjectPool.length > 0 && aspectPool.length > 0) {
        const hasSubjInQ = subjectPool.some((s) => qCombined.includes(s.toLowerCase()));
        const hasSubjInA = subjectPool.some((s) => aCombined.includes(s.toLowerCase()));
        const hasAspectInQ = aspectPool.some((a) => qCombined.includes(a.toLowerCase()));
        const hasAspectInA = aspectPool.some((a) => aCombined.includes(a.toLowerCase()));

        if (hasSubjInQ && hasAspectInQ) {
          // Both subject and specific fiqh issue are explicitly present in the question/title
          score += 420.0;
        } else if (hasSubjInQ && hasAspectInA) {
          // Question sets the subject context, and the fatwa answer directly resolves the issue
          score += 300.0;
        } else if (hasAspectInQ && hasSubjInA) {
          score += 280.0;
        } else if (hasSubjInA && hasAspectInA) {
          score += 180.0;
        } else if (hasSubjInQ && !hasAspectInQ && !hasAspectInA && queryTokens.length >= 2) {
          // Matched subject only (e.g. random Roza fatwa without injection) -> suppress false positives
          score *= 0.12;
        } else if (hasAspectInQ && !hasSubjInQ && !hasSubjInA && queryTokens.length >= 2) {
          score *= 0.25;
        }
      }

      // 4. Check token and synonym matches & coverage
      let matchedTokensCount = 0;
      for (const token of queryTokens) {
        if (titleLower.includes(token)) {
          score += 40.0;
          matchedTokensCount++;
          matchedForDoc.add(token);
        } else if (questionLower.includes(token)) {
          score += 22.0;
          matchedTokensCount++;
          matchedForDoc.add(token);
        } else if (answerLower.includes(token)) {
          score += 8.0;
        }
      }

      if (queryTokens.length > 0) {
        const coverageRatio = matchedTokensCount / queryTokens.length;
        score += coverageRatio * 90.0;
      }

      for (const syn of expandedSynonyms) {
        if (titleLower.includes(syn)) {
          score += 30.0;
          matchedForDoc.add(syn);
        } else if (questionLower.includes(syn)) {
          score += 14.0;
          matchedForDoc.add(syn);
        } else if (answerLower.includes(syn)) {
          score += 4.0;
          matchedForDoc.add(syn);
        }
      }

      // 5. Co-occurrence of Subject and Action for posture queries (e.g. Sijda + Sitting)
      const hasSijda = titleLower.includes('সিজদা') || questionLower.includes('সিজদা');
      const hasBosa =
        titleLower.includes('বসা') ||
        questionLower.includes('বসা') ||
        titleLower.includes('বৈঠক') ||
        questionLower.includes('বৈঠক') ||
        titleLower.includes('ইস্তিরাহ') ||
        questionLower.includes('ইস্তিরাহ') ||
        answerLower.includes('ইস্তিরাহ');
      const hasPor =
        titleLower.includes('পর') ||
        questionLower.includes('পর') ||
        titleLower.includes('মাঝে') ||
        questionLower.includes('মাঝে');

      if (hasSijda && hasBosa && hasPor) {
        score += 160.0;
      } else if (hasSijda && hasBosa) {
        score += 100.0;
      } else if (hasSijda && !hasBosa && queryTokens.some((t) => t.includes('বস') || t.includes('বৈঠক'))) {
        score = score * 0.15;
      }

      // 6. Phonetic matching
      const docPhonetics = extractPhoneticTokens(doc.title + ' ' + (doc.question || '').slice(0, 100));
      for (const p of expandedPhonetics) {
        if (docPhonetics.includes(p)) {
          score += 18.0;
        }
      }

      // 7. Ablution disambiguation & false-positive suppression
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
