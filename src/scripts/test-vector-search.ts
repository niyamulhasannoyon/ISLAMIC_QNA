import {
  formatDocumentForEmbedding,
  formatFatwaForEmbedding,
  VECTOR_DIMENSIONS,
  EMBEDDING_MODEL,
} from '../lib/ai/embedding';
import { normalizeSearchQuery } from '../lib/ai/normalizeQuery';
import { MongoAtlasSearchEngine } from '../lib/search/mongodb';
import { generateRAGAnswer } from '../lib/ai/rag';

async function runVectorSearchTests() {
  console.log('===========================================================');
  console.log('  Testing Ultra-Fast Semantic Search Pipeline (DeenQnA)    ');
  console.log('===========================================================\n');

  // --- 1. Testing Query Normalization (LLM Step) ---
  console.log('=== 1. Testing Query Normalization Service ===');
  const conversationalQuery = 'ami esar namaj porte vule gechi fojorer pore ki porle problem hobe';
  console.log(`Raw Conversational Input: "${conversationalQuery}"`);

  const normResult = await normalizeSearchQuery(conversationalQuery);
  console.log(`Normalized Query:        "${normResult.normalizedQuery}"`);
  console.log(`Provider:                ${normResult.provider}`);
  console.log(`Latency:                 ${normResult.latencyMs}ms`);

  if (!normResult.normalizedQuery.includes('এশার') || !normResult.normalizedQuery.includes('কাজা') || !normResult.normalizedQuery.includes('ফজরের পর')) {
    throw new Error(`Expected normalized query to contain missed prayer terms ('এশার', 'কাজা', 'ফজরের পর'), got: "${normResult.normalizedQuery}"`);
  }

  // Test colloquial Bengali input
  const banglaCasualQuery = 'আমি এশার নামজ পড়তে ভুলে গেসি ফজরের পর পড়লে কি প্রবলেম হবে';
  const banglaNorm = await normalizeSearchQuery(banglaCasualQuery);
  console.log(`Bangla Casual Input:     "${banglaCasualQuery}"`);
  console.log(`Normalized Output:       "${banglaNorm.normalizedQuery}"`);

  if (!banglaNorm.normalizedQuery.includes('এশার') || !banglaNorm.normalizedQuery.includes('কাজা')) {
    throw new Error(`Expected colloquial Bengali query to map to missed prayer terms, got: "${banglaNorm.normalizedQuery}"`);
  }

  // Verify second run hits 0ms LRU cache
  const cachedNorm = await normalizeSearchQuery(conversationalQuery);
  console.log(`Cached Query (0ms check): "${cachedNorm.normalizedQuery}" (${cachedNorm.latencyMs}ms)`);
  if (cachedNorm.latencyMs !== 0) {
    console.warn(`Note: Cached latency was ${cachedNorm.latencyMs}ms (expected 0ms)`);
  }
  console.log('Query Normalization tests PASSED.\n');

  // --- 2. Testing Embedding Formatter & HTML Stripping ---
  console.log('=== 2. Testing Document Embedding Formatter (${doc.title} ${doc.question || ""} ${doc.content || ""}) ===');

  if (VECTOR_DIMENSIONS !== 1536) {
    throw new Error(`Expected VECTOR_DIMENSIONS to be 1536, got ${VECTOR_DIMENSIONS}`);
  }
  if (EMBEDDING_MODEL !== 'text-embedding-3-small') {
    throw new Error(`Expected model to be text-embedding-3-small, got ${EMBEDDING_MODEL}`);
  }

  const { formatDocForEmbedding, cleanHtml } = await import('../../scripts/generate-embeddings');
  const sampleDoc = {
    title: '<h1>এশার <b>সালাত</b> কাজা হলে পড়ার বিধান</h1>',
    question: '<p>আমি কি ফজরের পর এশার সালাত পড়তে পারব?</p>',
    content: '<div>কোনো ব্যক্তি যদি এশার সালাত না পড়ে ঘুমিয়ে যায়, তবে জাগ্রত হওয়া মাত্রই তা কাজা আদায় করে নিতে হবে।<br/></div>',
  };

  const formattedDoc = formatDocForEmbedding(sampleDoc);
  console.log('Formatted document text:\n', formattedDoc);

  if (formattedDoc.includes('<h1>') || formattedDoc.includes('<b>') || formattedDoc.includes('<br/>')) {
    throw new Error('Expected HTML tags to be stripped from formatted document');
  }

  if (!formattedDoc.startsWith('এশার সালাত কাজা হলে পড়ার বিধান') || !formattedDoc.includes('জাগ্রত হওয়া মাত্রই')) {
    throw new Error('formatDocForEmbedding failed to combine title + question + content correctly');
  }
  console.log('Embedding formatter & HTML stripping test PASSED.\n');

  // --- 3. Testing MongoAtlasSearchEngine Pipeline Definition ---
  console.log('=== 3. Testing MongoDB Atlas Vector Search Pipeline Verification ===');
  const engine = new MongoAtlasSearchEngine();
  console.log(`Engine Name: ${engine.name}`);

  // Test Atlas Text Search Fallback pipeline building
  const pipeline = engine.buildAtlasSearchPipeline({ q: 'এশার সালাত কাজা', limit: 10 });
  console.log('Generated Atlas pipeline stages:', pipeline.map((s: any) => Object.keys(s)[0]));

  // Verify embedding array is explicitly omitted to prevent bandwidth bloat
  const projectStage = pipeline.find((s: any) => s.$project && s.$project.embedding === 0);
  if (!projectStage) {
    throw new Error('Expected projection to explicitly omit 1536-dim embedding field');
  }
  console.log('Pipeline project stage correctly omits 1536-dim embedding array. PASSED.\n');

  // --- 4. Testing RAG Integration with Verified Grounding ---
  console.log('=== 4. Testing Islamic Q&A RAG Pipeline with Fallback Grounding ===');
  const mockFatwa = {
    id: 'test-fatwa-qasr',
    source: 'al-itisam' as const,
    source_url: 'https://al-itisam.com/fatwa/qasr',
    title: 'সফর অবস্থায় সালাত কসরের শারয়ী হুকুম',
    question: 'কত দূর পথ অতিক্রম করলে মুসাফির ব্যক্তি সালাত কসর করবে?',
    answer: 'সাধারণভাবে ৪৮ মাইল বা প্রায় ৭৮ কিলোমিটার পথ সফরের নিয়তে বের হলে চার রাকাত বিশিষ্ট ফরয সালাত দুই রাকাত (কসর) করে পড়তে হবে।',
    category: 'সালাত',
    tags: ['সালাত', 'কসর', 'সফর'],
    scholar: 'শায়খ আব্দুল হামীদ ফাইযী',
    published_date: '2024-03-01',
    sha256_hash: 'qasr123hash',
    scraped_at: '2024-03-01T10:00:00Z',
  };

  const ragRes = await generateRAGAnswer('সফরে কসরের দূরত্ব কত?', {
    preloadedFatwas: [mockFatwa],
    limit: 1,
  });

  console.log('RAG Model:', ragRes.model);
  console.log('RAG Grounded:', ragRes.grounded);
  console.log('RAG Answer Snippet:', ragRes.answer.slice(0, 120) + '...');
  console.log('RAG Sources:', ragRes.sources.map((s) => s.title));

  if (!ragRes.answer || ragRes.sources.length === 0) {
    throw new Error('Expected RAG answer to return content and citations');
  }
  console.log('RAG pipeline test PASSED.\n');

  console.log('===========================================================');
  console.log('  ALL SEMANTIC VECTOR SEARCH TESTS PASSED SUCCESSFULLY!    ');
  console.log('===========================================================\n');
}

runVectorSearchTests().catch((err) => {
  console.error('Vector search test failed:', err);
  process.exit(1);
});
