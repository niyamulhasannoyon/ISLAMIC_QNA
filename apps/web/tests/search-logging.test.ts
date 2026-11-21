import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { recordZeroResultSearch, getDb } from '@/lib/db';

describe('Search Logs & Observability', () => {
  it('ignores empty, undefined, or whitespace-only queries', () => {
    expect(recordZeroResultSearch('')).toBe('');
    expect(recordZeroResultSearch('   ')).toBe('');
    expect(recordZeroResultSearch(null as any)).toBe('');
  });

  it('records zero-result searches with SHA-256 hash and no raw PII', () => {
    const testQuery = 'একটিঅজানাশব্দযাখুঁজেপাওয়াযাবেনা';
    const rawSession = 'user_session_abc123';
    
    const logId = recordZeroResultSearch(testQuery, rawSession);
    expect(logId).toBeTruthy();

    const db = getDb();
    const row = db.prepare('SELECT * FROM search_logs WHERE id = ?').get(logId) as any;
    expect(row).toBeDefined();
    expect(row.id).toBe(logId);
    expect(row.result_count).toBe(0);

    // Verify SHA-256 query hash
    const expectedHash = crypto.createHash('sha256').update(testQuery.toLowerCase()).digest('hex');
    expect(row.query_hash).toBe(expectedHash);
    expect(row.query_hash.length).toBe(64);

    // Verify that raw session ID is NOT stored (it must be hashed/salted)
    expect(row.anonymous_session_hash).not.toContain(rawSession);
    expect(row.anonymous_session_hash.length).toBe(32);
  });
});
