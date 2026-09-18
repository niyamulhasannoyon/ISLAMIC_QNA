import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmailAsync,
  createOrUpdateUserAsync,
} from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  setUserSession,
  clearUserSession,
  getCurrentUserSession,
} from "@/lib/userAuth";

import { safeErrorResponse } from "@/lib/apiErrors";
import { verifyCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password, name } = body;

    // Verify CSRF for state-changing authentication actions
    if (action === "register" || action === "login" || action === "logout") {
      const csrf = verifyCsrf(req);
      if (!csrf.valid) {
        return NextResponse.json(
          { error: csrf.error || "Forbidden: CSRF validation failed" },
          { status: 403 }
        );
      }
    }

    // Check status action
    if (action === "check") {
      const user = await getCurrentUserSession();
      return NextResponse.json({
        authenticated: !!user,
        user: user || null,
      });
    }

    // Logout action
    if (action === "logout") {
      await clearUserSession();
      return NextResponse.json({ success: true, message: "Logged out successfully" });
    }

    // Register action
    if (action === "register") {
      if (!email || !password || !name) {
        return NextResponse.json(
          { error: "নাম, ইমেইল এবং পাসওয়ার্ড সবকটি ফিল্ড পূরণ করুন" },
          { status: 400 }
        );
      }

      const emailTrimmed = String(email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrimmed) || emailTrimmed.length > 254) {
        return NextResponse.json(
          { error: "একটি সঠিক ইমেইল ঠিকানা প্রদান করুন।" },
          { status: 400 }
        );
      }

      const nameTrimmed = String(name).trim();
      if (nameTrimmed.length < 2 || nameTrimmed.length > 100) {
        return NextResponse.json(
          { error: "নাম ২ থেকে ১০০ অক্ষরের মধ্যে হতে হবে।" },
          { status: 400 }
        );
      }

      if (typeof password !== "string" || password.length < 8) {
        return NextResponse.json(
          { error: "পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।" },
          { status: 400 }
        );
      }

      if (password.length > 128) {
        return NextResponse.json(
          { error: "পাসওয়ার্ড সর্বোচ্চ ১২৮ অক্ষরের হতে পারবে।" },
          { status: 400 }
        );
      }

      const existingUser = await findUserByEmailAsync(emailTrimmed);
      if (existingUser && existingUser.password_hash) {
        return NextResponse.json(
          { error: "এই ইমেইল দিয়ে ইতিমধ্যে একটি একাউন্ট খোলা আছে। লগইন করুন।" },
          { status: 400 }
        );
      }

      const password_hash = hashPassword(password);
      const user = await createOrUpdateUserAsync({
        email: emailTrimmed,
        name: nameTrimmed,
        password_hash,
        role: "user",
        provider: "credentials",
      });

      await setUserSession(user);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          role: user.role,
        },
      });
    }

    // Login action
    if (action === "login") {
      if (!email || !password) {
        return NextResponse.json(
          { error: "ইমেইল এবং পাসওয়ার্ড প্রদান করুন" },
          { status: 400 }
        );
      }

      const emailTrimmed = String(email).trim().toLowerCase();
      if (emailTrimmed.length > 254 || (typeof password === "string" && password.length > 128)) {
        return NextResponse.json(
          { error: "ভুল ইমেইল অথবা পাসওয়ার্ড" },
          { status: 401 }
        );
      }

      const user = await findUserByEmailAsync(emailTrimmed);
      if (!user || !user.password_hash) {
        return NextResponse.json(
          { error: "ভুল ইমেইল অথবা পাসওয়ার্ড" },
          { status: 401 }
        );
      }

      const isValid = verifyPassword(password, user.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { error: "ভুল ইমেইল অথবা পাসওয়ার্ড" },
          { status: 401 }
        );
      }

      // Upgrade legacy password hash to modern scrypt hash automatically
      if (!user.password_hash.startsWith("scrypt:")) {
        try {
          const modernHash = hashPassword(password);
          await createOrUpdateUserAsync({
            email: user.email,
            name: user.name,
            password_hash: modernHash,
            role: user.role,
            provider: user.provider,
          });
        } catch (upgradeErr) {
          console.warn("[Auth] Password hash upgrade warning:", upgradeErr);
        }
      }

      await setUserSession(user);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          role: user.role,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return safeErrorResponse("Authentication failed", 500, error);
  }
}
