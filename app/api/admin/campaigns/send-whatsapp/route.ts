import { NextRequest, NextResponse } from 'next/server';
import { getAdminActorContext, recordAdminSecurityEvent } from '@/lib/billing/dev-admin-auth';
import {
  sendAdminMarketingWhatsAppMessage,
  getAdminWhatsAppCredentials,
} from '@/lib/whatsapp/admin-whatsapp-service';

export const dynamic = 'force-dynamic';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      messageText = '',
      promoCode = 'PROMO50',
      promoLink = 'https://www.blendandbold.com',
      companyName = 'QuoteFlow',
      useTemplate = true,
    } = body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
    }

    const creds = await getAdminWhatsAppCredentials();
    if (!creds) {
      return NextResponse.json(
        { error: 'No Meta WhatsApp Cloud API credentials configured for Developer Admin.' },
        { status: 400 }
      );
    }

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const successfulContactIds: string[] = [];

    for (const recipient of recipients) {
      const phone = (recipient.phone || recipient.rawPhone || '').replace(/[^\d]/g, '');
      const name = (recipient.name || '').trim() || 'Partner';

      if (!phone || phone.length < 10) {
        failedCount++;
        continue;
      }

      const res = await sendAdminMarketingWhatsAppMessage({
        recipientPhone: phone,
        recipientName: name,
        companyName,
        messageText,
        promoCode,
        promoLink,
        useTemplate,
      });

      if (res.success) {
        sentCount++;
        if (recipient.id) successfulContactIds.push(recipient.id);
      } else {
        failedCount++;
        if (res.error && errors.length < 5) {
          errors.push(`${phone}: ${res.error}`);
        }
      }

      // 150ms delay pacing to respect Meta Cloud API rates
      await sleep(150);
    }

    recordAdminSecurityEvent({
      action: 'broadcast_whatsapp_dispatched',
      actor: actor.email || 'developer_admin',
      target: `recipients_${recipients.length}`,
      details: {
        sentCount,
        failedCount,
        useTemplate,
        provider: creds.source,
      },
    });

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      successfulContactIds,
      errors,
      provider: creds.source,
      verifiedName: creds.verifiedName,
    });
  } catch (err: any) {
    console.error('[Admin WhatsApp Campaign Broadcast] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to dispatch WhatsApp broadcast' }, { status: 500 });
  }
}
