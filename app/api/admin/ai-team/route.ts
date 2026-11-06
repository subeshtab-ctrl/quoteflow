import { NextRequest, NextResponse } from 'next/server';
import { getAdminActorContext } from '@/lib/billing/dev-admin-auth';
import { aiTeamStore } from '@/lib/ai/ai-team-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const actor = await getAdminActorContext(req);
    if (!actor.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const refresh = req.nextUrl.searchParams.get('refresh') === 'true';
    const state = await aiTeamStore.getState(refresh);

    return NextResponse.json({
      success: true,
      data: state,
    });
  } catch (error: any) {
    console.error('[AI_TEAM_GET_ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch AI Team data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getAdminActorContext(req);
    if (!actor.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const triggerSource = body.triggerSource || 'admin_manual_button';

    const result = await aiTeamStore.runCycle(triggerSource);

    return NextResponse.json({
      success: true,
      message: 'AI Team cycle executed successfully.',
      data: result,
    });
  } catch (error: any) {
    console.error('[AI_TEAM_CYCLE_ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to execute AI Team cycle' },
      { status: 500 }
    );
  }
}
