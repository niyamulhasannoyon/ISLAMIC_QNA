import crypto from 'crypto';
import { UserSession } from '../types/user';
import {
  getAuthSecret,
  getAllowedAdminEmails,
  isAllowedAdminEmail,
  isAllowedAdmin,
  createAdminSessionToken,
  verifyAdminSessionToken,
  createUserSessionToken,
  parseUserSessionToken,
} from '../lib/authConfig';

async function runSessionSecurityTests() {
  console.log('=== Running Auth Session Security Tests ===\n');

  const originalAuthSecret = process.env.AUTH_SECRET;
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  try {
    const validSecret = 'test_ultra_secure_session_signing_secret_64_characters_long_for_test!';
    process.env.AUTH_SECRET = validSecret;
    process.env.ADMIN_EMAILS = 'niyamulhasanbd@gmail.com,niyamulhasan1089@gmail.com';

    // ----------------------------------------------------
    // Test 1: Forgery attempt using old deterministic sha256 hash
    // ----------------------------------------------------
    console.log('Test 1: Attempting admin bypass with old deterministic hash sha256(email:fallback_secret)...');
    const oldDeterministicHash = crypto
      .createHash('sha256')
      .update('niyamulhasanbd@gmail.com:admin_secret_key_2026')
      .digest('hex');

    const bypassResult1 = verifyAdminSessionToken(oldDeterministicHash);
    if (bypassResult1 !== null) {
      throw new Error('CRITICAL SECURITY FLAW: Old deterministic sha256 hash was accepted as admin session!');
    }
    console.log('✅ Test 1 PASSED: Deterministic SHA-256 forge attempt safely rejected with null.\n');

    // ----------------------------------------------------
    // Test 2: Forgery attempt using old fallback secret 'fatwa_archive_jwt_secret_key_2026'
    // ----------------------------------------------------
    console.log('Test 2: Attempting user/admin session forge with old hardcoded JWT secret...');
    const fakePayload = {
      type: 'user_session',
      id: 'attacker-1',
      email: 'niyamulhasanbd@gmail.com',
      name: 'Attacker Impersonating Admin',
      picture: '',
      role: 'admin',
      provider: 'credentials',
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const encodedFakePayload = Buffer.from(JSON.stringify(fakePayload)).toString('base64url');
    const forgedOldSignature = crypto
      .createHmac('sha256', 'fatwa_archive_jwt_secret_key_2026')
      .update(encodedFakePayload)
      .digest('base64url');
    const forgedOldToken = `${encodedFakePayload}.${forgedOldSignature}`;

    const bypassResult2 = parseUserSessionToken(forgedOldToken);
    if (bypassResult2 !== null) {
      throw new Error('CRITICAL SECURITY FLAW: Forged token with old hardcoded secret was accepted!');
    }
    console.log('✅ Test 2 PASSED: Forged token with legacy fallback secret safely rejected.\n');

    // ----------------------------------------------------
    // Test 3: Boot-time / run-time fail fast when AUTH_SECRET is missing
    // ----------------------------------------------------
    console.log('Test 3: Checking fail-fast when AUTH_SECRET is missing...');
    delete process.env.AUTH_SECRET;
    let missingSecretThrew = false;
    try {
      getAuthSecret();
    } catch (err: any) {
      if (err?.message?.includes('CRITICAL SECURITY CONFIGURATION ERROR: AUTH_SECRET')) {
        missingSecretThrew = true;
      }
    }
    if (!missingSecretThrew) {
      throw new Error('SECURITY FLAW: getAuthSecret() did not throw a critical error when AUTH_SECRET was missing!');
    }

    let tokenCreationThrew = false;
    try {
      createUserSessionToken({
        id: 'u-1',
        email: 'test@example.com',
        name: 'Test',
        picture: '',
        role: 'user',
        provider: 'credentials',
      });
    } catch (err: any) {
      if (err?.message?.includes('AUTH_SECRET')) {
        tokenCreationThrew = true;
      }
    }
    if (!tokenCreationThrew) {
      throw new Error('SECURITY FLAW: createUserSessionToken did not fail-fast when AUTH_SECRET was missing!');
    }
    console.log('✅ Test 3 PASSED: Missing AUTH_SECRET fails fast with descriptive critical error, no silent fallback.\n');

    // ----------------------------------------------------
    // Test 4: Fail fast when AUTH_SECRET is too short (< 32 characters)
    // ----------------------------------------------------
    console.log('Test 4: Checking fail-fast when AUTH_SECRET is weak (<32 chars)...');
    process.env.AUTH_SECRET = 'too_short_secret';
    let weakSecretThrew = false;
    try {
      getAuthSecret();
    } catch (err: any) {
      if (err?.message?.includes('too short')) {
        weakSecretThrew = true;
      }
    }
    if (!weakSecretThrew) {
      throw new Error('SECURITY FLAW: Weak AUTH_SECRET was allowed!');
    }
    console.log('✅ Test 4 PASSED: Weak secret (<32 chars) is rejected.\n');

    // Restore valid secret for subsequent tests
    process.env.AUTH_SECRET = validSecret;

    // ----------------------------------------------------
    // Test 5: Expiration verification
    // ----------------------------------------------------
    console.log('Test 5: Testing expired token rejection...');
    const expiredPayload = {
      type: 'admin_session',
      identifier: 'niyamulhasanbd@gmail.com',
      email: 'niyamulhasanbd@gmail.com',
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    };
    const encodedExpiredPayload = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
    const expiredSig = crypto
      .createHmac('sha256', validSecret)
      .update(encodedExpiredPayload)
      .digest('base64url');
    const expiredToken = `${encodedExpiredPayload}.${expiredSig}`;

    const expiredResult = verifyAdminSessionToken(expiredToken);
    if (expiredResult !== null) {
      throw new Error('SECURITY FLAW: Expired admin token was accepted!');
    }
    console.log('✅ Test 5 PASSED: Expired session token is strictly rejected.\n');

    // ----------------------------------------------------
    // Test 6: Non-deterministic tokens (random jti nonce)
    // ----------------------------------------------------
    console.log('Test 6: Verifying tokens are non-deterministic (unique nonces)...');
    const adminEmail = 'niyamulhasanbd@gmail.com';
    const tokenA = createAdminSessionToken(adminEmail);
    const tokenB = createAdminSessionToken(adminEmail);

    if (tokenA === tokenB) {
      throw new Error('SECURITY FLAW: Admin session tokens are deterministic! Repeated calls returned identical tokens.');
    }

    const payloadA = verifyAdminSessionToken(tokenA);
    const payloadB = verifyAdminSessionToken(tokenB);

    if (!payloadA?.jti || !payloadB?.jti || payloadA.jti === payloadB.jti) {
      throw new Error('SECURITY FLAW: Session tokens missing unique cryptographic jti nonces!');
    }
    console.log(`Token A JTI: ${payloadA.jti}`);
    console.log(`Token B JTI: ${payloadB.jti}`);
    console.log('✅ Test 6 PASSED: Session tokens are completely non-deterministic with unique random nonces.\n');

    // ----------------------------------------------------
    // Test 7: Tamper resistance (signature verification)
    // ----------------------------------------------------
    console.log('Test 7: Testing payload tampering detection...');
    const userSession: UserSession = {
      id: 'usr_100',
      email: 'regular_user@example.com',
      name: 'Regular User',
      picture: '',
      role: 'user',
      provider: 'credentials',
    };
    const validUserToken = createUserSessionToken(userSession);
    const [headerPayload, userSig] = validUserToken.split('.');

    // Attacker modifies the payload to change role to 'admin'
    const decodedUserPayload = JSON.parse(Buffer.from(headerPayload, 'base64url').toString('utf8'));
    decodedUserPayload.role = 'admin';
    const tamperedPayload = Buffer.from(JSON.stringify(decodedUserPayload)).toString('base64url');
    const tamperedToken = `${tamperedPayload}.${userSig}`;

    const tamperedResult = parseUserSessionToken(tamperedToken);
    if (tamperedResult !== null) {
      throw new Error('SECURITY FLAW: Tampered payload with mismatched signature was accepted!');
    }
    console.log('✅ Test 7 PASSED: Tampered payload is rejected by HMAC signature verification.\n');

    // ----------------------------------------------------
    // Test 8: Unauthorized admin email rejection
    // ----------------------------------------------------
    console.log('Test 8: Testing unauthorized admin email rejection...');
    let unauthorizedCreationBlocked = false;
    try {
      createAdminSessionToken('attacker@evil.com');
    } catch (err: any) {
      unauthorizedCreationBlocked = true;
    }
    if (!unauthorizedCreationBlocked) {
      throw new Error('SECURITY FLAW: createAdminSessionToken allowed non-admin email!');
    }

    // Attacker crafts a token for unauthorized email signed with the valid secret
    const unauthorizedAdminPayload = {
      type: 'admin_session',
      identifier: 'attacker@evil.com',
      email: 'attacker@evil.com',
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const encUnauthorized = Buffer.from(JSON.stringify(unauthorizedAdminPayload)).toString('base64url');
    const unauthSig = crypto.createHmac('sha256', validSecret).update(encUnauthorized).digest('base64url');
    const unauthToken = `${encUnauthorized}.${unauthSig}`;

    const unauthResult = verifyAdminSessionToken(unauthToken);
    if (unauthResult !== null) {
      throw new Error('SECURITY FLAW: verifyAdminSessionToken accepted unauthorized admin email!');
    }
    console.log('✅ Test 8 PASSED: Unauthorized admin email is blocked from token creation and verification.\n');

    // ----------------------------------------------------
    // Test 9: Defense-in-depth on user session role elevation
    // ----------------------------------------------------
    console.log('Test 9: Testing defense-in-depth role elevation prevention in user session...');
    const elevatedUser: UserSession = {
      id: 'usr_200',
      email: 'regular_user@example.com',
      name: 'Sneaky User',
      picture: '',
      role: 'admin', // Claims admin role but email is not in ADMIN_EMAILS
      provider: 'credentials',
    };
    const elevatedToken = createUserSessionToken(elevatedUser);
    const parsedElevated = parseUserSessionToken(elevatedToken);

    if (parsedElevated?.role === 'admin') {
      throw new Error('SECURITY FLAW: Non-whitelisted email was able to obtain admin role via user token!');
    }
    if (parsedElevated?.role !== 'user') {
      throw new Error(`Expected role to be downgraded to 'user', got '${parsedElevated?.role}'`);
    }
    console.log('✅ Test 9 PASSED: Role is safely downgraded to "user" if email is not an authorized admin.\n');

    // ----------------------------------------------------
    // Test 10: Valid admin and user authentication flow
    // ----------------------------------------------------
    console.log('Test 10: Testing legitimate admin session creation and verification...');
    const legitToken = createAdminSessionToken('niyamulhasanbd@gmail.com');
    const legitPayload = verifyAdminSessionToken(legitToken);

    if (!legitPayload || legitPayload.email !== 'niyamulhasanbd@gmail.com') {
      throw new Error('Legitimate admin session failed verification!');
    }
    console.log(`Verified Admin Session: email=${legitPayload.email}, jti=${legitPayload.jti}, exp in ${legitPayload.exp - Math.floor(Date.now()/1000)}s`);
    console.log('✅ Test 10 PASSED: Legitimate admin session verified successfully.\n');

    console.log('🎉 ALL 10 AUTH SESSION SECURITY TESTS PASSED SUCCESSFULLY! The deterministic session token and hardcoded fallback secret vulnerabilities are 100% eliminated.');
  } finally {
    if (originalAuthSecret !== undefined) {
      process.env.AUTH_SECRET = originalAuthSecret;
    } else {
      delete process.env.AUTH_SECRET;
    }
    if (originalAdminEmails !== undefined) {
      process.env.ADMIN_EMAILS = originalAdminEmails;
    } else {
      delete process.env.ADMIN_EMAILS;
    }
  }
}

runSessionSecurityTests().catch((err) => {
  console.error('❌ Session security test failed:', err);
  process.exit(1);
});
