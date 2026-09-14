import { getMongoDb, isMongoConfigured } from '../lib/db/mongodb';
import { getAllFatwas, closeDb } from '../lib/db';

async function runMigration() {
  console.log('=== MongoDB Atlas Migration Utility ===\n');

  if (!isMongoConfigured()) {
    console.error('ERROR: MONGODB_URI environment variable is not defined.');
    console.error('Usage: MONGODB_URI="mongodb+srv://..." npm run migrate:mongo\n');
    process.exit(1);
  }

  const mongoDb = await getMongoDb();
  if (!mongoDb) {
    console.error('ERROR: Failed to establish connection to MongoDB Atlas.');
    process.exit(1);
  }

  console.log('Connected to MongoDB Atlas successfully.');
  const collection = mongoDb.collection('fatwas');

  console.log('Ensuring indexes on fatwas collection...');
  await collection.createIndex({ sha256_hash: 1 }, { unique: true });
  await collection.createIndex({ source_url: 1 });
  await collection.createIndex({ source: 1, published_date: -1 });

  console.log('Fetching all fatwas from local SQLite database...');
  const fatwas = getAllFatwas();
  console.log(`Found ${fatwas.length} fatwas to migrate.`);

  if (fatwas.length === 0) {
    console.log('No fatwas found in local SQLite database to migrate.');
    closeDb();
    process.exit(0);
  }

  const batchSize = 500;
  let totalInserted = 0;
  let totalUpdated = 0;
  const startTime = Date.now();

  for (let i = 0; i < fatwas.length; i += batchSize) {
    const chunk = fatwas.slice(i, i + batchSize);
    const bulkOps = chunk.map((item) => ({
      updateOne: {
        filter: { sha256_hash: item.sha256_hash },
        update: {
          $set: {
            id: item.id,
            source: item.source,
            source_url: item.source_url,
            title: item.title,
            question: item.question,
            answer: item.answer,
            category: item.category,
            tags: item.tags,
            scholar: item.scholar,
            published_date: item.published_date,
            scraped_at: item.scraped_at,
            updated_at: item.updated_at,
          },
          $setOnInsert: {
            _id: item.id as any,
            sha256_hash: item.sha256_hash,
            created_at: item.created_at,
          },
        },
        upsert: true,
      },
    }));

    const res = await collection.bulkWrite(bulkOps, { ordered: false });
    totalInserted += res.upsertedCount || 0;
    totalUpdated += res.modifiedCount || 0;

    const progress = Math.min(i + batchSize, fatwas.length);
    console.log(`Migrated ${progress}/${fatwas.length} fatwas...`);
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== Migration Completed Successfully ===');
  console.log(`Total processed: ${fatwas.length}`);
  console.log(`Newly inserted:  ${totalInserted}`);
  console.log(`Updated:         ${totalUpdated}`);
  console.log(`Duration:        ${elapsedSec}s\n`);

  closeDb();
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  closeDb();
  process.exit(1);
});
