import { NextRequest } from 'next/server';

export type RateLimitTier = 'auth' | 'rag' | 'ingest' | 'search' | 'default';

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMIT_TIERS: Record<RateLimitTier, RateLimitConfig> = {
  auth: { limit: 10, windowSeconds: 60 },
  rag: { limit: 10, windowSeconds: 60 },
  ingest: { limit: 20, windowSeconds: 60 },
  search: { limit: 60, windowSeconds: 60 },
  default: { limit: 60, windowSeconds: 60 },
};

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory sliding window cache for fallback
interface WindowEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, WindowEntry>();

// Periodic cleanup of stale memory entries (every 60s)
let lastCleanup = Date.now();
function cleanupMemoryStore() {
  const now = Date.now();
  if (now - lastCleanup > 60000) {
    lastCleanup = now;
    for (const [k, v] of memoryStore.entries()) {
      if (v.resetAt <= now) {
        memoryStore.delete(k);
      }
    }
  }
}

/**
 * Extracts client IP address safely from standard proxy headers
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();

  return (req as any).ip || '127.0.0.1';
}

/**
 * Checks rate limit using Upstash Redis if configured, otherwise falls back to in-memory store
 */
export async function checkRateLimit(
  req: NextRequest,
  tier: RateLimitTier
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.default;
  const ip = getClientIp(req);
  const key = `ratelimit:${tier}:${ip}`;

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  // 1. Try Upstash Redis REST API if credentials exist
  if (upstashUrl && upstashToken) {
    try {
      const pipelineUrl = `${upstashUrl.replace(/\/$/, '')}/pipeline`;
      const res = await fetch(pipelineUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, config.windowSeconds, 'NX'],
          ['TTL', key],
        ]),
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        // data is an array of responses: [incrResult, expireResult, ttlResult]
        const currentCount = Number(data[0]?.result || 1);
        const ttl = Number(data[2]?.result || config.windowSeconds);
        const resetTimestamp = Math.floor(Date.now() / 1000) + Math.max(1, ttl);

        const remaining = Math.max(0, config.limit - currentCount);
        return {
          success: currentCount <= config.limit,
          limit: config.limit,
          remaining,
          reset: resetTimestamp,
        };
      }
    } catch (err) {
      console.warn('[RateLimit] Upstash Redis check failed, falling back to memory:', err);
    }
  }

  // 2. High performance in-memory sliding window fallback
  cleanupMemoryStore();
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: Math.floor((now + windowMs) / 1000),
    };
  }

  entry.count += 1;
  const remaining = Math.max(0, config.limit - entry.count);
  return {
    success: entry.count <= config.limit,
    limit: config.limit,
    remaining,
    reset: Math.floor(entry.resetAt / 1000),
  };
}
