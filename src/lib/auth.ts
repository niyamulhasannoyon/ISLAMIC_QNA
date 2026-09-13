import { cookies } from 'next/headers';
import crypto from 'crypto';

const ADMIN_COOKIE_NAME = 'is_admin_session';

export function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  return { username, password };
}

// Generate a deterministic session token based on credentials + secret
function generateSessionToken(username: string): string {
  const secret = process.env.INGESTION_SECRET_TOKEN || 'admin_secret_key_2026';
  return crypto.createHash('sha256').update(`${username}:${secret}`).digest('hex');
}

export function verifyAdminCredentials(user: string, pass: string): boolean {
  const { username, password } = getAdminCredentials();
  return user.trim() === username && pass.trim() === password;
}

export async function setAdminSession(username: string): Promise<string> {
  const token = generateSessionToken(username);
  const cookieStore = cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return token;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  const { username } = getAdminCredentials();
  const expectedToken = generateSessionToken(username);
  return token === expectedToken;
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}
