import { describe, it, expect } from 'vitest';
import { GET as getHealth } from '@/app/api/health/route';
import { GET as getV1Health } from '@/app/api/v1/health/route';

describe('Health Check Endpoints', () => {
  it('returns HTTP 200 and healthy system state for /api/health', async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(typeof data.uptime).toBe('number');
    expect(data.checks.api).toBe('ok');
    expect(data.checks.database).toBe('healthy');
    expect(data.database.totalFatwas).toBeGreaterThanOrEqual(0);
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('returns HTTP 200 and valid status for /api/v1/health', async () => {
    const res = await getV1Health();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.checks.database).toBe('healthy');
  });
});
