import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDatabase } from '../db/database';
import { subscribeSyncProgress, performFatwaSync } from '../db/syncService';
import type { SyncProgress } from '../types';
import Constants from 'expo-constants';

interface SyncContextType {
  progress: SyncProgress;
  triggerSync: () => Promise<void>;
}

const defaultProgress: SyncProgress = {
  state: 'idle',
  lastSyncedAt: null,
  totalSyncedCount: 0,
  error: null,
  isOffline: false,
};

const SyncContext = createContext<SyncContextType>({
  progress: defaultProgress,
  triggerSync: async () => {},
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useState<SyncProgress>(defaultProgress);

  useEffect(() => {
    const unsubscribe = subscribeSyncProgress(setProgress);

    // Initial background sync attempt on app mount
    (async () => {
      try {
        const db = await getDatabase();
        const baseUrl =
          Constants.expoConfig?.extra?.apiUrl ||
          process.env.EXPO_PUBLIC_API_URL ||
          'https://deenqna.vercel.app';
        await performFatwaSync(db, baseUrl);
      } catch {}
    })();

    return unsubscribe;
  }, []);

  const triggerSync = async () => {
    try {
      const db = await getDatabase();
      const baseUrl =
        Constants.expoConfig?.extra?.apiUrl ||
        process.env.EXPO_PUBLIC_API_URL ||
        'https://deenqna.vercel.app';
      await performFatwaSync(db, baseUrl);
    } catch {}
  };

  return (
    <SyncContext.Provider value={{ progress, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
};

export function useSync() {
  return useContext(SyncContext);
}
