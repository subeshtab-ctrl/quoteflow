import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/service-role';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 500 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in first.' }, { status: 401 });
    }

    const body = await req.json();
    const { newPassword } = body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (admin) {
      const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          ...user.user_metadata,
          must_change_password: false,
          password_updated_at: new Date().toISOString(),
        },
      });

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    } else {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          ...user.user_metadata,
          must_change_password: false,
          password_updated_at: new Date().toISOString(),
        },
      });

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Your password has been updated successfully.',
    });
  } catch (err: any) {
    console.error('Change password error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update password' },
      { status: 500 }
    );
  }
}
