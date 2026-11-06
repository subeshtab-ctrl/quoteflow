import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { growthEngine } from '@/lib/ai/growth-engine';
import { store } from '@/lib/supabase/data-store';
import { isOwnerOrAdminRole } from '@/types/staff';
import { staffService } from '@/lib/staff/staff-service';

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
        { error: 'Subscription required to access AI prospect discovery' },
        { status: 402 }
      );
    }

    const { searchParams } = new URL(req.url);
    const targetCity = searchParams.get('city') || undefined;
    const targetCategory = searchParams.get('category') || undefined;
    const count = parseInt(searchParams.get('count') || '15', 10);

    const prospects = await growthEngine.generateTargetedProspects(orgId, {
      targetCity,
      targetCategory,
      count: Math.min(Math.max(count, 5), 50),
    });

    return NextResponse.json({
      success: true,
      prospects,
      totalCount: prospects.length,
    });
  } catch (err: any) {
    console.error('Error fetching prospects:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to discover targeted prospects' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canAddCustomer =
      isOwnerOrAdminRole(auth.role) ||
      staffService.hasPermission(auth.role, undefined, 'customers_create');
    if (!canAddCustomer) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to add leads' },
        { status: 403 }
      );
    }

    const orgId = auth.orgId;
    const org = await store.getOrganization(orgId);
    const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';

    const body = await req.json().catch(() => ({}));
    const { action, prospect } = body;

    if (action === 'add_to_leads' && prospect) {
      const created = await store.createCustomer({
        organization_id: orgId,
        environment: env,
        name: prospect.businessName,
        email: prospect.contactEmail || undefined,
        phone: prospect.contactPhone || undefined,
        city: prospect.city || org?.city || 'Unknown',
        country: prospect.country || org?.country || 'IN',
        notes: `AI Discovered Lead [Score: ${prospect.leadScore}/100]. Fit: ${prospect.fitReason}. Discovered from: ${prospect.leadSource}`,
      });

      // Record positive feedback for recommendations engine
      growthEngine.recordRecommendationFeedback(
        orgId,
        `PROSPECT_${prospect.id}`,
        'APPLIED',
        'ACCEPTED'
      );

      return NextResponse.json({
        success: true,
        message: `${prospect.businessName} successfully added to customer leads!`,
        customer: created,
      });
    }

    return NextResponse.json({ error: 'Invalid action or missing prospect data' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in /api/ai/growth/prospects POST:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process prospect action' },
      { status: 500 }
    );
  }
}
