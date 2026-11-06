import { NextRequest, NextResponse } from 'next/server';
import { getAdminActorContext, recordAdminSecurityEvent } from '@/lib/billing/dev-admin-auth';
import { sendEmail } from '@/lib/email/service';

export const dynamic = 'force-dynamic';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getAdminActorContext(req);
    if (!actor.authorized) {
      return NextResponse.json({ error: 'Unauthorized developer admin' }, { status: 403 });
    }

    const body = await req.json();
    const {
      recipients = [],
      subject = 'Special Offer from QuoteFlow',
      messageBody = '',
      offerCode = '',
      ctaLink = 'https://blendandbold.com',
      ctaText = 'Explore QuoteFlow Pro',
      imageUrl = '',
      fromEmail = 'marketing@blendandbold.com',
      fromName = 'QuoteFlow Marketing',
    } = body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
    }

    if (!messageBody.trim()) {
      return NextResponse.json({ error: 'Email message body is required' }, { status: 400 });
    }

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Send in batches with pacing (150ms per email)
    for (const recipient of recipients) {
      const email = (recipient.email || '').trim();
      const rawName = (recipient.name || '').trim();
      const name = rawName || 'Valued Business';

      if (!email || !email.includes('@')) {
        failedCount++;
        continue;
      }

      // Replace merge tags
      const personalizedBody = messageBody
        .replace(/{name}/gi, escapeHtml(name))
        .replace(/{company}/gi, 'QuoteFlow')
        .replace(/{offer_code}/gi, escapeHtml(offerCode || 'PROMO99'))
        .replace(/{link}/gi, escapeHtml(ctaLink));

      const personalizedSubject = subject
        .replace(/{name}/gi, name)
        .replace(/{offer_code}/gi, offerCode || 'PROMO99');

      const cleanFromEmail = (fromEmail || 'marketing@blendandbold.com').trim();
      const cleanFromName = (fromName || 'QuoteFlow Marketing').trim();
      const unsubscribeUrl = `mailto:${cleanFromEmail}?subject=Unsubscribe%20${encodeURIComponent(email)}`;
      const activeCtaLink = ctaLink || 'https://www.blendandbold.com';
      const activeCtaText = ctaText || 'Start Your 14-Day Free Trial →';

      const formattedHtml = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(personalizedSubject)}</title>
</head>

<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#101828;">

<!-- Preheader -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
  Create professional quotes and invoices faster with QuoteFlow. ${offerCode ? `Use code ${escapeHtml(offerCode)}.` : 'Start your 14-day free trial.'}
