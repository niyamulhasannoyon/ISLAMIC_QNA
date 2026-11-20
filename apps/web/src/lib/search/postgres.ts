import { FatwaQA, SearchQueryOptions, SearchResponse, SearchResultItem, SearchFacets, FatwaSource } from '@/types/fatwa';
import { SearchEngine } from './types';
import { getPostgresPool } from '../db/postgres';
import { generateHighlightedSnippet } from './local';
import { embed } from './embedder';
import { reciprocalRankFusion } from './rrf';
import {
  normalizeBengaliText,
  stemBengaliToken,
  getCanonicalTerm,
  expandSynonyms,
  isStopWord,
} from '@repo/text-utils';
import { transliterateQuery } from './transliterate';

export type QueryIntentType = 'exact-question' | 'banglish' | 'topic-keyword';

/**
 * Detects search query intent based on linguistic markers and script.
 */
export function detectQueryIntent(query: string): QueryIntentType {
  const trimmed = query.trim();
  if (!trimmed) return 'topic-keyword';

  // Exact question: ends with ?, contains question particles 'কি', 'কী', 'কেন', 'কিভাবে'
  const isQuestion =
    trimmed.endsWith('?') ||
    trimmed.endsWith('？') ||
    trimmed.endsWith('।') ||
    /\b(কি|কী|কেন|কিভাবে|কীভাবে|কখন|কোথায়|কোথায়|হুকুম|বিধান)\b/u.test(trimmed);

  if (isQuestion) return 'exact-question';

  // Banglish / English transliteration: majority Latin letters
  const latinMatches = trimmed.match(/[a-zA-Z]/g);
  const bengaliMatches = trimmed.match(/[\u0980-\u09FF]/g);
  const arabicMatches = trimmed.match(/[\u0600-\u06FF]/g);

  const latinCount = latinMatches ? latinMatches.length : 0;
  const nativeCount = (bengaliMatches ? bengaliMatches.length : 0) + (arabicMatches ? arabicMatches.length : 0);

  if (latinCount > nativeCount && latinCount >= 3) {
    return 'banglish';
  }

  return 'topic-keyword';
}

