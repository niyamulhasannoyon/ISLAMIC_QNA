import {
  ALLOWED_ADMIN_EMAILS,
  getAllowedAdminEmails,
  isAllowedAdminEmail,
  isAllowedAdmin,
  createAdminSessionToken,
  verifyAdminSessionToken,
  createUserSessionToken,
  parseUserSessionToken,
} from '../lib/authConfig';
import { UserSession } from '../types/user';

async function runAdminWhitelistTests() {
  console.log('====================================================');
  console.log('🧪 TESTING ADMIN EMAIL WHITELIST & ACCESS CONTROL');
  console.log('====================================================\n');

  const savedAuthSecret = process.env.AUTH_SECRET;
  const savedAdminEmails = process.env.ADMIN_EMAILS;

  process.env.AUTH_SECRET = 'test_secret_for_whitelist_verification_at_least_32_characters!';

  try {
    // ----------------------------------------------------
    // TEST 1: Check dynamic ADMIN_EMAILS resolution
    // ----------------------------------------------------
    console.log('--- TEST 1: Dynamic ADMIN_EMAILS Definition ---');
    process.env.ADMIN_EMAILS = 'niyamulhasanbd@gmail.com,niyamulhasan1089@gmail.com';
    if (!ALLOWED_ADMIN_EMAILS.includes('niyamulhasanbd@gmail.com')) {
      throw new Error('FAILED: niyamulhasanbd@gmail.com is missing from configured ADMIN_EMAILS');
    }
    if (!ALLOWED_ADMIN_EMAILS.includes('niyamulhasan1089@gmail.com')) {
      throw new Error('FAILED: niyamulhasan1089@gmail.com is missing from configured ADMIN_EMAILS');
    }
    if (ALLOWED_ADMIN_EMAILS.length !== 2) {
      throw new Error(`FAILED: ALLOWED_ADMIN_EMAILS should contain exactly 2 emails, found ${ALLOWED_ADMIN_EMAILS.length}`);
    }
    console.log('✅ Dynamic ALLOWED_ADMIN_EMAILS contains exactly the 2 authorized emails:');
    ALLOWED_ADMIN_EMAILS.forEach((email) => console.log(`   - ${email}`));

    // ----------------------------------------------------
    // TEST 2: Check secure default when ADMIN_EMAILS env is unset (No hardcoded leak)
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Fallback when ADMIN_EMAILS is unset ---');
    delete process.env.ADMIN_EMAILS;
    const fallbackEmails = getAllowedAdminEmails();
    if (fallbackEmails.length !== 0) {
      throw new Error(`FAILED: Expected 0 fallback emails when unset, got ${fallbackEmails.length}`);
    }
    console.log('✅ Fallback correctly resolves to empty array when env var is unset (no hardcoded leak).');
    process.env.ADMIN_EMAILS = 'niyamulhasanbd@gmail.com,niyamulhasan1089@gmail.com';

    // ----------------------------------------------------
    // TEST 3: Validation of authorized admin emails
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Validation of Authorized Emails ---');
    if (!isAllowedAdminEmail('niyamulhasanbd@gmail.com')) {
      throw new Error('FAILED: niyamulhasanbd@gmail.com was not recognized as allowed admin');
    }
    if (!isAllowedAdminEmail('niyamulhasan1089@gmail.com')) {
      throw new Error('FAILED: niyamulhasan1089@gmail.com was not recognized as allowed admin');
    }
    console.log('✅ Both niyamulhasanbd@gmail.com and niyamulhasan1089@gmail.com are recognized as authorized admins.');

    // ----------------------------------------------------
    // TEST 4: Case-insensitivity & whitespace trimming
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Case-Insensitivity & Whitespace Normalization ---');
    if (!isAllowedAdminEmail('  NIYAMULHASANBD@GMAIL.COM  ')) {
      throw new Error('FAILED: Upper case niyamulhasanbd@gmail.com failed check');
    }
    if (!isAllowedAdminEmail('NiyamulHasan1089@Gmail.com ')) {
      throw new Error('FAILED: Mixed case niyamulhasan1089@gmail.com failed check');
    }
    console.log('✅ Case-insensitivity and whitespace normalization verified.');

    // ----------------------------------------------------
    // TEST 5: Strict rejection of any unauthorized email
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Rejection of Unauthorized Emails ---');
    const unauthorizedEmails = [
      'admin@example.com',
      'user@gmail.com',
      'hacker@domain.com',
      'niyamulhasan@gmail.com',
      'niyamulhasan108@gmail.com',
      'other.admin@gmail.com',
      '',
    ];

    for (const email of unauthorizedEmails) {
      if (isAllowedAdminEmail(email)) {
        throw new Error(`CRITICAL SECURITY FAILURE: Unauthorized email '${email}' was accepted as admin!`);
      }
      if (isAllowedAdmin(email)) {
        throw new Error(`CRITICAL SECURITY FAILURE: isAllowedAdmin accepted '${email}'!`);
      }
    }
    console.log(`✅ All ${unauthorizedEmails.length} unauthorized emails strictly rejected.`);

    // ----------------------------------------------------
    // TEST 6: Admin token generation & verification
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Admin Session Token Generation & Verification ---');
    const tokenA = createAdminSessionToken('niyamulhasanbd@gmail.com');
    const verifiedA = verifyAdminSessionToken(tokenA);
    if (!verifiedA || verifiedA.email !== 'niyamulhasanbd@gmail.com') {
      throw new Error('FAILED: Failed to create or verify session token for niyamulhasanbd@gmail.com');
    }

    const tokenB = createAdminSessionToken('niyamulhasan1089@gmail.com');
    const verifiedB = verifyAdminSessionToken(tokenB);
    if (!verifiedB || verifiedB.email !== 'niyamulhasan1089@gmail.com') {
      throw new Error('FAILED: Failed to create or verify session token for niyamulhasan1089@gmail.com');
    }

    let blockedUnauthorized = false;
    try {
      createAdminSessionToken('random_person@gmail.com');
    } catch {
      blockedUnauthorized = true;
    }
    if (!blockedUnauthorized) {
      throw new Error('CRITICAL SECURITY FAILURE: createAdminSessionToken allowed an unauthorized email!');
    }
    console.log('✅ Token creation succeeds for the 2 authorized emails and throws for unauthorized emails.');

    // ----------------------------------------------------
    // TEST 7: Defense-in-depth against role escalation in user session
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Defense-in-Depth Role Escalation Prevention ---');
    const fakeAdminUser: UserSession = {
      id: 'fake-admin-1',
      email: 'attacker@gmail.com',
      name: 'Attacker',
      picture: '',
      role: 'admin',
      provider: 'google',
    };
    const userToken = createUserSessionToken(fakeAdminUser);
    const parsedToken = parseUserSessionToken(userToken);
    if (parsedToken?.role === 'admin') {
      throw new Error('CRITICAL SECURITY FAILURE: Non-whitelisted user maintained admin role via session token!');
    }
    if (parsedToken?.role !== 'user') {
      throw new Error('FAILED: Expected role to be downgraded to user');
    }
    console.log('✅ Role escalation blocked: Unauthorized email role safely downgraded to "user".');

    const validAdminUser: UserSession = {
      id: 'admin-1',
      email: 'niyamulhasanbd@gmail.com',
      name: 'Niyamul Hasan',
      picture: '',
      role: 'admin',
      provider: 'google',
    };
    const validAdminToken = createUserSessionToken(validAdminUser);
    const parsedAdminToken = parseUserSessionToken(validAdminToken);
    if (parsedAdminToken?.role !== 'admin') {
      throw new Error('FAILED: Legitimate admin email role was incorrectly stripped');
    }
    console.log('✅ Legitimate admin session verified: niyamulhasanbd@gmail.com maintains admin role.');

    console.log('\n🎉 ALL ADMIN EMAIL WHITELIST VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    process.env.AUTH_SECRET = savedAuthSecret;
    if (savedAdminEmails !== undefined) {
      process.env.ADMIN_EMAILS = savedAdminEmails;
    } else {
      delete process.env.ADMIN_EMAILS;
    }
  }
}

runAdminWhitelistTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
