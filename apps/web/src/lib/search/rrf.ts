/**
 * Reciprocal Rank Fusion (RRF) Implementation
 *
 * Merges ranked lists from lexical search and semantic vector search into
 * an intent-aware hybrid ranking.
 *
 * Formula:
 *   RRF_score(d) = sum_{m in M} ( w_m / (k + rank_m(d)) )
 *
 * Standard defaults:
 *   k = 60
 *   w_lexical = 1.0
 *   w_semantic = 1.0
 */

export interface RRFItem {
  id: string;
  score?: number;
  [key: string]: any;
}

export interface RRFOptions {
  k?: number;
  lexicalWeight?: number;
  semanticWeight?: number;
}

export interface FusedItem<T extends RRFItem> {
  item: T;
  fusedScore: number;
  lexicalRank: number | null;
  semanticRank: number | null;
}

export function reciprocalRankFusion<T extends RRFItem>(
  lexicalList: T[],
  semanticList: T[],
  options: RRFOptions = {}
): T[] {
  const k = options.k ?? 60;
  const wLex = options.lexicalWeight ?? 1.0;
  const wSem = options.semanticWeight ?? 1.0;

  // If semantic search is completely empty (e.g. timeout / disabled / provider unavailable),
  // return lexical list directly preserving original ranks.
  if (!semanticList || semanticList.length === 0) {
    return lexicalList.map((item, idx) => ({
      ...item,
      debug: {
        ...(item.debug || {}),
        lexicalRank: idx + 1,
        semanticRank: null,
        fusedScore: wLex / (k + idx + 1),
      },
    }));
  }

  // If lexical search is empty (pure semantic query), return semantic list
  if (!lexicalList || lexicalList.length === 0) {
    return semanticList.map((item, idx) => ({
      ...item,
      debug: {
        ...(item.debug || {}),
        lexicalRank: null,
        semanticRank: idx + 1,
        fusedScore: wSem / (k + idx + 1),
      },
    }));
  }

  const scores = new Map<string, { score: number; lexRank: number | null; semRank: number | null; item: T }>();

  // 1. Process Lexical Ranking (1-based ranks)
  for (let i = 0; i < lexicalList.length; i++) {
    const item = lexicalList[i];
    const rank = i + 1;
    const rrfContribution = wLex / (k + rank);

    scores.set(item.id, {
      score: rrfContribution,
      lexRank: rank,
      semRank: null,
      item,
    });
  }

  // 2. Process Semantic Ranking (1-based ranks)
  for (let i = 0; i < semanticList.length; i++) {
    const item = semanticList[i];
    const rank = i + 1;
    const rrfContribution = wSem / (k + rank);

    const existing = scores.get(item.id);
    if (existing) {
      existing.score += rrfContribution;
      existing.semRank = rank;
      // Merge any missing fields if needed
      existing.item = { ...item, ...existing.item };
    } else {
      scores.set(item.id, {
        score: rrfContribution,
        lexRank: null,
        semRank: rank,
        item,
      });
    }
  }

  // 3. Sort by fused score descending
  const fusedEntries = Array.from(scores.values()).sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Tie-break: prefer items that matched in lexical
    const aLex = a.lexRank ?? 9999;
    const bLex = b.lexRank ?? 9999;
    return aLex - bLex;
  });

  return fusedEntries.map((entry) => ({
    ...entry.item,
    score: Number(entry.score.toFixed(6)),
    debug: {
      ...(entry.item.debug || {}),
      lexicalRank: entry.lexRank,
      semanticRank: entry.semRank,
      fusedScore: Number(entry.score.toFixed(6)),
    },
  }));
}
