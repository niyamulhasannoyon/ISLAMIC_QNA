import { NextResponse } from 'next/server';
import { getFatwaCountAsync } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let totalFatwas = 0;

  try {
    totalFatwas = await getFatwaCountAsync();
  } catch (err: any) {
    dbStatus = 'degraded';
    console.error('[HealthCheck Error]:', err?.message || err);
  }

  const responseTimeMs = Date.now() - startTime;
  const status = dbStatus === 'healthy' ? 200 : 503;

  return NextResponse.json(
    {
      status: dbStatus === 'healthy' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '0.1.0',
      database: {
        status: dbStatus,
        totalFatwas,
        responseTimeMs,
      },
      checks: {
        api: 'ok',
        database: dbStatus,
      },
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