function formatTsqueryCandidate(raw: string): string {
  const words = raw
    .replace(/['&|!():*<>-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  if (words.length === 0) return '';
  if (words.length === 1) {
    return words[0].length >= 3 ? `${words[0]}:*` : words[0];
  }
  return '(' + words.map((w) => (w.length >= 3 ? `${w}:*` : w)).join(' <-> ') + ')';
}

/**
 * Normalizes query string and resolves synonyms, stems, and transliterations
 * into an optimized list of search tokens for PostgreSQL to_tsquery.
 */
export function processQueryTokens(
  rawQuery: string,
  intent: QueryIntentType
): {
  normalizedQuery: string;
  tokens: string[];
  matchedTerms: string[];
  andTsQuery: string;
  orTsQuery: string;
} {
  let queryText = rawQuery;

  // Handle Banglish transliteration
  if (intent === 'banglish') {
    // First check if any word directly matches our synonym registry
    const rawTokens = queryText.toLowerCase().split(/\s+/).filter(Boolean);
    let hasSynonymMatch = false;
    const convertedTokens: string[] = [];

    for (const tok of rawTokens) {
      if (isStopWord(tok)) continue;
      const canonical = getCanonicalTerm(tok);
      if (canonical !== tok) {
        hasSynonymMatch = true;
        convertedTokens.push(canonical);
      } else {
        convertedTokens.push(tok);
      }
    }

    if (hasSynonymMatch) {
      queryText = convertedTokens.join(' ');
    } else {
      const transliterated = transliterateQuery(queryText);
      const translitText = transliterated.primaryBengali || '';
      queryText = translitText ? `${convertedTokens.join(' ')} ${translitText}` : convertedTokens.join(' ');
    }
  }

  const normalizedQuery = normalizeBengaliText(queryText);
  const rawWords = normalizedQuery.split(/[\s,.;:!?"'()\[\]{}।\\/\-_–—+*=<>#@%^&|~`]+/u).filter(Boolean);

  const nonStopWords = rawWords.filter((w) => !isStopWord(w));
  const activeWords = nonStopWords.length > 0 ? nonStopWords : rawWords;

  const tokenClauses: string[] = [];
  const matchedTermsSet = new Set<string>();

  // Add original query terms for snippet highlighting
  rawWords.forEach((w) => matchedTermsSet.add(w));

  for (const word of activeWords) {
    const directStemmed = stemBengaliToken(word);
    const directCanonical = getCanonicalTerm(word);
    const stemmedCanonical = getCanonicalTerm(directStemmed);
    const canonical =
      directCanonical !== word
        ? directCanonical
        : stemmedCanonical !== directStemmed
        ? stemmedCanonical
        : directCanonical;
    const stemmed = stemBengaliToken(canonical);
    const variants = expandSynonyms(canonical);

    // Collect terms for regex highlighting
    matchedTermsSet.add(word);
    matchedTermsSet.add(canonical);
    if (stemmed.length >= 2) matchedTermsSet.add(stemmed);
    if (directStemmed.length >= 2) matchedTermsSet.add(directStemmed);
    variants.forEach((v) => {
      if (v.length >= 2) matchedTermsSet.add(v);
    });

    // Build tsquery group for this word
    const candidates = new Set<string>();
    candidates.add(canonical);
    if (stemmed !== canonical && stemmed.length >= 2) {
      candidates.add(stemmed);
    }
    // Also include original word if different
    if (word !== canonical) {
      candidates.add(word);
    }
    if (directStemmed.length >= 2 && directStemmed !== canonical) {
      candidates.add(directStemmed);
    }
    // Add top single-word synonym variants to expand lexical recall
    variants.slice(0, 8).forEach((v) => {
      if (v.length >= 2) {
        candidates.add(v);
      }
    });

    const subClauses = Array.from(candidates)
      .map(formatTsqueryCandidate)
      .filter(Boolean);

    if (subClauses.length > 0) {
      tokenClauses.push(`(${subClauses.join(' | ')})`);
    }
  }

  const andTsQuery = tokenClauses.length > 0 ? tokenClauses.join(' & ') : '';
  const orTsQuery = tokenClauses.length > 0 ? tokenClauses.join(' | ') : '';

  return {
    normalizedQuery,
    tokens: activeWords,
    matchedTerms: Array.from(matchedTermsSet).filter((t) => t.length >= 2),
    andTsQuery,
    orTsQuery,
  };
}

export class PostgresSearchEngine implements SearchEngine {
  name = 'postgres';

  async init(): Promise<void> {
    const pool = getPostgresPool();
    const res = await pool.query('SELECT 1');
    if (!res) throw new Error('Failed to connect to PostgreSQL database');
  }

  async indexDocuments(docs: FatwaQA[]): Promise<void> {
    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const doc of docs) {
        const titleTokens = normalizeBengaliText(doc.title);
        const tagsTokens = normalizeBengaliText(doc.tags.join(' '));
        const questionTokens = normalizeBengaliText(doc.question);
        const categoryTokens = normalizeBengaliText(doc.category);
        const answerTokens = normalizeBengaliText((doc.answer || '').slice(0, 3000));

        await client.query(
          `
          INSERT INTO fatwas (
            id, source, source_url, title, question, answer, category, tags, scholar,
            published_date, sha256_hash, scraped_at, created_at, updated_at, tsv
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            setweight(to_tsvector('simple', $15), 'A') ||
            setweight(to_tsvector('simple', $16), 'B') ||
            setweight(to_tsvector('simple', $17), 'B') ||
            setweight(to_tsvector('simple', $18), 'C') ||
            setweight(to_tsvector('simple', $19), 'D')
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            question = EXCLUDED.question,
            answer = EXCLUDED.answer,
            category = EXCLUDED.category,
            tags = EXCLUDED.tags,
            scholar = EXCLUDED.scholar,
            tsv = EXCLUDED.tsv,
            updated_at = EXCLUDED.updated_at
        `,
          [
            doc.id,
            doc.source,
            doc.source_url,
            doc.title,
            doc.question,
            doc.answer,
            doc.category,
            JSON.stringify(doc.tags),
            doc.scholar || '',
            doc.published_date || '',
            doc.sha256_hash || '',
            doc.scraped_at || '',
            doc.created_at || new Date().toISOString(),
            doc.updated_at || new Date().toISOString(),
            titleTokens,
            tagsTokens,
            questionTokens,
            categoryTokens,
            answerTokens,
          ]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async search(options: SearchQueryOptions): Promise<SearchResponse> {
    const startTime = Date.now();
    const pool = getPostgresPool();

    const rawQuery = (options.q || '').trim();
    const sourceFilter = options.source && options.source !== 'All' ? options.source : null;
    const categoryFilter = options.category && options.category !== 'All' ? options.category : null;
    const scholarFilter = options.scholar && options.scholar !== 'All' ? options.scholar : null;
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const offset = (page - 1) * limit;

    // Default response for empty query: browse recent
    if (!rawQuery) {
      return this.browseRecent({ sourceFilter, categoryFilter, scholarFilter, page, limit, offset, startTime });
    }

    const intent = detectQueryIntent(rawQuery);
    const { normalizedQuery, tokens, matchedTerms, andTsQuery, orTsQuery } = processQueryTokens(rawQuery, intent);

    // ── 1. Lexical Search (AND first, fallback to OR, fallback to Trigram) ──
    let lexicalDocs: any[] = [];
    const params: any[] = [];
    let filterClauses: string[] = [];

    if (sourceFilter) {
      params.push(sourceFilter);
      filterClauses.push(`source = $${params.length}`);
    }
    if (categoryFilter) {
      params.push(categoryFilter);
      filterClauses.push(`category = $${params.length}`);
    }
    if (scholarFilter) {
      params.push(scholarFilter);
      filterClauses.push(`scholar = $${params.length}`);
    }

    const filterSql = filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : '';

    if (andTsQuery) {
      const qParams = [...params, andTsQuery, normalizedQuery];
      const andSql = `
        SELECT
          id, source, source_url, title, question, answer, category, tags, scholar,
          published_date, sha256_hash, scraped_at, created_at, updated_at,
          ts_rank_cd('{0.1, 0.2, 0.4, 1.0}', tsv, to_tsquery('simple', $${qParams.length - 1})) +
          (CASE WHEN title ILIKE '%' || $${qParams.length} || '%' THEN 3.0 ELSE 0.0 END) +
          (similarity(title, $${qParams.length}) * 1.5) as score
        FROM fatwas
        WHERE tsv @@ to_tsquery('simple', $${qParams.length - 1}) ${filterSql}
        ORDER BY score DESC
        LIMIT 50;
      `;

      try {
        const { rows } = await pool.query(andSql, qParams);
        lexicalDocs = rows;
      } catch (err) {
        console.warn('[PostgresSearchEngine] AND query execution error:', err);
      }
    }

    // If AND query returned fewer than 5 hits, try OR query
    if (lexicalDocs.length < 5 && orTsQuery && orTsQuery !== andTsQuery) {
      const existingIds = new Set(lexicalDocs.map((d) => d.id));
      const qParams = [...params, orTsQuery, normalizedQuery];
      const orSql = `
        SELECT
          id, source, source_url, title, question, answer, category, tags, scholar,
          published_date, sha256_hash, scraped_at, created_at, updated_at,
          ts_rank_cd('{0.1, 0.2, 0.4, 1.0}', tsv, to_tsquery('simple', $${qParams.length - 1})) +
          (CASE WHEN title ILIKE '%' || $${qParams.length} || '%' THEN 2.0 ELSE 0.0 END) +
          (similarity(title, $${qParams.length}) * 1.5) as score
        FROM fatwas
        WHERE tsv @@ to_tsquery('simple', $${qParams.length - 1}) ${filterSql}
        ORDER BY score DESC
        LIMIT 50;
      `;

      try {
        const { rows } = await pool.query(orSql, qParams);
        for (const row of rows) {
          if (!existingIds.has(row.id)) {
            lexicalDocs.push(row);
            existingIds.add(row.id);
          }
        }
      } catch (err) {
        console.warn('[PostgresSearchEngine] OR query execution error:', err);
      }
    }

    // If still fewer than 5 hits, use pg_trgm fuzzy matching on title / question
    if (lexicalDocs.length < 5 && normalizedQuery.length >= 4) {
      const existingIds = new Set(lexicalDocs.map((d) => d.id));
      const qParams = [...params, normalizedQuery];
      const trgmSql = `
        SELECT
          id, source, source_url, title, question, answer, category, tags, scholar,
          published_date, sha256_hash, scraped_at, created_at, updated_at,
          (similarity(title, $${qParams.length}) * 2.0 + similarity(question, $${qParams.length})) as score
        FROM fatwas
        WHERE (similarity(title, $${qParams.length}) > 0.2 OR similarity(question, $${qParams.length}) > 0.2)
          ${filterSql}
        ORDER BY score DESC
        LIMIT 25;
      `;

      try {
        const { rows } = await pool.query(trgmSql, qParams);
        for (const row of rows) {
          if (!existingIds.has(row.id)) {
            lexicalDocs.push(row);
            existingIds.add(row.id);
          }
        }
      } catch (err) {
        console.warn('[PostgresSearchEngine] Trigram query execution error:', err);
      }
    }

    // ── 2. Semantic Vector Search (pgvector HNSW) ──────────────────────
    let semanticDocs: any[] = [];
    try {
      const queryVector = await embed(rawQuery);
      if (queryVector) {
        const vectorStr = `[${queryVector.join(',')}]`;
        const vParams = [...params, vectorStr];
        const vecSql = `
          SELECT
            id, source, source_url, title, question, answer, category, tags, scholar,
            published_date, sha256_hash, scraped_at, created_at, updated_at,
            (1 - (embedding <=> $${vParams.length})) as score
          FROM fatwas
          WHERE embedding IS NOT NULL ${filterSql}
          ORDER BY embedding <=> $${vParams.length}
          LIMIT 50;
        `;
        const { rows } = await pool.query(vecSql, vParams);
        semanticDocs = rows;
      }
    } catch (err) {
      console.warn('[PostgresSearchEngine] Semantic vector search skipped or failed:', err);
    }

    // ── 3. Hybrid Reciprocal Rank Fusion (k=60) ────────────────────────
    const fusedResults = reciprocalRankFusion(lexicalDocs, semanticDocs, {
      k: 60,
      lexicalWeight: 1.0,
      semanticWeight: 1.0,
    });

    // ── 4. "Did You Mean" Suggestion (when results < 3) ────────────────
    let didYouMean: string | undefined = undefined;
    if (fusedResults.length < 3 && normalizedQuery.length >= 3) {
      try {
        const dymRes = await pool.query(
          `
          SELECT title, similarity(title, $1) as sim
          FROM fatwas
          WHERE similarity(title, $1) > 0.25 AND similarity(title, $1) < 0.99
          ORDER BY sim DESC
          LIMIT 1;
        `,
          [normalizedQuery]
        );
        if (dymRes.rows.length > 0) {
          const suggestedTitle = dymRes.rows[0].title;
          didYouMean = suggestedTitle;
        }
      } catch (dymErr) {
        // Non-blocking
      }
    }

    // ── 5. Pagination & Snippet Generation ─────────────────────────────
    const total = fusedResults.length;
    const paginatedDocs = fusedResults.slice(offset, offset + limit);

    const results: SearchResultItem[] = paginatedDocs.map((doc) => {
      let tagsArr: string[] = [];
      try {
        tagsArr = typeof doc.tags === 'string' ? JSON.parse(doc.tags) : doc.tags || [];
      } catch {
        tagsArr = [];
      }

      const snippet = generateHighlightedSnippet(doc.answer || '', matchedTerms, 220);
      const titleSnippet = generateHighlightedSnippet(doc.title || '', matchedTerms, 120);

      return {
        id: doc.id,
        source: doc.source as FatwaSource,
        source_url: doc.source_url,
        title: doc.title,
        question: doc.question,
        answer: doc.answer,
        category: doc.category,
        tags: tagsArr,
        scholar: doc.scholar || '',
        published_date: doc.published_date || '',
        sha256_hash: doc.sha256_hash || '',
        scraped_at: doc.scraped_at || '',
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        score: doc.score || 0,
        snippet,
        titleSnippet,
        matchedTerms,
        debug: doc.debug,
      };
    });

    // ── 6. Dynamic Facets ──────────────────────────────────────────────
    const facets = await this.getFacets();

    const tookMs = Date.now() - startTime;

    return {
      results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      tookMs,
      engine: 'postgres',
      facets,
      didYouMean,
      semanticIntent: {
        fiqh_intent: intent,
        fiqh_category: categoryFilter || 'General',
        technical_fiqh_terms: matchedTerms.slice(0, 5),
        expanded_keywords: matchedTerms,
        optimized_search_query: andTsQuery || orTsQuery || rawQuery,
      },
    };
  }

  private async browseRecent(params: {
    sourceFilter: string | null;
    categoryFilter: string | null;
    scholarFilter: string | null;
    page: number;
    limit: number;
    offset: number;
    startTime: number;
  }): Promise<SearchResponse> {
    const pool = getPostgresPool();
    const filterClauses: string[] = [];
    const sqlParams: any[] = [];

    if (params.sourceFilter) {
      sqlParams.push(params.sourceFilter);
      filterClauses.push(`source = $${sqlParams.length}`);
    }
    if (params.categoryFilter) {
      sqlParams.push(params.categoryFilter);
      filterClauses.push(`category = $${sqlParams.length}`);
    }
    if (params.scholarFilter) {
      sqlParams.push(params.scholarFilter);
      filterClauses.push(`scholar = $${sqlParams.length}`);
    }

    const whereClause = filterClauses.length > 0 ? `WHERE ${filterClauses.join(' AND ')}` : '';

    const countRes = await pool.query(`SELECT count(*) FROM fatwas ${whereClause}`, sqlParams);
    const total = parseInt(countRes.rows[0].count, 10);

    const queryParams = [...sqlParams, params.limit, params.offset];
    const selectSql = `
      SELECT id, source, source_url, title, question, answer, category, tags, scholar,
             published_date, sha256_hash, scraped_at, created_at, updated_at
      FROM fatwas
      ${whereClause}
      ORDER BY id ASC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length};
    `;

    const { rows } = await pool.query(selectSql, queryParams);

    const results: SearchResultItem[] = rows.map((doc) => {
      let tagsArr: string[] = [];
      try {
        tagsArr = typeof doc.tags === 'string' ? JSON.parse(doc.tags) : doc.tags || [];
      } catch {
        tagsArr = [];
      }
      return {
        id: doc.id,
        source: doc.source as FatwaSource,
        source_url: doc.source_url,
        title: doc.title,
        question: doc.question,
        answer: doc.answer,
        category: doc.category,
        tags: tagsArr,
        scholar: doc.scholar || '',
        published_date: doc.published_date || '',
        sha256_hash: doc.sha256_hash || '',
        scraped_at: doc.scraped_at || '',
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        score: 1.0,
        snippet: generateHighlightedSnippet(doc.answer || '', [], 220),
        matchedTerms: [],
      };
    });

    const facets = await this.getFacets();

    return {
      results,
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit) || 1,
      tookMs: Date.now() - params.startTime,
      engine: 'postgres',
      facets,
    };
  }

  private cachedFacets: SearchFacets | null = null;
  private lastFacetFetch: number = 0;
  private readonly FACET_TTL: number = 5 * 60 * 1000; // 5 minutes

  private async getFacets(): Promise<SearchFacets> {
    const now = Date.now();
    if (this.cachedFacets && now - this.lastFacetFetch < this.FACET_TTL) {
      return this.cachedFacets;
    }

    const pool = getPostgresPool();
    try {
      const [sourcesRes, categoriesRes, scholarsRes] = await Promise.all([
        pool.query(`SELECT source as name, count(*)::int as count FROM fatwas GROUP BY source ORDER BY count DESC`),
        pool.query(
          `SELECT category as name, count(*)::int as count FROM fatwas WHERE category != '' GROUP BY category ORDER BY count DESC LIMIT 30`
        ),
        pool.query(
          `SELECT scholar as name, count(*)::int as count FROM fatwas WHERE scholar != '' GROUP BY scholar ORDER BY count DESC LIMIT 20`
        ),
      ]);

      this.cachedFacets = {
        sources: sourcesRes.rows,
        categories: categoriesRes.rows,
        scholars: scholarsRes.rows,
      };
      this.lastFacetFetch = now;
      return this.cachedFacets;
    } catch {
      return (
        this.cachedFacets || {
          sources: [],
          categories: [],
          scholars: [],
        }
      );
    }
  }
}
