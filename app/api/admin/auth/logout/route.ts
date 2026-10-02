import { NextRequest, NextResponse } from 'next/server';
import { DEV_ADMIN_COOKIE_NAME } from '@/lib/billing/dev-admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Developer Admin logged out.',
  });

  response.cookies.set({
    name: DEV_ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
