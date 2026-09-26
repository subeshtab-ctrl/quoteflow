import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing quotation token' }, { status: 400 });
    }

    const quotation = await store.getQuotationByPublicToken(token);
    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const markRead = request.nextUrl.searchParams.get('markRead') === 'true';
    if (markRead) {
      await store.markCustomerChatRead(
        quotation.id,
        quotation.organization_id,
        quotation.customer?.name || quotation.customer?.company_name || 'Customer'
      );
    }

    const messages = await store.getQuotationChatMessages(quotation.id);
    return NextResponse.json({ messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load chat' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, sender_name, message, attachment } = body;

    const trimmedMsg = String(message || '').trim();
    if (!token || (!trimmedMsg && !attachment)) {
      return NextResponse.json({ error: 'Token and message or attachment are required' }, { status: 400 });
    }

    const quotation = await store.getQuotationByPublicToken(token);
    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const senderName =
      (sender_name && String(sender_name).trim()) ||
      quotation.customer?.name ||
      quotation.customer?.company_name ||
      'Customer';

    const saved = await store.addQuotationChatMessage({
      quotationId: quotation.id,
      organizationId: quotation.organization_id,
      senderRole: 'CUSTOMER',
      senderName,
      message: trimmedMsg || (attachment ? `Attached: ${attachment.name}` : ''),
      attachment: attachment || null,
    });

    await store.markCustomerChatRead(quotation.id, quotation.organization_id, senderName);

    const messages = await store.getQuotationChatMessages(quotation.id);
    return NextResponse.json({ message: saved, messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send message' }, { status: 500 });
  }
}
