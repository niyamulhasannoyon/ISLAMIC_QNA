import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { NextRequest } from 'next/server';
import { GET as searchGET } from '../app/api/v1/search/route';
import { POST as ragPOST } from '../app/api/v1/rag/route';
import { POST as adminFatwaPOST, DELETE as adminFatwaDELETE } from '../app/api/v1/admin/fatwa/route';
import {
  createOrUpdateUser,
  findUserByEmail,
  findDbSessionByTokenHash,
  createDbSession,
  deleteDbSession,
} from '../lib/db';
import {
  setUserSession,
  getCurrentUserSession,
  revokeSessionByToken,
  createUserSessionToken,
  parseUserSessionToken,
} from '../lib/userAuth';
import crypto from 'crypto';

if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = 'test_ultra_secure_session_signing_secret_64_characters_long_for_test!';
}
if (!process.env.ADMIN_EMAILS) {
  process.env.ADMIN_EMAILS = 'niyamulhasanbd@gmail.com,niyamulhasan1089@gmail.com';
}

async function runTests() {
  console.log('========================================================');
  console.log('🧪 RUNNING REPO HYGIENE, DX & SECURITY VERIFICATION TESTS');
  console.log('========================================================\n');

  // TEST 1: Repo Hygiene & .gitignore
  console.log('--- TEST 1: Repo Hygiene & Data File Untracking ---');
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  if (!gitignoreContent.includes('data/*.json')) {
    throw new Error('FAILED: data/*.json is missing from .gitignore');
  }
  console.log('✅ .gitignore correctly includes data/*.json');

  const trackedDataJson = execSync('git ls-files "data/*.json"', { encoding: 'utf8' }).trim();
  if (trackedDataJson.length > 0) {
    throw new Error(`FAILED: data/*.json files are still tracked in git:\n${trackedDataJson}`);
  }
  console.log('✅ No data/*.json files are tracked in git index.');

  // TEST 2: Decoupled Build and Seed Safety Check
  console.log('\n--- TEST 2: Decoupled Build Script & Seed "if empty" Check ---');
  const pkgJsonPath = path.join(process.cwd(), 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  if (pkgJson.scripts.build !== 'next build') {
    throw new Error(`FAILED: package.json build script should be 'next build', got: ${pkgJson.scripts.build}`);
  }
  console.log('✅ package.json build script is safely decoupled from seed ("next build").');

  const seedOutput = execSync('npm run seed', { encoding: 'utf8' });
  if (!seedOutput.includes('Skipping seed') && !seedOutput.includes('already contains')) {
    throw new Error(`FAILED: seed script did not skip when records exist. Output:\n${seedOutput}`);
  }
  console.log('✅ Seed script correctly checks "if empty" and safely skips re-seeding.');

  // TEST 3: Admin CSRF Protection on Write Routes
  console.log('\n--- TEST 3: Admin CSRF Protection on Write Endpoints ---');
  // 3a. POST with untrusted cross-origin
  const fakeCrossHostReq = new NextRequest('http://localhost:3000/api/v1/admin/fatwa', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://malicious-evil-domain.com',
      host: 'localhost:3000',
    },
    body: JSON.stringify({ title: 'test', question: 'test', answer: 'test', source: 'al-itisam' }),
  });
  const crossPostRes = await adminFatwaPOST(fakeCrossHostReq);
  if (crossPostRes.status !== 403) {
    throw new Error(`FAILED: Expected 403 Forbidden for cross-origin POST, got: ${crossPostRes.status}`);
  }
  const crossPostData = await crossPostRes.json();
  console.log(`✅ Cross-origin POST blocked with status 403: "${crossPostData.error}"`);

  // 3b. DELETE with untrusted cross-origin
  const fakeCrossDeleteReq = new NextRequest('http://localhost:3000/api/v1/admin/fatwa?id=123', {
    method: 'DELETE',
    headers: {
      origin: 'http://attacker-site.org',
      host: 'localhost:3000',
    },
  });
  const crossDeleteRes = await adminFatwaDELETE(fakeCrossDeleteReq);
  if (crossDeleteRes.status !== 403) {
    throw new Error(`FAILED: Expected 403 Forbidden for cross-origin DELETE, got: ${crossDeleteRes.status}`);
  }
  const crossDeleteData = await crossDeleteRes.json();
  console.log(`✅ Cross-origin DELETE blocked with status 403: "${crossDeleteData.error}"`);

  // TEST 4: Database-Backed Session Revocation
  console.log('\n--- TEST 4: Database-Backed Session Revocation & Invalidation ---');
  const testUser = createOrUpdateUser({
    email: 'test_session_user@example.com',
    name: 'Session Test User',
    role: 'user',
    provider: 'credentials',
  });

  const sessionToken = createUserSessionToken({
    id: testUser.id,
    email: testUser.email,
    name: testUser.name,
    picture: '',
    role: testUser.role,
    provider: testUser.provider,
  });
  const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  // Create session in DB
  createDbSession({
    userId: testUser.id,
    email: testUser.email,
    role: testUser.role,
    tokenHash,
    expiresAt,
  });

  // Verify session exists in DB
  const activeSession = findDbSessionByTokenHash(tokenHash);
  if (!activeSession) {
    throw new Error('FAILED: Session was not found in DB after creation');
  }
  console.log('✅ Active session successfully stored and verified in SQLite sessions table.');

  // Revoke session
  revokeSessionByToken(sessionToken);
  const revokedSession = findDbSessionByTokenHash(tokenHash);
  if (revokedSession !== null) {
    throw new Error('FAILED: Revoked session was still found in DB');
  }
  console.log('✅ Session successfully revoked and deleted from SQLite sessions table.');

  // TEST 5: Input Validation & Query Length Limits
  console.log('\n--- TEST 5: Search and RAG Query Length Limits ---');
  // 5a. Excessive Search Query (> 500 characters)
  const hugeQuery = 'a'.repeat(550);
  const searchOverLimitReq = new NextRequest(`http://localhost:3000/api/v1/search?q=${hugeQuery}`, {
    method: 'GET',
  });
  const searchOverRes = await searchGET(searchOverLimitReq);
  if (searchOverRes.status !== 400) {
    throw new Error(`FAILED: Expected 400 Bad Request for query > 500 chars, got: ${searchOverRes.status}`);
  }
  const searchOverData = await searchOverRes.json();
  console.log('✅ Search query > 500 chars rejected with 400 Bad Request:', searchOverData.details);

  // 5b. Valid Search Query
  const searchValidReq = new NextRequest('http://localhost:3000/api/v1/search?q=সালাত', {
    method: 'GET',
  });
  const searchValidRes = await searchGET(searchValidReq);
  if (searchValidRes.status !== 200) {
    throw new Error(`FAILED: Expected 200 OK for valid search query, got: ${searchValidRes.status}`);
  }
  console.log('✅ Valid search query accepted with 200 OK.');

  // 5c. Excessive RAG Question (> 1000 characters)
  const hugeRAGQuestion = 'কী বিধান? '.repeat(150); // ~1500 chars
  const ragOverLimitReq = new NextRequest('http://localhost:3000/api/v1/rag', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: hugeRAGQuestion }),
  });
  const ragOverRes = await ragPOST(ragOverLimitReq);
  if (ragOverRes.status !== 400) {
    throw new Error(`FAILED: Expected 400 Bad Request for RAG question > 1000 chars, got: ${ragOverRes.status}`);
  }
  const ragOverData = await ragOverRes.json();
  console.log('✅ RAG question > 1000 chars rejected with 400 Bad Request:', ragOverData.details);

  console.log('\n🎉 ALL REPO HYGIENE, DX & SECURITY TESTS PASSED PERFECTLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
