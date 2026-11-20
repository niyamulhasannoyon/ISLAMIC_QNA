import { z } from 'zod';
import {
  FatwaSourceSchema,
  FatwaQASchema,
  RelatedFatwaItemSchema,
  FatwaDetailSchema,
  SearchResultItemSchema,
  FacetCountSchema,
  SearchFacetsSchema,
  SearchQuerySchema,
  SearchResponseSchema,
  RAGQuerySchema,
  RAGResponseSchema,
  TrackEventSchema,
  FatwaIngestionItemSchema,
  FatwaIngestionBatchSchema,
  IngestResultItemSchema,
  IngestResponseSchema,
  AdminLoginSchema,
} from './schemas';

export type FatwaSource = z.infer<typeof FatwaSourceSchema>;
export type FatwaQA = z.infer<typeof FatwaQASchema>;
export type RelatedFatwaItem = z.infer<typeof RelatedFatwaItemSchema>;
export type FatwaDetail = z.infer<typeof FatwaDetailSchema>;
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;
export type FacetCount = z.infer<typeof FacetCountSchema>;
export type SearchFacets = z.infer<typeof SearchFacetsSchema>;

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type SearchQueryInput = z.input<typeof SearchQuerySchema>;

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export type RAGQuery = z.infer<typeof RAGQuerySchema>;
export type RAGQueryInput = z.input<typeof RAGQuerySchema>;

export type RAGResponse = z.infer<typeof RAGResponseSchema>;

export type TrackEvent = z.infer<typeof TrackEventSchema>;
export type TrackEventInput = z.input<typeof TrackEventSchema>;

export type FatwaIngestionItem = z.infer<typeof FatwaIngestionItemSchema>;
export type FatwaIngestionItemInput = z.input<typeof FatwaIngestionItemSchema>;

export type FatwaIngestionBatch = z.infer<typeof FatwaIngestionBatchSchema>;
export type IngestResultItem = z.infer<typeof IngestResultItemSchema>;
export type IngestResponse = z.infer<typeof IngestResponseSchema>;

export type AdminLogin = z.infer<typeof AdminLoginSchema>;
export type AdminLoginInput = z.input<typeof AdminLoginSchema>;
