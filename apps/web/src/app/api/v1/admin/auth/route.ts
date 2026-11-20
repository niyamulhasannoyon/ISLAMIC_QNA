import { NextRequest, NextResponse } from 'next/server';
import {
  clearAdminSession,
  isAdminAuthenticated,
  getAdminCredentials,
  verifyAdminCredentials,
  setAdminSession,
} from '@/lib/auth';
import { getCurrentUserSession, clearUserSession } from '@/lib/userAuth';
import { safeErrorResponse } from '@/lib/apiErrors';
import { verifyCsrf } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const csrf = verifyCsrf(req);
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.error || 'Forbidden: CSRF validation failed' }, { status: 403 });
    }

    const body = await req.json();
    const { action, username, password } = body;

    if (action === 'logout') {
      await clearAdminSession();
      await clearUserSession();
      return NextResponse.json({ success: true, message: 'Logged out successfully' });
    }

    if (action === 'check') {
      const authenticated = await isAdminAuthenticated();
      const userSession = await getCurrentUserSession();
      return NextResponse.json({ authenticated, user: userSession });
    }

    if (action === 'login') {
      const { username: configuredUser, password: configuredPass } = getAdminCredentials();
      if (!configuredUser || !configuredPass) {
        return NextResponse.json(
          {
            error:
              'ইউজারনেম/পাসওয়ার্ড ভিত্তিক এডমিন লগইন নিষ্ক্রিয় রয়েছে। অনুগ্রহ করে পরিবেশ চলক (ADMIN_USERNAME এবং ADMIN_PASSWORD) কনফিগার করুন অথবা অনুমোদিত গুগল একাউন্ট দিয়ে লগইন করুন।',
          },
          { status: 403 }
        );
      }

      if (!username || !password) {
        return NextResponse.json(
          { error: 'ইউজারনেম এবং পাসওয়ার্ড উভয়ই প্রদান করতে হবে।' },
          { status: 400 }
        );
      }

      const isValid = verifyAdminCredentials(username, password);
      if (!isValid) {
        return NextResponse.json(
          { error: 'ভুল ইউজারনেম অথবা পাসওয়ার্ড প্রদান করা হয়েছে।' },
          { status: 401 }
        );
      }

      await setAdminSession(username);
      return NextResponse.json({ success: true, message: 'Admin authenticated successfully' });
    }

    return NextResponse.json(
      { error: 'এডমিন প্যানেলে কেবল Sign in with Google (নির্ধারিত ইমেইল) অথবা অনুমোদিত ক্রেডেনশিয়াল দিয়ে প্রবেশ করা সম্ভব।' },
      { status: 400 }
    );
  } catch (error: any) {
    return safeErrorResponse('Authentication failed', 500, error);
  }
}
