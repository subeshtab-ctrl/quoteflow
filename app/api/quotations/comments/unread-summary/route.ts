import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { staffCommentService } from '@/lib/comments/staff-comment-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { quotationIds } = body;

    if (!Array.isArray(quotationIds) || quotationIds.length === 0) {
      return NextResponse.json({ success: true, statuses: {} });
    }

    // Limit to 100 quotation IDs per request for optimal throughput
    const targetIds = quotationIds.slice(0, 100);
    const statuses = await staffCommentService.getBatchNotificationStatus(
      targetIds,
      auth.orgId,
      auth.userId
    );

    return NextResponse.json({
      success: true,
      statuses,
    });
  } catch (err: any) {
    console.error('Failed to get unread summary:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch unread statuses' },
      { status: 500 }
    );
  }
}
