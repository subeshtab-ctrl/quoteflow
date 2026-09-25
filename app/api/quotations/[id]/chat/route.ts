import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const quote = await store.getQuotationById(id, orgId);

    if (!quote) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const markRead = request.nextUrl.searchParams.get('markRead') === 'true';
    if (markRead) {
      await store.markQuotationChatRead(id, quote.organization_id, auth?.fullName || auth?.email || 'Staff');
    }

    const messages = await store.getQuotationChatMessages(id);
    return NextResponse.json({ messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load chat messages' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const quote = await store.getQuotationById(id, orgId);

    if (!quote) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message || !String(message).trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const senderName = auth?.fullName || quote.organization?.name || 'Team';

    const saved = await store.addQuotationChatMessage({
      quotationId: id,
      organizationId: quote.organization_id,
      senderRole: 'STAFF',
      senderName,
      message: String(message).trim(),
    });

    await store.markQuotationChatRead(id, quote.organization_id, senderName);

    const messages = await store.getQuotationChatMessages(id);
    return NextResponse.json({ message: saved, messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send chat reply' }, { status: 500 });
  }
}
