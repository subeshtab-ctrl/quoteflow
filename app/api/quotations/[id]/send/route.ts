import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { sendQuotationEmail } from '@/lib/email/service';

interface RouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const rawTemplate = (body.template || body.templateType || 'quotation_created') as string;
    const template = (
      rawTemplate === 'payment_reminder' || rawTemplate === 'PAYMENT_REMINDER'
        ? 'payment_reminder'
        : rawTemplate === 'quotation_reminder' || rawTemplate === 'FOLLOW_UP'
        ? 'quotation_reminder'
        : 'quotation_created'
    ) as 'quotation_created' | 'quotation_reminder' | 'payment_reminder';

    const recipientEmailOverride = body.recipientEmail?.trim();
    const customNote = body.customNote?.trim();
    const saveEmail = Boolean(body.saveEmail);

    const quote = await store.getQuotationById(id, orgId);
    if (!quote) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const org = await store.getOrganization(orgId);
    let customer = quote.customer;
    if (!customer && quote.customer_id) {
      customer = (await store.getCustomerById(quote.customer_id, orgId)) || undefined;
    }

    const recipientEmail = recipientEmailOverride || customer?.email?.trim();
    if (!recipientEmail || recipientEmail.endsWith('@mobile.client') || recipientEmail.endsWith('@client.local')) {
      return NextResponse.json(
        { error: 'Customer has no valid email address configured. Please add an email address to the customer profile.' },
        { status: 400 }
      );
    }

    // If requested, persist the new email address to customer profile
    if (saveEmail && customer?.id && recipientEmailOverride && recipientEmailOverride !== customer.email) {
      try {
        await store.updateCustomer(customer.id, { email: recipientEmailOverride }, orgId);
      } catch (err) {
        console.warn('Failed to update customer email in database:', err);
      }
    }

    const isPaymentReminder = template === 'payment_reminder';
    const isReminder = template === 'quotation_reminder';

    const mailRes = await sendQuotationEmail(quote, {
      customer,
      organization: org,
      template,
      recipientEmail,
      customNote,
    });

    if (!mailRes.success) {
      return NextResponse.json(
        { error: mailRes.error || 'Failed to dispatch quotation email via Resend' },
        { status: 502 }
      );
    }

    // If quotation was in DRAFT, transition to SENT
    if (quote.status === 'DRAFT') {
      try {
        await store.updateQuotation(id, { status: 'SENT' }, orgId);
      } catch (err) {
        console.error('Failed to transition quotation status from DRAFT to SENT:', err);
      }
    }

    // Log the event in quotation audit trail
    const eventType = isPaymentReminder
      ? 'PAYMENT_REMINDER_EMAIL_SENT'
      : isReminder
      ? 'EMAIL_FOLLOWUP_SENT'
      : 'EMAIL_SENT';

    try {
      await store.logEvent(orgId, quote.id, 'SYSTEM', eventType, {
        to: recipientEmail,
        recipient_name: customer?.name || 'Customer',
        template,
        resend_id: mailRes.id,
        sent_at: new Date().toISOString(),
        triggered_by: auth?.fullName || 'Business User',
      });
    } catch (logErr) {
      console.error('[Quotation Send] Failed to log email event:', logErr);
    }

    return NextResponse.json({
      success: true,
      message: isPaymentReminder
        ? `Payment reminder email successfully sent to ${recipientEmail}`
        : isReminder
        ? `Quotation follow-up email successfully sent to ${recipientEmail}`
        : `Quotation email successfully sent to ${recipientEmail}`,
      id: mailRes.id,
      template,
    });
  } catch (err: any) {
    console.error('Error dispatching quotation email:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred while sending the email' },
      { status: 500 }
    );
  }
}
