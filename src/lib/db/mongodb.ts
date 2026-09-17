import { MongoClient, Db } from 'mongodb';
import { User } from '@/types/user';
import { FatwaQA, IngestItemInput, IngestResultItem, SearchFacets, FatwaSource } from '@/types/fatwa';
import { computeFatwaHash, hashToUuid, normalizeText } from '../hash';
import { extractIdFromSlug } from '@/lib/utils';
import { getEmbedding, formatFatwaForEmbedding, isEmbeddingConfigured } from '../ai/embedding';

const uri = process.env.MONGODB_URI;

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0);
}

export function getMongoClientPromise(): Promise<MongoClient> | null {
  if (!uri) {
    return null;
  }

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri, {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 5000,
      });
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getMongoDb(dbName: string = 'fatwas_db'): Promise<Db | null> {
  const promise = getMongoClientPromise();
  if (!promise) return null;
  const c = await promise;
  return c.db(dbName);
}

// -------------------------------------------------------------
// USER DAO (MongoDB Atlas)
// -------------------------------------------------------------

export async function findUserByEmailMongo(email: string): Promise<User | null> {
  const db = await getMongoDb();
  if (!db) return null;

  const doc = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
  if (!doc) return null;

  return {
    id: doc.id || String(doc._id),
    email: doc.email,
    name: doc.name,
    picture: doc.picture || '',
    password_hash: doc.password_hash || '',
    role: doc.role || 'user',
    provider: doc.provider || 'credentials',
    created_at: doc.created_at || new Date().toISOString(),
    updated_at: doc.updated_at || new Date().toISOString(),
  };
}

export async function findUserByIdMongo(id: string): Promise<User | null> {
  const db = await getMongoDb();
  if (!db) return null;

  const doc = await db.collection('users').findOne({ $or: [{ id }, { _id: id as any }] });
  if (!doc) return null;

  return {
    id: doc.id || String(doc._id),
    email: doc.email,
    name: doc.name,
    picture: doc.picture || '',
    password_hash: doc.password_hash || '',
    role: doc.role || 'user',
    provider: doc.provider || 'credentials',
    created_at: doc.created_at || new Date().toISOString(),
    updated_at: doc.updated_at || new Date().toISOString(),
  };
}

export async function createOrUpdateUserMongo(userData: {
  email: string;
  name: string;
  picture?: string;
  password_hash?: string;
  role?: 'user' | 'admin';
  provider?: 'credentials' | 'google';
}): Promise<User> {
  const db = await getMongoDb();
  if (!db) throw new Error('MongoDB is not configured');

  const collection = db.collection('users');
  await collection.createIndex({ email: 1 }, { unique: true });

  const email = userData.email.toLowerCase().trim();
  const now = new Date().toISOString();

  const existing = await collection.findOne({ email });

  if (existing) {
    const updated = {
      name: userData.name,
      picture: userData.picture !== undefined ? userData.picture : existing.picture || '',
      password_hash: userData.password_hash !== undefined ? userData.password_hash : existing.password_hash || '',
      role: userData.role || existing.role || 'user',
      provider: userData.provider || existing.provider || 'credentials',
      updated_at: now,
    };

    await collection.updateOne({ email }, { $set: updated });

    return {
      id: existing.id || String(existing._id),
      email,
      ...updated,
      created_at: existing.created_at || now,
    };
  }

  const userId = crypto.randomUUID();
  const newUser: User = {
    id: userId,
    email,
    name: userData.name,
    picture: userData.picture || '',
    password_hash: userData.password_hash || '',
    role: userData.role || 'user',
    provider: userData.provider || 'credentials',
    created_at: now,
    updated_at: now,
  };

  await collection.insertOne({
    _id: userId as any,
    ...newUser,
  });

  return newUser;
}

// -------------------------------------------------------------
// FATWA DAO (MongoDB Atlas)
// -------------------------------------------------------------

function mapMongoFatwaDoc(doc: any): FatwaQA {
  return {
    id: doc.id || String(doc._id),
    source: doc.source as FatwaSource,
    source_url: doc.source_url || '',
    title: doc.title || '',
    question: doc.question || '',
    answer: doc.answer || '',
    category: doc.category || 'General',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    scholar: doc.scholar || '',
    published_date: doc.published_date || doc.created_at || '',
    sha256_hash: doc.sha256_hash || '',
    scraped_at: doc.scraped_at || '',
    created_at: doc.created_at || new Date().toISOString(),
    updated_at: doc.updated_at || new Date().toISOString(),
  };
}

const fatwaCache = new Map<string, { data: FatwaQA; expiresAt: number }>();
const FATWA_CACHE_TTL = 15 * 60 * 1000; // 15 minutes TTL in memory

