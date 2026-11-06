import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { operatorRecommendationManager } from '@/lib/ai/business-operator/recommendation-manager';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = auth.orgId;
    const entitlement = await subscriptionService.getOrganizationEntitlement(orgId);
    if (!entitlement.hasAccess) {
      return NextResponse.json({ error: 'Subscription required' }, { status: 402 });
    }

    const recommendations = await operatorRecommendationManager.getActiveRecommendations(orgId);
    return NextResponse.json({ success: true, recommendations });
  } catch (err: any) {
    console.error('Error in /api/ai/recommendations GET:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch recommendations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = auth.orgId;
    const body = await req.json().catch(() => ({}));
    const { id, status, reason, revenue } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    const updated = await operatorRecommendationManager.updateRecommendationStatus(
      orgId,
      id,
      status,
      reason,
      revenue ? Number(revenue) : undefined
    );

    return NextResponse.json({ success: true, recommendation: updated });
  } catch (err: any) {
    console.error('Error in /api/ai/recommendations POST:', err);
    return NextResponse.json({ error: err?.message || 'Failed to update recommendation' }, { status: 500 });
  }
}
