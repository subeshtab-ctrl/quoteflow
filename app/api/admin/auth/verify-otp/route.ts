import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminOtp,
  createAdminSessionToken,
  hasDeveloperAdminPassword,
  DEV_ADMIN_COOKIE_NAME,
} from '@/lib/billing/dev-admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const otp = (body.otp || '').trim();

    if (!otp || otp.length !== 6) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit verification code.' }, { status: 400 });
    }

    const isValid = verifyAdminOtp(otp);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code. Please check or request a new code.' },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken();
    const hasPassword = hasDeveloperAdminPassword();

    const response = NextResponse.json({
      success: true,
      message: 'Verification successful.',
      hasPassword,
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
    console.error('Verify developer admin OTP error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
