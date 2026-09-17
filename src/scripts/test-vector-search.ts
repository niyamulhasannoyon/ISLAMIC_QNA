import {
  formatFatwaForEmbedding,
  VECTOR_DIMENSIONS,
  EMBEDDING_MODEL,
  isEmbeddingConfigured,
} from '../lib/ai/embedding';
import { MongoAtlasSearchEngine } from '../lib/search/mongodb';
import { generateRAGAnswer } from '../lib/ai/rag';

async function runVectorSearchTests() {
  console.log('=== 1. Testing Embedding Module & Formatting ===');

  if (VECTOR_DIMENSIONS !== 1536) {
    throw new Error(`Expected VECTOR_DIMENSIONS to be 1536, got ${VECTOR_DIMENSIONS}`);
  }
  if (EMBEDDING_MODEL !== 'text-embedding-3-small') {
    throw new Error(`Expected model to be text-embedding-3-small, got ${EMBEDDING_MODEL}`);
  }

  const sampleFatwa = {
    title: 'রোজা অবস্থায় ইনহেলার ব্যবহারের বিধান',
    question: 'রোজা থাকা অবস্থায় ইনহেলার নিলে রোজা ভাঙবে কি?',
    answer: 'ইনহেলার ফুসফুসের শ্বাসনালী প্রসারিত করে, এটি পাকস্থলীতে খাদ্য বা পানীয় হিসেবে পৌঁছায় না। অধিকাংশ গবেষকের মতে এতে রোজা ভঙ্গ হয় না।',
    category: 'সিয়াম (Fasting)',
    scholar: 'শায়খ আব্দুল হামীদ ফাইযী',
  };

  const formatted = formatFatwaForEmbedding(sampleFatwa);
  console.log('Formatted text for embedding:\n', formatted);

  if (!formatted.includes('রোজা অবস্থায় ইনহেলার') || !formatted.includes('উত্তর:')) {
    throw new Error('formatFatwaForEmbedding failed to format fatwa correctly');
  }
  console.log('Embedding formatter test PASSED.');

  console.log('\n=== 2. Testing MongoAtlasSearchEngine Vector & Fallback Pipelines ===');
  const engine = new MongoAtlasSearchEngine();
  console.log(`Engine name: ${engine.name}`);

  // Test pipeline building
  const pipeline = engine.buildAtlasSearchPipeline({ q: 'ইনহেলার ও রোজা', limit: 5 });
  console.log('Generated Atlas pipeline stages:', pipeline.map((s: any) => Object.keys(s)[0]));

  // Verify embedding is NOT projected
  const projectStage = pipeline.find((s: any) => s.$project && s.$project.embedding === 0);
  if (!projectStage) {
    throw new Error('Expected projection to explicitly omit embedding field');
  }
  console.log('Pipeline project stage correctly omits 1536-dim embedding array. PASSED.');

  console.log('\n=== 3. Testing RAG On-Demand Summary Generation (Mixtral) ===');
  const mockFatwa = {
    id: 'test-fatwa-1',
    source: 'al-itisam' as const,
    source_url: 'https://al-itisam.com/fatwa/inhaler',
    title: 'রোযা অবস্থায় ইনহেলার ব্যবহারের হুকুম',
    question: 'ইনহেলার ব্যবহার করলে রোযা ভাঙবে কি?',
    answer: 'ইসলামিক ফিকাহ একাডেমির সিদ্ধান্ত অনুযায়ী অ্যাজমা রোগীদের জন্য রোযা অবস্থায় গ্যাসীয় ইনহেলার ব্যবহারে সিয়াম বিনষ্ট হয় না।',
    category: 'সিয়াম',
    tags: ['রোযা', 'ইনহেলার'],
    scholar: 'শায়খ আব্দুল হামীদ ফাইযী',
    published_date: '2024-03-01',
    sha256_hash: 'abc123hash',
    scraped_at: '2024-03-01T10:00:00Z',
  };

  const ragRes = await generateRAGAnswer('রোজা অবস্থায় ইনহেলার নিলে কি রোজা ভাঙবে?', {
    preloadedFatwas: [mockFatwa],
    limit: 1,
  });

  console.log('RAG Response answer snippet:', ragRes.answer.slice(0, 150) + '...');
  console.log('RAG Grounded:', ragRes.grounded);
  console.log('RAG Model:', ragRes.model);
  console.log('RAG Sources:', ragRes.sources.map((s) => s.title));

  if (!ragRes.answer || ragRes.sources.length === 0) {
    throw new Error('Expected RAG answer to return content and citations');
  }
  console.log('RAG On-Demand generation test PASSED.');

  console.log('\n=== ALL VECTOR SEARCH TESTS PASSED SUCCESSFULLY! ===\n');
}

runVectorSearchTests().catch((err) => {
  console.error('Vector search test failed:', err);
  process.exit(1);
});
