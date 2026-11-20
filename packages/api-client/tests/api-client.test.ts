import assert from 'node:assert';
import {
  createApiClient,
  SearchQuerySchema,
  SearchResponseSchema,
  RAGQuerySchema,
  FatwaIngestionBatchSchema,
} from '../src';

console.log('Running @repo/api-client test suite...');

// 1. Query parameter parsing and coercion
const validQuery = SearchQuerySchema.parse({
  q: 'সালাত',
  page: '2',
  limit: '20',
});
assert.strictEqual(validQuery.q, 'সালাত');
assert.strictEqual(validQuery.page, 2);
assert.strictEqual(validQuery.limit, 20);
console.log('✓ Search query schema validation and coercion passed');

// 2. RAG question schema
const validRag = RAGQuerySchema.parse({
  question: 'ওযুর ফরজ কয়টি?',
});
assert.strictEqual(validRag.question, 'ওযুর ফরজ কয়টি?');
assert.strictEqual(validRag.contextLimit, 5);
console.log('✓ RAG query schema validation passed');

// 3. Client search execution
async function runClientTest() {
  const mockSearchResponse = {
    results: [
      {
        id: 'fatwa-1',
        source: 'at-tahreek',
        source_url: 'https://at-tahreek.com/fatwa/1',
        title: 'ওযুর নিয়ম',
        question: 'ওযু কিভাবে করব?',
        answer: 'ওযুর নিয়ম হলো...',
        category: 'তাহারাত',
        tags: ['ওযু'],
        scholar: 'ড. আসাদুল্লাহ আল-গালিব',
        published_date: '2024-01-01',
        sha256_hash: 'abc123hash',
        scraped_at: '2024-01-01T00:00:00Z',
        score: 1.0,
        snippet: 'ওযুর নিয়ম হলো...',
        matchedTerms: ['ওযু'],
      },
    ],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
    facets: {
      sources: [{ name: 'at-tahreek', count: 1 }],
      categories: [{ name: 'তাহারাত', count: 1 }],
    },
  };

  const client = createApiClient({
    baseUrl: 'https://api.example.com',
    fetch: async (url) => {
      assert(url.toString().startsWith('https://api.example.com/api/v1/search'));
      return {
        ok: true,
        status: 200,
        json: async () => mockSearchResponse,
      } as any;
    },
  });

  const searchRes = await client.search({ q: 'ওযু' });
  assert.strictEqual(searchRes.total, 1);
  assert.strictEqual(searchRes.results[0].title, 'ওযুর নিয়ম');
  console.log('✓ API Client mock search and schema parse passed');
}

runClientTest().then(() => {
  console.log('All @repo/api-client tests passed successfully!');
});
