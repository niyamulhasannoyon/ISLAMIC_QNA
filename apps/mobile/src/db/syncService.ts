import * as SQLite from 'expo-sqlite';
import { batchUpsertLocalFatwas, getLocalFatwaCount } from './fatwaRepo';
import type { SyncProgress, LocalFatwa } from '../types';

type SyncListener = (progress: SyncProgress) => void;
const listeners = new Set<SyncListener>();

let currentProgress: SyncProgress = {
  state: 'idle',
  lastSyncedAt: null,
  totalSyncedCount: 0,
  error: null,
  isOffline: false,
};

function notifyListeners() {
  for (const listener of listeners) {
    listener({ ...currentProgress });
  }
}

export function subscribeSyncProgress(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({ ...currentProgress });
  return () => {
    listeners.delete(listener);
  };
}

export async function getLastSyncedTimestamp(db: SQLite.SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_metadata WHERE key = 'last_synced_at'`
  );
  return row?.value || null;
}

export async function setLastSyncedTimestamp(db: SQLite.SQLiteDatabase, ts: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_metadata (key, value) VALUES ('last_synced_at', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [ts]
  );
}

/**
 * Executes full or incremental sync against backend API
 */
export async function performFatwaSync(
  db: SQLite.SQLiteDatabase,
  baseUrl: string = 'https://deenqna.vercel.app'
): Promise<SyncProgress> {
  if (currentProgress.state === 'syncing') {
    return currentProgress;
  }

  currentProgress = {
    ...currentProgress,
    state: 'syncing',
    error: null,
  };
  notifyListeners();

  try {
    const lastSync = await getLastSyncedTimestamp(db);
    let hasMore = true;
    let cursorSince = lastSync;
    let totalSyncedThisRun = 0;
    const maxBatches = 10; // safety ceiling per sync run
    let batchIndex = 0;

    while (hasMore && batchIndex < maxBatches) {
      batchIndex++;
      const params = new URLSearchParams();
      if (cursorSince) params.set('since', cursorSince);
      params.set('limit', '100');

      const url = `${baseUrl.replace(/\/$/, '')}/api/v2/sync?${params.toString()}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Sync HTTP error ${response.status}`);
      }

      const data = await response.json();
      const fatwas: LocalFatwa[] = data.fatwas || [];

      if (fatwas.length > 0) {
        await batchUpsertLocalFatwas(db, fatwas);
        totalSyncedThisRun += fatwas.length;
        cursorSince = data.latestTimestamp;
        if (cursorSince) {
          await setLastSyncedTimestamp(db, cursorSince);
        }
      }

      hasMore = Boolean(data.hasMore) && fatwas.length > 0;
    }

    const totalCount = await getLocalFatwaCount(db);
    const lastSyncedAt = (await getLastSyncedTimestamp(db)) || new Date().toISOString();

    currentProgress = {
      state: 'synced',
      lastSyncedAt,
      totalSyncedCount: totalCount,
      error: null,
      isOffline: false,
    };
    notifyListeners();
    return currentProgress;
  } catch (err: any) {
    const isNetworkError =
      err.name === 'AbortError' ||
      err.message?.includes('Network request failed') ||
      err.message?.includes('Failed to fetch');

    const totalCount = await getLocalFatwaCount(db);
    const lastSyncedAt = await getLastSyncedTimestamp(db);

    currentProgress = {
      state: isNetworkError ? 'idle' : 'error',
      lastSyncedAt,
      totalSyncedCount: totalCount,
      error: isNetworkError ? 'Offline mode active' : err.message || 'Sync failed',
      isOffline: isNetworkError,
    };
    notifyListeners();
    return currentProgress;
  }
}
