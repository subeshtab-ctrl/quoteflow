import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { growthEngine } from '@/lib/ai/growth-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = auth.orgId;
    const body = await req.json().catch(() => ({}));
    const { key, action, outcome, revenue } = body;

    if (!key || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: key and action' },
        { status: 400 }
      );
    }

    if (!['APPLIED', 'DISMISSED', 'SNOOZED'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
    }

    const record = growthEngine.recordRecommendationFeedback(
      orgId,
      key,
      action,
      outcome,
      revenue ? Number(revenue) : undefined
    );

    return NextResponse.json({
      success: true,
      record,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/growth/feedback:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to record recommendation feedback' },
      { status: 500 }
    );
  }
}
