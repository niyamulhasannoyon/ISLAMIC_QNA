import { FatwaQA, SearchQueryOptions, SearchResponse, SearchResultItem, FiqhSemanticAnalysis } from '@/types/fatwa';
import { SearchEngine } from './types';
import { transliterateQuery } from './transliterate';
import { getSynonymsAndVariants } from './synonyms';
import { normalizeBengaliText, stemBengaliToken, isStopWord } from './normalizer';
import { getMongoDb, isMongoConfigured, getFacetsMongo } from '../db/mongodb';
import { generateHighlightedSnippet } from './local';
import { escapeRegExp } from '../utils';
import { extractSemanticFiqhIntent } from '../ai/semantic';

export class MongoAtlasSearchEngine implements SearchEngine {
  public name = 'MongoDB Atlas Search (Bengali Analyzer)';
  private uri: string;

  constructor() {
    this.uri = process.env.MONGODB_URI || '';
  }

  public async init(): Promise<void> {
    if (!isMongoConfigured()) return;
    const db = await getMongoDb();
    if (!db) return;
    const collection = db.collection('fatwas');
    await collection.createIndex({ sha256_hash: 1 }, { unique: true });
    await collection.createIndex({ source_url: 1 });
    await collection.createIndex({ source: 1, published_date: -1 });
    await collection.createIndex({ category: 1 });
    await collection.createIndex({ scholar: 1 });
  }

