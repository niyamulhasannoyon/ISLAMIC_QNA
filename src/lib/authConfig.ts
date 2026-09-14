import crypto from 'crypto';
import { UserSession } from '@/types/user';

export const ADMIN_COOKIE_NAME = 'is_admin_session';
export const USER_COOKIE_NAME = 'fatwa_user_session';

export const ADMIN_SESSION_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const USER_SESSION_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface AdminSessionPayload {
  type: 'admin_session';
  identifier: string; // admin email or username
  email: string;
  jti: string; // cryptographically random UUID nonce
  iat: number;
  exp: number;
}

export interface UserTokenPayload {
  type: 'user_session';
  id: string;
  email: string;
  name: string;
  picture: string;
  role: string;
  provider: string;
  jti: string;
  iat: number;
  exp: number;
}

/**
 * Returns the cryptographically secure auth secret from environment.
 * Throws a fatal configuration error if AUTH_SECRET is missing or too short.
 * NEVER provides a silent insecure fallback.
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.INGESTION_SECRET_TOKEN;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'CRITICAL SECURITY CONFIGURATION ERROR: AUTH_SECRET environment variable is missing. ' +
      'Authentication operations are disabled. Define AUTH_SECRET (min 32 characters) in your environment.'
    );
  }
  if (secret.trim().length < 32) {
    throw new Error(
      'CRITICAL SECURITY CONFIGURATION ERROR: AUTH_SECRET environment variable is too short. ' +
      'It must be at least 32 characters long for cryptographic security.'
    );
  }
  return secret.trim();
}

/**
 * Strictly authorized admin emails allowed to access the admin panel:
 * - niyamulhasanbd@gmail.com
 * - niyamulhasan1089@gmail.com
 */
export const ALLOWED_ADMIN_EMAILS: readonly string[] = [
  'niyamulhasanbd@gmail.com',
  'niyamulhasan1089@gmail.com',
];

/**
 * Dynamically resolves allowed admin emails from ADMIN_EMAILS environment variable.
 * Fallbacks to ALLOWED_ADMIN_EMAILS if environment variable is missing or empty.
 */
export function getAllowedAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS;
  if (!envEmails || envEmails.trim().length === 0) {
    return [...ALLOWED_ADMIN_EMAILS];
  }
  const configured = envEmails
    .split(',')
    .map((email) => email.toLowerCase().trim())
    .filter(Boolean);
  return configured.length > 0 ? configured : [...ALLOWED_ADMIN_EMAILS];
}

/**
 * Checks if the given email is an authorized administrator.
 */
export function isAllowedAdminEmail(email: string): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  const allowed = getAllowedAdminEmails();
  return allowed.includes(normalized);
}

/**
 * Reads admin credentials from environment without any hardcoded defaults.
 * If not set, returns empty strings which disables password-based admin login.
 */
export function getAdminCredentials() {
  const username = (process.env.ADMIN_USERNAME || '').trim();
  const password = (process.env.ADMIN_PASSWORD || '').trim();
  return { username, password };
}

/**
 * Verifies username and password against configured environment credentials in constant time.
 * If credentials are not configured in environment, returns false immediately.
 */
export function verifyAdminCredentials(user: string, pass: string): boolean {
  const { username: envUser, password: envPass } = getAdminCredentials();
  if (!envUser || !envPass || envPass.length < 8) {
    return false;
  }

  const userBuf = Buffer.from((user || '').trim(), 'utf8');
  const envUserBuf = Buffer.from(envUser, 'utf8');
  const passBuf = Buffer.from((pass || '').trim(), 'utf8');
  const envPassBuf = Buffer.from(envPass, 'utf8');

  if (userBuf.length !== envUserBuf.length || passBuf.length !== envPassBuf.length) {
    return false;
  }

  const userMatch = crypto.timingSafeEqual(userBuf, envUserBuf);
  const passMatch = crypto.timingSafeEqual(passBuf, envPassBuf);
  return userMatch && passMatch;
}

/**
 * Checks if identifier is an authorized admin (either allowed admin email or configured admin username).
 */
export function isAllowedAdmin(identifier: string): boolean {
  if (!identifier) return false;
  const normalized = identifier.toLowerCase().trim();
  if (isAllowedAdminEmail(normalized)) return true;

  const { username: envUser, password: envPass } = getAdminCredentials();
  if (envUser && envPass && normalized === envUser.toLowerCase()) {
    return true;
  }

  return false;
}

/**
 * Generates a signed, non-deterministic session token for an admin
 * containing a random cryptographic nonce (jti), issued timestamp, and expiry.
 */
export function createAdminSessionToken(identifier: string): string {
  const normalized = identifier.toLowerCase().trim();
  if (!isAllowedAdmin(normalized)) {
    throw new Error(`Unauthorized: '${normalized}' is not an authorized administrator.`);
  }

  const secret = getAuthSecret();
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    type: 'admin_session',
    identifier: normalized,
    email: normalized,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + ADMIN_SESSION_EXPIRY_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes an admin session token.
 * Validates HMAC signature with constant-time comparison, type, expiry, and allowed admin status.
 */
export function verifyAdminSessionToken(token: string): AdminSessionPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [encodedPayload, signature] = parts;
    if (!encodedPayload || !signature) return null;

    const secret = getAuthSecret();
    const expectedSignature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');

    const sigBuf = Buffer.from(signature, 'base64url');
    const expectedBuf = Buffer.from(expectedSignature, 'base64url');

    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    const jsonStr = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const payload = JSON.parse(jsonStr) as AdminSessionPayload;

    if (payload.type !== 'admin_session') return null;
    const adminId = payload.identifier || payload.email;
    if (!adminId || !payload.jti || typeof payload.exp !== 'number') return null;

    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp) {
      return null; // Expired token
    }

    if (!isAllowedAdmin(adminId)) {
      return null; // Revoked or unauthorized admin
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generates a signed, non-deterministic session token for a user
 * containing a random cryptographic nonce (jti), issued timestamp, and expiry.
 */
export function createUserSessionToken(user: UserSession): string {
  const secret = getAuthSecret();
  const now = Math.floor(Date.now() / 1000);
  const payload: UserTokenPayload = {
    type: 'user_session',
    id: user.id,
    email: user.email.toLowerCase().trim(),
    name: user.name,
    picture: user.picture || '',
    role: user.role,
    provider: user.provider,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + USER_SESSION_EXPIRY_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes a user session token.
 * Validates HMAC signature with constant-time comparison, type, expiry, and admin role authorization.
 */
export function parseUserSessionToken(token: string): UserSession | null {
  try {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [encodedPayload, signature] = parts;
    if (!encodedPayload || !signature) return null;

    const secret = getAuthSecret();
    const expectedSignature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');

    const sigBuf = Buffer.from(signature, 'base64url');
    const expectedBuf = Buffer.from(expectedSignature, 'base64url');

    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    const jsonStr = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const payload = JSON.parse(jsonStr) as UserTokenPayload;

    if (payload.type !== 'user_session') return null;
    if (!payload.id || !payload.email || typeof payload.exp !== 'number') return null;

    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp) {
      return null; // Expired session
    }

    // Defense-in-depth: if role claims admin, verify email is in allowed admin list
    const isActuallyAdmin = payload.role === 'admin' && isAllowedAdmin(payload.email);
    const role = isActuallyAdmin ? 'admin' : 'user';

    const provider: 'credentials' | 'google' = payload.provider === 'google' ? 'google' : 'credentials';

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name || 'User',
      picture: payload.picture || '',
      role,
      provider,
    };
  } catch {
    return null;
  }
}
