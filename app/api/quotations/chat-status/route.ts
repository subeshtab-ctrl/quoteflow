import { NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const quotations = await store.getQuotations(orgId);

    const statusMap: Record<
      string,
      { has_unread_chat: boolean; unread_chat_count: number; chat_count: number }
    > = {};

    for (const q of quotations) {
      statusMap[q.id] = {
        has_unread_chat: Boolean(q.has_unread_chat),
        unread_chat_count: q.unread_chat_count || 0,
        chat_count: q.chat_count || 0,
      };
    }

    return NextResponse.json({ statusMap });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch chat status' },
      { status: 500 }
    );
  }
}
