import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { sendEmail } from '@/lib/email/service';
import { getAuthRedirectUrl } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const admin = createAdminClient();
    let otpCode: string | null = null;
    let actionLink: string | null = null;

    if (admin) {
      try {
        const { data, error } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email,
        });

        if (!error && data?.properties) {
          otpCode = data.properties.email_otp || null;
          actionLink = data.properties.action_link || null;
        }
      } catch (genErr) {
        console.warn('generateLink warning:', genErr);
      }
    }

    // If we have an OTP code, send an email via Resend if configured
    if (otpCode) {
      console.log(`\n======================================================`);
      console.log(`[AUTH OTP DISPATCH] Target: ${email}`);
      console.log(`[AUTH OTP CODE]     ${otpCode}`);
      console.log(`======================================================\n`);

      const publicRedirect = getAuthRedirectUrl();

      await sendEmail({
        to: email,
        subject: `Your QuoteFlow Verification Code: ${otpCode}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
                .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                .badge { display: inline-block; background: #4f46e5; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
                .code-box { background: #eef2ff; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
                .code-digits { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #4338ca; font-family: monospace; }
                .note { font-size: 13px; color: #64748b; line-height: 1.6; }
                .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px; }
                .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="badge">QuoteFlow Verification</div>
                <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800;">Verify Your Email Address</h2>
                <p class="note">Enter the following verification code on the screen to activate and access your QuoteFlow workspace:</p>
                
                <div class="code-box">
                  <div class="code-digits">${otpCode}</div>
                </div>

                <p class="note">This code will expire shortly. If you did not request this verification, you can safely ignore this email.</p>

                ${
                  actionLink
                    ? `<div style="text-align: center; margin-top: 20px;">
                        <a href="${actionLink}" class="btn">Or Click Here to Confirm Directly</a>
                      </div>`
                    : ''
                }

                <div class="footer">
                  <p>QuoteFlow SaaS Platform © 2026</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `Your QuoteFlow verification code is: ${otpCode}\n\nEnter this code on the screen to activate your account.`,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email.',
    });
  } catch (err: any) {
    console.error('Send verification OTP error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to dispatch verification OTP.' },
      { status: 500 }
    );
  }
}
