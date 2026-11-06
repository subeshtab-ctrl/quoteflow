import { NextRequest, NextResponse } from 'next/server';
import { getAdminActorContext, recordAdminSecurityEvent } from '@/lib/billing/dev-admin-auth';
import { sendAdminSupportWhatsAppMessage } from '@/lib/whatsapp/admin-whatsapp-service';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const actor = await getAdminActorContext(req);
    if (!actor.authorized) {
      return NextResponse.json({ error: 'Unauthorized developer admin' }, { status: 403 });
    }

    const body = await req.json();
    const {
      ticketId,
      ticketNumber,
      recipientPhone,
      businessName,
      message,
      useTemplate = false,
    } = body;

    if (!recipientPhone) {
      return NextResponse.json({ error: 'Recipient phone number is required' }, { status: 400 });
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    let resolvedTicketNumber = ticketNumber;
    let resolvedBusinessName = businessName;

    if (ticketId && (!resolvedTicketNumber || !resolvedBusinessName)) {
      const ticket = await store.getSupportTicket(ticketId);
      if (ticket) {
        resolvedTicketNumber = resolvedTicketNumber || ticket.ticket_number;
        resolvedBusinessName = resolvedBusinessName || (ticket as any).business_name || 'Valued Business';
      }
    }

    const res = await sendAdminSupportWhatsAppMessage({
      recipientPhone,
      businessName: resolvedBusinessName || 'Valued Business',
      ticketNumber: resolvedTicketNumber || 'QF-SUPPORT',
      ticketId: ticketId || 'direct_support',
      replyMessage: message.trim(),
      useTemplate: Boolean(useTemplate),
    });

    if (!res.success) {
      return NextResponse.json({ error: res.error || 'Failed to send WhatsApp message' }, { status: 500 });
    }

    recordAdminSecurityEvent({
      action: 'support_whatsapp_sent',
      actor: actor.email || 'developer_admin',
      target: recipientPhone,
      details: {
        ticketId,
        ticketNumber: resolvedTicketNumber,
        messageId: res.messageId,
      },
    });

    return NextResponse.json({
      success: true,
      messageId: res.messageId,
    });
  } catch (err: any) {
    console.error('[Admin Support WhatsApp] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
