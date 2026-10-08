import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'Auth service unavailable' }, { status: 500 });
    }

    const { data: listData, error } = await admin.auth.admin.listUsers();
    if (error || !listData) {
      return NextResponse.json({ verified: false }, { status: 200 });
    }

    const matchedUser = listData.users.find(
      (u) => u.email?.toLowerCase().trim() === email
    );

    if (!matchedUser) {
      return NextResponse.json({ exists: false, verified: false }, { status: 200 });
    }

    const isVerified = Boolean(
      matchedUser.email_confirmed_at ||
      matchedUser.confirmed_at ||
      matchedUser.user_metadata?.email_verified === true
    );

    return NextResponse.json({
      exists: true,
      verified: isVerified,
      email: matchedUser.email,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
