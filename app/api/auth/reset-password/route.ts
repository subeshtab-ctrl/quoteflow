import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { newPassword, email, otp } = body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Approach 1: User provided 6-digit recovery OTP and Email
    if (email && otp) {
      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = otp.trim();

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json(
          { error: 'Authentication configuration missing on server.' },
          { status: 500 }
        );
      }

      const anonClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: verifyData, error: verifyErr } = await anonClient.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOtp,
        type: 'recovery',
      });

      if (verifyErr || !verifyData?.user) {
        return NextResponse.json(
          { error: verifyErr?.message || 'Invalid or expired 6-digit recovery code.' },
          { status: 400 }
        );
      }

      const userId = verifyData.user.id;

      if (admin) {
        const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
          password: newPassword,
          email_confirm: true,
          user_metadata: {
            ...verifyData.user.user_metadata,
            password_updated_at: new Date().toISOString(),
          },
        });

        if (updateErr) {
          return NextResponse.json({ error: updateErr.message }, { status: 400 });
        }
      } else {
        const { error: updateErr } = await anonClient.auth.updateUser({
          password: newPassword,
        });

        if (updateErr) {
          return NextResponse.json({ error: updateErr.message }, { status: 400 });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully. You can now sign in.',
      });
    }

    // Approach 2: User has an active recovery session in cookies (redirected from callback)
    const serverSupabase = await createServerSupabaseClient();
    if (serverSupabase) {
      const {
        data: { user },
        error: userError,
      } = await serverSupabase.auth.getUser();

      if (user && !userError) {
        if (admin) {
          const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
            password: newPassword,
            email_confirm: true,
            user_metadata: {
              ...user.user_metadata,
              password_updated_at: new Date().toISOString(),
            },
          });

          if (updateErr) {
            return NextResponse.json({ error: updateErr.message }, { status: 400 });
          }
        } else {
          const { error: updateErr } = await serverSupabase.auth.updateUser({
            password: newPassword,
          });

          if (updateErr) {
            return NextResponse.json({ error: updateErr.message }, { status: 400 });
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Password updated successfully.',
        });
      }
    }

    return NextResponse.json(
      { error: 'Session expired or invalid. Please request a new password reset link.' },
      { status: 401 }
    );
  } catch (err: any) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while resetting password.' },
      { status: 500 }
    );
  }
}
