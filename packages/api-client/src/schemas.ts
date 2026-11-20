import { z } from 'zod';

export const FatwaSourceSchema = z.enum(['al-itisam', 'at-tahreek', 'al-kawsar']);

export const FatwaQASchema = z.object({
  id: z.string(),
  source: FatwaSourceSchema,
  source_url: z.string(),
  title: z.string(),
  question: z.string(),
  answer: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  scholar: z.string(),
  published_date: z.string(),
  sha256_hash: z.string(),
  scraped_at: z.string(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const RelatedFatwaItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  question: z.string().optional(),
  answer: z.string().optional(),
  category: z.string(),
  source: FatwaSourceSchema,
  scholar: z.string(),
  published_date: z.string(),
});

export const FatwaDetailSchema = FatwaQASchema.extend({
  relatedFatwas: z.array(RelatedFatwaItemSchema).optional(),
});

export const SearchResultItemSchema = FatwaQASchema.extend({
  score: z.number(),
  snippet: z.string(),
  titleSnippet: z.string().optional(),
  matchedTerms: z.array(z.string()),
});

export const FacetCountSchema = z.object({
  name: z.string(),
  count: z.number().int().nonnegative(),
});

export const SearchFacetsSchema = z.object({
  sources: z.array(FacetCountSchema),
  categories: z.array(FacetCountSchema),
  scholars: z.array(FacetCountSchema).optional(),
});

export const SearchQuerySchema = z.object({
  q: z.string().max(500, 'Search query cannot exceed 500 characters').optional().default(''),
  source: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  scholar: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  facets: SearchFacetsSchema,
  timingMs: z.number().optional(),
  intent: z.record(z.any()).optional(),
});

export const RAGQuerySchema = z.object({
  question: z.string().min(2, 'Question must be at least 2 characters').max(1000),
  contextLimit: z.coerce.number().int().positive().max(10).optional().default(5),
  fatwaIds: z.array(z.string()).optional(),
});

export const RAGResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(RelatedFatwaItemSchema),
  model: z.string().optional(),
  latencyMs: z.number().optional(),
});

export const TrackEventSchema = z.object({
  eventType: z.string().min(1),
  eventData: z.record(z.any()).optional(),
});

export const FatwaIngestionItemSchema = z.object({
  id: z.string().optional(),
  source: z.string().min(1, 'Source is required'),
  source_url: z.string().url('Source URL must be a valid URL'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  question: z.string().min(5, 'Question must be at least 5 characters'),
  answer: z.string().min(10, 'Answer must be at least 10 characters'),
  category: z.string().optional().default('General'),
  tags: z.array(z.string()).optional().default([]),
  scholar: z.string().optional().default(''),
  published_date: z.string().optional(),
  sha256_hash: z.string().optional(),
  scraped_at: z.string().optional(),
});

export const FatwaIngestionBatchSchema = z.object({
  items: z.array(FatwaIngestionItemSchema),
});

export const IngestResultItemSchema = z.object({
  id: z.string(),
  sha256_hash: z.string(),
  status: z.enum(['inserted', 'updated', 'skipped']),
});

export const IngestResponseSchema = z.object({
  success: z.boolean(),
  inserted: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  items: z.array(IngestResultItemSchema),
  message: z.string().optional(),
});

export const AdminLoginSchema = z.object({
  password: z.string().min(1),
});
