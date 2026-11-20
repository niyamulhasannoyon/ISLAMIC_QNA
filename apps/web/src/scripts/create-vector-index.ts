import { getMongoDb, isMongoConfigured } from '../lib/db/mongodb';
import { VECTOR_DIMENSIONS } from '../lib/ai/embedding';

async function createAtlasVectorIndex() {
  console.log('=== MongoDB Atlas Vector Search Index Initializer ===\n');

  if (!isMongoConfigured()) {
    console.error('ERROR: MONGODB_URI environment variable is not defined.');
    process.exit(1);
  }

  const db = await getMongoDb();
  if (!db) {
    console.error('ERROR: Failed to establish connection to MongoDB Atlas.');
    process.exit(1);
  }

  const indexName = process.env.VECTOR_INDEX_NAME || 'vector_index';
  const collection = db.collection('fatwas');

  console.log(`Checking existing search indexes on 'fatwas' collection...`);

  try {
    const existing = await collection.listSearchIndexes().toArray();
    const found = existing.find((idx: any) => idx.name === indexName);

    if (found) {
      console.log(`Vector index '${indexName}' already exists in MongoDB Atlas.`);
      console.log(`Status: ${(found as any).status || 'READY'}`);
      process.exit(0);
    }
  } catch (err: any) {
    console.log('Notice: Could not list existing search indexes programmatically:', err.message);
  }

  console.log(`Creating Vector Search Index '${indexName}'...`);
  const indexDefinition = {
    fields: [
      {
        type: 'vector',
        path: 'embedding',
        numDimensions: VECTOR_DIMENSIONS,
        similarity: 'cosine',
      },
      {
        type: 'filter',
        path: 'source',
      },
      {
        type: 'filter',
        path: 'category',
      },
    ],
  };

  try {
    const result = await collection.createSearchIndex({
      name: indexName,
      type: 'vectorSearch',
      definition: indexDefinition,
    });

    console.log('\nSUCCESS! Vector Search Index creation initiated:');
    console.log(`- Index Name: ${result}`);
    console.log(`- Vector Path: embedding`);
    console.log(`- Dimensions:  ${VECTOR_DIMENSIONS}`);
    console.log(`- Metric:      cosine`);
    console.log('\nAtlas will build the index in the background (typically 1-3 minutes).');
    process.exit(0);
  } catch (err: any) {
    console.warn('\nNotice regarding programmatic index creation:');
    console.warn(err.message || err);
    console.log('\nIf your MongoDB database user lacks Atlas Search Admin permissions,');
    console.log('you can create the index manually in the MongoDB Atlas Web UI:');
    console.log('1. Go to cloud.mongodb.com -> Atlas Cluster -> Database -> Search Indexes');
    console.log('2. Select collection: fatwas_db.fatwas');
    console.log('3. Click "Create Search Index" -> Select "Atlas Vector Search" (JSON Editor)');
    console.log(`4. Index Name: ${indexName}`);
    console.log('5. Paste the following JSON definition:');
    console.log(JSON.stringify(indexDefinition, null, 2));
    console.log('\n--------------------------------------------------------------\n');
    process.exit(0);
  }
}

createAtlasVectorIndex().catch((err) => {
  console.error('Fatal error during vector index setup:', err);
  process.exit(1);
});