</div>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
       style="width:100%;background:#f4f7fb;">
  <tr>
    <td align="center" style="padding:35px 14px;">

      <!-- MAIN CONTAINER -->
      <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0"
             style="width:100%;max-width:620px;background:#ffffff;border-radius:24px;
                    overflow:hidden;box-shadow:0 15px 50px rgba(16,24,40,.10);">

        <!-- HEADER WITH LOGO -->
        <tr>
          <td align="center" style="padding:32px 35px 22px;background:#ffffff;">
            <a href="${escapeHtml(activeCtaLink)}" target="_blank" style="text-decoration:none;display:inline-block;">
              <img
                src="https://www.blendandbold.com/quoteflow-logo-transparent.png"
                width="210"
                alt="QuoteFlow by blendandbold"
                style="display:block;width:210px;max-width:75%;height:auto;border:0;margin:0 auto;"
              >
            </a>
          </td>
        </tr>

        <!-- HERO -->
        <tr>
          <td align="center"
              style="padding:52px 38px;
              background:linear-gradient(135deg,#a33cff 0%,#5a46f8 48%,#1ca7f7 100%);">

            <div style="font-size:13px;font-weight:700;letter-spacing:1.3px;
                        color:#ffffff;text-transform:uppercase;margin-bottom:18px;">
              QUOTING • INVOICING • SIMPLIFIED
            </div>

            <h1 style="margin:0 0 18px;font-size:38px;line-height:1.12;
                       color:#ffffff;font-weight:800;letter-spacing:-1.2px;">
              From Quote to Payment.<br>
              Beautifully Simple.
            </h1>

            <p style="margin:0 auto 28px;max-width:480px;font-size:16px;
                      line-height:1.65;color:#f4efff;">
              Create professional quotations, convert them into invoices,
              get instant customer approvals and manage your business documents
              from one simple cloud platform.
            </p>

            <!-- CTA -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" bgcolor="#ffffff"
                    style="border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,0.12);">
                  <a href="${escapeHtml(activeCtaLink)}" target="_blank"
                     style="display:inline-block;padding:16px 32px;
                            font-size:16px;font-weight:800;color:#5638e8;
                            text-decoration:none;border-radius:12px;">
                    ${escapeHtml(activeCtaText)}
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:16px 0 0;font-size:13px;color:#eee9ff;">
              Get started in minutes &bull; No credit card required.
            </p>
          </td>
        </tr>

        ${
          imageUrl
            ? `
        <!-- ATTACHED FLYER BANNER -->
        <tr>
          <td align="center" style="padding:28px 32px 10px;">
            <a href="${escapeHtml(activeCtaLink)}" target="_blank">
              <img src="${escapeHtml(imageUrl)}" alt="Special Promo Banner" style="max-width:100%;height:auto;border-radius:16px;display:block;margin:0 auto;box-shadow:0 8px 24px rgba(16,24,40,.08);" />
            </a>
          </td>
        </tr>`
            : ''
        }

        <!-- INTRO & PERSONALIZED MESSAGE -->
        <tr>
          <td align="center" style="padding:42px 40px 22px;">
            <div style="font-size:16px;color:#5638e8;font-weight:800;margin-bottom:8px;">
              Hi ${escapeHtml(name)},
            </div>

            <div style="font-size:12px;color:#6547ed;font-weight:700;
                        letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">
              Built for modern businesses
            </div>

            <h2 style="margin:0 0 14px;font-size:28px;line-height:1.25;
                       color:#101828;letter-spacing:-.7px;">
              Spend less time on paperwork.<br>
              More time growing your business.
            </h2>

            <p style="margin:0 auto 16px;max-width:500px;color:#475569;font-size:15px;
                      line-height:1.65;">
              ${personalizedBody.replace(/\n/g, '<br/>')}
            </p>

            ${
              offerCode
                ? `
            <!-- PROMO CODE CALLOUT -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px auto 0;">
              <tr>
                <td style="background:#f5f3ff;border:2px dashed #7c3aed;border-radius:14px;padding:14px 28px;text-align:center;">
                  <div style="font-size:11px;font-weight:800;color:#6d28d9;text-transform:uppercase;letter-spacing:1px;">Your Exclusive Promo Code</div>
                  <div style="font-family:monospace;font-size:22px;font-weight:900;color:#4338ca;letter-spacing:2px;margin-top:4px;">${escapeHtml(offerCode)}</div>
                </td>
              </tr>
            </table>`
                : ''
            }
          </td>
        </tr>

        <!-- FEATURES -->
        <tr>
          <td style="padding:15px 35px 12px;">

            <!-- Feature 1 -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                   style="margin-bottom:14px;background:#f8f7ff;border-radius:16px;">
              <tr>
                <td width="60" valign="top" style="padding:20px 8px 20px 20px;">
                  <div style="width:44px;height:44px;line-height:44px;text-align:center;
                              background:#ebe7ff;border-radius:12px;font-size:21px;">
                    ✦
                  </div>
                </td>
                <td style="padding:19px 20px 19px 8px;">
                  <div style="font-size:16px;font-weight:700;color:#101828;">
                    Professional Quotes in Minutes
                  </div>
                  <div style="font-size:14px;line-height:1.55;color:#667085;margin-top:5px;">
                    Create polished quotations and estimates with your business branding and AI assistance.
                  </div>
                </td>
              </tr>
            </table>

            <!-- Feature 2 -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                   style="margin-bottom:14px;background:#f5faff;border-radius:16px;">
              <tr>
                <td width="60" valign="top" style="padding:20px 8px 20px 20px;">
                  <div style="width:44px;height:44px;line-height:44px;text-align:center;
                              background:#e5f4ff;border-radius:12px;font-size:21px;">
                    ✓
                  </div>
                </td>
                <td style="padding:19px 20px 19px 8px;">
                  <div style="font-size:16px;font-weight:700;color:#101828;">
                    Easy Customer Approvals via WhatsApp
                  </div>
                  <div style="font-size:14px;line-height:1.55;color:#667085;margin-top:5px;">
                    Send secure interactive quotation links and let customers review and approve online in 1 click.
                  </div>
                </td>
              </tr>
            </table>

            <!-- Feature 3 -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                   style="margin-bottom:14px;background:#f8f7ff;border-radius:16px;">
              <tr>
                <td width="60" valign="top" style="padding:20px 8px 20px 20px;">
                  <div style="width:44px;height:44px;line-height:44px;text-align:center;
                              background:#ebe7ff;border-radius:12px;font-size:21px;">
                    ↗
                  </div>
                </td>
                <td style="padding:19px 20px 19px 8px;">
                  <div style="font-size:16px;font-weight:700;color:#101828;">
                    Instant Quote → Sequential GST Invoice
                  </div>
                  <div style="font-size:14px;line-height:1.55;color:#667085;margin-top:5px;">
                    Turn approved quotations into compliant sequential invoices without re-entering any data.
                  </div>
                </td>
              </tr>
            </table>

            <!-- Feature 4 -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                   style="background:#f5faff;border-radius:16px;">
              <tr>
                <td width="60" valign="top" style="padding:20px 8px 20px 20px;">
                  <div style="width:44px;height:44px;line-height:44px;text-align:center;
                              background:#e5f4ff;border-radius:12px;font-size:21px;">
                    ◈
                  </div>
                </td>
                <td style="padding:19px 20px 19px 8px;">
                  <div style="font-size:16px;font-weight:700;color:#101828;">
                    Everything in One Dashboard
                  </div>
                  <div style="font-size:14px;line-height:1.55;color:#667085;margin-top:5px;">
                    Keep customers, quotes, payments and business activity organized in one cloud workspace.
                  </div>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- WORKFLOW -->
        <tr>
          <td align="center" style="padding:45px 35px 32px;">
            <p style="margin:0 0 12px;color:#667085;font-size:13px;font-weight:700;
                      text-transform:uppercase;letter-spacing:1px;">
              Simple workflow
            </p>

            <p style="margin:0;font-size:17px;font-weight:700;color:#101828;">
              Create Quote
              <span style="color:#8a75ee;padding:0 7px;">→</span>
              Send
              <span style="color:#8a75ee;padding:0 7px;">→</span>
              Approve
              <span style="color:#8a75ee;padding:0 7px;">→</span>
              Invoice
              <span style="color:#8a75ee;padding:0 7px;">→</span>
              Paid
            </p>
          </td>
        </tr>

        <!-- FINAL CTA -->
        <tr>
          <td style="padding:0 30px 35px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                   style="background:#101828;border-radius:20px;">
              <tr>
                <td align="center" style="padding:38px 25px;">
                  <h2 style="margin:0 0 10px;color:#ffffff;font-size:26px;font-weight:800;">
                    Ready to simplify your quoting?
                  </h2>

                  <p style="margin:0 0 23px;color:#cbd5e1;font-size:15px;line-height:1.6;">
                    Experience QuoteFlow free for 14 days. No lock-in, cancel anytime.
                  </p>

                  <table role="presentation" cellspacing="0" cellpadding="0">
                    <tr>
                      <td bgcolor="#6547ed" style="border-radius:11px;box-shadow:0 4px 14px rgba(101,71,237,0.35);">
                        <a href="${escapeHtml(activeCtaLink)}" target="_blank"
                           style="display:inline-block;padding:15px 32px;color:#ffffff;
                                  text-decoration:none;font-size:15px;font-weight:700;">
                          ${escapeHtml(activeCtaText)}
                        </a>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td align="center" style="padding:8px 30px 35px;">
            <p style="margin:0 0 7px;font-size:14px;font-weight:700;color:#344054;">
              QuoteFlow
            </p>

            <p style="margin:0 0 15px;font-size:12px;color:#98a2b3;">
              Powered by blendandbold
            </p>

            <p style="margin:0;font-size:11px;line-height:1.6;color:#98a2b3;">
              You received this email because you expressed interest in QuoteFlow or our business services.<br>
              <a href="${escapeHtml(unsubscribeUrl)}" style="color:#667085;text-decoration:underline;">
                Unsubscribe
              </a>
              &nbsp;•&nbsp;
              <a href="${escapeHtml(activeCtaLink)}" style="color:#667085;text-decoration:underline;" target="_blank">
                Visit Website
              </a>
            </p>
          </td>
        </tr>

      </table>

      <!-- Outside footer -->
      <p style="margin:22px 0 0;color:#98a2b3;font-size:11px;">
        © 2026 blendandbold. All rights reserved.
      </p>

    </td>
  </tr>
</table>

</body>
</html>
`;

      try {
        const cleanFromEmail = (fromEmail || 'marketing@blendandbold.com').trim();
        const cleanFromName = (fromName || 'QuoteFlow Marketing').trim();
        const res = await sendEmail({
          to: email,
          subject: personalizedSubject,
          html: formattedHtml,
          fromName: cleanFromName,
          from: `"${cleanFromName}" <${cleanFromEmail}>`,
          replyTo: cleanFromEmail,
        });

        if (res.success) {
          sentCount++;
        } else {
          failedCount++;
          if (res.error && errors.length < 5) {
            errors.push(`${email}: ${res.error}`);
          }
        }
      } catch (e: any) {
        failedCount++;
        if (errors.length < 5) {
          errors.push(`${email}: ${e.message}`);
        }
      }

      // Small pacing delay to avoid hitting rate limits
      await sleep(150);
    }

    recordAdminSecurityEvent({
      action: 'broadcast_email_dispatched',
      actor: actor.email || 'developer_admin',
      target: `recipients_${recipients.length}`,
      details: {
        sentCount,
        failedCount,
        subject,
      },
    });

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      errors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
