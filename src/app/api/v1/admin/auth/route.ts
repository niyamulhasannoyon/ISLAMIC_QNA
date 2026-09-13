import { NextRequest, NextResponse } from 'next/server';
import { clearAdminSession, isAdminAuthenticated } from '@/lib/auth';
import { getCurrentUserSession, clearUserSession } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'logout') {
      await clearAdminSession();
      await clearUserSession();
      return NextResponse.json({ success: true, message: 'Logged out successfully' });
    }

    if (action === 'check') {
      const adminAuth = await isAdminAuthenticated();
      const userSession = await getCurrentUserSession();
      const authenticated = adminAuth || (userSession?.role === 'admin');
      return NextResponse.json({ authenticated, user: userSession });
    }

    return NextResponse.json(
      { error: 'এডমিন প্যানেলে কেবল Sign in with Google (নির্ধারিত ইমেইল) দিয়ে প্রবেশ করা সম্ভব।' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Authentication failed', message: error?.message },
      { status: 500 }
    );
  }
}
