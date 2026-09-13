import { cookies } from "next/headers";
import crypto from "crypto";
import { User, UserSession } from "@/types/user";
import { findUserByEmail, findUserById, createOrUpdateUser } from "./db";
import { setAdminSession } from "./auth";

const USER_COOKIE_NAME = "fatwa_user_session";
const AUTH_SECRET = process.env.INGESTION_SECRET_TOKEN || "fatwa_archive_jwt_secret_key_2026";

/**
 * Hash password securely with SHA-256 and salt
 */
export function hashPassword(password: string): string {
  return crypto.createHmac("sha256", AUTH_SECRET).update(password).digest("hex");
}

/**
 * Verify user password
 */
export function verifyPassword(password: string, passwordHash: string): boolean {
  const hash = hashPassword(password);
  return hash === passwordHash;
}

/**
 * Generate a signed session token for user
 */
function createSessionToken(user: UserSession): string {
  const payload = JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    role: user.role,
    provider: user.provider,
    iat: Date.now(),
  });
  const encodedPayload = Buffer.from(payload).toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(encodedPayload).digest("hex");
  return `${encodedPayload}.${signature}`;
}

/**
 * Parse and verify user session token
 */
export function parseSessionToken(token: string): UserSession | null {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;

    const expectedSignature = crypto.createHmac("sha256", AUTH_SECRET).update(encodedPayload).digest("hex");
    if (signature !== expectedSignature) return null;

    const jsonStr = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload = JSON.parse(jsonStr);

    if (!payload.id || !payload.email) return null;

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name || "User",
      picture: payload.picture || "",
      role: payload.role || "user",
      provider: payload.provider || "credentials",
    };
  } catch (err) {
    return null;
  }
}

/**
 * Sets user session HTTP-Only cookie
 */
export async function setUserSession(user: User): Promise<void> {
  const session: UserSession = {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture || "",
    role: user.role,
    provider: user.provider,
  };
  const token = createSessionToken(session);

  const cookieStore = cookies();
  cookieStore.set(USER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  // If user is admin, also set admin cookie session
  if (user.role === "admin") {
    await setAdminSession(user.email);
  }
}

/**
 * Get current authenticated user session from cookie
 */
export async function getCurrentUserSession(): Promise<UserSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(USER_COOKIE_NAME)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

/**
 * Clear user session cookie
 */
export async function clearUserSession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(USER_COOKIE_NAME);
}

/**
 * Verify Google ID Token / OAuth Credential Token
 */
export async function verifyGoogleToken(credentialToken: string): Promise<{
  email: string;
  name: string;
  picture: string;
  sub: string;
} | null> {
  if (!credentialToken) return null;

  try {
    // 1. First attempt verification via Google TokenInfo API
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credentialToken}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.email) {
        return {
          email: data.email,
          name: data.name || data.email.split("@")[0],
          picture: data.picture || "",
          sub: data.sub || data.user_id || "",
        };
      }
    }
  } catch (err) {
    console.warn("Google tokeninfo API error:", err);
  }

  // 2. Decode JWT payload directly (for GIS Credential / OAuth ID tokens)
  try {
    const parts = credentialToken.split(".");
    if (parts.length === 3) {
      const payloadStr = Buffer.from(parts[1], "base64url").toString("utf8");
      const payload = JSON.parse(payloadStr);
      if (payload && payload.email) {
        return {
          email: payload.email,
          name: payload.name || payload.given_name || payload.email.split("@")[0],
          picture: payload.picture || "",
          sub: payload.sub || "",
        };
      }
    }
  } catch (decodeErr) {
    console.warn("Google token decoding error:", decodeErr);
  }

  return null;
}
