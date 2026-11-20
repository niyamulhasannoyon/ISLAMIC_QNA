import {
  SearchQuerySchema,
  SearchResponseSchema,
  FatwaDetailSchema,
  RAGQuerySchema,
  RAGResponseSchema,
  TrackEventSchema,
  FatwaIngestionBatchSchema,
  IngestResponseSchema,
  AdminLoginSchema,
} from './schemas';
import type {
  SearchQueryInput,
  SearchResponse,
  FatwaDetail,
  RAGQueryInput,
  RAGResponse,
  TrackEventInput,
  FatwaIngestionItemInput,
  IngestResponse,
  AdminLoginInput,
} from './types';

export interface ApiClientConfig {
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
  token?: string;
}

export class ApiClientError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

export class FatwaApiClient {
  private baseUrl: string;
  private fetchFn: typeof fetch;
  private defaultHeaders: Record<string, string>;
  private token?: string;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl ? config.baseUrl.replace(/\/$/, '') : '';
    this.fetchFn = config.fetch || globalThis.fetch.bind(globalThis);
    this.defaultHeaders = config.headers || {};
    this.token = config.token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(options.headers as Record<string, string>),
    });

    const res = await this.fetchFn(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorBody: any;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = { error: res.statusText };
      }
      throw new ApiClientError(
        errorBody?.error || `Request failed with status ${res.status}`,
        res.status,
        errorBody?.details
      );
    }

    return (await res.json()) as T;
  }

  /**
   * Search fatwas with query, facets, pagination, and filters (v1)
   */
  async search(query: SearchQueryInput = {}): Promise<SearchResponse> {
    const validated = SearchQuerySchema.parse(query);
    const params = new URLSearchParams();

    if (validated.q) params.set('q', validated.q);
    if (validated.source) params.set('source', validated.source);
    if (validated.category) params.set('category', validated.category);
    if (validated.scholar) params.set('scholar', validated.scholar);
    if (validated.page && validated.page > 1) params.set('page', String(validated.page));
    if (validated.limit && validated.limit !== 10) params.set('limit', String(validated.limit));

    const queryString = params.toString();
    const data = await this.request<unknown>(
      `/api/v1/search${queryString ? `?${queryString}` : ''}`,
      { method: 'GET' }
    );
    return SearchResponseSchema.parse(data);
  }

  /**
   * Search fatwas with intent-aware enrichment and facets (v2)
   */
  async searchV2(query: SearchQueryInput = {}): Promise<SearchResponse & { intent?: any }> {
    const validated = SearchQuerySchema.parse(query);
    const params = new URLSearchParams();

    if (validated.q) params.set('q', validated.q);
    if (validated.source) params.set('source', validated.source);
    if (validated.category) params.set('category', validated.category);
    if (validated.scholar) params.set('scholar', validated.scholar);
    if (validated.page && validated.page > 1) params.set('page', String(validated.page));
    if (validated.limit && validated.limit !== 10) params.set('limit', String(validated.limit));

    const queryString = params.toString();
    const data = await this.request<any>(
      `/api/v2/search${queryString ? `?${queryString}` : ''}`,
      { method: 'GET' }
    );
    return data;
  }

  /**
   * Incremental sync endpoint (v2)
   */
  async syncFatwas(options: { since?: string; limit?: number } = {}): Promise<{
    fatwas: any[];
    hasMore: boolean;
    count: number;
    since?: string | null;
    latestTimestamp: string;
  }> {
    const params = new URLSearchParams();
    if (options.since) params.set('since', options.since);
    if (options.limit) params.set('limit', String(options.limit));

    const qs = params.toString();
    return this.request<any>(`/api/v2/sync${qs ? `?${qs}` : ''}`, { method: 'GET' });
  }

  /**
   * Report an issue with a fatwa
   */
  async reportFatwa(data: {
    fatwaId: string;
    issueType: 'typo' | 'factual_error' | 'broken_link' | 'wrong_category' | 'scholarly_dispute' | 'other';
    description: string;
    proposedCorrection?: string | null;
    reporterName?: string | null;
    reporterEmail?: string | null;
  }): Promise<{ success: boolean; reportId?: string }> {
    return this.request<any>('/api/v1/fatwa/report', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Retrieve a specific fatwa by ID
   */
  async getFatwa(id: string): Promise<FatwaDetail> {
    if (!id) throw new ApiClientError('Fatwa ID is required', 400);
    const encodedId = encodeURIComponent(id);
    const data = await this.request<unknown>(`/api/v1/fatwa/${encodedId}`, {
      method: 'GET',
    });
    return FatwaDetailSchema.parse(data);
  }

  /**
   * Submit a question to the AI RAG engine
   */
  async askRag(input: RAGQueryInput): Promise<RAGResponse> {
    const validated = RAGQuerySchema.parse(input);
    const data = await this.request<unknown>('/api/v1/rag', {
      method: 'POST',
      body: JSON.stringify(validated),
    });
    return RAGResponseSchema.parse(data);
  }

  /**
   * Track analytics / user behavior events
   */
  async trackEvent(event: TrackEventInput): Promise<{ success: boolean }> {
    const validated = TrackEventSchema.parse(event);
    return this.request<{ success: boolean }>('/api/v1/analytics/track', {
      method: 'POST',
      body: JSON.stringify(validated),
    });
  }

  /**
   * Batch ingest fatwas (requires admin ingestion bearer token)
   */
  async ingestFatwas(
    items: FatwaIngestionItemInput[],
    authToken?: string
  ): Promise<IngestResponse> {
    const validated = FatwaIngestionBatchSchema.parse({ items });
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const data = await this.request<unknown>('/api/v1/ingest', {
      method: 'POST',
      headers,
      body: JSON.stringify(validated),
    });
    return IngestResponseSchema.parse(data);
  }

  /**
   * Admin authentication
   */
  async adminLogin(input: AdminLoginInput): Promise<{ authenticated: boolean }> {
    const validated = AdminLoginSchema.parse(input);
    return this.request<{ authenticated: boolean }>('/api/v1/admin/auth', {
      method: 'POST',
      body: JSON.stringify(validated),
    });
  }
}

export function createApiClient(config?: ApiClientConfig): FatwaApiClient {
  return new FatwaApiClient(config);
}
