import { NextRequest, NextResponse } from 'next/server';
import { generateAdminOtp, DEVELOPER_ADMIN_EMAIL } from '@/lib/billing/dev-admin-auth';
import { sendEmail } from '@/lib/email/service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedEmail = (body.email || '').trim().toLowerCase();

    // Strictly enforce developer admin email
    if (requestedEmail && requestedEmail !== DEVELOPER_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: `Unauthorized. Admin access is strictly reserved for ${DEVELOPER_ADMIN_EMAIL}.` },
        { status: 403 }
      );
    }

    const otpCode = generateAdminOtp();

    console.log(`\n======================================================`);
    console.log(`[DEVELOPER ADMIN OTP] Recipient: ${DEVELOPER_ADMIN_EMAIL}`);
    console.log(`[DEVELOPER ADMIN OTP CODE]      ${otpCode}`);
    console.log(`======================================================\n`);

    await sendEmail({
      to: DEVELOPER_ADMIN_EMAIL,
      subject: `QuoteFlow Developer Admin Verification Code: ${otpCode}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 24px; }
              .card { max-width: 500px; margin: 0 auto; background: #111827; border-radius: 16px; padding: 36px; border: 1px solid #374151; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
              .badge { display: inline-block; background: #6366f1; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
              .code-box { background: #1f2937; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
              .code-digits { font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #818cf8; font-family: monospace; }
              .note { font-size: 13px; color: #9ca3af; line-height: 1.6; }
              .footer { font-size: 12px; color: #6b7280; margin-top: 32px; border-top: 1px solid #1f2937; padding-top: 16px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="badge">Developer Console Security</div>
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #ffffff;">Developer Admin Verification</h2>
              <p class="note">Enter this 6-digit one-time code to authenticate your Developer Admin session for www.blendandbold.com/admin:</p>
              
              <div class="code-box">
                <div class="code-digits">${otpCode}</div>
              </div>

              <p class="note">This code is valid for 15 minutes. Once verified, you will have the option to set your Developer Admin Password for direct one-click access.</p>

              <div class="footer">
                <p>QuoteFlow Core Infrastructure & Security © 2026</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `QuoteFlow Developer Admin Verification Code: ${otpCode}\n\nEnter this code on www.blendandbold.com/admin to authenticate your session. Valid for 15 minutes.`,
    });

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${DEVELOPER_ADMIN_EMAIL}.`,
      // For local testing convenience if SMTP is not configured
      devOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    });
  } catch (err: any) {
    console.error('Error sending developer admin OTP:', err);
    return NextResponse.json({ error: err.message || 'Failed to dispatch verification code.' }, { status: 500 });
  }
}
