import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminCredentials, setAdminSession, clearAdminSession, isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, username, password } = body;

    if (action === 'logout') {
      await clearAdminSession();
      return NextResponse.json({ success: true, message: 'Logged out successfully' });
    }

    if (action === 'check') {
      const authenticated = await isAdminAuthenticated();
      return NextResponse.json({ authenticated });
    }

    // Default: Login action
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const isValid = verifyAdminCredentials(username, password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'ইউজারনেম অথবা পাসওয়ার্ড ভুল হয়েছে' },
        { status: 401 }
      );
    }

    await setAdminSession(username);
    return NextResponse.json({ success: true, message: 'Admin authentication successful' });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Authentication failed', message: error?.message },
      { status: 500 }
    );
  }
}
