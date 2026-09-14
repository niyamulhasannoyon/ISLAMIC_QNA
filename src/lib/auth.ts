import { cookies } from 'next/headers';
import crypto from 'crypto';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_EXPIRY_SECONDS,
  AdminSessionPayload,
  getAuthSecret,
  getAllowedAdminEmails,
  isAllowedAdminEmail,
  getAdminCredentials,
  verifyAdminCredentials,
  isAllowedAdmin,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from './authConfig';
import { getCurrentUserSession } from './userAuth';
import { createDbSession, findDbSessionByTokenHash, deleteDbSession } from './db';

export {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_EXPIRY_SECONDS,
  getAuthSecret,
  getAllowedAdminEmails,
  isAllowedAdminEmail,
  getAdminCredentials,
  verifyAdminCredentials,
  isAllowedAdmin,
  createAdminSessionToken,
  verifyAdminSessionToken,
};
export type { AdminSessionPayload };

/**
 * Sets the admin session HTTP-Only cookie with a DB-backed session record.
 */
export async function setAdminSession(identifier: string): Promise<string> {
  const token = createAdminSessionToken(identifier);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_EXPIRY_SECONDS * 1000).toISOString();

  try {
    createDbSession({
      userId: 'admin:' + identifier,
      email: identifier,
      role: 'admin',
      tokenHash,
      expiresAt,
    });
  } catch (err) {
    console.error('Failed to create admin DB session:', err);
  }

  try {
    const cookieStore = cookies();
    cookieStore.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ADMIN_SESSION_EXPIRY_SECONDS,
      path: '/',
    });
  } catch {
    // Running outside Next.js request scope (e.g. test scripts)
  }
  return token;
}

/**
 * Checks if the current request is authenticated as an administrator.
 * Validates either:
 * 1. An active, valid, non-expired, non-revoked is_admin_session verified against SQLite sessions.
 * 2. An active, valid, non-expired user session with role === 'admin' and an allowed admin email.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    // 1. Check direct admin cookie session
    const cookieStore = cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (token) {
      const validAdminPayload = verifyAdminSessionToken(token);
      if (validAdminPayload) {
        // Validate active session in database
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const dbSession = findDbSessionByTokenHash(tokenHash);
        if (dbSession && dbSession.role === 'admin') {
          return true;
        }
      }
    }

    // 2. Check user session cookie
    const userSession = await getCurrentUserSession();
    if (userSession && userSession.role === 'admin' && isAllowedAdmin(userSession.email)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Clears the admin session cookie and deletes the active session from database.
 */
export async function clearAdminSession(): Promise<void> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      deleteDbSession(tokenHash);
    }
    cookieStore.delete(ADMIN_COOKIE_NAME);
  } catch {
    // Running outside Next.js request scope (e.g. test scripts)
  }
}
