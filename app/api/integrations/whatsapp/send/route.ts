import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';
import { decryptToken } from '@/lib/whatsapp/encryption';
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp/meta-cloud-api';
import { formatCurrency } from '@/lib/quotations/calculations';
import { cleanPhoneNumber, formatPhoneNumber } from '@/lib/country-codes';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      documentType, // 'QUOTATION' | 'INVOICE'
      documentId,
      templateName,
      templateLanguage = 'en_US',
      recipientPhone: overridePhone,
      includeSecureLink = true,
      attachPdf = false,
      force = false,
    } = body;

    if (!documentType || !documentId || !templateName) {
      return NextResponse.json(
        { error: 'documentType, documentId, and templateName are required' },
        { status: 400 }
      );
    }

    // 1. Verify WhatsApp connection for this tenant
    const connection = await store.getWhatsAppConnection(auth.orgId);
    if (!connection || connection.connection_status !== 'connected' || !connection.phone_number_id) {
      return NextResponse.json(
        {
          error:
            'WhatsApp Business is not connected for this business. Please connect via Settings → Integrations → WhatsApp Business.',
        },
        { status: 400 }
      );
    }

    const accessToken = decryptToken(connection.encrypted_access_token || '');
    if (!accessToken) {
      return NextResponse.json(
        { error: 'WhatsApp authentication token is missing or invalid. Please reconnect WhatsApp.' },
        { status: 400 }
      );
    }

    // 2. Fetch and verify tenant ownership of document
    let customer: any = null;
    let documentNumber = '';
    let amountFormatted = '';
    let secureLink = '';
    let dueDateFormatted = '';
    let currency = auth.organization.default_currency || 'INR';

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.nextUrl.origin ||
      'https://www.blendandbold.com';

    if (documentType === 'QUOTATION') {
      const quote = await store.getQuotation(documentId);
      if (!quote || quote.organization_id !== auth.orgId) {
        return NextResponse.json({ error: 'Quotation not found or access denied' }, { status: 404 });
      }

      customer = quote.customer || (await store.getCustomer(quote.customer_id));
      documentNumber = quote.quotation_number;
      currency = quote.currency || currency;
      amountFormatted = formatCurrency(quote.grand_total, currency);
      secureLink = quote.public_token ? `${baseUrl}/q/${quote.public_token}` : baseUrl;
    } else if (documentType === 'INVOICE') {
      const invoice = await store.getInvoice(documentId);
      if (!invoice || invoice.organization_id !== auth.orgId) {
        return NextResponse.json({ error: 'Invoice not found or access denied' }, { status: 404 });
      }

      customer = invoice.customer || (await store.getCustomer(invoice.customer_id));
      documentNumber = invoice.invoice_number;
      currency = invoice.currency || currency;
      amountFormatted = formatCurrency(invoice.grand_total, currency);
      dueDateFormatted = invoice.due_date ? invoice.due_date.split('T')[0] : '';
      secureLink = `${baseUrl}/invoices/${invoice.id}`;
    } else {
      return NextResponse.json({ error: 'Unsupported documentType' }, { status: 400 });
    }

    // 3. Resolve and validate recipient phone number
    const targetPhone = overridePhone || customer?.phone || customer?.alternate_phone;
    if (!targetPhone || !targetPhone.trim()) {
      return NextResponse.json(
        {
          error:
            'This customer does not have a registered phone number. Please add a phone number to send via WhatsApp.',
          requiresPhoneNumber: true,
          customerId: customer?.id,
        },
        { status: 400 }
      );
    }

    const countryCode = customer?.phone_country_code || (auth.organization.business_country === 'IN' ? '+91' : '+1');
    const rawClean = targetPhone.replace(/[^\d+]/g, '');
    const cleanWithCode = rawClean.startsWith('+') ? rawClean : `${countryCode}${rawClean.replace(/^0+/, '')}`;
    const cleanRecipientDigits = cleanWithCode.replace(/[^\d]/g, '');

    if (cleanRecipientDigits.length < 8) {
      return NextResponse.json(
        {
          error: `The phone number (${targetPhone}) is invalid. Please verify the country code and digits.`,
          requiresPhoneNumber: true,
        },
        { status: 400 }
      );
    }

    // 4. Check idempotency to prevent duplicate sends within 10 minutes
    const todayStr = new Date().toISOString().slice(0, 16); // Minute precision
    const idempotencyKey = `${auth.orgId}:${documentType}:${documentId}:${templateName}:${cleanRecipientDigits}`;

    if (!force) {
      const recentMessages = await store.getWhatsAppMessages(auth.orgId, { limit: 10, documentId });
      const duplicate = recentMessages.find(
        (m) =>
          m.template_name === templateName &&
          m.recipient_phone.replace(/[^\d]/g, '') === cleanRecipientDigits &&
          m.status !== 'FAILED' &&
          Date.now() - new Date(m.created_at).getTime() < 10 * 60 * 1000 // 10 minutes
      );

      if (duplicate) {
        return NextResponse.json(
          {
            error: `A WhatsApp message for this document was already sent recently (at ${duplicate.created_at}). Check message history or confirm to re-send.`,
            isDuplicateWarning: true,
          },
          { status: 409 }
        );
      }
    }

    // 5. Build template variables
    const customerDisplayName = customer?.name || customer?.company_name || 'Valued Customer';
    const businessDisplayName = connection.verified_name || auth.organization.name || 'Our Company';

    const variables: Record<string, string> = {
      customer_name: customerDisplayName,
      business_name: businessDisplayName,
      quotation_number: documentNumber,
      invoice_number: documentNumber,
      amount: amountFormatted,
      currency,
      due_date: dueDateFormatted,
      quote_link: includeSecureLink ? secureLink : baseUrl,
      invoice_link: includeSecureLink ? secureLink : baseUrl,
      payment_link: includeSecureLink ? secureLink : baseUrl,
      receipt_link: includeSecureLink ? secureLink : baseUrl,
    };

    // 6. Dispatch message via Meta WhatsApp Cloud API
    let metaMessageId = '';
    let dispatchStatus = 'SENT';
    let errorMessage: string | null = null;
    let errorCode: string | null = null;

    try {
      const dispatchResult = await sendWhatsAppTemplateMessage({
        phoneNumberId: connection.phone_number_id,
        accessToken,
        recipientPhone: cleanRecipientDigits,
        templateName,
        templateLanguage,
        variables,
      });
      metaMessageId = dispatchResult.messageId;
      dispatchStatus = dispatchResult.status;
    } catch (err: any) {
      console.error('[WhatsApp Send API] Meta dispatch error:', err);
      dispatchStatus = 'FAILED';
      errorMessage = err.message || 'Failed to dispatch WhatsApp message via Meta Cloud API';
      errorCode = err.code || 'META_API_ERROR';
    }

    // 7. Record message in multi-tenant audit trail
    const recordedMessage = await store.createWhatsAppMessage({
      organization_id: auth.orgId,
      customer_id: customer?.id || null,
      document_type: documentType,
      document_id: documentId,
      document_number: documentNumber,
      recipient_phone: `+${cleanRecipientDigits}`,
      template_name: templateName,
      template_language: templateLanguage,
      meta_message_id: metaMessageId,
      status: dispatchStatus as any,
      error_code: errorCode,
      error_message: errorMessage,
      idempotency_key: idempotencyKey,
      sent_by_user_id: auth.userId,
      sent_at: dispatchStatus === 'SENT' ? new Date().toISOString() : null,
      failed_at: dispatchStatus === 'FAILED' ? new Date().toISOString() : null,
      metadata: {
        document_number: documentNumber,
        variables,
      },
    });

    if (dispatchStatus === 'FAILED') {
      return NextResponse.json(
        {
          error: errorMessage || 'Failed to send WhatsApp message',
          errorCode,
          messageId: recordedMessage.id,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: metaMessageId,
      status: dispatchStatus,
      recordedMessageId: recordedMessage.id,
    });
  } catch (error: any) {
    console.error('[WhatsApp Send Route Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send WhatsApp message' },
      { status: 500 }
    );
  }
}
