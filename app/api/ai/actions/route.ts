import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { controlledActionRegistry } from '@/lib/ai/business-operator/action-registry';
import { operatorAuditService } from '@/lib/ai/business-operator/audit-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const actions = controlledActionRegistry.getRegisteredActions();
    return NextResponse.json({ success: true, actions });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let actionName = 'unknown';
  let orgId = '';
  let userId = '';

  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    orgId = auth.orgId;
    userId = auth.userId;

    const entitlement = await subscriptionService.getOrganizationEntitlement(orgId);
    const body = await req.json().catch(() => ({}));
    actionName = body.actionName;
    const parameters = body.parameters || {};
    const confirmedByUser = Boolean(body.confirmedByUser);
    const conversationId = body.conversationId || null;

    if (!actionName) {
      return NextResponse.json({ error: 'actionName is required' }, { status: 400 });
    }

    const result = await controlledActionRegistry.executeAction(
      actionName,
      parameters,
      {
        organizationId: orgId,
        userId: auth.userId,
        userEmail: auth.email,
        userRole: auth.role,
        subscriptionActive: entitlement.hasAccess,
        conversationId,
      },
      confirmedByUser
    );

    // Record usage telemetry
    await operatorAuditService.recordUsage({
      organization_id: orgId,
      user_id: auth.userId,
      feature_name: `action:${actionName}`,
      response_time_ms: Date.now() - startTime,
      success: result.success,
      error_message: result.error,
      actions_invoked: [actionName],
    });

    if (!result.success && result.requiresConfirmation) {
      return NextResponse.json(result, { status: 200 }); // Status 200 with confirmation request
    }

    if (!result.success) {
      return NextResponse.json(result, { status: result.error?.includes('Permission') ? 403 : 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error(`Error in /api/ai/actions for ${actionName}:`, err);
    if (orgId && userId) {
      await operatorAuditService.recordUsage({
        organization_id: orgId,
        user_id: userId,
        feature_name: `action:${actionName}`,
        response_time_ms: Date.now() - startTime,
        success: false,
        error_message: err?.message,
      });
    }

    return NextResponse.json({ error: err?.message || 'Action failed' }, { status: 500 });
  }
}
