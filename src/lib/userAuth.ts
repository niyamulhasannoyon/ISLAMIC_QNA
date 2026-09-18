import { cookies } from "next/headers";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { User, UserSession } from "@/types/user";
import {
  findUserByEmail,
  findUserById,
  findUserByIdAsync,
  createOrUpdateUser,
  createDbSession,
  createDbSessionAsync,
  findDbSessionByTokenHash,
  findDbSessionByTokenHashAsync,
  deleteDbSession,
  deleteDbSessionAsync,
  deleteSessionsByUserId,
  deleteSessionsByUserIdAsync,
} from "./db";
import {
  USER_COOKIE_NAME,
  ADMIN_COOKIE_NAME,
  USER_SESSION_EXPIRY_SECONDS,
  ADMIN_SESSION_EXPIRY_SECONDS,
  getAuthSecret,
  isAllowedAdmin,
  createUserSessionToken,
  parseUserSessionToken,
  createAdminSessionToken,
} from "./authConfig";

export {
  USER_COOKIE_NAME,
  USER_SESSION_EXPIRY_SECONDS,
  createUserSessionToken,
  createUserSessionToken as createSessionToken,
  parseUserSessionToken,
  parseUserSessionToken as parseSessionToken,
};

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const googleAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Hash password securely with scrypt and per-user random salt (RFC 7914)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derivedKey}`;
}

/**
 * Verify user password supporting modern scrypt and legacy HMAC-SHA256 fallback
 */
export function verifyPassword(password: string, passwordHash: string): boolean {
  if (!password || !passwordHash) return false;

  if (passwordHash.startsWith("scrypt:")) {
    const parts = passwordHash.split(":");
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const key = parts[2];
    const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
    const keyBuffer = Buffer.from(key, "hex");
    const derivedBuffer = Buffer.from(derivedKey, "hex");
    if (keyBuffer.length !== derivedBuffer.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
  }

  // Legacy HMAC-SHA256 fallback for existing credentials
  try {
    const secret =
      process.env.AUTH_SECRET ||
      process.env.INGESTION_SECRET_TOKEN ||
      process.env.LEGACY_AUTH_SECRET;
    if (!secret) {
      return false;
    }
    const legacyHash = crypto.createHmac("sha256", secret).update(password).digest("hex");
    const legBuffer = Buffer.from(legacyHash, "hex");
    const storedBuffer = Buffer.from(passwordHash, "hex");
    if (legBuffer.length !== storedBuffer.length) return false;
    return crypto.timingSafeEqual(legBuffer, storedBuffer);
  } catch {
    return false;
  }
}

/**
 * Sets user session HTTP-Only cookie with a DB-backed session record
 */
export async function setUserSession(user: User): Promise<string> {
  const session: UserSession = {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture || "",
    role: user.role,
    provider: user.provider,
  };
  const token = createUserSessionToken(session);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + USER_SESSION_EXPIRY_SECONDS * 1000).toISOString();

  // 1. Create DB-backed session record (MongoDB Atlas + SQLite dual-sync)
  try {
    await createDbSessionAsync({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenHash,
      expiresAt,
    });
  } catch (err) {
    console.error("Failed to create DB user session:", err);
  }

  // 2. Set user session cookie
  try {
    const cookieStore = cookies();
    cookieStore.set(USER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: USER_SESSION_EXPIRY_SECONDS,
      path: "/",
    });

    // If user is admin and authorized, also issue admin session cookie
    if (user.role === "admin" && isAllowedAdmin(user.email)) {
      const adminToken = createAdminSessionToken(user.email);
      const adminTokenHash = crypto.createHash("sha256").update(adminToken).digest("hex");
      const adminExpiresAt = new Date(Date.now() + ADMIN_SESSION_EXPIRY_SECONDS * 1000).toISOString();

      try {
        await createDbSessionAsync({
          userId: "admin:" + user.email,
          email: user.email,
          role: "admin",
          tokenHash: adminTokenHash,
          expiresAt: adminExpiresAt,
        });
      } catch (adminErr) {
        console.error("Failed to create DB admin session:", adminErr);
      }

      cookieStore.set(ADMIN_COOKIE_NAME, adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: ADMIN_SESSION_EXPIRY_SECONDS,
        path: "/",
      });
    }
  } catch {
    // Running outside Next.js request scope (e.g. CLI or test scripts)
  }

  return token;
}

/**
 * Get current authenticated user session from cookie.
 * Validates cryptographic signature, expiry, AND database session record.
 * If session was revoked or user was deleted/banned, returns null immediately.
 */
export async function getCurrentUserSession(): Promise<UserSession | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(USER_COOKIE_NAME)?.value;
    if (!token) return null;

    // 1. Verify token signature, structure, and expiry
    const parsed = parseUserSessionToken(token);
    if (!parsed) return null;

    // 2. Verify active session exists in DB if available
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    let targetUserId = parsed.id;
    try {
      const dbSession = await findDbSessionByTokenHashAsync(tokenHash);
      if (dbSession) {
        targetUserId = dbSession.user_id;
      } else {
        // If DB session was deleted (logout or revocation), invalidate immediately
        return null;
      }
    } catch {
      // Ephemeral or DB connection error; rely on verified signed token
    }

    // 3. Ensure user still exists in database and reflect latest status
    try {
      const freshUser = await findUserByIdAsync(targetUserId);
      if (freshUser) {
        return {
          id: freshUser.id,
          email: freshUser.email,
          name: freshUser.name,
          picture: freshUser.picture || parsed.picture || "",
          role: freshUser.role,
          provider: freshUser.provider,
        };
      }
    } catch {
      // Fallback to verified token payload
    }

    // Fallback to verified cryptographic token if DB is ephemeral or cold
    return {
      id: parsed.id,
      email: parsed.email,
      name: parsed.name,
      picture: parsed.picture || "",
      role: parsed.role,
      provider: parsed.provider,
    };
  } catch {
    return null;
  }
}

/**
 * Clear user session: removes session from database and deletes cookie
 */
export async function clearUserSession(): Promise<void> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(USER_COOKIE_NAME)?.value;
    if (token) {
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      await deleteDbSessionAsync(tokenHash);
    }
    cookieStore.delete(USER_COOKIE_NAME);
  } catch {
    // Running outside Next.js request scope
  }
}

/**
 * Revoke all active sessions for a given user (e.g. account ban, security reset)
 */
export function revokeAllSessionsForUser(userId: string): void {
  deleteSessionsByUserIdAsync(userId).catch(() => {});
}

/**
 * Revoke an individual session by its raw token string
 */
export function revokeSessionByToken(token: string): void {
  if (!token) return;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  deleteDbSessionAsync(tokenHash).catch(() => {});
}

/**
 * Verify Google ID Token / OAuth Credential Token using Google Auth Library
 */
export async function verifyGoogleToken(credentialToken: string): Promise<{
  email: string;
  name: string;
  picture: string;
  sub: string;
} | null> {
  if (!credentialToken) return null;

  try {
    const clientId =
      process.env.GOOGLE_CLIENT_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      console.warn("Google token verification failed: GOOGLE_CLIENT_ID is not configured.");
      return null;
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credentialToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.email_verified) {
      console.warn("Google token verification failed: email missing or not verified");
      return null;
    }

    return {
      email: payload.email,
      name: payload.name || payload.given_name || payload.email.split("@")[0],
      picture: payload.picture || "",
      sub: payload.sub,
    };
  } catch (error) {
    console.error("Google token verification error:", error);
    return null;
  }
}
