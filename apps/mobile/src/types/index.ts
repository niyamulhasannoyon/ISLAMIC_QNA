import type { FatwaSource } from '@repo/api-client';

export type { FatwaSource };

export interface LocalFatwa {
  id: string;
  source: FatwaSource;
  source_url: string;
  title: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  scholar: string;
  published_date: string;
  scraped_at: string;
  sha256_hash: string;
  synced_at?: string;
  score?: number;
  snippet?: string;
}

export interface Bookmark {
  id: string;
  fatwa_id: string;
  collection_id?: string | null;
  notes?: string | null;
  created_at: string;
  fatwa?: LocalFatwa;
}

export interface Collection {
  id: string;
  name: string;
  color: string;
  icon?: string;
  created_at: string;
  count?: number;
}

export interface RecentSearch {
  id: string;
  query: string;
  timestamp: string;
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncProgress {
  state: SyncState;
  lastSyncedAt: string | null;
  totalSyncedCount: number;
  error?: string | null;
  isOffline: boolean;
}

export type AppTheme = 'system' | 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large' | 'xl';
export type Language = 'bn' | 'en';

export interface AppSettings {
  theme: AppTheme;
  fontSize: FontSize;
  language: Language;
  analyticsOptOut: boolean;
  offlineFirst: boolean;
}

export interface CategorySummary {
  name: string;
  count: number;
}

export interface ReportIssuePayload {
  fatwaId: string;
  issueType: 'typo' | 'factual_error' | 'broken_link' | 'wrong_category' | 'scholarly_dispute' | 'other';
  description: string;
  proposedCorrection?: string | null;
  reporterName?: string | null;
  reporterEmail?: string | null;
}
