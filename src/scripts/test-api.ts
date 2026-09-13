import { NextRequest } from 'next/server';
import { POST as ingestHandler } from '../app/api/v1/ingest/route';
import { searchFatwas } from '../lib/search';
import { computeFatwaHash } from '../lib/hash';

async function testApi() {
  console.log('\n--- 1. Testing Ingest API Auth Protection ---');
  process.env.INGESTION_SECRET_TOKEN = 'test_secret_123';

  // Request without auth
  const unauthReq = new NextRequest('http://localhost:3000/api/v1/ingest', {
    method: 'POST',
    body: JSON.stringify({
      items: [
        {
          source: 'al-itisam',
          source_url: 'https://al-itisam.com/fatwa/test',
          title: 'টেস্ট ফতোয়া শিরোনাম',
          question: 'টেস্ট প্রশ্ন',
          answer: 'টেস্ট উত্তর',
        },
      ],
    }),
  });

  const unauthRes = await ingestHandler(unauthReq);
  console.log(`Unauthenticated status: ${unauthRes.status}`);
  if (unauthRes.status !== 401) {
    throw new Error(`Expected 401 Unauthorized, got ${unauthRes.status}`);
  }
  console.log('Auth check passed: 401 returned for missing token');

  console.log('\n--- 2. Testing Authenticated Ingestion & SHA-256 Idempotency ---');
  const testQuestion = 'তাহাজ্জুদ সালাতের মধ্যে বিতর পড়ার সঠিক সময় কোনটি?';
  const testAnswer = 'বিতর সালাত রাতের শেষ সালাত হিসেবে আদায় করা উত্তম। রাসূলুল্লাহ (সা.) বলেছেন: তোমরা রাতের শেষ সালাত বিতরকে কর। তবে ঘুমানোর পূর্বে বিতর পড়ে নিয়ে রাতে জাগ্রত হয়ে তাহাজ্জুদ পড়া জায়েয, সেক্ষেত্রে দ্বিতীয়বার বিতর পড়ার প্রয়োজন নেই।';
  const expectedHash = computeFatwaHash({ question: testQuestion, answer: testAnswer });

  const validReq = new NextRequest('http://localhost:3000/api/v1/ingest', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test_secret_123',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        {
          source: 'al-itisam',
          source_url: 'https://al-itisam.com/fatwa/tahajjud-witr-timing',
          title: 'তাহাজ্জুদ সালাতের সাথে বিতর পড়ার বিধান কি?',
          question: testQuestion,
          answer: testAnswer,
          category: 'সালাত (Prayer)',
          tags: ['তাহাজ্জুদ', 'বিতর', 'সালাত'],
          scholar: 'শায়খ মতিউর রহমান মাদানী',
          published_date: '2024-03-20',
          sha256_hash: expectedHash,
        },
      ],
    }),
  });

  const validRes = await ingestHandler(validReq);
  const resBody = await validRes.json();
  console.log(`Ingest response:`, resBody);
  if (validRes.status !== 200 || !resBody.success) {
    throw new Error(`Ingestion failed with status ${validRes.status}`);
  }
  console.log(`Inserted: ${resBody.inserted}, Skipped: ${resBody.skipped}`);

  console.log('\n--- 3. Testing Idempotency (Re-ingesting same item) ---');
  const duplicateReq = new NextRequest('http://localhost:3000/api/v1/ingest', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test_secret_123',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        {
          source: 'al-itisam',
          source_url: 'https://al-itisam.com/fatwa/tahajjud-witr-timing',
          title: 'তাহাজ্জুদ সালাতের সাথে বিতর পড়ার বিধান কি?',
          question: testQuestion,
          answer: testAnswer,
          category: 'সালাত (Prayer)',
          tags: ['তাহাজ্জুদ', 'বিতর', 'সালাত'],
          scholar: 'শায়খ মতিউর রহমান মাদানী',
          published_date: '2024-03-20',
        },
      ],
    }),
  });

  const dupRes = await duplicateReq.json ? await ingestHandler(duplicateReq) : null;
  if (dupRes) {
    const dupBody = await dupRes.json();
    console.log(`Duplicate Ingest response:`, dupBody);
    if (dupBody.skipped !== 1) {
      throw new Error(`Expected skipped = 1, got ${dupBody.skipped}`);
    }
    console.log('Idempotency verified: Duplicate item was skipped!');
  }

  console.log('\n--- 4. Testing Search on newly ingested item ---');
  const searchRes = await searchFatwas({ q: 'তাহাজ্জুদ' });
  console.log(`Search for 'তাহাজ্জুদ' returned ${searchRes.total} results`);
  if (searchRes.total === 0) {
    throw new Error('Expected at least 1 result for তাহাজ্জুদ');
  }
  console.log(`Matched item title: ${searchRes.results[0].title}`);
  console.log(`Scholar: ${searchRes.results[0].scholar}`);
  console.log(`Highlighted snippet: ${searchRes.results[0].snippet}`);

  console.log('\nAll API & Ingestion tests passed with 100% success!');
}

testApi().catch((err) => {
  console.error('API Test failed:', err);
  process.exit(1);
});
