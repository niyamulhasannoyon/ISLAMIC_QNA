import { FatwaQA, SearchQueryOptions, SearchResponse, SearchResultItem } from '@/types/fatwa';

export interface SearchEngine {
  name: string;
  init(): Promise<void>;
  indexDocuments(docs: FatwaQA[]): Promise<void>;
  search(options: SearchQueryOptions): Promise<SearchResponse>;
  deleteDocument?(id: string): Promise<void>;
}