export async function getFatwaByIdMongo(idOrSlug: string): Promise<FatwaQA | null> {
  if (!idOrSlug || typeof idOrSlug !== 'string') return null;

  let decoded = idOrSlug.trim();
  try {
    decoded = decodeURIComponent(idOrSlug).trim();
  } catch {}

  const now = Date.now();
  const cached = fatwaCache.get(decoded);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const db = await getMongoDb();
  if (!db) return null;

  const collection = db.collection('fatwas');
  const candidate = extractIdFromSlug(decoded);

  if (candidate && candidate !== decoded) {
    const cachedCandidate = fatwaCache.get(candidate);
    if (cachedCandidate && cachedCandidate.expiresAt > now) {
      return cachedCandidate.data;
    }
  }

  let doc: any = null;
  const isUuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(candidate);
  const isHash = /^[a-f0-9]{64}$/i.test(candidate);

  if (isUuid || isHash) {
    doc = await collection.findOne({
      $or: [
        { _id: candidate as any },
        { id: candidate },
        { sha256_hash: candidate.toLowerCase() },
      ],
    });
  } else {
    const cleanHex = candidate.replace(/[^a-f0-9]/gi, '').toLowerCase();
    if (cleanHex.length >= 6) {
      doc = await collection.findOne({
        $or: [
          { _id: candidate as any },
          { id: candidate },
          { _id: { $regex: `^${cleanHex}` } },
          { id: { $regex: `^${cleanHex}` } },
          { sha256_hash: { $regex: `^${cleanHex}` } },
        ],
      });
    } else {
      doc = await collection.findOne({
        $or: [
          { id: decoded },
          { _id: decoded as any },
          { sha256_hash: decoded.toLowerCase() },
        ],
      });
    }
  }

  if (doc) {
    const mapped = mapMongoFatwaDoc(doc);
    const expiresAt = now + FATWA_CACHE_TTL;
    fatwaCache.set(decoded, { data: mapped, expiresAt });
    if (candidate) fatwaCache.set(candidate, { data: mapped, expiresAt });
    if (mapped.id) fatwaCache.set(mapped.id, { data: mapped, expiresAt });
    if (mapped.sha256_hash) fatwaCache.set(mapped.sha256_hash, { data: mapped, expiresAt });
    return mapped;
  }

  return null;
}

export async function upsertFatwaMongo(item: IngestItemInput): Promise<IngestResultItem> {
  const db = await getMongoDb();
  if (!db) throw new Error('MongoDB is not configured');

  const collection = db.collection('fatwas');
  await collection.createIndex({ id: 1 });
  await collection.createIndex({ sha256_hash: 1 }, { unique: true });
  await collection.createIndex({ source_url: 1 });
  await collection.createIndex({ source: 1, published_date: -1 });

  const question = item.question.trim();
  const answer = item.answer.trim();
  const sha256_hash = (item.sha256_hash || computeFatwaHash({ question, answer })).toLowerCase();
  const id = item.id || hashToUuid(sha256_hash);
  const now = new Date().toISOString();

  const existing = await collection.findOne({ sha256_hash });

  if (existing) {
    const hasChanged =
      existing.title !== item.title ||
      existing.category !== item.category ||
      existing.scholar !== item.scholar ||
      existing.source_url !== item.source_url;

    if (hasChanged) {
      await collection.updateOne(
        { sha256_hash },
        {
          $set: {
            title: item.title,
            category: item.category || 'General',
            tags: item.tags || [],
            scholar: item.scholar || '',
            source_url: item.source_url,
            published_date: item.published_date || existing.published_date,
            updated_at: now,
          },
        }
      );
      return { id: existing.id || String(existing._id), sha256_hash, status: 'updated' };
    }
    return { id: existing.id || String(existing._id), sha256_hash, status: 'skipped' };
  }

  let embedding: number[] | null = null;
  if (isEmbeddingConfigured()) {
    try {
      const formatted = formatFatwaForEmbedding({
        title: item.title,
        question,
        answer,
        category: item.category,
        scholar: item.scholar,
      });
      embedding = await getEmbedding(formatted);
    } catch {}
  }

  const newDoc: any = {
    _id: id as any,
    id,
    source: item.source,
    source_url: item.source_url,
    title: item.title,
    question,
    answer,
    category: item.category || 'General',
    tags: item.tags || [],
    scholar: item.scholar || '',
    published_date: item.published_date || now,
    sha256_hash,
    scraped_at: item.scraped_at || now,
    created_at: item.published_date || now,
    updated_at: now,
  };

  if (embedding && Array.isArray(embedding)) {
    newDoc.embedding = embedding;
    newDoc.embedded_at = now;
  }

  await collection.insertOne(newDoc);

  return { id, sha256_hash, status: 'inserted' };
}

export async function deleteFatwaMongo(id: string): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;

  const res = await db.collection('fatwas').deleteOne({
    $or: [{ id }, { _id: id as any }],
  });

  return (res.deletedCount || 0) > 0;
}

