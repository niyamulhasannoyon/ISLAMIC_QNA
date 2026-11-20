export type FatwaSource = 'al-itisam' | 'at-tahreek' | 'al-kawsar';

export interface FatwaQA {
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
  sha256_hash: string;
  scraped_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface RelatedFatwaItem {
  id: string;
  title: string;
  question?: string;
  answer?: string;
  category: string;
  source: FatwaSource;
  scholar: string;
  published_date: string;
}

export interface IngestItemInput {
  id?: string;
  source: FatwaSource | string;
  source_url: string;
  title: string;
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
  scholar?: string;
  published_date?: string;
  sha256_hash?: string;
  scraped_at?: string;
  createdAt?: string;
  hash?: string;
}

export interface IngestResultItem {
  id: string;
  sha256_hash: string;
  status: 'inserted' | 'updated' | 'skipped';
}

export interface IngestResponse {
  success: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
  items: IngestResultItem[];
  message?: string;
}

export interface SearchQueryOptions {
  q?: string;
  source?: FatwaSource | string;
  category?: string;
  scholar?: string;
  page?: number;
  limit?: number;
  fuzzy?: boolean;
}

export interface SearchResultItem extends FatwaQA {
  score: number;
  snippet: string; // HTML highlighted snippet with regex-matched terms
  titleSnippet?: string;
  matchedTerms: string[];
}

export interface FacetCount {
  name: string;
  count: number;
}

export interface SearchFacets {
  sources: FacetCount[];
  categories: FacetCount[];
  scholars?: FacetCount[];
}

export interface FiqhSemanticAnalysis {
  fiqh_intent: string;
  fiqh_category: string;
  technical_fiqh_terms: string[];
  expanded_keywords: string[];
  optimized_search_query: string;
  // Compatibility aliases
  canonicalBengali?: string;
  coreSubject?: string;
  coreAspect?: string;
  essentialKeywords?: string[];
  fiqhConcepts?: string[];
  primarySubject?: string;
  primaryAction?: string;
  fiqhTerms?: string[];
  mustInclude?: string[];
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  tookMs: number;
  engine?: string;
  searchEventId?: string;
  facets: SearchFacets;
  semanticIntent?: FiqhSemanticAnalysis;
}

export type ReportIssueType = 'typo' | 'factual_error' | 'broken_link' | 'wrong_category' | 'scholarly_dispute' | 'other';
export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';

export interface FatwaReport {
  id: string;
  fatwa_id: string;
  fatwa_title?: string;
  issue_type: ReportIssueType;
  description: string;
  proposed_correction?: string;
  reporter_name?: string;
  reporter_email?: string;
  status: ReportStatus;
  admin_notes?: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface SearchEventRecord {
  id: string;
  session_id: string;
  visitor_id: string;
  user_id?: string | null;
  query: string;
  normalized_query: string;
  result_count: number;
  took_ms: number;
  search_engine?: string;
  clicked_fatwa_id?: string | null;
  clicked_position?: number | null;
  has_click?: number;
  created_at: string;
}

