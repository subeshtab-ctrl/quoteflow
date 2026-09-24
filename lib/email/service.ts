import { Resend } from 'resend';
import { formatCurrency } from '@/lib/quotations/calculations';
import { CurrencyCode } from '@/types/database';

const resendApiKey = process.env.RESEND_API_KEY;

export function resolveFromAddress(senderName?: string): string {
  const envFrom = (process.env.EMAIL_FROM || '').trim();
  if (!envFrom) {
    return senderName ? `"${senderName}" <onboarding@resend.dev>` : 'QuoteFlow <onboarding@resend.dev>';
  }

  if (!senderName) return envFrom;

  const emailMatch = envFrom.match(/<([^>]+)>/);
  const emailOnly = emailMatch ? emailMatch[1].trim() : (envFrom.includes('@') ? envFrom : 'onboarding@resend.dev');

  return `"${senderName}" <${emailOnly}>`;
}

const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

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

  if (!resendClient || !resendApiKey) {
    console.log('\n=================== [DEV EMAIL SERVICE LOG] ===================');
    console.log(`To: ${Array.isArray(payload.to) ? payload.to.join(', ') : payload.to}`);
    console.log(`From: ${sender}`);
    if (payload.replyTo) console.log(`Reply-To: ${payload.replyTo}`);
    console.log(`Subject: ${payload.subject}`);
    console.log('--- Content Summary ---');
    console.log(payload.text || payload.html.replace(/<[^>]*>?/gm, '').slice(0, 300) + '...');
    console.log('===============================================================\n');
    return { success: true, id: `dev_mock_${Date.now()}` };
  }

  try {
    const sendOptions: any = {
      from: sender,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    };

    if (payload.replyTo) {
      sendOptions.reply_to = payload.replyTo;
    }

    const data = await resendClient.emails.send(sendOptions);

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
 * Quotation Sent Email Template
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
}): EmailPayload {
  const formattedAmount = formatCurrency(params.amount, params.currency);
  const subject = `Quotation ${params.quotationNumber} from ${params.companyName}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; }
          .company-title { font-size: 20px; font-weight: 700; color: #4f46e5; margin: 0; }
          .highlight-box { background: #f1f5f9; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }
          .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
          .label { color: #64748b; font-weight: 500; }
          .val { color: #0f172a; font-weight: 600; }
          .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .footer { font-size: 13px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h2 class="company-title">${params.companyName}</h2>
          </div>
          <p>Hello <strong>${params.customerName}</strong>,</p>
          <p>We have prepared quotation <strong>${params.quotationNumber}</strong> for your review and digital approval.</p>
          
          <div class="highlight-box">
            <div class="row">
              <span class="label">Quotation Number:</span>
              <span class="val">${params.quotationNumber}</span>
            </div>
            <div class="row">
              <span class="label">Total Amount:</span>
              <span class="val" style="color: #4f46e5; font-size: 16px;">${formattedAmount}</span>
            </div>
            <div class="row">
              <span class="label">Valid Until:</span>
              <span class="val">${params.validUntil}</span>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${params.publicUrl}" class="btn">View & Approve Quotation</a>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            Alternatively, copy and paste this link in your browser:<br/>
            <a href="${params.publicUrl}" style="color: #4f46e5; word-break: break-all;">${params.publicUrl}</a>
          </p>

          <div class="footer">
            <p>Thank you,<br/><strong>${params.companyName}</strong></p>
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
    text: `Hello ${params.customerName},\n\nPlease review your quotation ${params.quotationNumber} from ${params.companyName}.\nTotal Amount: ${formattedAmount}\nValid Until: ${params.validUntil}\n\nView quotation: ${params.publicUrl}\n\nThank you,\n${params.companyName}`,
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

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; padding: 24px; background: #f8fafc;">
        <div style="max-width: 580px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
          <div style="color: #16a34a; font-size: 24px; font-weight: bold; margin-bottom: 12px;">✓ Quotation Approved</div>
          <p>Great news! Quotation <strong>${params.quotationNumber}</strong> has been digitally approved by <strong>${params.signerName}</strong>.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Quotation:</strong> ${params.quotationNumber}</p>
            <p style="margin: 4px 0;"><strong>Total Value:</strong> ${formattedAmount}</p>
            <p style="margin: 4px 0;"><strong>Approved By:</strong> ${params.signerName}</p>
          </div>
          <p><a href="${params.publicUrl}" style="background: #16a34a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Approved Document</a></p>
        </div>
      </body>
    </html>
  `;

  return {
    to: '',
    fromName: params.companyName || 'QuoteFlow',
    subject,
    html,
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

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; padding: 24px; background: #f8fafc;">
        <div style="max-width: 580px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
          <div style="color: #dc2626; font-size: 24px; font-weight: bold; margin-bottom: 12px;">Quotation Rejected</div>
          <p>Quotation <strong>${params.quotationNumber}</strong> was marked as rejected by the customer.</p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Customer:</strong> ${params.customerName}</p>
            <p style="margin: 4px 0;"><strong>Reason:</strong> ${params.reason}</p>
            <p style="margin: 4px 0;"><strong>Comments:</strong> ${params.comments}</p>
          </div>
          <p><a href="${params.publicUrl}" style="background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review in Dashboard</a></p>
        </div>
      </body>
    </html>
  `;

  return {
    to: '',
    fromName: params.companyName || 'QuoteFlow',
    subject,
    html,
  };
}
