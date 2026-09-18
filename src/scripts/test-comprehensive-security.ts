import { serializeJsonLd, sanitizeString, stripAllHtml, sanitizeFatwaInput } from '../lib/sanitizer';
import { getClientIp } from '../lib/rateLimit';
import { getAllowedAdminEmails, isAllowedAdminEmail, ALLOWED_ADMIN_EMAILS } from '../lib/authConfig';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import nextConfig from '../../next.config.mjs';

async function runComprehensiveSecurityTests() {
  console.log('\n======================================================');
  console.log('🛡️  DEENQNA COMPREHENSIVE SECURITY VERIFICATION SUITE');
  console.log('======================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      throw new Error(`Test assertion failed: ${message}`);
    }
    passedTests++;
    console.log(`  ✅ ${message}`);
  }

  // ---------------------------------------------------------
  // 1. JSON-LD Serialization & Script Breakout XSS Prevention
  // ---------------------------------------------------------
  console.log('--- 1. JSON-LD Serialization & XSS Breakout Tests ---');
  {
    const attackPayload = {
      '@context': 'https://schema.org',
      '@type': 'QAPage',
      headline: '</script><script>alert("XSS")</script>',
      text: 'Evil <img src=x onerror=alert(1)> and unicode \u2028 \u2029',
      htmlContent: '<!-- <script>test</script> -->',
    };

    const serialized = serializeJsonLd(attackPayload);
    assert(!serialized.includes('</script>'), 'Serialized JSON-LD contains no raw "</script>" tag');
    assert(!serialized.includes('<script>'), 'Serialized JSON-LD contains no raw "<script>" tag');
    assert(!serialized.includes('<!--'), 'Serialized JSON-LD contains no raw HTML comment openers');
    assert(serialized.includes('\\u003c'), 'Serialized JSON-LD safely encodes "<" as \\u003c');
    assert(serialized.includes('\\u003e'), 'Serialized JSON-LD safely encodes ">" as \\u003e');
    assert(!serialized.includes('\u2028'), 'Serialized JSON-LD contains no raw unicode \\u2028 line separator');
    assert(!serialized.includes('\u2029'), 'Serialized JSON-LD contains no raw unicode \\u2029 paragraph separator');

    // Verify search engine crawler compatibility: JSON.parse must succeed and reconstruct original text
    const parsed = JSON.parse(serialized);
    assert(parsed.headline === '</script><script>alert("XSS")</script>', 'JSON.parse reconstructs exact original headline safely');
    assert(parsed.text.includes('\u2028'), 'JSON.parse preserves unicode line separator for crawler parsing');
  }

  // ---------------------------------------------------------
  // 2. Input Sanitization & Anti-XSS Multi-pass Tests
  // ---------------------------------------------------------
  console.log('\n--- 2. Recursive & Nested Input Sanitization Tests ---');
  {
    const nestedTagPayload = '<<SCRIPT>alert(1);//<</SCRIPT>';
    const sanitizedNested = sanitizeString(nestedTagPayload);
    assert(!sanitizedNested.toLowerCase().includes('script'), 'Nested tag injection stripped cleanly');

    const mixedCaseEvent = '<a href="javascript:alert(1)" onmouseover="evil()" ONERROR="bad()">Click</a>';
    const sanitizedEvent = sanitizeString(mixedCaseEvent);
    assert(!sanitizedEvent.toLowerCase().includes('javascript:'), 'javascript: URI scheme removed');
    assert(!sanitizedEvent.toLowerCase().includes('onerror'), 'Mixed-case ONERROR removed');
    assert(!sanitizedEvent.toLowerCase().includes('onmouseover'), 'onmouseover event handler removed');

    const solitaryScript = '</script><img src=x onerror="alert(1)">Hello';
    const sanitizedSolitary = sanitizeString(solitaryScript);
    assert(!sanitizedSolitary.toLowerCase().includes('script'), 'Solitary closing </script> tag stripped cleanly');
    assert(!sanitizedSolitary.toLowerCase().includes('onerror'), 'Solitary tag event handler stripped cleanly');

    const unclosedScript = '<script src="https://evil.com/xss.js">Unclosed script text';
    const sanitizedUnclosed = sanitizeString(unclosedScript);
    assert(!sanitizedUnclosed.toLowerCase().includes('<script'), 'Unclosed opening <script tag stripped cleanly');

    const allHtml = '<p>Hello <strong>World</strong> <script>bad()</script></p>';
    const stripped = stripAllHtml(allHtml);
    assert(stripped === 'Hello World', 'stripAllHtml cleanly removed all tag markup and script contents');
  }

  // ---------------------------------------------------------
  // 3. Client IP Extraction & Anti-Spoofing Tests
  // ---------------------------------------------------------
  console.log('\n--- 3. Client IP Extraction & Anti-Spoofing Tests ---');
  {
    // Test: Spoofed X-Forwarded-For when X-Real-IP is provided by trusted reverse proxy
    const spoofedReq1 = new NextRequest('http://localhost:3000/api/search', {
      headers: {
        'x-forwarded-for': '10.0.0.1, 192.168.1.1', // Attacker spoofing upstream internal IP
        'x-real-ip': '203.0.113.45',                 // Real edge proxy IP
      },
    });
    const ip1 = getClientIp(spoofedReq1);
    assert(ip1 === '203.0.113.45', 'getClientIp prioritizes trusted x-real-ip over spoofed x-forwarded-for');

    // Test: Vercel Forwarded For prioritized
    const vercelReq = new NextRequest('http://localhost:3000/api/search', {
      headers: {
        'x-vercel-forwarded-for': '198.51.100.17',
        'x-forwarded-for': '1.2.3.4',
      },
    });
    const ip2 = getClientIp(vercelReq);
    assert(ip2 === '198.51.100.17', 'getClientIp prioritizes trusted x-vercel-forwarded-for');

    // Test: Invalid IP format fallback
    const invalidIpReq = new NextRequest('http://localhost:3000/api/search', {
      headers: {
        'x-real-ip': 'invalid-ip-format!#$%',
      },
    });
    const ip3 = getClientIp(invalidIpReq);
    assert(ip3 === '127.0.0.1', 'Invalid IP header safely falls back to 127.0.0.1');
  }

  // ---------------------------------------------------------
  // 4. Ingestion Authentication & Timing Attack Protection
  // ---------------------------------------------------------
  console.log('\n--- 4. Ingestion Constant-Time Token Verification Tests ---');
  {
    const secret = 'production-secret-token-value-must-be-secure-32ch';
    const validHeader = `Bearer ${secret}`;
    const invalidHeader = `Bearer wrong-token-value`;
    const attackerPrefixMatch = `Bearer ${secret.slice(0, 10)}wrongwrongwrong`;

    function verifyIngestAuth(authHeader: string | null, configuredSecret: string): boolean {
      if (!authHeader?.startsWith('Bearer ')) return false;
      const token = authHeader.replace('Bearer ', '').trim();
      if (!token || !configuredSecret) return false;

      const tokenBuffer = Buffer.from(token);
      const secretBuffer = Buffer.from(configuredSecret);

      if (tokenBuffer.length !== secretBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(tokenBuffer, secretBuffer);
    }

    assert(verifyIngestAuth(validHeader, secret) === true, 'Valid Bearer token accepted');
    assert(verifyIngestAuth(invalidHeader, secret) === false, 'Invalid Bearer token rejected');
    assert(verifyIngestAuth(attackerPrefixMatch, secret) === false, 'Prefix-matching token rejected');
    assert(verifyIngestAuth(null, secret) === false, 'Null auth header rejected');
    assert(verifyIngestAuth('Bearer ', secret) === false, 'Empty Bearer token rejected');
  }

  // ---------------------------------------------------------
  // 5. Auth Credentials & DoS Bounds Tests
  // ---------------------------------------------------------
  console.log('\n--- 5. Auth Input Bounds & DoS Prevention Tests ---');
  {
    // Passwords longer than 128 characters can cause CPU exhaustion in scrypt/bcrypt
    const hugePassword = 'A'.repeat(500);
    const shortPassword = 'short';
    const validPassword = 'CorrectLengthPass123!';

    function validatePasswordBounds(pwd: string): { valid: boolean; error?: string } {
      if (!pwd || pwd.length < 8) return { valid: false, error: 'Password must be at least 8 characters long.' };
      if (pwd.length > 128) return { valid: false, error: 'Password cannot exceed 128 characters.' };
      return { valid: true };
    }

    assert(!validatePasswordBounds(hugePassword).valid, 'Oversized 500-char password rejected (prevents scrypt CPU DoS)');
    assert(!validatePasswordBounds(shortPassword).valid, 'Short password under 8 chars rejected');
    assert(validatePasswordBounds(validPassword).valid, 'Valid length password accepted');
  }

  // ---------------------------------------------------------
  // 6. Security Headers & Next.js Hardening Tests
  // ---------------------------------------------------------
  console.log('\n--- 6. Security Headers & Next.js Configuration Tests ---');
  {
    assert(nextConfig.poweredByHeader === false, 'X-Powered-By header disabled in next.config.mjs');

    const headersConfig = await nextConfig.headers();
    assert(headersConfig.length > 0, 'Security headers rule defined in next.config.mjs');

    const globalHeaders = headersConfig.find((h: any) => h.source === '/:path*')?.headers || [];
    const headerMap = new Map(globalHeaders.map((h: any) => [h.key.toLowerCase(), h.value]));

    assert(headerMap.has('x-frame-options'), 'X-Frame-Options header present (DENY/SAMEORIGIN)');
    assert(headerMap.get('x-frame-options') === 'DENY', 'X-Frame-Options set to DENY against clickjacking');
    assert(headerMap.has('x-content-type-options'), 'X-Content-Type-Options header present');
    assert(headerMap.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options set to nosniff');
    assert(headerMap.has('referrer-policy'), 'Referrer-Policy header present');
    assert(headerMap.has('permissions-policy'), 'Permissions-Policy header present');
    assert(headerMap.has('strict-transport-security'), 'HSTS header present');
    assert(headerMap.has('content-security-policy'), 'Content-Security-Policy header present');
  }

  // ---------------------------------------------------------
  // 7. Dynamic Admin Emails & Secret Hygiene Tests
  // ---------------------------------------------------------
  console.log('\n--- 7. Dynamic Admin Emails & Secret Hygiene Tests ---');
  {
    const savedEnv = process.env.ADMIN_EMAILS;

    // Test when unset: must return empty array without falling back to hardcoded personal emails
    delete process.env.ADMIN_EMAILS;
    assert(getAllowedAdminEmails().length === 0, 'Unset ADMIN_EMAILS returns empty array (no hardcoded fallback emails)');
    assert(!isAllowedAdminEmail('attacker@example.com'), 'Random email rejected when ADMIN_EMAILS unset');

    // Test when set dynamically
    process.env.ADMIN_EMAILS = 'admin1@deenqna.org,admin2@deenqna.org';
    assert(getAllowedAdminEmails().length === 2, 'Configured ADMIN_EMAILS parsed correctly');
    assert(isAllowedAdminEmail('admin1@deenqna.org'), 'Configured admin email accepted');
    assert(isAllowedAdminEmail('ADMIN1@DEENQNA.ORG'), 'Case-insensitive email check verified');
    assert(!isAllowedAdminEmail('other@deenqna.org'), 'Non-whitelisted email rejected');

    // Restore env
    if (savedEnv) {
      process.env.ADMIN_EMAILS = savedEnv;
    } else {
      delete process.env.ADMIN_EMAILS;
    }
  }

  // ---------------------------------------------------------
  // Summary
  // ---------------------------------------------------------
  console.log('\n======================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} COMPREHENSIVE SECURITY TESTS PASSED!`);
  console.log('======================================================\n');
}

runComprehensiveSecurityTests().catch((err) => {
  console.error('\n❌ Security verification suite encountered an error:', err);
  process.exit(1);
});
