/**
 * Canonical Islamic category definitions and multi-source alignment utilities.
 * Unifies differences across archives:
 * - Al-Kawsar: 'সালাত ও তাহারাত (Prayer & Purity)' vs At-Tahreek/Al-Itisam: 'সালাত (Prayer)'
 * - Al-Kawsar: 'হজ্জ ও উমরাহ (Hajj & Qurbani)' vs At-Tahreek/Al-Itisam: 'হজ্জ ও উমরাহ (Hajj)'
 */

export interface CanonicalCategory {
  name: string;
  dbCategories: string[];
  matchKeywords: string[];
}

export const CANONICAL_CATEGORIES: CanonicalCategory[] = [
  {
    name: 'সালাত ও তাহারাত (Prayer & Purity)',
    dbCategories: ['সালাত (Prayer)', 'সালাত ও তাহারাত (Prayer & Purity)'],
    matchKeywords: ['সালাত', 'ছালাত', 'নামাজ', 'নামায', 'তাহারাত', 'পবিত্রতা', 'prayer', 'purity'],
  },
  {
    name: 'যাকাত ও সাদাকাহ (Zakat)',
    dbCategories: ['যাকাত ও সাদাকাহ (Zakat)'],
    matchKeywords: ['যাকাত', 'সাদাকাহ', 'সদকা', 'দান', 'zakat'],
  },
  {
    name: 'সাধারণ জিজ্ঞাসা (General)',
    dbCategories: ['সাধারণ জিজ্ঞাসা (General)'],
    matchKeywords: ['সাধারণ', 'general'],
  },
  {
    name: 'পারিবারিক ও বিবাহ (Family)',
    dbCategories: ['পারিবারিক ও বিবাহ (Family)'],
    matchKeywords: ['পারিবারিক', 'বিবাহ', 'বিয়ে', 'তালাক', 'family'],
  },
  {
    name: 'হজ্জ ও উমরাহ (Hajj)',
    dbCategories: ['হজ্জ ও উমরাহ (Hajj)', 'হজ্জ ও উমরাহ (Hajj & Qurbani)'],
    matchKeywords: ['হজ্জ', 'হজ', 'উমরাহ', 'উমরা', 'কুরবানী', 'কুরবানি', 'hajj', 'qurbani'],
  },
  {
    name: 'আকীদাহ ও তাওহীদ (Creed)',
    dbCategories: ['আকীদাহ ও তাওহীদ (Creed)'],
    matchKeywords: ['আকীদাহ', 'আকিদা', 'তাওহীদ', 'তাওহিদ', 'ঈমান', 'creed'],
  },
  {
    name: 'মুয়ামালাত ও লেনদেন (Transactions)',
    dbCategories: ['মুয়ামালাত ও লেনদেন (Transactions)'],
    matchKeywords: ['মুয়ামালাত', 'মুয়ামালাত', 'লেনদেন', 'ব্যবসা', 'সুদ', 'transactions'],
  },
  {
    name: 'সিয়াম (Fasting)',
    dbCategories: ['সিয়াম (Fasting)'],
    matchKeywords: ['সিয়াম', 'সিয়াম', 'ছিয়াম', 'রোজা', 'রোযা', 'fasting'],
  },
  {
    name: 'বিদআত ও কুসংস্কার (Innovations)',
    dbCategories: ['বিদআত ও কুসংস্কার (Innovations)'],
    matchKeywords: ['বিদআত', 'বিদাত', 'কুসংস্কার', 'innovations'],
  },
];

export const STANDARD_SOURCES = ['at-tahreek', 'al-itisam', 'al-kawsar'] as const;

/**
 * Resolves any raw category string to the matching database categories.
 */
export function resolveDbCategories(categoryInput: string): string[] {
  if (!categoryInput || categoryInput === 'All') return [];

  const clean = categoryInput.trim().toLowerCase();

  for (const cat of CANONICAL_CATEGORIES) {
    if (cat.name.toLowerCase() === clean) {
      return cat.dbCategories;
    }
    if (cat.dbCategories.some((dc) => dc.toLowerCase() === clean)) {
      return cat.dbCategories;
    }
    if (cat.matchKeywords.some((kw) => clean.includes(kw.toLowerCase()))) {
      return cat.dbCategories;
    }
  }

  return [categoryInput.trim()];
}

/**
 * Returns MongoDB filter condition for a given category input.
 */
export function getMongoCategoryFilter(categoryInput?: string): Record<string, any> | undefined {
  if (!categoryInput || categoryInput === 'All') return undefined;

  const resolved = resolveDbCategories(categoryInput);
  if (resolved.length === 1) {
    return { category: resolved[0] };
  }
  if (resolved.length > 1) {
    return { category: { $in: resolved } };
  }
  return undefined;
}

/**
 * Returns SQLite WHERE clause and parameters for category filtering.
 */
export function getSqliteCategoryCondition(
  categoryInput?: string,
  tablePrefix: string = 'f.'
): { sql: string; params: string[] } | null {
  if (!categoryInput || categoryInput === 'All') return null;

  const resolved = resolveDbCategories(categoryInput);
  if (resolved.length === 1) {
    return {
      sql: `LOWER(${tablePrefix}category) = ?`,
      params: [resolved[0].toLowerCase()],
    };
  }
  if (resolved.length > 1) {
    const placeholders = resolved.map(() => '?').join(', ');
    return {
      sql: `LOWER(${tablePrefix}category) IN (${placeholders})`,
      params: resolved.map((c) => c.toLowerCase()),
    };
  }
  return null;
}

/**
 * Interleaves items by source round-robin:
 * [At-Tahreek #1, Al-I'tisam #1, Al-Kawsar #1, At-Tahreek #2, Al-I'tisam #2, Al-Kawsar #2, ...]
 */
export function interleaveBySource<T>(
  itemsBySource: Map<string, T[]> | Record<string, T[]>,
  sourcesOrder: string[] = ['at-tahreek', 'al-itisam', 'al-kawsar']
): T[] {
  const result: T[] = [];
  const queues = new Map<string, T[]>();

  for (const s of sourcesOrder) {
    const list = itemsBySource instanceof Map ? itemsBySource.get(s) : itemsBySource[s];
    queues.set(s, [...(list || [])]);
  }

  // Also include any extra sources not in the default order
  const allKeys =
    itemsBySource instanceof Map ? Array.from(itemsBySource.keys()) : Object.keys(itemsBySource);
  for (const key of allKeys) {
    if (!queues.has(key)) {
      const list = itemsBySource instanceof Map ? itemsBySource.get(key) : itemsBySource[key];
      queues.set(key, [...(list || [])]);
    }
  }

  const orderList = Array.from(queues.keys());
  let hasMore = true;

  while (hasMore) {
    hasMore = false;
    for (const s of orderList) {
      const q = queues.get(s);
      if (q && q.length > 0) {
        result.push(q.shift()!);
        hasMore = true;
      }
    }
  }

  return result;
}
