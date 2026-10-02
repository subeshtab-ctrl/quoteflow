import { NextRequest, NextResponse } from 'next/server';
import {
  getDeveloperAdminConfig,
  verifyPassword,
  createAdminSessionToken,
  hasDeveloperAdminPassword,
  DEV_ADMIN_COOKIE_NAME,
} from '@/lib/billing/dev-admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = body.password || '';

    if (!hasDeveloperAdminPassword()) {
      return NextResponse.json(
        { error: 'No Developer Admin password has been set yet. Please verify via email code to set your password.' },
        { status: 400 }
      );
    }

    const cfg = getDeveloperAdminConfig();
    if (!cfg.passwordHash || !cfg.salt) {
      return NextResponse.json(
        { error: 'Password configuration missing. Please verify via email code.' },
        { status: 400 }
      );
    }

    const isValid = verifyPassword(password, cfg.passwordHash, cfg.salt);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Incorrect Developer Admin password. Try again or verify via email code.' },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken();

    const response = NextResponse.json({
      success: true,
      message: 'Developer Admin authentication successful.',
    });

    response.cookies.set({
      name: DEV_ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error('Developer admin password login error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
