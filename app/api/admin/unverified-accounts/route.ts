import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedDeveloperAdmin, getDeveloperAdminEmail } from '@/lib/billing/dev-admin-auth';
import { createAdminClient } from '@/lib/supabase/service-role';
import { sendEmail, generateVerificationOtpEmail } from '@/lib/email/service';
import { getAuthRedirectUrl } from '@/lib/utils/auth';
import { checkRateLimit } from '@/lib/auth/otp-service';
import { escapeHtml } from '@/lib/utils/html-escape';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { error: 'Forbidden: Strict developer admin access required.' },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'Auth service unavailable' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') === 'verified' ? 'verified' : 'unverified';
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));

    const { data: listData, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allUsers = listData?.users || [];
    const masterAdminEmail = getDeveloperAdminEmail();
    const envAdminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

    // Strictly exclude master developer admin and any internal admin email
    const nonAdminUsers = allUsers.filter((u) => {
      const email = (u.email || '').trim().toLowerCase();
      if (!email) return false;
      if (masterAdminEmail && email === masterAdminEmail) return false;
      if (envAdminEmail && email === envAdminEmail) return false;
      return true;
    });

    const isUserVerified = (u: any) =>
      Boolean(u.email_confirmed_at || u.confirmed_at || u.user_metadata?.email_verified === true);

    const verifiedList = nonAdminUsers.filter(isUserVerified);
    const unverifiedList = nonAdminUsers.filter((u) => !isUserVerified(u));

    const targetList = tab === 'verified' ? verifiedList : unverifiedList;

    const searchedList = search
      ? targetList.filter((u) => {
          const email = (u.email || '').toLowerCase();
          const name = String(u.user_metadata?.full_name || '').toLowerCase();
          const company = String(u.user_metadata?.company_name || '').toLowerCase();
          return email.includes(search) || name.includes(search) || company.includes(search);
        })
      : targetList;

    const total = searchedList.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedUsers = searchedList.slice(offset, offset + limit).map((u) => ({
      id: u.id,
      email: u.email || '',
      fullName: u.user_metadata?.full_name || '',
      companyName: u.user_metadata?.company_name || '',
      organizationId: u.user_metadata?.organization_id || '',
      role: u.user_metadata?.role || 'OWNER',
      isVerified: isUserVerified(u),
      createdAt: u.created_at,
      verifiedAt: u.email_confirmed_at || u.confirmed_at || u.user_metadata?.verified_at || null,
      lastSignInAt: u.last_sign_in_at || null,
    }));

    const mappedUnverifiedForCompatibility = unverifiedList.map((u) => ({
      id: u.id,
      email: u.email || '',
      fullName: u.user_metadata?.full_name || '',
      companyName: u.user_metadata?.company_name || '',
      organizationId: u.user_metadata?.organization_id || '',
      role: u.user_metadata?.role || 'OWNER',
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at || null,
    }));

    return NextResponse.json({
      success: true,
      tab,
      users: paginatedUsers,
      total,
      page,
      limit,
      totalPages,
      verifiedCount: verifiedList.length,
      unverifiedCount: unverifiedList.length,
      // Backward compatibility with existing admin dashboard view
      unverifiedAccounts: mappedUnverifiedForCompatibility,
    });
  } catch (err: any) {
    console.error('Error fetching verification status accounts:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { error: 'Forbidden: Strict developer admin access required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = body.action;
    const userId = body.userId;
    const email = (body.email || '').trim().toLowerCase();

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'Auth service unavailable' }, { status: 500 });
    }

    if ((action === 'verify' || action === 'verify_manually') && userId) {
      const nowIso = new Date().toISOString();
      const { data, error } = await admin.auth.admin.updateUserById(userId, {
        email_confirm: true,
        user_metadata: {
          email_verified: true,
          verified_at: nowIso,
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Account for ${data.user.email} marked as verified successfully.`,
      });
    }

    if (action === 'resend' && email) {
      // Rate-limit resending per target email (60s cooldown, max 3 per 15m)
      const resendLimit = checkRateLimit(`resend:verify:${email}`, 3, 15 * 60 * 1000, 60 * 1000);
      if (!resendLimit.allowed) {
        return NextResponse.json(
          { error: resendLimit.reason || 'Please wait before requesting another verification email.' },
          {
            status: 429,
            headers: { 'Retry-After': String(resendLimit.retryAfterSeconds) },
          }
        );
      }

      const callbackUrl = getAuthRedirectUrl('/auth/callback');
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: callbackUrl },
      });

      if (linkErr) {
        return NextResponse.json({ error: linkErr.message }, { status: 400 });
      }

      const otpCode = linkData?.properties?.email_otp;
      const actionLink = linkData?.properties?.action_link;

      const emailPayload = generateVerificationOtpEmail({
        email,
        verifyUrl: actionLink || undefined,
        otpCode: otpCode || undefined,
      });

      await sendEmail(emailPayload);

      return NextResponse.json({
        success: true,
        message: `Verification link successfully re-sent to ${escapeHtml(email)}.`,
      });
    }

    if (action === 'delete' && userId) {
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Unverified user removed successfully.',
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    console.error('Error processing unverified account action:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
