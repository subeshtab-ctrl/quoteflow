import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { growthEngine } from '@/lib/ai/growth-engine';

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
      return NextResponse.json(
        {
          error:
            auth.role === 'STAFF'
              ? "Your organization's subscription has expired. Please contact your administrator."
              : 'Your subscription has expired. Please renew to access QuoteFlow AI Growth Assistant.',
        },
        { status: 402 }
      );
    }

    const [mistakes, opportunities, health] = await Promise.all([
      growthEngine.analyzeBusinessMistakes(orgId, auth.role),
      growthEngine.identifyGrowthOpportunities(orgId, auth.role),
      growthEngine.calculateBusinessHealth(orgId),
    ]);

    return NextResponse.json({
      success: true,
      mistakes,
      opportunities,
      health,
      role: auth.role,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/growth:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch business growth insights' },
      { status: 500 }
    );
  }
}
