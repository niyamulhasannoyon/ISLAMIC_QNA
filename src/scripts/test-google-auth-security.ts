import { NextRequest } from 'next/server';
import { POST as googleAuthHandler } from '../app/api/v1/auth/google/route';
import { verifyGoogleToken } from '../lib/userAuth';

async function runSecurityTests() {
  console.log('=== Running Google Auth Security Tests ===\n');

  // Test 1: Direct mockUser exploit attempt (the exact exploit reported)
  console.log('Test 1: Attempting login using mockUser exploit...');
  const mockUserReq = new NextRequest('http://localhost:3000/api/v1/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mockUser: {
        email: 'niyamulhasanbd@gmail.com',
        name: 'Attacker Impersonating Admin',
      },
    }),
  });

  const mockUserRes = await googleAuthHandler(mockUserReq);
  const mockUserBody = await mockUserRes.json();
  console.log(`Response Status: ${mockUserRes.status}`, mockUserBody);
  if (mockUserRes.status !== 400) {
    throw new Error(`SECURITY VULNERABILITY: mockUser was not rejected with 400! Got ${mockUserRes.status}`);
  }
  console.log('✅ Test 1 PASSED: mockUser exploit is 100% blocked with status 400.\n');

  // Test 2: Forged / fake unsigned JWT attempt
  console.log('Test 2: Attempting login using forged unsigned JWT...');
  const fakeHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const fakePayload = Buffer.from(JSON.stringify({
    email: 'niyamulhasanbd@gmail.com',
    email_verified: true,
    name: 'Fake Admin',
    sub: '1234567890',
  })).toString('base64url');
  const forgedToken = `${fakeHeader}.${fakePayload}.`;

  const forgedReq = new NextRequest('http://localhost:3000/api/v1/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credentialToken: forgedToken,
      isAdminLogin: true,
    }),
  });

  const forgedRes = await googleAuthHandler(forgedReq);
  const forgedBody = await forgedRes.json();
  console.log(`Response Status: ${forgedRes.status}`, forgedBody);
  if (forgedRes.status !== 401) {
    throw new Error(`SECURITY VULNERABILITY: Forged JWT was not rejected with 401! Got ${forgedRes.status}`);
  }
  console.log('✅ Test 2 PASSED: Forged JWT token is rejected by OAuth2Client.verifyIdToken with status 401.\n');

  // Test 3: verifyGoogleToken with garbage / empty strings
  console.log('Test 3: Testing verifyGoogleToken unit behavior...');
  const emptyRes = await verifyGoogleToken('');
  if (emptyRes !== null) {
    throw new Error('Expected null for empty token');
  }
  const garbageRes = await verifyGoogleToken('invalid.token.here');
  if (garbageRes !== null) {
    throw new Error('Expected null for garbage token');
  }
  console.log('✅ Test 3 PASSED: verifyGoogleToken safely returns null on invalid/forged tokens.\n');

  console.log('🎉 ALL SECURITY TESTS PASSED SUCCESSFULLY! The admin bypass vulnerability is completely eliminated.');
}

runSecurityTests().catch((err) => {
  console.error('Security test failed:', err);
  process.exit(1);
});
