import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { staffCommentService } from '@/lib/comments/staff-comment-service';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: quotationId } = await params;
    const quotation = await store.getQuotationById(quotationId, auth.orgId);
    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    // Tenant isolation verification
    if (quotation.organization_id !== auth.orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let lastReadCommentId: string | undefined;
    try {
      const body = await req.json();
      lastReadCommentId = body?.lastReadCommentId;
    } catch {}

    await staffCommentService.markCommentsRead(
      quotationId,
      auth.orgId,
      auth.userId,
      lastReadCommentId
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to mark comments as read:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update read status' },
      { status: 500 }
    );
  }
}