  public async indexDocuments(docs: FatwaQA[]): Promise<void> {
    const db = await getMongoDb();
    if (!db || docs.length === 0) return;
    const collection = db.collection('fatwas');
    const batchSize = 500;
    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      const bulkOps = chunk.map((item) => ({
        updateOne: {
          filter: { sha256_hash: item.sha256_hash },
          update: {
            $set: {
              id: item.id,
              source: item.source,
              source_url: item.source_url,
              title: item.title,
              question: item.question,
              answer: item.answer,
              category: item.category,
              tags: item.tags,
              scholar: item.scholar,
              published_date: item.published_date,
              scraped_at: item.scraped_at,
              updated_at: item.updated_at,
            },
            $setOnInsert: {
              _id: item.id as any,
              sha256_hash: item.sha256_hash,
              created_at: item.created_at,
            },
          },
          upsert: true,
        },
      }));
      await collection.bulkWrite(bulkOps, { ordered: false });
    }
  }

  /**
   * Generates MongoDB Atlas Search aggregation pipeline for Bengali full-text search
   */
  public buildAtlasSearchPipeline(options: SearchQueryOptions, aiIntent?: FiqhSemanticAnalysis | null): any[] {
    const rawQuery = (options.q || '').trim();
    const transliterated = transliterateQuery(rawQuery);
    const primaryQuery = transliterated.primaryBengali || rawQuery;
    const normalized = normalizeBengaliText(primaryQuery);
    const synonyms = normalized.split(/\s+/).flatMap((t) => getSynonymsAndVariants(t));
    const aiTerms = [
      ...(aiIntent?.technical_fiqh_terms || []),
      ...(aiIntent?.expanded_keywords || []),
    ];
    const finalSearchQuery = Array.from(
      new Set([normalized, ...transliterated.expandedTerms, ...synonyms.slice(0, 5), ...aiTerms.slice(0, 6)])
    ).join(' ');

    const shouldClauses: any[] = [];
    const filterClauses: any[] = [];

    if (finalSearchQuery) {
      shouldClauses.push({
        text: {
          query: finalSearchQuery,
          path: 'title',
          score: { boost: { value: 4.5 } },
          fuzzy: { maxEdits: 1 },
        },
      });
      shouldClauses.push({
        text: {
          query: finalSearchQuery,
          path: 'question',
          score: { boost: { value: 2.5 } },
          fuzzy: { maxEdits: 1 },
        },
      });
      shouldClauses.push({
        text: {
          query: finalSearchQuery,
          path: 'answer',
          score: { boost: { value: 1.0 } },
        },
      });
      shouldClauses.push({
        autocomplete: {
          query: finalSearchQuery,
          path: 'title',
          score: { boost: { value: 2.0 } },
        },
      });

      // Boost specific classical Islamic jurisprudence concepts
      if (aiIntent?.technical_fiqh_terms && aiIntent.technical_fiqh_terms.length > 0) {
        shouldClauses.push({
          text: {
            query: aiIntent.technical_fiqh_terms.join(' '),
            path: ['title', 'question'],
            score: { boost: { value: 6.0 } },
          },
        });
      }
    }

    if (options.source && options.source !== 'All') {
      filterClauses.push({
        phrase: {
          query: options.source.toLowerCase(),
          path: 'source',
        },
      });
    }

    if (options.category && options.category !== 'All') {
      filterClauses.push({
        phrase: {
          query: options.category,
          path: 'category',
        },
      });
    }

    if (options.scholar && options.scholar !== 'All') {
      filterClauses.push({
        phrase: {
          query: options.scholar,
          path: 'scholar',
        },
      });
    }

    const compound: any = {};
    if (shouldClauses.length > 0) {
      compound.should = shouldClauses;
      compound.minimumShouldMatch = 1;
    }
    if (filterClauses.length > 0) {
      compound.filter = filterClauses;
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));

    return [
      {
        $search: {
          index: 'fatwa_bengali_index',
          compound,
          highlight: {
            path: ['title', 'question', 'answer'],
          },
        },
      },
      {
        $project: {
          score: { $meta: 'searchScore' },
          highlights: { $meta: 'searchHighlights' },
          id: 1,
          source: 1,
          source_url: 1,
          title: 1,
          question: 1,
          answer: 1,
          category: 1,
          tags: 1,
          scholar: 1,
          published_date: 1,
          sha256_hash: 1,
          scraped_at: 1,
        },
      },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];
  }

  public async search(options: SearchQueryOptions): Promise<SearchResponse> {
    const startTime = Date.now();

    if (!isMongoConfigured()) {
      const { LocalBengaliSearchEngine } = await import('./local');
      const local = new LocalBengaliSearchEngine();
      return local.search(options);
    }

    const db = await getMongoDb();
    if (!db) {
      const { LocalBengaliSearchEngine } = await import('./local');
      const local = new LocalBengaliSearchEngine();
      return local.search(options);
    }

    const collection = db.collection('fatwas');
    const rawQuery = (options.q || '').trim();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const sourceFilter = options.source && options.source !== 'All' ? options.source.toLowerCase() : undefined;
    const categoryFilter = options.category && options.category !== 'All' ? options.category : undefined;
    const scholarFilter = options.scholar && options.scholar !== 'All' ? options.scholar : undefined;

    // 1. Browse mode (empty query)
    if (!rawQuery) {
      const filter: any = {};
      if (sourceFilter) filter.source = sourceFilter;
      if (categoryFilter) filter.category = categoryFilter;
      if (scholarFilter) filter.scholar = { $regex: escapeRegExp(scholarFilter), $options: 'i' };

      const [total, docs, facets] = await Promise.all([
        collection.countDocuments(filter),
        collection
          .find(filter)
          .sort({ published_date: -1, created_at: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        getFacetsMongo(),
      ]);

      const results: SearchResultItem[] = docs.map((doc: any) => ({
        id: doc.id || String(doc._id),
        source: doc.source,
        source_url: doc.source_url || '',
        title: doc.title || '',
        question: doc.question || '',
        answer: doc.answer || '',
        category: doc.category || 'General',
        tags: Array.isArray(doc.tags) ? doc.tags : [],
        scholar: doc.scholar || '',
        published_date: doc.published_date || doc.created_at || '',
        sha256_hash: doc.sha256_hash || '',
        scraped_at: doc.scraped_at || '',
        created_at: doc.created_at || '',
        updated_at: doc.updated_at || '',
        score: 1.0,
        snippet: generateHighlightedSnippet(doc.answer || doc.question, []),
        titleSnippet: doc.title || '',
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
        facets,
      };
    }

    // 2. Search query processing & expansion
    const aiIntent = await extractSemanticFiqhIntent(rawQuery);

    const transliterated = transliterateQuery(rawQuery);
    const primaryQuery = transliterated.primaryBengali || rawQuery;
    const normalizedQuery = normalizeBengaliText(primaryQuery);

    const rawTokens = normalizedQuery.split(/[\s,.;:!?"'()\-–—\/\\]+/).filter(Boolean);
    const nonStopTokens = rawTokens.filter((t) => !isStopWord(t));
    const queryTokens = nonStopTokens.length > 0 ? nonStopTokens : rawTokens;

    const expandedSynonyms = new Set<string>();
    const highlightTerms = new Set<string>();

    if (aiIntent?.technical_fiqh_terms) {
      aiIntent.technical_fiqh_terms.forEach((ft) => {
        expandedSynonyms.add(ft);
        highlightTerms.add(ft);
      });
    }
    if (aiIntent?.expanded_keywords) {
      aiIntent.expanded_keywords.forEach((ek) => {
        expandedSynonyms.add(ek);
        highlightTerms.add(ek);
      });
    }

    transliterated.expandedTerms.forEach((t) => {
      if (!isStopWord(t) && t.length >= 2) {
        highlightTerms.add(t);
        getSynonymsAndVariants(t).forEach((s) => {
          if (!isStopWord(s)) expandedSynonyms.add(s);
        });
      }
    });

    for (const token of queryTokens) {
      if (isStopWord(token)) continue;
      highlightTerms.add(token);
      const stemmed = stemBengaliToken(token);
      if (stemmed && stemmed.length >= 2 && !isStopWord(stemmed)) {
        highlightTerms.add(stemmed);
      }
      getSynonymsAndVariants(token).forEach((s) => {
        if (!isStopWord(s)) {
          expandedSynonyms.add(s);
          highlightTerms.add(s);
        }
      });
    }

    let docs: any[] = [];
    let total = 0;
    let usedAtlasSearch = false;

    // Try Atlas Search aggregation pipeline
    try {
      const pipeline = this.buildAtlasSearchPipeline(options, aiIntent);
      const aggResults = await collection.aggregate(pipeline).toArray();
      if (aggResults && aggResults.length > 0) {
        docs = aggResults;
        total = aggResults.length >= limit ? limit * page + 1 : (page - 1) * limit + aggResults.length;
        usedAtlasSearch = true;
      }
    } catch (atlasErr) {
      usedAtlasSearch = false;
    }

    // Resilient Regex Fallback
    if (!usedAtlasSearch) {
      const searchTerms = Array.from(
        new Set([
          primaryQuery,
          normalizedQuery,
          ...queryTokens,
          ...Array.from(expandedSynonyms).slice(0, 8),
        ])
      ).filter((t) => t && t.length >= 2);

      const regexParts = searchTerms.map(escapeRegExp);
      const orConditions: any[] = [];
      if (regexParts.length > 0) {
        const regexStr = regexParts.join('|');
        orConditions.push(
          { title: { $regex: regexStr, $options: 'i' } },
          { question: { $regex: regexStr, $options: 'i' } },
          { answer: { $regex: regexStr, $options: 'i' } }
        );
      }

      const filter: any = {};
      if (orConditions.length > 0) filter.$or = orConditions;
      if (sourceFilter) filter.source = sourceFilter;
      if (categoryFilter) filter.category = categoryFilter;
      if (scholarFilter) filter.scholar = { $regex: escapeRegExp(scholarFilter), $options: 'i' };

      const candidateDocs = await collection.find(filter).limit(150).toArray();
      total = candidateDocs.length;

      const scoredDocs = candidateDocs.map((doc: any) => {
        let score = 50.0;
        const titleLower = (doc.title || '').toLowerCase();
        const questionLower = (doc.question || '').toLowerCase();
        const answerLower = (doc.answer || '').toLowerCase();
        const matched = new Set<string>();

        if (titleLower.includes(normalizedQuery.toLowerCase()) || titleLower.includes(primaryQuery.toLowerCase())) {
          score += 200.0;
          matched.add(primaryQuery);
        } else if (questionLower.includes(normalizedQuery.toLowerCase()) || questionLower.includes(primaryQuery.toLowerCase())) {
          score += 120.0;
          matched.add(primaryQuery);
        }

        for (const token of queryTokens) {
          if (titleLower.includes(token)) {
            score += 35.0;
            matched.add(token);
          } else if (questionLower.includes(token)) {
            score += 20.0;
            matched.add(token);
          } else if (answerLower.includes(token)) {
            score += 8.0;
            matched.add(token);
          }
        }

        for (const syn of expandedSynonyms) {
          if (titleLower.includes(syn)) {
            score += 25.0;
            matched.add(syn);
          } else if (questionLower.includes(syn)) {
            score += 12.0;
            matched.add(syn);
          }
        }

        // High-Priority Technical Fiqh Term Matches (Highest Domain Weight)
        if (aiIntent?.technical_fiqh_terms) {
          for (const term of aiIntent.technical_fiqh_terms) {
            const tLower = term.toLowerCase();
            if (titleLower.includes(tLower)) {
              score += 350.0;
              matched.add(term);
            } else if (questionLower.includes(tLower)) {
              score += 260.0;
              matched.add(term);
            } else if (answerLower.includes(tLower)) {
              score += 120.0;
              matched.add(term);
            }
          }
        }

        return {
          doc,
          score,
          matchedTerms: Array.from(matched),
        };
      });

      scoredDocs.sort((a, b) => b.score - a.score);
      docs = scoredDocs.slice(skip, skip + limit).map((s) => ({
        ...s.doc,
        _score: s.score,
        _matched: s.matchedTerms,
      }));
    }

    const allHighlightPool = Array.from(
      new Set([...Array.from(highlightTerms), ...queryTokens, ...Array.from(expandedSynonyms).slice(0, 8)])
    );

    const results: SearchResultItem[] = docs.map((doc: any) => {
      const termsForDoc = Array.from(new Set([...(doc._matched || []), ...allHighlightPool]));
      const snippet = generateHighlightedSnippet(doc.answer || doc.question, termsForDoc, 240);
      const titleSnippet = generateHighlightedSnippet(doc.title, termsForDoc, 120);

      return {
        id: doc.id || String(doc._id),
        source: doc.source,
        source_url: doc.source_url || '',
        title: doc.title || '',
        question: doc.question || '',
        answer: doc.answer || '',
        category: doc.category || 'General',
        tags: Array.isArray(doc.tags) ? doc.tags : [],
        scholar: doc.scholar || '',
        published_date: doc.published_date || doc.created_at || '',
        sha256_hash: doc.sha256_hash || '',
        scraped_at: doc.scraped_at || '',
        created_at: doc.created_at || '',
        updated_at: doc.updated_at || '',
        score: doc._score || doc.score || 1.0,
        snippet,
        titleSnippet,
        matchedTerms: termsForDoc,
      };
    });

    const facets = await getFacetsMongo();

    return {
      results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      tookMs: Date.now() - startTime,
      engine: usedAtlasSearch ? this.name : `${this.name} (Resilient Text)`,
      facets,
      semanticIntent: aiIntent || undefined,
    };
  }
}
