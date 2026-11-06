import { Resend } from 'resend';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate } from '@/lib/utils';
import { CurrencyCode } from '@/types/database';
import { SUBSCRIPTION_CONFIG } from '@/lib/billing/subscription-config';
import { escapeHtml, sanitizeUrl, stripHtmlToText } from '@/lib/utils/html-escape';

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export function resolveFromAddress(senderName?: string): string {
  const envFrom = (process.env.EMAIL_FROM || 'QuoteFlow <quotes@blendandbold.com>').trim();
  if (!envFrom) {
    return senderName ? `"${senderName}" <quotes@blendandbold.com>` : 'QuoteFlow <quotes@blendandbold.com>';
  }

  if (!senderName) return envFrom;

  const emailMatch = envFrom.match(/<([^>]+)>/);
  const emailOnly = emailMatch ? emailMatch[1].trim() : (envFrom.includes('@') ? envFrom : 'quotes@blendandbold.com');

  return `"${senderName}" <${emailOnly}>`;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  from?: string;
  replyTo?: string | string[];
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  const sender = payload.from || resolveFromAddress(payload.fromName);
  const client = getResendClient();

  const plainText = payload.text || stripHtmlToText(payload.html);

  if (!client) {
    console.log('\n=================== [DEV EMAIL SERVICE LOG] ===================');
    console.log(`To: ${Array.isArray(payload.to) ? payload.to.join(', ') : payload.to}`);
    console.log(`From: ${sender}`);
    if (payload.replyTo) console.log(`Reply-To: ${payload.replyTo}`);
    console.log(`Subject: ${payload.subject}`);
    console.log('--- Content Summary ---');
    console.log(plainText.slice(0, 300) + '...');
    console.log('===============================================================\n');
    return { success: true, id: `dev_mock_${Date.now()}` };
  }

  try {
    const sendOptions: any = {
      from: sender,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: plainText,
    };

    if (payload.replyTo) {
      sendOptions.reply_to = payload.replyTo;
    }

    const data = await client.emails.send(sendOptions);

    if (data.error) {
      const isDomainRestriction =
        data.error.message?.toLowerCase().includes('resend.dev') ||
        data.error.message?.toLowerCase().includes('testing domain');

      if (isDomainRestriction) {
        console.error(
          '\n⚠️ [RESEND TESTING DOMAIN RESTRICTION - 403 FORBIDDEN]\n' +
          `Resend cannot deliver to "${Array.isArray(payload.to) ? payload.to.join(', ') : payload.to}" using onboarding@resend.dev.\n` +
          'Reason: The free onboarding@resend.dev testing domain only delivers to the owner email registered on Resend.\n' +
          'To fix this:\n' +
          '1. Go to https://resend.com/domains and click "Add Domain" (e.g. blendandbold.com or mail.blendandbold.com)\n' +
          '2. Add the DNS records provided by Resend to your DNS provider (e.g. Vercel DNS)\n' +
          '3. Set EMAIL_FROM="QuoteFlow <quotes@blendandbold.com>" in your environment variables.\n'
        );
      } else {
        console.error('[Resend Email Error]:', data.error);
      }
      return { success: false, error: data.error.message };
    }

    return { success: true, id: data.data?.id };
  } catch (err: any) {
    console.error('[Email Send Exception]:', err);
    return { success: false, error: err.message || 'Failed to send email' };
  }
}

/**
 * Quotation Sent Email Template (Responsive & Mobile-Optimized)
 */
