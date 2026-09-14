import { NextRequest } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Validates that a state-changing request (POST, PUT, DELETE, PATCH)
 * originated from a trusted same-origin source and not via Cross-Site Request Forgery (CSRF).
 */
export function verifyCsrf(req: NextRequest): { valid: boolean; error?: string } {
  const method = req.method.toUpperCase();
  if (SAFE_METHODS.has(method)) {
    return { valid: true };
  }

  const originHeader = req.headers.get('origin');
  const refererHeader = req.headers.get('referer');
  const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const requestedWith = req.headers.get('x-requested-with');
  const csrfTokenHeader = req.headers.get('x-csrf-token');

  const hasCustomHeader = requestedWith === 'XMLHttpRequest' || !!csrfTokenHeader;

  // 1. If Origin header is present, it must match the server host
  if (originHeader) {
    try {
      const originUrl = new URL(originHeader);
      const hostClean = (hostHeader || '').split(':')[0].toLowerCase();
      const originHostname = originUrl.hostname.toLowerCase();

      if (originHostname === hostClean) {
        return { valid: true };
      }

      // Allow localhost/127.0.0.1 combinations in development/test
      const isLocalhost =
        (originHostname === 'localhost' || originHostname === '127.0.0.1') &&
        (!hostClean || hostClean === 'localhost' || hostClean === '127.0.0.1');
      if (isLocalhost) {
        return { valid: true };
      }

      // Check configured APP_URL or NEXT_PUBLIC_APP_URL
      const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
      if (configuredAppUrl) {
        const appUrl = new URL(configuredAppUrl);
        if (originHostname === appUrl.hostname.toLowerCase()) {
          return { valid: true };
        }
      }

      return {
        valid: false,
        error: `CSRF validation failed: Origin mismatch (${originHeader} does not match ${hostHeader})`,
      };
    } catch {
      return { valid: false, error: 'CSRF validation failed: Invalid Origin URL header' };
    }
  }

  // 2. If Origin is missing (e.g. some same-origin navigations), inspect Referer
  if (refererHeader) {
    try {
      const refererUrl = new URL(refererHeader);
      const hostClean = (hostHeader || '').split(':')[0].toLowerCase();
      const refererHostname = refererUrl.hostname.toLowerCase();

      if (refererHostname === hostClean) {
        return { valid: true };
      }

      const isLocalhost =
        (refererHostname === 'localhost' || refererHostname === '127.0.0.1') &&
        (!hostClean || hostClean === 'localhost' || hostClean === '127.0.0.1');
      if (isLocalhost) {
        return { valid: true };
      }

      const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
      if (configuredAppUrl) {
        const appUrl = new URL(configuredAppUrl);
        if (refererHostname === appUrl.hostname.toLowerCase()) {
          return { valid: true };
        }
      }

      return {
        valid: false,
        error: `CSRF validation failed: Referer mismatch (${refererHeader} does not match ${hostHeader})`,
      };
    } catch {
      return { valid: false, error: 'CSRF validation failed: Invalid Referer header' };
    }
  }

  // 3. If neither Origin nor Referer is provided, verify custom header
  if (hasCustomHeader) {
    return { valid: true };
  }

  // Reject state-changing requests in production if origin/referer/custom headers are missing
  if (process.env.NODE_ENV === 'production') {
    return {
      valid: false,
      error: 'CSRF validation failed: Missing Origin, Referer, or custom protection header',
    };
  }

  return { valid: true };
}
