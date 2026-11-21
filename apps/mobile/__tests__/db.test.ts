import {
  isBookmarked,
  toggleBookmark,
  createCollection,
  getCollections,
} from '../src/db/bookmarksRepo';
import {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
} from '../src/db/recentSearchesRepo';
import type { SQLiteDatabase } from 'expo-sqlite';

describe('Local SQLite Repositories', () => {
  let mockDb: any;
  let inMemoryBookmarks: Map<string, any>;
  let inMemoryCollections: any[];
  let inMemoryRecents: any[];

  beforeEach(() => {
    inMemoryBookmarks = new Map();
    inMemoryCollections = [];
    inMemoryRecents = [];

    mockDb = {
      withTransactionAsync: jest.fn(async (cb: () => Promise<any>) => {
        return cb();
      }),
      getFirstAsync: jest.fn(async (sql: string, params: any[] = []) => {
        if (sql.includes('FROM bookmarks WHERE fatwa_id = ?')) {
          const fatwaId = params[0];
          return inMemoryBookmarks.has(fatwaId) ? { id: inMemoryBookmarks.get(fatwaId).id } : null;
        }
        return null;
      }),
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes('FROM collections')) {
          return inMemoryCollections;
        }
        if (sql.includes('FROM recent_searches')) {
          return inMemoryRecents;
        }
        return [];
      }),
      runAsync: jest.fn(async (sql: string, params: any[] = []) => {
        if (sql.includes('INSERT INTO bookmarks')) {
          const [id, fatwa_id, collection_id, created_at] = params;
          inMemoryBookmarks.set(fatwa_id, { id, fatwa_id, collection_id, created_at });
        } else if (sql.includes('DELETE FROM bookmarks WHERE fatwa_id = ?')) {
          inMemoryBookmarks.delete(params[0]);
        } else if (sql.includes('INSERT INTO collections')) {
          const [id, name, color, icon, created_at] = params;
          inMemoryCollections.push({ id, name, color, icon, created_at, count: 0 });
        } else if (sql.includes('INSERT INTO recent_searches')) {
          const [id, query, timestamp] = params;
          inMemoryRecents.unshift({ id, query, timestamp });
        } else if (sql.includes('DELETE FROM recent_searches WHERE query = ?')) {
          inMemoryRecents = inMemoryRecents.filter((r) => r.query !== params[0]);
        } else if (sql.includes('DELETE FROM recent_searches WHERE id NOT IN')) {
          // pruning query, keep at most 20
          inMemoryRecents = inMemoryRecents.slice(0, 20);
        } else if (sql.trim() === 'DELETE FROM recent_searches') {
          inMemoryRecents = [];
        }
        return { changes: 1, lastInsertRowId: 1 };
      }),
    };
  });

  describe('Bookmarks Repository', () => {
    it('toggles bookmark on and off correctly', async () => {
      const fatwaId = 'fatwa_123';

      // 1. Initially not bookmarked
      let bookmarked = await isBookmarked(mockDb as SQLiteDatabase, fatwaId);
      expect(bookmarked).toBe(false);

      // 2. Toggle on
      const added = await toggleBookmark(mockDb as SQLiteDatabase, fatwaId);
      expect(added).toBe(true);

      // 3. Verify it is bookmarked
      bookmarked = await isBookmarked(mockDb as SQLiteDatabase, fatwaId);
      expect(bookmarked).toBe(true);

      // 4. Toggle off
      const removed = await toggleBookmark(mockDb as SQLiteDatabase, fatwaId);
      expect(removed).toBe(false);

      // 5. Verify it is no longer bookmarked
      bookmarked = await isBookmarked(mockDb as SQLiteDatabase, fatwaId);
      expect(bookmarked).toBe(false);
    });

    it('creates collections and returns them', async () => {
      const col = await createCollection(mockDb as SQLiteDatabase, 'রমযান সম্পর্কিত');
      expect(col.name).toBe('রমযান সম্পর্কিত');

      const all = await getCollections(mockDb as SQLiteDatabase);
      expect(all.length).toBe(1);
      expect(all[0].name).toBe('রমযান সম্পর্কিত');
    });
  });

  describe('Recent Searches Repository', () => {
    it('stores recent searches and retrieves them in order', async () => {
      await addRecentSearch(mockDb as SQLiteDatabase, 'সালাত');
      await addRecentSearch(mockDb as SQLiteDatabase, 'রোজা');

      const recents = await getRecentSearches(mockDb as SQLiteDatabase);
      expect(recents.length).toBe(2);
      expect(recents[0].query).toBe('রোজা');
      expect(recents[1].query).toBe('সালাত');

      await clearRecentSearches(mockDb as SQLiteDatabase);
      expect(inMemoryRecents.length).toBe(0);
    });
  });
});
