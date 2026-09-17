import { getMongoDb, isMongoConfigured } from '../lib/db/mongodb';
import { getBatchEmbeddings, formatFatwaForEmbedding, isEmbeddingConfigured, EMBEDDING_MODEL, VECTOR_DIMENSIONS } from '../lib/ai/embedding';

async function generateEmbeddings() {
  console.log('=== MongoDB Atlas Vector Embedding Backfill Tool ===\n');

  if (!isMongoConfigured()) {
    console.error('ERROR: MONGODB_URI environment variable is not defined.');
    process.exit(1);
  }

  if (!isEmbeddingConfigured()) {
    console.error('ERROR: OPENAI_API_KEY is not defined.');
    console.error('Please set OPENAI_API_KEY in .env.local to generate embeddings.');
    process.exit(1);
  }

  const db = await getMongoDb();
  if (!db) {
    console.error('ERROR: Failed to establish connection to MongoDB Atlas.');
    process.exit(1);
  }

  const collection = db.collection('fatwas');

  // Parse optional CLI args: --limit=100 --batch=50
  const args = process.argv.slice(2);
  let limitParam = 0;
  let batchSize = 50;

  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      limitParam = parseInt(arg.split('=')[1], 10) || 0;
    }
    if (arg.startsWith('--batch=')) {
      batchSize = parseInt(arg.split('=')[1], 10) || 50;
    }
  }

  const query = {
    $or: [
      { embedding: { $exists: false } },
      { embedding: null },
      { embedding: { $size: 0 } },
    ],
  };

  const totalUnprocessed = await collection.countDocuments(query);
  console.log(`Total fatwas in collection lacking embeddings: ${totalUnprocessed}`);

  if (totalUnprocessed === 0) {
    console.log('All fatwa records in MongoDB Atlas are already vectorized! No work needed.');
    process.exit(0);
  }

  const targetCount = limitParam > 0 ? Math.min(limitParam, totalUnprocessed) : totalUnprocessed;
  console.log(`Targeting ${targetCount} fatwas using model: ${EMBEDDING_MODEL} (${VECTOR_DIMENSIONS} dimensions)`);
  console.log(`Batch size: ${batchSize} documents per OpenAI request\n`);

  let processedCount = 0;
  let successfulEmbeddings = 0;
  const startTime = Date.now();

  while (processedCount < targetCount) {
    const currentBatchLimit = Math.min(batchSize, targetCount - processedCount);

    const docs = await collection
      .find(query, {
        projection: {
          _id: 1,
          id: 1,
          title: 1,
          question: 1,
          answer: 1,
          category: 1,
          scholar: 1,
        },
      })
      .limit(currentBatchLimit)
      .toArray();

    if (!docs || docs.length === 0) break;

    const formattedTexts = docs.map((d: any) => formatFatwaForEmbedding(d));

    // Call OpenAI API for batch embeddings with retry
    let vectors: Array<number[] | null> = [];
    let attempts = 0;
    while (attempts < 3) {
      try {
        vectors = await getBatchEmbeddings(formattedTexts);
        break;
      } catch (err: any) {
        attempts++;
        console.warn(`[Retry ${attempts}/3]: OpenAI rate-limit or network issue:`, err.message);
        await new Promise((r) => setTimeout(r, 2000 * attempts));
      }
    }

    const bulkOps = [];
    for (let i = 0; i < docs.length; i++) {
      const vector = vectors[i];
      if (vector && Array.isArray(vector) && vector.length === VECTOR_DIMENSIONS) {
        bulkOps.push({
          updateOne: {
            filter: { _id: docs[i]._id },
            update: {
              $set: {
                embedding: vector,
                embedded_at: new Date().toISOString(),
              },
            },
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      const res = await collection.bulkWrite(bulkOps, { ordered: false });
      successfulEmbeddings += res.modifiedCount || 0;
    }

    processedCount += docs.length;
    const percent = ((processedCount / targetCount) * 100).toFixed(1);
    const elapsedSec = (Date.now() - startTime) / 1000;
    const rate = processedCount / (elapsedSec || 1);
    const remainingSec = Math.max(0, Math.round((targetCount - processedCount) / (rate || 1)));

    console.log(
      `[Progress]: ${processedCount}/${targetCount} (${percent}%) | ` +
      `Success: ${successfulEmbeddings} | ` +
      `Rate: ${rate.toFixed(1)}/sec | ` +
      `ETA: ${Math.floor(remainingSec / 60)}m ${remainingSec % 60}s`
    );
  }

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== Vector Embedding Generation Finished ===');
  console.log(`Total processed: ${processedCount}`);
  console.log(`Successfully embedded: ${successfulEmbeddings}`);
  console.log(`Time taken: ${totalTimeSec}s`);
  console.log(`Ready for MongoDB Atlas Vector Search ($vectorSearch).\n`);

  process.exit(0);
}

generateEmbeddings().catch((err) => {
  console.error('Fatal error in generateEmbeddings:', err);
  process.exit(1);
});
