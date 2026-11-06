import { NextRequest, NextResponse } from 'next/server';
import { getAdminActorContext } from '@/lib/billing/dev-admin-auth';
import { aiTeamStore } from '@/lib/ai/ai-team-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const actor = await getAdminActorContext(req);
    if (!actor.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { approvalId, founderNotes } = body;

    if (!approvalId) {
      return NextResponse.json({ error: 'approvalId is required' }, { status: 400 });
    }

    const result = await aiTeamStore.approveItem(approvalId, founderNotes);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[AI_TEAM_APPROVE_ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to approve item' },
      { status: 500 }
    );
  }
}
