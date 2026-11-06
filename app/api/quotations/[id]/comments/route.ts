import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { staffCommentService } from '@/lib/comments/staff-comment-service';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';

export async function GET(
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

    const [comments, staff, notificationStatus] = await Promise.all([
      staffCommentService.getComments(quotationId, auth.orgId),
      staffCommentService.getMentionCandidates(auth.orgId),
      staffCommentService.getNotificationStatus(quotationId, auth.orgId, auth.userId),
    ]);

    return NextResponse.json({
      success: true,
      comments,
      staff,
      notificationStatus,
      currentUserId: auth.userId,
      currentUserName: auth.fullName,
      currentUserRole: auth.role,
    });
  } catch (err: any) {
    console.error('Failed to get staff comments:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to load comments' },
      { status: 500 }
    );
  }
}

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

    const body = await req.json();
    const { text, mentions } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    const comment = await staffCommentService.addComment({
      quotationId,
      orgId: auth.orgId,
      authorId: auth.userId,
      authorName: auth.fullName || auth.email.split('@')[0],
      authorEmail: auth.email,
      authorRole: auth.role,
      text: text.trim(),
      mentions: Array.isArray(mentions) ? mentions : [],
    });

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (err: any) {
    console.error('Failed to post staff comment:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to post comment' },
      { status: 500 }
    );
  }
}
