import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { verifySecureOtp } from '@/lib/auth/otp-service';
import { syncUserAndOrganization } from '@/lib/supabase/auth-sync';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const otp = (body.otp || '').trim();
    const type = (body.type || 'VERIFICATION') as 'VERIFICATION' | 'PASSWORD_RESET' | 'ADMIN';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    if (!otp || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: 'A 6-digit numeric OTP code is required.' }, { status: 400 });
    }

    const verification = verifySecureOtp(email, otp, type);

    if (!verification.valid) {
      if (verification.reason === 'MAX_ATTEMPTS') {
        return NextResponse.json(
          { error: 'Maximum verification attempts exceeded. Please request a new OTP code.' },
          { status: 429 }
        );
      }
      if (verification.reason === 'EXPIRED') {
        return NextResponse.json(
          { error: 'This verification code has expired (valid for 10 minutes). Please request a new code.' },
          { status: 410 }
        );
      }
      if (verification.reason === 'ALREADY_USED') {
        return NextResponse.json(
          { error: 'This verification code has already been used.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: 'Invalid verification code.',
          remainingAttempts: verification.remainingAttempts,
        },
        { status: 400 }
      );
    }

    // If OTP is valid and type is VERIFICATION: mark user verified in Supabase
    const admin = createAdminClient();
    if (admin && type === 'VERIFICATION') {
      try {
        const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
        const matched = (listData?.users || []).find((u) => u.email?.toLowerCase() === email);
        if (matched) {
          await admin.auth.admin.updateUserById(matched.id, {
            email_confirm: true,
            user_metadata: {
              ...matched.user_metadata,
              email_verified: true,
              verified_at: new Date().toISOString(),
            },
          });

          await syncUserAndOrganization({
            userId: matched.id,
            email: matched.email,
            fullName: matched.user_metadata?.full_name || '',
            companyName: matched.user_metadata?.company_name || '',
          });

          // Dispatch welcome email strictly post-verification (exactly once)
          if (!matched.user_metadata?.welcome_email_sent_at && !matched.user_metadata?.emailWelcomeSentAt) {
            const orgId = matched.user_metadata?.organization_id;
            if (orgId) {
              const nowIso = new Date().toISOString();
              await admin.auth.admin.updateUserById(matched.id, {
                user_metadata: {
                  ...matched.user_metadata,
                  email_verified: true,
                  verified_at: nowIso,
                  welcome_email_sent_at: nowIso,
                  emailWelcomeSentAt: nowIso,
                },
              });
              const { sendWelcomeEmailIfEligible } = await import('@/lib/welcome/welcome-service');
              await sendWelcomeEmailIfEligible({
                organizationId: orgId,
                userId: matched.id,
                ownerName: matched.user_metadata?.full_name || '',
                email: matched.email || '',
                businessName: matched.user_metadata?.company_name || 'Your Business',
                userRole: matched.user_metadata?.role || 'OWNER',
              }).catch(console.warn);
            }
          }
        }
      } catch (err) {
        console.warn('Sync user error post OTP verification:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully.',
    });
  } catch (err: any) {
    console.error('Verify OTP route error:', err);
    return NextResponse.json(
      { error: err.message || 'Verification failed.' },
      { status: 500 }
    );
  }
}
