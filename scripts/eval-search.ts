import fs from 'fs';
import path from 'path';
import { searchFatwas } from '../apps/web/src/lib/search';

interface GoldenQuery {
  id: number;
  query: string;
  type: string;
  titleKeywords: string[];
  expectedIds: string[];
  sampleExpectedTitles: string[];
}

interface EvalResult {
  query: string;
  type: string;
  recallAt5: number;
  reciprocalRank: number;
  ndcgAt10: number;
  firstRelevantRank: number | null;
  topResultTitle?: string;
  tookMs: number;
}

function calculateDCG(relevanceList: number[]): number {
  return relevanceList.reduce((acc, rel, i) => {
    if (rel <= 0) return acc;
    return acc + rel / Math.log2(i + 2); // i=0 is rank 1 -> log2(2) = 1
  }, 0);
}

function calculateIDCG(relevanceCount: number, k: number): number {
  const idealList = Array(Math.min(relevanceCount, k)).fill(1);
  return calculateDCG(idealList);
}

export async function runSearchEvaluation() {
  const goldenPath = path.resolve(process.cwd(), 'eval/golden.json');
  if (!fs.existsSync(goldenPath)) {
    throw new Error('eval/golden.json not found!');
  }

  const queries: GoldenQuery[] = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  console.log(`\n============================================================`);
  console.log(`Starting Search Relevance Evaluation (${queries.length} Golden Queries)`);
  console.log(`============================================================\n`);

  const results: EvalResult[] = [];
  const failures: { id: number; query: string; type: string; topFound?: string }[] = [];

  for (let i = 0; i < queries.length; i++) {
    const item = queries[i];
    const startTime = Date.now();
    let searchRes;
    try {
      searchRes = await searchFatwas({ q: item.query, limit: 10 });
    } catch (err: any) {
      console.error(`Error querying "${item.query}":`, err.message);
      results.push({
        query: item.query,
        type: item.type,
        recallAt5: 0,
        reciprocalRank: 0,
        ndcgAt10: 0,
        firstRelevantRank: null,
        tookMs: Date.now() - startTime,
      });
      failures.push({ id: item.id, query: item.query, type: item.type, topFound: 'ERROR' });
      continue;
    }

    const hits = searchRes.results || [];
    const relevance: number[] = [];
    let firstRelevantRank: number | null = null;

    hits.forEach((doc, idx) => {
      const isIdMatch = item.expectedIds && item.expectedIds.includes(doc.id);
      const titleQuestion = ((doc.title || '') + ' ' + (doc.question || '')).toLowerCase();
      const isKeywordMatch =
        item.titleKeywords &&
        item.titleKeywords.some((kw) => titleQuestion.includes(kw.toLowerCase()));

      const isRel = isIdMatch || isKeywordMatch ? 1 : 0;
      relevance.push(isRel);

      if (isRel === 1 && firstRelevantRank === null) {
        firstRelevantRank = idx + 1; // 1-based rank
      }
    });

    // Recall@5: was there any relevant doc in top 5?
    const top5Relevance = relevance.slice(0, 5);
    const recallAt5 = top5Relevance.some((r) => r === 1) ? 1 : 0;

    // MRR: 1 / rank
    const rr = firstRelevantRank !== null ? 1 / firstRelevantRank : 0;

    // nDCG@10
    const dcg = calculateDCG(relevance);
    const idcg = calculateIDCG(Math.max(1, relevance.filter((r) => r > 0).length), 10);
    const ndcgAt10 = idcg > 0 ? dcg / idcg : 0;

    results.push({
      query: item.query,
      type: item.type,
      recallAt5,
      reciprocalRank: rr,
      ndcgAt10,
      firstRelevantRank,
      topResultTitle: hits[0]?.title?.slice(0, 60),
      tookMs: searchRes.tookMs || Date.now() - startTime,
    });

    console.log(`[${i + 1}/${queries.length}] "${item.query}" (${item.type}) => Hits: ${hits.length}, RR: ${rr.toFixed(2)}, Recall@5: ${recallAt5}`);

    if (recallAt5 === 0) {
      failures.push({
        id: item.id,
        query: item.query,
        type: item.type,
        topFound: hits[0]?.title?.slice(0, 60) || 'None',
      });
    }
  }

  // Summary Metrics
  const total = results.length;
  const avgRecallAt5 = results.reduce((acc, r) => acc + r.recallAt5, 0) / total;
  const avgMRR = results.reduce((acc, r) => acc + r.reciprocalRank, 0) / total;
  const avgNDCG = results.reduce((acc, r) => acc + r.ndcgAt10, 0) / total;
  const avgLatency = results.reduce((acc, r) => acc + r.tookMs, 0) / total;

  console.log('\n📊 EVALUATION BENCHMARK RESULTS');
  console.log('────────────────────────────────────────────────────────────');
  console.log(`Total Evaluated Queries: ${total}`);
  console.log(`Recall@5:                ${(avgRecallAt5 * 100).toFixed(2)}%`);
  console.log(`MRR (Mean Recip Rank):   ${avgMRR.toFixed(4)}`);
  console.log(`nDCG@10:                 ${avgNDCG.toFixed(4)}`);
  console.log(`Average Latency:         ${avgLatency.toFixed(1)} ms`);
  console.log('────────────────────────────────────────────────────────────\n');

  if (failures.length > 0) {
    console.log(`❌ Failed Queries (Recall@5 = 0) [${failures.length}/${total}]:`);
    failures.forEach((f) => {
      console.log(`  [#${f.id}] (${f.type}) "${f.query}" => Top found: "${f.topFound}"`);
    });
  } else {
    console.log('✅ All queries achieved Recall@5 = 100%!');
  }

  return {
    total,
    recallAt5: avgRecallAt5,
    mrr: avgMRR,
    ndcgAt10: avgNDCG,
    avgLatency,
    failures,
  };
}

if (require.main === module || process.argv[1]?.endsWith('eval-search.ts')) {
  runSearchEvaluation().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