export function generateQuotationSentEmail(params: {
  customerName: string;
  companyName: string;
  quotationNumber: string;
  amount: number;
  currency: CurrencyCode;
  validUntil: string;
  publicUrl: string;
  replyTo?: string;
  customerEmail?: string;
  createdAt?: string;
  pin?: string;
}): EmailPayload {
  const formattedAmount = formatCurrency(params.amount, params.currency);
  const subject = `Quotation ${params.quotationNumber} from ${params.companyName}`;
  const year = new Date().getFullYear();
  const quoteDate = params.createdAt ? formatDate(params.createdAt) : formatDate(new Date().toISOString());
  const expiryDate = params.validUntil ? formatDate(params.validUntil) : '7 days';
  const customerEmail = params.customerEmail || 'your email';

  const safeCustomerName = escapeHtml(params.customerName);
  const safeCompanyName = escapeHtml(params.companyName);
  const safeQuotationNumber = escapeHtml(params.quotationNumber);
  const safeQuoteDate = escapeHtml(quoteDate);
  const safeExpiryDate = escapeHtml(expiryDate);
  const safeCustomerEmail = escapeHtml(customerEmail);
  const safePublicUrl = sanitizeUrl(params.publicUrl);
  const safePin = escapeHtml(params.pin);
  const safeFormattedAmount = escapeHtml(formattedAmount);

  const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
<head>
  <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
  <meta content="text/html; charset=UTF-8" http-equiv="Content-Type"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <meta content="IE=edge" http-equiv="X-UA-Compatible"/>
  <meta content="telephone=no,address=no,email=no,date=no,url=no" name="format-detection"/>
  <meta name="color-scheme" content="light"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>${safeQuotationNumber} • ${safeCompanyName}</title>
  <style>
    @media (prefers-color-scheme: dark) {
      li::marker { color: #c4c4c4; }
    }
    @media only screen and (max-width: 620px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .mobile-banner-padding {
        padding: 26px 20px 22px !important;
      }
      .mobile-body-padding {
        padding: 24px 18px !important;
      }
      .mobile-footer-padding {
        padding: 20px 16px !important;
      }
      .hero-title {
        font-size: 22px !important;
        line-height: 29px !important;
      }
      .total-amount-display {
        font-size: 21px !important;
        line-height: 26px !important;
      }
      .cta-button {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 15px 20px !important;
        text-align: center !important;
      }
    }
  </style>
</head>
<body dir="ltr" lang="en" style="background-color:#f3f4f8;margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0" data-skip-in-text="true">
    Quotation ${safeQuotationNumber} from ${safeCompanyName} (${safeFormattedAmount}). Review and respond online.
  </div>

  <table border="0" width="100%" cellPadding="0" cellSpacing="0" role="presentation" align="center" style="background-color:#f3f4f8;margin:0;padding:0;">
    <tbody>
      <tr>
        <td align="center" style="padding:28px 12px;">
          <!-- MAIN CONTAINER -->
          <table class="email-container" width="600" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(31,41,55,0.08);margin:0 auto;">
            <tbody>
              <!-- GRADIENT HERO BANNER -->
              <tr>
                <td class="mobile-banner-padding" style="margin:0;padding:34px 34px 30px;background:linear-gradient(135deg,#6d28d9 0%,#4f46e5 45%,#2563eb 100%);color:#ffffff;">
                  <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation">
                    <tbody>
                      <tr>
                        <td align="left" style="margin:0;padding:0;">
                          <div style="margin:0;padding:0;font-size:27px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">
                            Quote<span style="color:#c4b5fd;">Flow</span>
                          </div>
                          <div style="margin:0;padding:0;font-size:12px;color:#ddd6fe;margin-top:4px;">
                            Simple • Secure • Professional
                          </div>
                        </td>
                        <td align="right" style="margin:0;padding:0;">
                          <span style="display:inline-block;background:rgba(255,255,255,0.18);color:#ffffff;padding:7px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;">
                            NEW QUOTATION
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div class="hero-title" style="margin:0;padding:0;font-size:26px;line-height:35px;font-weight:700;margin-top:30px;color:#ffffff;">
                    Your quotation is ready 🎉
                  </div>
                  <div style="margin:0;padding:0;font-size:14px;line-height:22px;color:#e0e7ff;margin-top:8px;">
                    <strong>${safeCompanyName}</strong> has prepared a new quotation for you.
                  </div>
                </td>
              </tr>

              <!-- CARD BODY CONTENT -->
              <tr>
                <td class="mobile-body-padding" style="margin:0;padding:34px;background:#ffffff;">
                  <div style="margin:0;padding:0;font-size:16px;color:#1f2937;margin-bottom:12px;">
                    Hi <strong>${safeCustomerName}</strong>,
                  </div>
                  <div style="margin:0;padding:0;font-size:14px;line-height:23px;color:#4b5563;margin-bottom:26px;">
                    Please review your quotation below. You can securely view the complete quotation and approve or reject it using the button.
                  </div>

                  <!-- QUOTATION HIGHLIGHT BOX -->
                  <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="background:#fafaff;border:1px solid #e8e7ff;border-radius:14px;margin:0 0 24px 0;">
                    <tbody>
                      <tr>
                        <td style="padding:22px;">
                          <!-- Quote Number -->
                          <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation">
                            <tbody>
                              <tr>
                                <td style="font-size:13px;color:#6b7280;padding:0;">
                                  Quotation
                                </td>
                                <td align="right" style="font-size:15px;font-weight:700;color:#4f46e5;padding:0;font-family:monospace;">
                                  ${safeQuotationNumber}
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          <!-- Quote Date -->
                          <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:16px;">
                            <tbody>
                              <tr>
                                <td style="font-size:13px;color:#6b7280;padding:0;">
                                  📅 Quote Date
                                </td>
                                <td align="right" style="font-size:13px;color:#374151;font-weight:500;padding:0;">
                                  ${safeQuoteDate}
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          <!-- Valid Until -->
                          <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:16px;">
                            <tbody>
                              <tr>
                                <td style="font-size:13px;color:#6b7280;padding:0;">
                                  ⏳ Valid Until
                                </td>
                                <td align="right" style="padding:0;">
                                  <span style="background:#fff7ed;color:#ea580c;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;display:inline-block;border:1px solid #ffedd5;">
                                    ${safeExpiryDate}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          ${params.pin ? `
                          <!-- Client PIN Protection -->
                          <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:16px;">
                            <tbody>
                              <tr>
                                <td style="font-size:13px;color:#6b7280;padding:0;">
                                  🔑 Access PIN
                                </td>
                                <td align="right" style="padding:0;">
                                  <span style="background:#eff6ff;color:#1e40af;padding:5px 10px;border-radius:8px;font-size:13px;font-weight:800;font-family:monospace;letter-spacing:1.5px;display:inline-block;border:1px solid #dbeafe;">
                                    ${safePin}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          ` : ''}

                          <div style="margin:20px 0;border-top:1px solid #e5e7eb;"></div>

                          <!-- Total Amount -->
                          <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation">
                            <tbody>
                              <tr>
                                <td valign="middle" style="padding:0;">
                                  <div style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.5px;text-transform:uppercase;">
                                    TOTAL AMOUNT
                                  </div>
                                  <div style="font-size:12px;color:#9ca3af;margin-top:3px;">
                                    Quotation total
                                  </div>
                                </td>
                                <td align="right" valign="middle" style="padding:0;">
                                  <div class="total-amount-display" style="font-size:26px;font-weight:800;color:#059669;letter-spacing:-0.5px;">
                                    ${safeFormattedAmount}
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- CTA BUTTON -->
                  <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation">
                    <tbody>
                      <tr>
                        <td align="center" style="padding:10px 0 14px;">
                          <a href="${safePublicUrl}" class="cta-button" target="_blank" rel="noopener noreferrer" style="color:#ffffff;text-decoration:none;display:inline-block;background:#4f46e5;padding:16px 36px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.2px;box-shadow:0 4px 14px rgba(79,70,229,0.35);">
                            View &amp; Respond to Quote &rarr;
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div style="text-align:center;font-size:12px;color:#9ca3af;margin-bottom:24px;">
                    View full quotation details securely online
                  </div>

                  <!-- SECURE NOTICE BOX -->
                  <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="background:#eff6ff;border:1px solid #dbeafe;border-radius:12px;margin-bottom:24px;">
                    <tbody>
                      <tr>
                        <td style="padding:16px 18px;">
                          <table border="0" cellPadding="0" cellSpacing="0" role="presentation" width="100%">
                            <tbody>
                              <tr>
                                <td valign="top" style="font-size:20px;padding-right:12px;width:24px;">
                                  🔐
                                </td>
                                <td valign="top" style="padding:0;">
                                  <div style="font-size:13px;font-weight:700;color:#1e40af;">
                                    Secure quotation
                                  </div>
                                  <div style="font-size:12px;line-height:19px;color:#64748b;margin-top:3px;">
                                    This quotation link is intended for you. Please don&#x27;t forward or share this email with others.
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- NEED HELP NOTE -->
                  <div style="font-size:13px;line-height:21px;color:#6b7280;">
                    Need help? Simply reply to this email and <strong>${safeCompanyName}</strong> will assist you.
                  </div>
                </td>
              </tr>

              <!-- COLORFUL GRADIENT DIVIDER -->
              <tr>
                <td style="padding:0;height:5px;background:linear-gradient(90deg,#7c3aed,#4f46e5,#2563eb,#06b6d4,#10b981);line-height:5px;font-size:0;">&nbsp;</td>
              </tr>

              <!-- SENDER & PLATFORM FOOTER -->
              <tr>
                <td class="mobile-footer-padding" align="center" style="padding:26px 30px;background:#fafafa;text-align:center;">
                  <div style="font-size:14px;font-weight:700;color:#374151;">
                    ${safeCompanyName}
                  </div>
                  <div style="font-size:11px;line-height:18px;color:#9ca3af;margin-top:8px;">
                    This transactional email was securely delivered via <strong>QuoteFlow</strong>
                  </div>
                  <div style="font-size:11px;color:#9ca3af;margin-top:4px;">
                    &copy; ${year} QuoteFlow
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- RECIPIENT DISCLAIMER -->
          <div style="max-width:560px;margin:18px auto 0;text-align:center;font-size:11px;line-height:18px;color:#9ca3af;">
            You&#x27;re receiving this email because <strong>${safeCompanyName}</strong> sent a quotation to ${safeCustomerEmail}.
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>
  `.trim();

  return {
    to: '',
    fromName: params.companyName || 'QuoteFlow',
    replyTo: params.replyTo,
    subject,
    html,
    text: `Hello ${params.customerName},\n\n${params.companyName} has prepared quotation ${params.quotationNumber} (${formattedAmount}) for your review and digital approval.\nQuote Date: ${quoteDate}\nValid Until: ${expiryDate}\n${params.pin ? `Access PIN: ${params.pin}\n` : ''}\nView and respond online:\n${params.publicUrl}\n\nNeed help? Simply reply to this email.\nThank you,\n${params.companyName}`,
  };
}

/**
 * Quotation Follow-up / Reminder Email Template
 */
export function generateQuotationReminderEmail(params: {
  customerName: string;
  companyName: string;
  quotationNumber: string;
  amount: number;
  currency: CurrencyCode;
  validUntil: string;
  publicUrl: string;
  replyTo?: string;
  pin?: string;
  customNote?: string;
}): EmailPayload {
  const formattedAmount = formatCurrency(params.amount, params.currency);
  const subject = `Gentle Follow-up: Quotation ${params.quotationNumber} from ${params.companyName}`;

  const safeCustomerName = escapeHtml(params.customerName);
  const safeCompanyName = escapeHtml(params.companyName);
  const safeQuotationNumber = escapeHtml(params.quotationNumber);
  const safeValidUntil = escapeHtml(params.validUntil);
  const safePublicUrl = sanitizeUrl(params.publicUrl);
  const safePin = escapeHtml(params.pin);
  const safeCustomNote = params.customNote ? escapeHtml(params.customNote).replace(/\n/g, '<br/>') : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .badge { display: inline-block; background-color: #eef2ff; color: #4f46e5; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 20px; border: 1px solid #e0e7ff; margin-bottom: 12px; }
          .header { margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; }
          .company-title { font-size: 20px; font-weight: 700; color: #4f46e5; margin: 0; }
          .highlight-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin: 20px 0; }
          .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
          .label { color: #64748b; font-weight: 500; }
          .val { color: #0f172a; font-weight: 600; }
          .note-box { background-color: #fefce8; border-left: 4px solid #eab308; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #713f12; margin: 16px 0; }
          .pin-box { background-color: #f0fdf4; border: 1px dashed #22c55e; border-radius: 8px; padding: 12px 16px; margin: 16px 0; text-align: center; font-size: 13px; color: #166534; }
          .pin-val { font-family: monospace; font-size: 18px; font-weight: 700; letter-spacing: 2px; color: #15803d; }
          .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .footer { font-size: 13px; color: #94a3b8; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <span class="badge">⏳ Quotation Follow-up</span>
            <h2 class="company-title">${safeCompanyName}</h2>
          </div>
          <p>Hello <strong>${safeCustomerName}</strong>,</p>
          <p>We are following up regarding quotation <strong>${safeQuotationNumber}</strong> prepared for you. We want to ensure you have all the information needed to move forward.</p>
          
          ${safeCustomNote ? `
          <div class="note-box">
            <strong>Note from ${safeCompanyName}:</strong><br/>
            ${safeCustomNote}
          </div>
          ` : ''}

          <div class="highlight-box">
            <div class="row">
              <span class="label">Quotation Number:</span>
              <span class="val">${safeQuotationNumber}</span>
            </div>
            <div class="row">
              <span class="label">Total Amount:</span>
              <span class="val" style="color: #4f46e5; font-size: 16px;">${formattedAmount}</span>
            </div>
            <div class="row">
              <span class="label">Valid Until:</span>
              <span class="val">${safeValidUntil}</span>
            </div>
          </div>

          ${params.pin ? `
          <div class="pin-box">
            <span>Your secure portal access PIN:</span><br/>
            <span class="pin-val">${safePin}</span>
          </div>
          ` : ''}

          <div style="text-align: center;">
            <a href="${safePublicUrl}" class="btn">Review & Approve Quotation →</a>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            Alternatively, copy and paste this link in your browser:<br/>
            <a href="${safePublicUrl}" style="color: #4f46e5; word-break: break-all;">${safePublicUrl}</a>
          </p>

          <p style="font-size: 13px; color: #64748b; margin-top: 14px;">
            If you have any questions or require adjustments to the quote, feel free to reply directly to this email.
          </p>

          <div class="footer">
            <p>Thank you,<br/><strong>${safeCompanyName}</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    to: '',
    fromName: params.companyName || 'QuoteFlow',
    replyTo: params.replyTo,
    subject,
    html,
    text: `Hello ${params.customerName},\n\nGentle follow-up regarding quotation ${params.quotationNumber} (${formattedAmount}) from ${params.companyName}.\nValid Until: ${params.validUntil}\n${params.pin ? `Security PIN: ${params.pin}\n` : ''}${params.customNote ? `\nNote: ${params.customNote}\n` : ''}\nReview and approve online: ${params.publicUrl}\n\nPlease let us know if you have any questions!\nThank you,\n${params.companyName}`,
  };
}

/**
 * Quotation Payment Reminder Email Template
 */
export function generateQuotationPaymentReminderEmail(params: {
  customerName: string;
  companyName: string;
  quotationNumber: string;
  amount: number;
  paidAmount?: number;
  currency: CurrencyCode;
  validUntil?: string;
  publicUrl: string;
  replyTo?: string;
  pin?: string;
  customNote?: string;
  bankDetails?: any;
}): EmailPayload {
  const formattedTotal = formatCurrency(params.amount, params.currency);
  const paidVal = params.paidAmount || 0;
  const balanceVal = Math.max(0, params.amount - paidVal);
  const formattedBalance = formatCurrency(balanceVal, params.currency);
  const formattedPaid = formatCurrency(paidVal, params.currency);
  const isPartial = paidVal > 0;

  const subject = `Payment Reminder: Quotation ${params.quotationNumber} from ${params.companyName}`;

  const bank = params.bankDetails;
  const hasBank = Boolean(bank && (bank.bank_name || bank.account_number || bank.upi_id));

  const safeCustomerName = escapeHtml(params.customerName);
  const safeCompanyName = escapeHtml(params.companyName);
  const safeQuotationNumber = escapeHtml(params.quotationNumber);
  const safeValidUntil = escapeHtml(params.validUntil);
  const safePublicUrl = sanitizeUrl(params.publicUrl);
  const safePin = escapeHtml(params.pin);
  const safeCustomNote = params.customNote ? escapeHtml(params.customNote).replace(/\n/g, '<br/>') : '';

  const safeBankName = bank?.bank_name ? escapeHtml(bank.bank_name) : '';
  const safeAccountName = bank?.account_name ? escapeHtml(bank.account_name) : '';
  const safeAccountNumber = bank?.account_number ? escapeHtml(bank.account_number) : '';
  const safeIfscCode = bank?.ifsc_code ? escapeHtml(bank.ifsc_code) : '';
  const safeUpiId = bank?.upi_id ? escapeHtml(bank.upi_id) : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .badge { display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 20px; border: 1px solid #a7f3d0; margin-bottom: 12px; }
          .header { margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; }
          .company-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
          .highlight-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin: 20px 0; }
          .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
          .label { color: #64748b; font-weight: 500; }
          .val { color: #0f172a; font-weight: 600; }
          .note-box { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #065f46; margin: 16px 0; }
          .bank-box { background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; margin: 16px 0; font-size: 13px; color: #334155; }
          .pin-box { background-color: #f0fdf4; border: 1px dashed #22c55e; border-radius: 8px; padding: 12px 16px; margin: 16px 0; text-align: center; font-size: 13px; color: #166534; }
          .pin-val { font-family: monospace; font-size: 18px; font-weight: 700; letter-spacing: 2px; color: #15803d; }
          .btn { display: inline-block; background-color: #059669; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .footer { font-size: 13px; color: #94a3b8; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <span class="badge">💳 Payment Reminder</span>
            <h2 class="company-title">${safeCompanyName}</h2>
          </div>
          <p>Hello <strong>${safeCustomerName}</strong>,</p>
          <p>This is a friendly reminder that payment for Quotation <strong>${safeQuotationNumber}</strong> from <strong>${safeCompanyName}</strong> is currently pending.</p>
          
          ${safeCustomNote ? `
          <div class="note-box">
            <strong>Note from ${safeCompanyName}:</strong><br/>
            ${safeCustomNote}
          </div>
          ` : ''}

          <div class="highlight-box">
            <div class="row">
              <span class="label">Quotation Number:</span>
              <span class="val">${safeQuotationNumber}</span>
            </div>
            <div class="row">
              <span class="label">Total Amount:</span>
              <span class="val">${formattedTotal}</span>
            </div>
            ${isPartial ? `
            <div class="row">
              <span class="label">Amount Paid:</span>
              <span class="val" style="color: #059669;">${formattedPaid}</span>
            </div>
            <div class="row">
              <span class="label">Balance Due:</span>
              <span class="val" style="color: #dc2626; font-size: 16px; font-weight: 700;">${formattedBalance}</span>
            </div>
            ` : `
            <div class="row">
              <span class="label">Amount Due:</span>
              <span class="val" style="color: #059669; font-size: 16px; font-weight: 700;">${formattedTotal}</span>
            </div>
            `}
            ${params.validUntil ? `
            <div class="row">
              <span class="label">Valid Until:</span>
              <span class="val">${safeValidUntil}</span>
            </div>
            ` : ''}
          </div>

          ${hasBank ? `
          <div class="bank-box">
            <strong style="color: #0f172a; display: block; margin-bottom: 6px;">🏦 Bank / UPI Transfer Details:</strong>
            ${safeBankName ? `<div>Bank: <strong>${safeBankName}</strong></div>` : ''}
            ${safeAccountName ? `<div>Account Name: <strong>${safeAccountName}</strong></div>` : ''}
            ${safeAccountNumber ? `<div>Account No: <strong style="font-family: monospace;">${safeAccountNumber}</strong></div>` : ''}
            ${safeIfscCode ? `<div>IFSC / SWIFT: <strong style="font-family: monospace;">${safeIfscCode}</strong></div>` : ''}
            ${safeUpiId ? `<div>UPI ID: <strong style="font-family: monospace; color: #047857;">${safeUpiId}</strong></div>` : ''}
          </div>
          ` : ''}

          ${params.pin ? `
          <div class="pin-box">
            <span>Your secure portal access PIN:</span><br/>
            <span class="pin-val">${safePin}</span>
          </div>
          ` : ''}

          <div style="text-align: center;">
            <a href="${safePublicUrl}" class="btn">💳 Pay Securely Online Now →</a>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            Alternatively, copy and paste this link in your browser to view your quotation and payment options:<br/>
            <a href="${safePublicUrl}" style="color: #059669; word-break: break-all;">${safePublicUrl}</a>
          </p>

          <p style="font-size: 13px; color: #64748b; margin-top: 14px;">
            If you have already processed this payment, thank you! You may reply directly to this email with your transaction reference.
          </p>

          <div class="footer">
            <p>Thank you,<br/><strong>${safeCompanyName}</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    to: '',
    fromName: params.companyName || 'QuoteFlow',
    replyTo: params.replyTo,
    subject,
    html,
    text: `Hello ${params.customerName},\n\nPayment reminder regarding quotation ${params.quotationNumber} from ${params.companyName}.\nTotal: ${formattedTotal}${isPartial ? `\nPaid: ${formattedPaid}\nBalance Due: ${formattedBalance}` : `\nAmount Due: ${formattedTotal}`}${params.validUntil ? `\nValid Until: ${params.validUntil}` : ''}${params.pin ? `\nSecurity PIN: ${params.pin}` : ''}${params.customNote ? `\nNote: ${params.customNote}` : ''}\n\nPay securely online: ${params.publicUrl}\n\nIf you have already paid, please reply with your payment reference.\nThank you,\n${params.companyName}`,
  };
}

/**
 * Quotation Approved Email Template
 */
export function generateQuotationApprovedEmail(params: {
  signerName: string;
  companyName: string;
  quotationNumber: string;
  amount: number;
  currency: CurrencyCode;
  publicUrl: string;
}): EmailPayload {
  const formattedAmount = formatCurrency(params.amount, params.currency);
  const subject = `✓ Quotation ${params.quotationNumber} Approved by ${params.signerName}`;

  const safeSignerName = escapeHtml(params.signerName);
  const safeCompanyName = escapeHtml(params.companyName);
  const safeQuotationNumber = escapeHtml(params.quotationNumber);
  const safePublicUrl = sanitizeUrl(params.publicUrl);

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; padding: 24px; background: #f8fafc;">
        <div style="max-width: 580px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
          <div style="color: #16a34a; font-size: 24px; font-weight: bold; margin-bottom: 12px;">✓ Quotation Approved</div>
          <p>Great news! Quotation <strong>${safeQuotationNumber}</strong> has been digitally approved by <strong>${safeSignerName}</strong>.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Quotation:</strong> ${safeQuotationNumber}</p>
            <p style="margin: 4px 0;"><strong>Total Value:</strong> ${formattedAmount}</p>
            <p style="margin: 4px 0;"><strong>Approved By:</strong> ${safeSignerName}</p>
          </div>
          <p><a href="${safePublicUrl}" style="background: #16a34a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Approved Document</a></p>
        </div>
      </body>
    </html>
  `;

  return {
    to: '',
    fromName: params.companyName || 'QuoteFlow',
    subject,
    html,
    text: `Great news! Quotation ${params.quotationNumber} has been digitally approved by ${params.signerName}.\nTotal Value: ${formattedAmount}\nView Approved Document: ${params.publicUrl}`,
  };
}

/**
 * Quotation Rejected Email Template
 */
export function generateQuotationRejectedEmail(params: {
  customerName: string;
  companyName: string;
  quotationNumber: string;
  reason: string;
  comments: string;
  publicUrl: string;
}): EmailPayload {
  const subject = `Quotation ${params.quotationNumber} was Rejected`;

  const safeCustomerName = escapeHtml(params.customerName);
  const safeCompanyName = escapeHtml(params.companyName);
  const safeQuotationNumber = escapeHtml(params.quotationNumber);
  const safeReason = escapeHtml(params.reason);
  const safeComments = escapeHtml(params.comments);
  const safePublicUrl = sanitizeUrl(params.publicUrl);

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; padding: 24px; background: #f8fafc;">
        <div style="max-width: 580px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
          <div style="color: #dc2626; font-size: 24px; font-weight: bold; margin-bottom: 12px;">Quotation Rejected</div>
          <p>Quotation <strong>${safeQuotationNumber}</strong> was marked as rejected by the customer.</p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Customer:</strong> ${safeCustomerName}</p>
            <p style="margin: 4px 0;"><strong>Reason:</strong> ${safeReason}</p>
            <p style="margin: 4px 0;"><strong>Comments:</strong> ${safeComments}</p>
          </div>
          <p><a href="${safePublicUrl}" style="background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review in Dashboard</a></p>
        </div>
      </body>
    </html>
  `;

  return {
    to: '',
    fromName: params.companyName || 'QuoteFlow',
    subject,
    html,
    text: `Quotation ${params.quotationNumber} was marked as rejected by ${params.customerName}.\nReason: ${params.reason}\nComments: ${params.comments}\nReview: ${params.publicUrl}`,
  };
}

/**
 * 7/5/3/1 Day Trial Reminder Email Template
 */
/**
 * Compile QuoteFlow Trial Expiration Reminder HTML Email
 * Uses the official 360 responsive email template with dynamic placeholders
 */
export function compileTrialReminderHtml(data: {
  customer_name: string;
  days_remaining: string | number;
  trial_end_date: string;
  renew_url: string;
  current_year?: number | string;
  is_india?: boolean;
  country?: string;
  currency?: string;
}): string {
  const customerName = data.customer_name || 'Valued Business';
  const daysRemaining = String(data.days_remaining);
  const trialEndDate = data.trial_end_date;
  const renewUrl = data.renew_url;
  const currentYear = data.current_year || new Date().getFullYear();

  const safeCustomerName = escapeHtml(customerName);
  const safeDaysRemaining = escapeHtml(daysRemaining);
  const safeTrialEndDate = escapeHtml(trialEndDate);
  const safeRenewUrl = sanitizeUrl(renewUrl);

  // Show Indian pricing (₹149) or International ($12) based on business region/currency
  const isIndia = data.is_india !== undefined
    ? Boolean(data.is_india)
    : (data.country
        ? (data.country.trim().toUpperCase() === 'IN' || data.country.trim().toUpperCase() === 'INDIA')
        : (data.currency ? data.currency.trim().toUpperCase() === 'INR' : true));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>QuoteFlow Trial Reminder</title>

  <style>
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: #f3f5fb !important;
      font-family: Arial, Helvetica, sans-serif;
    }

    table {
      border-spacing: 0;
      border-collapse: separate;
    }

    img {
      border: 0;
      display: block;
    }

    a {
      text-decoration: none;
    }

    .container {
      width: 100%;
      max-width: 640px;
    }

    .feature-col {
      width: 50%;
    }

    @media only screen and (max-width: 620px) {
      .mobile-padding {
        padding-left: 22px !important;
        padding-right: 22px !important;
      }

      .hero-title {
        font-size: 30px !important;
        line-height: 36px !important;
      }

      .feature-col {
        display: block !important;
        width: 100% !important;
      }

      .plan-col {
        display: block !important;
        width: 100% !important;
        text-align: left !important;
      }

      .price-box {
        display: block !important;
        width: auto !important;
        margin-top: 10px !important;
      }
    }
  </style>
</head>

<body>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f5fb;">
  <tr>
    <td align="center" style="padding:34px 14px;">

      <!-- MAIN CARD -->
      <table role="presentation" class="container" width="640" cellpadding="0" cellspacing="0" border="0"
             style="width:100%;max-width:640px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 12px 40px rgba(37,45,80,.08);">

        <!-- LOGO -->
        <tr>
          <td class="mobile-padding" style="padding:28px 34px 24px 34px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <img
                    src="https://www.blendandbold.com/quoteflow-logo.webp"
                    alt="QuoteFlow"
                    width="140"
                    style="display:block;border:0;max-width:140px;height:auto;"
                  />
                </td>

                <td align="right" style="font-size:12px;color:#7c839d;">
                  Create Quotes With AI.<br>
                  Get Approved. Get Paid.
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HERO -->
        <tr>
          <td class="mobile-padding"
              style="padding:34px;background:linear-gradient(135deg,#f5f3ff 0%,#eef4ff 55%,#ffffff 100%);">

            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#e8e4ff;border-radius:20px;padding:8px 13px;color:#5c52ee;font-size:12px;font-weight:700;">
                  ⏳ &nbsp; TRIAL REMINDER
                </td>
              </tr>
            </table>

            <div class="hero-title"
                 style="font-size:39px;line-height:46px;font-weight:800;letter-spacing:-1.5px;color:#10122f;margin-top:24px;">
              Your free trial ends in<br>
              <span style="color:#635bff;">${safeDaysRemaining} ${daysRemaining === '1' ? 'day' : 'days'}</span>
            </div>

            <div style="font-size:16px;line-height:25px;color:#475467;margin-top:22px;">
              Hi ${safeCustomerName},
              <br><br>
              Your QuoteFlow free trial is almost over. Upgrade your account to keep creating professional quotes,
              invoices and managing your customers without interruption.
            </div>

          </td>
        </tr>

        <!-- STATUS CARD -->
        <tr>
          <td class="mobile-padding" style="padding:28px 34px 8px 34px;">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#fbfbfe;border:1px solid #e9eaf2;border-radius:16px;">

              <tr>
                <td class="plan-col" width="50%" style="padding:20px;">

                  <table role="presentation">
                    <tr>
                      <td style="width:48px;height:48px;background:#eeeaff;border-radius:12px;text-align:center;font-size:23px;">
                        📅
                      </td>

                      <td style="padding-left:14px;">
                        <div style="font-size:11px;font-weight:700;color:#7d849d;letter-spacing:.5px;">
                          TRIAL ENDS
                        </div>

                        <div style="font-size:17px;font-weight:700;color:#171a36;margin-top:5px;">
                          ${safeTrialEndDate}
                        </div>

                        <div style="font-size:12px;color:#7d849d;margin-top:4px;">
                          in ${safeDaysRemaining} ${daysRemaining === '1' ? 'day' : 'days'}
                        </div>
                      </td>
                    </tr>
                  </table>

                </td>

                <td class="plan-col" width="50%" style="padding:20px;">

                  <table role="presentation">
                    <tr>
                      <td style="width:48px;height:48px;background:#fff2df;border-radius:12px;text-align:center;font-size:23px;">
                        👑
                      </td>

                      <td style="padding-left:14px;">
                        <div style="font-size:11px;font-weight:700;color:#7d849d;letter-spacing:.5px;">
                          CURRENT PLAN
                        </div>

                        <div style="font-size:17px;font-weight:700;color:#171a36;margin-top:5px;">
                          Free Trial
                        </div>

                        <div style="font-size:12px;color:#635bff;margin-top:4px;">
                          Upgrade to continue
                        </div>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

            </table>

          </td>
        </tr>

        <!-- FEATURES -->
        <tr>
          <td class="mobile-padding" style="padding:28px 34px 10px 34px;">

            <div style="font-size:21px;font-weight:800;color:#12152f;margin-bottom:22px;">
              Keep everything running smoothly:
            </div>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

              <tr>

                <td class="feature-col" valign="top" style="padding:0 14px 24px 0;">

                  <table role="presentation">
                    <tr>
                      <td valign="top">
                        <div style="width:50px;height:50px;line-height:50px;text-align:center;background:#e6faf0;border-radius:14px;font-size:22px;">
                          📄
                        </div>
                      </td>

                      <td style="padding-left:14px;">
                        <div style="font-size:15px;line-height:20px;font-weight:700;color:#171a36;">
                          Create and send professional quotes & invoices
                        </div>

                        <div style="font-size:12px;line-height:18px;color:#7c839d;margin-top:4px;">
                          Impress customers with beautiful documents.
                        </div>
                      </td>
                    </tr>
                  </table>

                </td>

                <td class="feature-col" valign="top" style="padding:0 0 24px 14px;">

                  <table role="presentation">
                    <tr>
                      <td valign="top">
                        <div style="width:50px;height:50px;line-height:50px;text-align:center;background:#f0e9ff;border-radius:14px;font-size:22px;">
                          ⚡
                        </div>
                      </td>

                      <td style="padding-left:14px;">
                        <div style="font-size:15px;line-height:20px;font-weight:700;color:#171a36;">
                          Create quotes faster with QuoteFlow AI
                        </div>

                        <div style="font-size:12px;line-height:18px;color:#7c839d;margin-top:4px;">
                          Save time and grow your business.
                        </div>
                      </td>
                    </tr>
                  </table>

                </td>

              </tr>

              <tr>

                <td class="feature-col" valign="top" style="padding:0 14px 10px 0;">

                  <table role="presentation">
                    <tr>
                      <td valign="top">
                        <div style="width:50px;height:50px;line-height:50px;text-align:center;background:#e7f2ff;border-radius:14px;font-size:22px;">
                          👥
                        </div>
                      </td>

                      <td style="padding-left:14px;">
                        <div style="font-size:15px;line-height:20px;font-weight:700;color:#171a36;">
                          Track approvals, payments and customer activity
                        </div>

                        <div style="font-size:12px;line-height:18px;color:#7c839d;margin-top:4px;">
                          Know exactly what's happening.
                        </div>
                      </td>
                    </tr>
                  </table>

                </td>

                <td class="feature-col" valign="top" style="padding:0 0 10px 14px;">

                  <table role="presentation">
                    <tr>
                      <td valign="top">
                        <div style="width:50px;height:50px;line-height:50px;text-align:center;background:#fff0e3;border-radius:14px;font-size:22px;">
                          🛡️
                        </div>
                      </td>

                      <td style="padding-left:14px;">
                        <div style="font-size:15px;line-height:20px;font-weight:700;color:#171a36;">
                          Keep your business records in one place
                        </div>

                        <div style="font-size:12px;line-height:18px;color:#7c839d;margin-top:4px;">
                          Secure, organized and always accessible.
                        </div>
                      </td>
                    </tr>
                  </table>

                </td>

              </tr>

            </table>

          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td class="mobile-padding" align="center" style="padding:22px 34px 10px 34px;">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" bgcolor="#5d4dff"
                    style="border-radius:13px;background:linear-gradient(90deg,#6655ff,#5140f5);">

                  <a href="${safeRenewUrl}"
                     style="display:block;padding:17px 25px;color:#ffffff;font-size:17px;font-weight:700;">
                    Upgrade &amp; Continue &nbsp; →
                  </a>

                </td>
              </tr>
            </table>

            <div style="font-size:12px;color:#8a90a5;margin-top:12px;">
              Upgrade before your trial ends to avoid interruption.
            </div>

          </td>
        </tr>

        <!-- PRICING -->
        <tr>
          <td class="mobile-padding" style="padding:26px 34px 8px 34px;">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f7f6ff;border-radius:15px;">

              <tr>

                <td class="plan-col" style="padding:18px 20px;">
                  <div style="font-size:14px;font-weight:700;color:#171a36;">
                    🏷️ &nbsp; Simple &amp; Affordable Plan
                  </div>

                  <div style="font-size:12px;color:#7c839d;margin-top:5px;">
                    ${isIndia ? 'QuoteFlow Pro for India' : 'QuoteFlow Pro for International Businesses'}
                  </div>
                </td>

                <td class="plan-col" align="right" style="padding:14px 20px;">

                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>

                      <td class="price-box"
                          style="padding:10px 18px;background:#ffffff;border-radius:11px;text-align:center;">
                        <div style="font-size:16px;font-weight:800;color:#5140f5;">
                          ${isIndia ? '₹149 / month' : '$12 / month'}
                        </div>
                        <div style="font-size:10px;color:#8a90a5;margin-top:3px;">
                          ${isIndia ? 'India' : 'Global'}
                        </div>
                      </td>

                    </tr>
                  </table>

                </td>

              </tr>

            </table>

          </td>
        </tr>

        <!-- SUPPORT -->
        <tr>
          <td class="mobile-padding" style="padding:25px 34px 28px 34px;">

            <div style="border-top:1px solid #eceef4;padding-top:20px;">

              <div style="font-size:13px;font-weight:700;color:#171a36;">
                Need help? We're here for you.
              </div>

              <div style="font-size:12px;line-height:22px;color:#7c839d;margin-top:8px;">
                ✉️
                <a href="mailto:hello@blendandbold.com" style="color:#5d4dff;">
                  hello@blendandbold.com
                </a>
                &nbsp;&nbsp; • &nbsp;&nbsp;
                💬 Support
                &nbsp;&nbsp; • &nbsp;&nbsp;
                ❓ Help Center
              </div>

            </div>

          </td>
        </tr>

      </table>

      <!-- FOOTER -->
      <table role="presentation" class="container" width="640" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center"
              style="padding:20px 15px;font-size:11px;line-height:18px;color:#9aa0b3;">

            © ${currentYear} QuoteFlow. All rights reserved.<br>
            Create Quotes With AI. Get Approved. Get Paid.<br>
            Powered by Blend &amp; Bold

          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>

</body>
</html>`;
}

/**
 * Trial Expiry Reminder Email Template (7, 5, 3, 1 days before trial ends)
 */
export function generateTrialReminderEmail(params: {
  companyName: string;
  daysRemaining: number;
  trialEndsAt?: string;
  trialEndDate?: string;
  subscribeUrl: string;
  planPrice?: string;
  currency?: string;
  country?: string;
  isIndia?: boolean;
}): EmailPayload {
  const isIndia = params.isIndia !== undefined
    ? Boolean(params.isIndia)
    : (params.currency
        ? params.currency.toUpperCase() === 'INR'
        : (params.country ? (params.country.toUpperCase() === 'IN' || params.country.toUpperCase() === 'INDIA') : true));

  const pricePerMonth = params.planPrice || (isIndia ? SUBSCRIPTION_CONFIG.INDIA.formattedMonthly : SUBSCRIPTION_CONFIG.GLOBAL.formattedMonthly);
  const rawDate = params.trialEndsAt || params.trialEndDate || '';
  const parsedDate = new Date(rawDate);
  const formattedDate = isNaN(parsedDate.getTime()) ? rawDate : parsedDate.toLocaleDateString(isIndia ? 'en-IN' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const subject = `⏳ Your QuoteFlow free trial ends in ${params.daysRemaining} days — Please renew`;

  const html = compileTrialReminderHtml({
    customer_name: params.companyName || 'Valued Business',
    days_remaining: params.daysRemaining,
    trial_end_date: formattedDate,
    renew_url: params.subscribeUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://blendandbold.com'}/billing`,
    current_year: new Date().getFullYear(),
    is_india: isIndia,
    currency: isIndia ? 'INR' : 'USD',
    country: isIndia ? 'IN' : 'US',
  });

  const text = `QuoteFlow Trial Reminder\n\nHi ${params.companyName || 'Valued Business'},\n\nYour QuoteFlow free trial is almost over and ends in ${params.daysRemaining} days (${formattedDate}). Upgrade your account to keep creating professional quotes, invoices and managing your customers without interruption.\n\nUpgrade & Continue:\n${params.subscribeUrl || 'https://blendandbold.com/billing'}\n\nSimple & Affordable Plan:\n• QuoteFlow Pro: ${pricePerMonth}\n\nNeed help? Email hello@blendandbold.com\n\n© ${new Date().getFullYear()} QuoteFlow. Powered by Blend & Bold`;

  return {
    to: '',
    fromName: 'QuoteFlow',
    subject,
    html,
    text,
  };
}

/**
 * Payment Due & Grace Period Reminder Email Template (Day 1, Day 2, Day 3)
 */
export function generatePaymentDueEmail(params: {
  companyName: string;
  dueDate: string;
  overdueDays?: number;
  payUrl: string;
  planPrice?: string;
  currency?: string;
}): EmailPayload {
  const isOverdue = typeof params.overdueDays === 'number' && params.overdueDays > 0;
  const isFinal = params.overdueDays === 3;
  const isUsd = params.currency === 'USD';
  const priceDisplay = params.planPrice || (isUsd ? SUBSCRIPTION_CONFIG.GLOBAL.formattedPrice : SUBSCRIPTION_CONFIG.INDIA.formattedPrice);

  const safeCompanyName = escapeHtml(params.companyName);
  const safeDueDate = escapeHtml(params.dueDate);
  const safePriceDisplay = escapeHtml(priceDisplay);
  const safePayUrl = sanitizeUrl(params.payUrl);

  const subject = isFinal
    ? `🚨 Final payment reminder: Your ${priceDisplay} QuoteFlow payment is 3 days overdue`
    : isOverdue
    ? `⚠️ Payment overdue: Your ${priceDisplay} QuoteFlow payment is ${params.overdueDays} ${params.overdueDays === 1 ? 'day' : 'days'} overdue`
    : `⚠️ Payment Due: ${priceDisplay} QuoteFlow payment is due on ${params.dueDate}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px;">
        <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px; border: 1px solid #e2e8f0;">
          <div style="display: inline-block; background: ${isFinal ? '#dc2626' : '#d97706'}; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-bottom: 16px;">
            ${isFinal ? 'Final Reminder' : isOverdue ? 'Payment Overdue' : 'Payment Due'}
          </div>
          <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #0f172a;">
            ${isFinal ? 'Account Restrictions Pending' : isOverdue ? 'Please Pay to Avoid Interruption' : `${safePriceDisplay} Subscription Payment Due`}
          </h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Hello <strong>${safeCompanyName}</strong>,<br><br>
            ${isFinal
              ? `Your ${safePriceDisplay} QuoteFlow payment is now 3 days overdue. Please complete payment today to avoid temporary account restrictions on creating new quotes and invoices.`
              : isOverdue
              ? `Your ${safePriceDisplay} QuoteFlow payment is ${params.overdueDays} ${params.overdueDays === 1 ? 'day' : 'days'} overdue. Your 3-day grace period is currently active so you can continue using QuoteFlow, but please pay now to keep your account active.`
              : `Your ${safePriceDisplay} payment for QuoteFlow Pro is due on <strong>${safeDueDate}</strong>. Please complete payment to maintain active service.`
            }
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${safePayUrl}" style="display: inline-block; background: ${isFinal ? '#dc2626' : '#4f46e5'}; color: #ffffff !important; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px;">
              Pay ${safePriceDisplay} Now
            </a>
          </div>
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            All your historical estimates, invoices, and reports will always remain safely preserved and accessible.
          </p>
        </div>
      </body>
    </html>
  `;

  return {
    to: '',
    fromName: 'QuoteFlow Billing',
    subject,
    html,
    text: `Hello ${params.companyName},\n\nPayment due reminder for QuoteFlow Pro (${priceDisplay}).\nDue Date: ${params.dueDate}\n\nComplete payment online:\n${params.payUrl}\n\nThank you,\nQuoteFlow Billing`,
  };
}

/**
 * Password Reset Email Template
 */
export function generatePasswordResetEmail(params: {
  email: string;
  resetUrl?: string;
  otpCode?: string;
}): EmailPayload {
  const safeEmail = escapeHtml(params.email);
  const safeResetUrl = sanitizeUrl(params.resetUrl);
  const safeOtpCode = escapeHtml(params.otpCode);

  const subject = params.otpCode
    ? `Your QuoteFlow Password Reset Code: ${params.otpCode}`
    : 'Reset your QuoteFlow password';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
          .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .badge { display: inline-block; background: #4f46e5; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
          .code-box { background: #eef2ff; border: 2px dashed #6366f1; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0; }
          .code-digits { font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #4338ca; font-family: monospace; }
          .note { font-size: 13px; color: #64748b; line-height: 1.6; }
          .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 20px 0; }
          .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">QuoteFlow Security</div>
          <h2 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #1e1b4b;">Reset Your Password</h2>
          <p class="note">
            We received a request to reset the password for your QuoteFlow account (<strong>${safeEmail}</strong>).
          </p>

          ${
            params.otpCode
              ? `<div class="code-box">
                  <div style="font-size: 12px; font-weight: 600; color: #6366f1; margin-bottom: 6px; text-transform: uppercase;">6-Digit Security Code</div>
                  <div class="code-digits">${safeOtpCode}</div>
                </div>`
              : ''
          }

          ${
            params.resetUrl
              ? `<div style="text-align: center; margin: 20px 0;">
                  <a href="${safeResetUrl}" class="btn">Reset Password Now</a>
                </div>
                <p class="note" style="font-size: 12px; word-break: break-all;">
                  Or click this secure link:<br>
                  <a href="${safeResetUrl}" style="color: #4f46e5;">${safeResetUrl}</a>
                </p>`
              : ''
          }

          <p class="note" style="margin-top: 20px;">
            This link and code will expire in 1 hour. If you did not request a password reset, you can safely ignore this email — your account remains completely secure.
          </p>

          <div class="footer">
            <p>QuoteFlow Platform © 2026 • Blend &amp; Bold</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    to: params.email,
    fromName: 'QuoteFlow Security',
    subject,
    html,
    text: `Reset your QuoteFlow password:\n${params.resetUrl || ''}\n${params.otpCode ? `Or enter code: ${params.otpCode}` : ''}\nIf you didn't request this, ignore this email.`,
  };
}

/**
 * Verification Email Template
 */
export function generateVerificationOtpEmail(params: {
  email: string;
  verifyUrl?: string;
  otpCode?: string;
  companyName?: string;
  fullName?: string;
}): EmailPayload {
  const safeFullName = escapeHtml(params.fullName);
  const safeEmail = escapeHtml(params.email);
  const safeCompanyName = escapeHtml(params.companyName);
  const safeOtpCode = escapeHtml(params.otpCode);
  const safeVerifyUrl = sanitizeUrl(params.verifyUrl);

  const subject = params.otpCode
    ? `Your QuoteFlow Verification Code: ${params.otpCode}`
    : `Verify your email for QuoteFlow`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
          .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .badge { display: inline-block; background: #4f46e5; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
          .code-box { background: #eef2ff; border: 2px dashed #6366f1; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0; }
          .code-digits { font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #4338ca; font-family: monospace; }
          .note { font-size: 13px; color: #64748b; line-height: 1.6; }
          .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 20px 0; }
          .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">QuoteFlow Security</div>
          <h2 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #1e1b4b;">Verify Your Email Address</h2>
          <p class="note">
            ${safeFullName ? `Hello <strong>${safeFullName}</strong>,<br><br>` : ''}
            Please confirm your email address (<strong>${safeEmail}</strong>) to activate and access your QuoteFlow workspace${safeCompanyName ? ` for <strong>${safeCompanyName}</strong>` : ''}:
          </p>

          ${
            params.otpCode
              ? `<div class="code-box">
                  <div style="font-size: 12px; font-weight: 600; color: #6366f1; margin-bottom: 6px; text-transform: uppercase;">Verification Code</div>
                  <div class="code-digits">${safeOtpCode}</div>
                </div>`
              : ''
          }

          ${
            params.verifyUrl
              ? `<div style="text-align: center; margin: 20px 0;">
                  <a href="${safeVerifyUrl}" class="btn">Verify Email &amp; Activate Account</a>
                </div>
                <p class="note" style="font-size: 12px; word-break: break-all;">
                  Or click this link:<br>
                  <a href="${safeVerifyUrl}" style="color: #4f46e5;">${safeVerifyUrl}</a>
                </p>`
              : ''
          }

          <div style="margin-top: 18px; padding: 10px 14px; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #b91c1c;">
              ⏰ This verification code and link will expire in 10 minutes. If expired, please request a new one.
            </p>
          </div>

          <p class="note" style="margin-top: 20px;">
            If you did not request this verification, you can safely ignore this email.
          </p>

          <div class="footer">
            <p>QuoteFlow Platform © 2026 • Blend &amp; Bold</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    to: params.email,
    fromName: 'QuoteFlow Security',
    subject,
    html,
    text: `Hello ${params.fullName ? params.fullName + ',\n\n' : ''}Please confirm your email address (${params.email}) to activate and access your QuoteFlow workspace${params.companyName ? ' for ' + params.companyName : ''}.\n\n${params.otpCode ? 'Verification Code: ' + params.otpCode + '\n\n' : ''}${params.verifyUrl ? 'Or verify via: ' + params.verifyUrl + '\n\n' : ''}⏰ This verification code and link will expire in 10 minutes. If expired, please request a new one.\n\nIf you did not request this verification, you can safely ignore this email.\n\nQuoteFlow Platform © 2026 • Blend & Bold`,
  };
}

/**
 * Developer Admin 2FA Verification Email Template
 */
export function generateAdminOtpEmail(params: {
  email: string;
  otpCode: string;
}): EmailPayload {
  const safeOtpCode = escapeHtml(params.otpCode);
  const subject = `QuoteFlow Developer Admin Verification Code: ${params.otpCode}`;

  const html = `
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
          <div class="badge">QuoteFlow Admin 2FA</div>
          <h2 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #ffffff;">Admin Verification Code</h2>
          <p class="note">
            A developer admin authentication request was initiated. Enter this single-use code on the admin verification screen to complete sign in:
          </p>
          <div class="code-box">
            <div style="font-size: 11px; font-weight: 700; color: #818cf8; margin-bottom: 8px; text-transform: uppercase;">2FA Passcode (Expires in 5 mins)</div>
            <div class="code-digits">${safeOtpCode}</div>
          </div>
          <p class="note" style="font-size: 12px;">
            If you did not initiate this administrator login, someone may be attempting to access your portal. All administrative access events are logged and audited.
          </p>
          <div class="footer">
            <p>QuoteFlow Platform © 2026 • Developer Operations Console</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    to: params.email,
    fromName: 'QuoteFlow Admin Security',
    subject,
    html,
    text: `QuoteFlow Developer Admin Verification Code: ${params.otpCode}\n\nEnter this code on blendandbold.com/admin to complete sign in. Valid for 5 minutes.`,
  };
}

/**
 * High-level helper to safely dispatch a quotation notification or follow-up email to a customer
 */
export async function sendQuotationEmail(
  quotation: any,
  options?: {
    customer?: any;
    organization?: any;
    template?: 'quotation_created' | 'quotation_reminder' | 'payment_reminder';
    templateType?: 'INITIAL' | 'FOLLOW_UP' | 'PAYMENT_REMINDER' | 'quotation_created' | 'quotation_reminder' | 'payment_reminder';
    recipientEmail?: string;
    customNote?: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const cust = options?.customer || quotation.customer;
    const recipientEmail = options?.recipientEmail?.trim() || cust?.email?.trim();

    if (!recipientEmail || recipientEmail.endsWith('@mobile.client') || recipientEmail.endsWith('@client.local')) {
      console.log(`[Email Service] Skipping quotation email: No valid recipient email for quotation ${quotation.quotation_number} (${recipientEmail || 'None'})`);
      return { success: false, error: 'Recipient has no valid email address' };
    }

    const org = options?.organization || quotation.organization;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com';

    const isPaymentReminder =
      options?.template === 'payment_reminder' ||
      options?.templateType === 'payment_reminder' ||
      options?.templateType === 'PAYMENT_REMINDER';

    const isReminder =
      options?.template === 'quotation_reminder' ||
      options?.templateType === 'quotation_reminder' ||
      options?.templateType === 'FOLLOW_UP';

    const emailPayload = isPaymentReminder
      ? generateQuotationPaymentReminderEmail({
          customerName: cust?.name || 'Valued Customer',
          companyName: org?.name || 'QuoteFlow',
          replyTo: org?.email,
          quotationNumber: quotation.quotation_number,
          amount: quotation.grand_total,
          paidAmount: quotation.paid_amount,
          currency: quotation.currency,
          validUntil: quotation.valid_until,
          publicUrl: `${appUrl}/q/${quotation.public_token}`,
          pin: quotation.pin || quotation.demo_pin,
          customNote: options?.customNote,
          bankDetails: quotation.bank_details || org?.default_bank_details,
        })
      : isReminder
      ? generateQuotationReminderEmail({
          customerName: cust?.name || 'Valued Customer',
          companyName: org?.name || 'QuoteFlow',
          replyTo: org?.email,
          quotationNumber: quotation.quotation_number,
          amount: quotation.grand_total,
          currency: quotation.currency,
          validUntil: quotation.valid_until,
          publicUrl: `${appUrl}/q/${quotation.public_token}`,
          pin: quotation.pin || quotation.demo_pin,
          customNote: options?.customNote,
        })
      : generateQuotationSentEmail({
          customerName: cust?.name || 'Valued Customer',
          companyName: org?.name || 'QuoteFlow',
          replyTo: org?.email,
          quotationNumber: quotation.quotation_number,
          amount: quotation.grand_total,
          currency: quotation.currency,
          validUntil: quotation.valid_until,
          publicUrl: `${appUrl}/q/${quotation.public_token}`,
          customerEmail: recipientEmail,
          createdAt: quotation.created_at,
          pin: quotation.pin || quotation.demo_pin,
        });

    emailPayload.to = recipientEmail;

    if (quotation.environment === 'test') {
      console.log(`[Email Service] Test environment detected for quotation ${quotation.quotation_number}. Email simulated.`);
      return { success: true, id: `test_sim_${Date.now()}` };
    }

    const result = await sendEmail(emailPayload);
    return result;
  } catch (err: any) {
    console.error('[Email Service] Failed to send quotation email:', err);
    return { success: false, error: err.message || 'Failed to send email' };
  }
}



