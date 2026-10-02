import { NextRequest, NextResponse } from 'next/server';
import {
  getDeveloperAdminConfig,
  verifyPassword,
  createAdminSessionToken,
  hasDeveloperAdminPassword,
  DEVELOPER_ADMIN_EMAIL,
  DEV_ADMIN_COOKIE_NAME,
} from '@/lib/billing/dev-admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    // Verify email against authorized developer admin
    if (!email || email !== DEVELOPER_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: 'Invalid credentials. Access restricted to authorized developer admin.' },
        { status: 401 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Please enter your Developer Admin password.' },
        { status: 400 }
      );
    }

    const cfg = getDeveloperAdminConfig();
    const isValid = verifyPassword(password, cfg.passwordHash || '', cfg.salt || '');
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password. Please try again.' },
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
    return NextResponse.json({ error: err.message || 'Authentication error' }, { status: 500 });
  }
}
