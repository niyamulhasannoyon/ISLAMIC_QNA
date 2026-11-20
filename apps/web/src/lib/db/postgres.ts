import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;

export function getPostgresConnectionString(): string {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    'postgresql://localhost:5432/fatwa_db'
  );
}

export function getPostgresPool(): Pool {
  if (pool) return pool;

  const connectionString = getPostgresConnectionString();
  const isRemote = !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');

  const config: PoolConfig = {
    connectionString,
    max: parseInt(process.env.PG_POOL_MAX || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  };

  pool = new Pool(config);

  pool.on('error', (err) => {
    console.error('[Postgres Pool Error]:', err.message);
  });

  return pool;
}

export async function queryPostgres<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const p = getPostgresPool();
  return p.query<T>(text, params);
}

/**
 * Initializes the Postgres database schema with pg_trgm, vector (pgvector),
 * indexes (HNSW for embeddings, GIN for tsvector, and GIN for trigram similarity).
 */
export async function initPostgresSchema(): Promise<void> {
  const client = await getPostgresPool().connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
      CREATE EXTENSION IF NOT EXISTS vector;

      CREATE TABLE IF NOT EXISTS fatwas (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        source_url TEXT NOT NULL,
        title TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'General',
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        scholar TEXT NOT NULL DEFAULT '',
        published_date TEXT NOT NULL DEFAULT '',
        sha256_hash TEXT NOT NULL DEFAULT '',
        scraped_at TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT '',
        -- Search columns
        tsv tsvector,
        embedding vector(1536)
      );

      -- Full-Text Search GIN index
      CREATE INDEX IF NOT EXISTS idx_fatwas_tsv ON fatwas USING gin (tsv);

      -- Trigram similarity index for typo tolerance & fuzzy search
      CREATE INDEX IF NOT EXISTS idx_fatwas_title_trgm ON fatwas USING gin (title gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_fatwas_question_trgm ON fatwas USING gin (question gin_trgm_ops);

      -- Filter indexes
      CREATE INDEX IF NOT EXISTS idx_fatwas_source ON fatwas (source);
      CREATE INDEX IF NOT EXISTS idx_fatwas_category ON fatwas (category);
      CREATE INDEX IF NOT EXISTS idx_fatwas_scholar ON fatwas (scholar);
      CREATE INDEX IF NOT EXISTS idx_fatwas_sha256_hash ON fatwas (sha256_hash);

      -- HNSW vector cosine similarity index
      CREATE INDEX IF NOT EXISTS idx_fatwas_embedding_hnsw 
      ON fatwas USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
    `);
  } finally {
    client.release();
  }
}
