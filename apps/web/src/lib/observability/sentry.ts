/**
 * Sentry Error Tracking & Diagnostic Logging Wrapper
 * 
 * Provides production-grade error reporting and breadcrumb capture
 * without throwing errors or breaking user execution paths when SENTRY_DSN
 * is unconfigured or in offline/development environments.
 */

interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id?: string; anonymous?: boolean };
}

export function captureException(error: unknown, context?: ErrorContext): string {
  const eventId = Math.random().toString(36).substring(2, 15);
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // In production with SENTRY_DSN configured, forward event
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (dsn) {
    try {
      // If Sentry client is initialized in global scope, dispatch
      const globalSentry = (globalThis as any).Sentry;
      if (globalSentry && typeof globalSentry.captureException === 'function') {
        return globalSentry.captureException(error, context);
      }
    } catch {
      // Never let telemetry crash the app
    }
  }

  // Structured diagnostic logging for SRE log aggregators
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
    console.error(`[Sentry:${eventId}] Captured Exception:`, errorMessage, {
      stack,
      context,
    });
  }

  return eventId;
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): string {
  const eventId = Math.random().toString(36).substring(2, 15);
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (dsn) {
    try {
      const globalSentry = (globalThis as any).Sentry;
      if (globalSentry && typeof globalSentry.captureMessage === 'function') {
        return globalSentry.captureMessage(message, level);
      }
    } catch {}
  }

  return eventId;
}
