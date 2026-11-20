import { NextRequest } from 'next/server';
import { getAdminCredentials, verifyAdminCredentials } from '../lib/auth';
import { POST as adminAuthHandler } from '../app/api/v1/admin/auth/route';

async function runAdminCredentialsSecurityTests() {
  console.log('=== Running Admin Credentials Security Tests ===\n');

  const originalUsername = process.env.ADMIN_USERNAME;
  const originalPassword = process.env.ADMIN_PASSWORD;
  const originalAuthSecret = process.env.AUTH_SECRET;

  process.env.AUTH_SECRET = 'test_auth_secret_key_with_at_least_32_characters_long_for_security';

  try {
    // ----------------------------------------------------
    // Scenario 1: Environment variables are NOT set
    // ----------------------------------------------------
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;

    console.log('Test 1: Check getAdminCredentials() has no default "admin" or "admin123"...');
    const creds = getAdminCredentials();
    if (creds.username === 'admin' || creds.password === 'admin123') {
      throw new Error(`SECURITY VULNERABILITY: Hardcoded admin defaults detected! username="${creds.username}", password="${creds.password}"`);
    }
    if (creds.username !== '' || creds.password !== '') {
      throw new Error(`Expected empty strings when env vars are not set, got username="${creds.username}", password="${creds.password}"`);
    }
    console.log('✅ Test 1 PASSED: No default hardcoded credentials in getAdminCredentials().\n');

    console.log('Test 2: verifyAdminCredentials("admin", "admin123") must fail when env vars are unset...');
    const attempt1 = verifyAdminCredentials('admin', 'admin123');
    if (attempt1 !== false) {
      throw new Error('SECURITY VULNERABILITY: verifyAdminCredentials("admin", "admin123") succeeded without env vars!');
    }
    const attempt2 = verifyAdminCredentials('', '');
    if (attempt2 !== false) {
      throw new Error('SECURITY VULNERABILITY: verifyAdminCredentials("", "") succeeded!');
    }
    console.log('✅ Test 2 PASSED: verifyAdminCredentials returns false for any credentials when env vars unset.\n');

    console.log('Test 3: POST /api/v1/admin/auth with action="login" must return 403 (disabled) when env vars unset...');
    const reqLoginDisabled = new NextRequest('http://localhost:3000/api/v1/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        username: 'admin',
        password: 'admin123',
      }),
    });
    const resLoginDisabled = await adminAuthHandler(reqLoginDisabled);
    const bodyLoginDisabled = await resLoginDisabled.json();
    console.log(`Response Status: ${resLoginDisabled.status}`, bodyLoginDisabled);

    if (resLoginDisabled.status !== 403) {
      throw new Error(`Expected 403 Forbidden when credentials login is disabled, got ${resLoginDisabled.status}`);
    }
    console.log('✅ Test 3 PASSED: Credentials login endpoint is completely disabled (403) when env vars are unset.\n');

    // ----------------------------------------------------
    // Scenario 2: Partial environment variables set (only username or only password)
    // ----------------------------------------------------
    console.log('Test 4: Partial env vars (only username set)...');
    process.env.ADMIN_USERNAME = 'valid_admin';
    delete process.env.ADMIN_PASSWORD;
    if (verifyAdminCredentials('valid_admin', 'some_password') !== false) {
      throw new Error('SECURITY VULNERABILITY: Partial credential allowed verification!');
    }
    console.log('✅ Test 4 PASSED: Partial credential configuration is safely rejected.\n');

    // ----------------------------------------------------
    // Scenario 3: Valid environment variables configured
    // ----------------------------------------------------
    console.log('Test 5: Valid env vars configured...');
    const testAdminUser = 'test_sysadmin_' + Date.now();
    const testAdminPass = 'super_secure_complex_password_2026!';
    process.env.ADMIN_USERNAME = testAdminUser;
    process.env.ADMIN_PASSWORD = testAdminPass;

    // Common brute-force pair must fail
    if (verifyAdminCredentials('admin', 'admin123') !== false) {
      throw new Error('SECURITY VULNERABILITY: admin/admin123 matched custom configured credentials!');
    }

    // Wrong password must fail
    if (verifyAdminCredentials(testAdminUser, 'wrong_pass') !== false) {
      throw new Error('SECURITY VULNERABILITY: Wrong password matched!');
    }

    // Correct password must succeed
    if (verifyAdminCredentials(testAdminUser, testAdminPass) !== true) {
      throw new Error('Configured credentials failed verification!');
    }
    console.log('✅ Test 5 PASSED: Configured credentials verify accurately and reject incorrect/default inputs.\n');

    console.log('Test 6: POST /api/v1/admin/auth with action="login" when configured...');
    const reqLoginSuccess = new NextRequest('http://localhost:3000/api/v1/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        username: testAdminUser,
        password: testAdminPass,
      }),
    });
    const resLoginSuccess = await adminAuthHandler(reqLoginSuccess);
    const bodyLoginSuccess = await resLoginSuccess.json();
    console.log(`Response Status: ${resLoginSuccess.status}`, bodyLoginSuccess);

    if (resLoginSuccess.status !== 200 || !bodyLoginSuccess.success) {
      throw new Error(`Expected 200 OK for valid configured credentials, got ${resLoginSuccess.status}`);
    }
    console.log('✅ Test 6 PASSED: Legitimate admin login succeeds when env vars are properly configured.\n');

    console.log('🎉 ALL ADMIN CREDENTIALS SECURITY TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    // Restore original env
    if (originalUsername !== undefined) {
      process.env.ADMIN_USERNAME = originalUsername;
    } else {
      delete process.env.ADMIN_USERNAME;
    }
    if (originalPassword !== undefined) {
      process.env.ADMIN_PASSWORD = originalPassword;
    } else {
      delete process.env.ADMIN_PASSWORD;
    }
    if (originalAuthSecret !== undefined) {
      process.env.AUTH_SECRET = originalAuthSecret;
    } else {
      delete process.env.AUTH_SECRET;
    }
  }
}

runAdminCredentialsSecurityTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
