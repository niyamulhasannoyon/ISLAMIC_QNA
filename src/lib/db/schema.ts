import { z } from 'zod';

export const FatwaSourceSchema = z.enum(['al-itisam', 'at-tahreek', 'al-kawsar']);

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

export const FatwaIngestionBatchSchema = z.array(FatwaIngestionItemSchema);

export const SearchQuerySchema = z.object({
  q: z.string().optional().default(''),
  source: z.string().optional(),
  category: z.string().optional(),
  scholar: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export const RAGQuerySchema = z.object({
  question: z.string().min(3, 'Question must be at least 3 characters'),
  contextLimit: z.coerce.number().int().positive().max(10).optional().default(5),
});

export type FatwaIngestionItem = z.infer<typeof FatwaIngestionItemSchema>;
