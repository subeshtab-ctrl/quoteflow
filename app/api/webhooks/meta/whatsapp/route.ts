import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/meta-cloud-api';
import { WhatsAppMessageStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken =
    process.env.META_WEBHOOK_VERIFY_TOKEN || 'quoteflow_meta_webhook_verify_token';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[Meta WhatsApp Webhook] Verification successful');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[Meta WhatsApp Webhook] Verification token mismatch');
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    // Verify HMAC SHA-256 signature
    const isValid = verifyMetaWebhookSignature(rawBody, signature);
    if (!isValid && process.env.NODE_ENV === 'production') {
      console.warn('[Meta WhatsApp Webhook] Invalid signature rejected');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    if (payload.object === 'whatsapp_business_account' && Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        if (!Array.isArray(entry.changes)) continue;

        for (const change of entry.changes) {
          const value = change.value;
          if (!value) continue;

          // Process status updates (sent, delivered, read, failed)
          if (Array.isArray(value.statuses)) {
            for (const statusObj of value.statuses) {
              const metaMessageId = statusObj.id;
              const statusStr = (statusObj.status || '').toUpperCase();

              let mappedStatus: WhatsAppMessageStatus | null = null;
              if (statusStr === 'SENT') mappedStatus = 'SENT';
              else if (statusStr === 'DELIVERED') mappedStatus = 'DELIVERED';
              else if (statusStr === 'READ') mappedStatus = 'READ';
              else if (statusStr === 'FAILED') mappedStatus = 'FAILED';

              let errorReason: string | undefined = undefined;
              if (Array.isArray(statusObj.errors) && statusObj.errors.length > 0) {
                const err = statusObj.errors[0];
                errorReason = `${err.title || err.message || 'Error'} (Code ${err.code})`;
              }

              if (metaMessageId && mappedStatus) {
                await store.updateWhatsAppMessageStatus(metaMessageId, mappedStatus, errorReason);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (error: any) {
    console.error('[Meta WhatsApp Webhook] Processing error:', error);
    // Always return 200 to acknowledge Meta webhook so it does not retry endlessly
    return NextResponse.json({ status: 'ERROR_RECORDED' }, { status: 200 });
  }
}
