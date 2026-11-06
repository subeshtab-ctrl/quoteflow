import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const documentId = searchParams.get('documentId') || undefined;

    const messages = await store.getWhatsAppMessages(auth.orgId, {
      limit,
      offset,
      documentId,
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('[WhatsApp Messages History API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch WhatsApp message history' },
      { status: 500 }
    );
  }
}