export async function listFatwasMongo(options: {
  q?: string;
  source?: string;
  category?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: FatwaQA[]; total: number }> {
  const db = await getMongoDb();
  if (!db) return { items: [], total: 0 };

  const collection = db.collection('fatwas');
  const filter: any = {};

  if (options.q) {
    const regex = new RegExp(options.q, 'i');
    filter.$or = [{ title: regex }, { question: regex }, { scholar: regex }];
  }

  if (options.source && options.source !== 'All') {
    filter.source = options.source;
  }

  if (options.category && options.category !== 'All') {
    filter.category = options.category;
  }

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 15));
  const skip = (page - 1) * limit;

  const total = await collection.countDocuments(filter);
  const docs = await collection
    .find(filter)
    .sort({ published_date: -1, created_at: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return {
    items: docs.map(mapMongoFatwaDoc),
    total,
  };
}

export async function getFatwaCountMongo(): Promise<number> {
  const db = await getMongoDb();
  if (!db) return 0;
  return db.collection('fatwas').estimatedDocumentCount();
}

export async function getFatwaMetadataListMongo(
  limit: number = 2000,
  offset: number = 0
): Promise<Array<{ id: string; title: string; updated_at: string; published_date: string }>> {
  const db = await getMongoDb();
  if (!db) return [];

  const docs = await db
    .collection('fatwas')
    .find({}, { projection: { _id: 0, id: 1, title: 1, updated_at: 1, published_date: 1 } })
    .sort({ _id: 1 })
    .skip(offset)
    .limit(limit)
    .toArray();

  return docs.map((d: any) => ({
    id: d.id || String(d._id),
    title: d.title || '',
    updated_at: d.updated_at || '',
    published_date: d.published_date || '',
  }));
}

export async function getFacetsMongo(): Promise<SearchFacets> {
  const db = await getMongoDb();
  if (!db) {
    return { sources: [], categories: [], scholars: [] };
  }

  const collection = db.collection('fatwas');

  const [sources, categories, scholars] = await Promise.all([
    collection
      .aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { name: '$_id', count: 1, _id: 0 } },
      ])
      .toArray(),
    collection
      .aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { name: '$_id', count: 1, _id: 0 } },
      ])
      .toArray(),
    collection
      .aggregate([
        { $match: { scholar: { $ne: '' } } },
        { $group: { _id: '$scholar', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
        { $project: { name: '$_id', count: 1, _id: 0 } },
      ])
      .toArray(),
  ]);

  return {
    sources: sources as { name: string; count: number }[],
    categories: categories as { name: string; count: number }[],
    scholars: scholars as { name: string; count: number }[],
  };
}

// -------------------------------------------------------------
// SESSIONS DAO (MongoDB Atlas)
// -------------------------------------------------------------

export async function createDbSessionMongo(data: {
  userId: string;
  email: string;
  role: string;
  tokenHash: string;
  expiresAt: string;
}): Promise<void> {
  const db = await getMongoDb();
  if (!db) return;

  try {
    const collection = db.collection('sessions');
    await collection.createIndex({ token_hash: 1 }, { unique: true });
    await collection.createIndex({ expires_at: 1 });

    const now = new Date().toISOString();
    await collection.updateOne(
      { token_hash: data.tokenHash },
      {
        $set: {
          user_id: data.userId,
          email: data.email.toLowerCase().trim(),
          role: data.role,
          token_hash: data.tokenHash,
          expires_at: data.expiresAt,
          last_active_at: now,
        },
        $setOnInsert: {
          created_at: now,
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.warn('[MongoDB createDbSessionMongo Warning]:', err);
  }
}

export async function findDbSessionByTokenHashMongo(tokenHash: string): Promise<any | null> {
  const db = await getMongoDb();
  if (!db) return null;

  try {
    const collection = db.collection('sessions');
    const now = new Date().toISOString();
    const doc = await collection.findOne({
      token_hash: tokenHash,
      expires_at: { $gt: now },
    });

    if (!doc) return null;

    return {
      id: doc.id || String(doc._id),
      user_id: doc.user_id,
      token_hash: doc.token_hash,
      role: doc.role,
      email: doc.email,
      created_at: doc.created_at,
      expires_at: doc.expires_at,
      last_active_at: doc.last_active_at,
    };
  } catch (err) {
    console.warn('[MongoDB findDbSessionByTokenHashMongo Warning]:', err);
    return null;
  }
}

export async function deleteDbSessionMongo(tokenHash: string): Promise<void> {
  const db = await getMongoDb();
  if (!db) return;

  try {
    await db.collection('sessions').deleteOne({ token_hash: tokenHash });
  } catch (err) {
    console.warn('[MongoDB deleteDbSessionMongo Warning]:', err);
  }
}

export async function deleteSessionsByUserIdMongo(userId: string): Promise<void> {
  const db = await getMongoDb();
  if (!db) return;

  try {
    await db.collection('sessions').deleteMany({ user_id: userId });
  } catch (err) {
    console.warn('[MongoDB deleteSessionsByUserIdMongo Warning]:', err);
  }
}

