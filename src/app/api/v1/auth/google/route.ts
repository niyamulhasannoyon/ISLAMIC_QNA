import { NextRequest, NextResponse } from "next/server";
import { createOrUpdateUserAsync } from "@/lib/db";
import { verifyGoogleToken, setUserSession } from "@/lib/userAuth";
import { setAdminSession, isAllowedAdminEmail } from "@/lib/auth";
import { safeErrorResponse } from "@/lib/apiErrors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credentialToken, isAdminLogin } = body;

    if (!credentialToken || typeof credentialToken !== "string") {
      return NextResponse.json(
        { error: "Google প্রমাণীকরণ টোকেন (credentialToken) আবশ্যক।" },
        { status: 400 }
      );
    }

    // Verify official Google OAuth ID token with Google's public keys
    const googleProfile = await verifyGoogleToken(credentialToken);

    if (!googleProfile) {
      return NextResponse.json(
        { error: "Google প্রমাণীকরণ ব্যর্থ হয়েছে বা টোকেনটি অবৈধ। অনুগ্রহ করে পুনরায় চেষ্টা করুন।" },
        { status: 401 }
      );
    }

    const emailLower = googleProfile.email.toLowerCase().trim();
    const isAdminAuthorized = isAllowedAdminEmail(emailLower);

    // If request originated from admin login, reject unauthorized accounts with 403
    if (isAdminLogin && !isAdminAuthorized) {
      return NextResponse.json(
        {
          error: `অননুমোদিত এডমিন একাউন্ট। '${googleProfile.email}' ইমেইলটি এডমিন প্যানেলের জন্য অনুমোদিত নয়।`,
          isUnauthorizedAdmin: true,
        },
        { status: 403 }
      );
    }

    // Only grant admin role if email is explicitly in allowed admin list
    const role = isAdminAuthorized ? "admin" : "user";

    // Create or update Google user profile (MongoDB Atlas + SQLite dual-sync)
    const user = await createOrUpdateUserAsync({
      email: googleProfile.email,
      name: googleProfile.name,
      picture: googleProfile.picture,
      role,
      provider: "google",
    });

    // Set User Cookie Session
    await setUserSession(user);

    // If Admin, also issue Admin Session Cookie
    if (user.role === "admin") {
      await setAdminSession(user.email);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
        provider: user.provider,
      },
      redirect: user.role === "admin" ? "/admin" : "/",
    });
  } catch (error: any) {
    return safeErrorResponse("Google Sign-In failed", 500, error);
  }
}
