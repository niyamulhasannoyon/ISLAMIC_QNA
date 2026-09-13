import { NextRequest, NextResponse } from "next/server";
import { createOrUpdateUser } from "@/lib/db";
import { verifyGoogleToken, setUserSession } from "@/lib/userAuth";
import { setAdminSession, isAllowedAdminEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credentialToken, isAdminLogin, mockUser } = body;

    let googleProfile: { email: string; name: string; picture: string } | null = null;

    // 1. Verify official Google OAuth ID token if provided
    if (credentialToken) {
      googleProfile = await verifyGoogleToken(credentialToken);
    }

    // 2. Allow fallback demo profile for local testing if explicitly provided
    if (!googleProfile && mockUser && mockUser.email) {
      googleProfile = {
        email: mockUser.email,
        name: mockUser.name || mockUser.email.split("@")[0],
        picture: mockUser.picture || "https://lh3.googleusercontent.com/a/default-user=s96-c",
      };
    }

    if (!googleProfile) {
      return NextResponse.json(
        { error: "Google প্রমাণীকরণ ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।" },
        { status: 400 }
      );
    }

    const emailLower = googleProfile.email.toLowerCase().trim();
    const isAdminAuthorized = isAllowedAdminEmail(emailLower);

    // If user attempts Admin login, but email is NOT authorized, reject access
    if (isAdminLogin && !isAdminAuthorized) {
      return NextResponse.json(
        {
          error: `দুঃখিত, এই ইমেইল (${googleProfile.email}) দিয়ে এডমিন প্যানেলে প্রবেশের অনুমতি নেই। কেবল niyamulhasanbd@gmail.com এবং niyamulhasan1089@gmail.com ইমেইল দুটি দিয়ে এডমিন প্যানেলে প্রবেশ করা সম্ভব।`,
        },
        { status: 403 }
      );
    }

    const role = isAdminAuthorized ? "admin" : "user";

    // Create or update Google user profile in SQLite
    const user = createOrUpdateUser({
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
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Google Sign-In failed", message: error?.message },
      { status: 500 }
    );
  }
}
