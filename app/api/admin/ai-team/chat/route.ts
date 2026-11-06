import { NextRequest, NextResponse } from 'next/server';
import { getAdminActorContext } from '@/lib/billing/dev-admin-auth';
import { aiTeamStore } from '@/lib/ai/ai-team-store';
import { AIAgentId } from '@/types/ai-team';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const actor = await getAdminActorContext(req);
    if (!actor.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { agentId, message } = body;

    if (!agentId || !message) {
      return NextResponse.json(
        { error: 'agentId and message are required' },
        { status: 400 }
      );
    }

    const validAgents: AIAgentId[] = ['ceo', 'growth', 'finance', 'ops'];
    if (!validAgents.includes(agentId)) {
      return NextResponse.json(
        { error: `Invalid agentId: ${agentId}` },
        { status: 400 }
      );
    }

    const result = await aiTeamStore.chat(agentId, message);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[AI_TEAM_CHAT_ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to chat with agent' },
      { status: 500 }
    );
  }
}
