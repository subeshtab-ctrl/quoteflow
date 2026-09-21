import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin client unavailable.' },
        { status: 500 }
      );
    }

    const { data: userList } = await admin.auth.admin.listUsers();
    const matched = (userList?.users || []).find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (!matched) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Mark email as confirmed in Supabase Auth
    const { error: updateErr } = await admin.auth.admin.updateUserById(matched.id, {
      email_confirm: true,
    });

    if (updateErr) {
      console.error('Failed to confirm user:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'User email confirmed successfully.',
    });
  } catch (err: any) {
    console.error('Confirm user error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
