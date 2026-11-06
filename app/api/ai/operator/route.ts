import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { businessOperatorEngine } from '@/lib/ai/business-operator/operator-engine';
import { controlledActionRegistry } from '@/lib/ai/business-operator/action-registry';
import { operatorRecommendationManager } from '@/lib/ai/business-operator/recommendation-manager';
import { subscriptionService } from '@/lib/billing/subscription-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entitlement = await subscriptionService.getOrganizationEntitlement(auth.orgId);
    if (!entitlement.hasAccess) {
      return NextResponse.json(
        { error: 'QuoteFlow Pro subscription required to use Business Operator.' },
        { status: 402 }
      );
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'plan';

    if (view === 'pipeline') {
      const pipeline = await businessOperatorEngine.analyzePipelineTemperatures(auth.orgId);
      return NextResponse.json({ success: true, pipeline });
    }

    if (view === 'recovery') {
      const recovery = await businessOperatorEngine.recoverLostLeads(auth.orgId);
      return NextResponse.json({ success: true, recovery });
    }

    if (view === 'win_loss') {
      const winLoss = await businessOperatorEngine.analyzeWinLossDisparity(auth.orgId);
      return NextResponse.json({ success: true, winLoss });
    }

    if (view === 'pricing') {
      const pricing = await businessOperatorEngine.analyzePricingAndMargins(auth.orgId);
      return NextResponse.json({ success: true, pricing });
    }

    if (view === 'cashflow') {
      const cashflow = await businessOperatorEngine.projectCashFlow(auth.orgId);
      return NextResponse.json({ success: true, cashflow });
    }

    if (view === 'automations') {
      const automations = await businessOperatorEngine.getAutomationRules(auth.orgId);
      return NextResponse.json({ success: true, automations });
    }

    const plan = await businessOperatorEngine.generateDailyActionPlan(
      auth.orgId,
      auth.userId,
      auth.role
    );

    return NextResponse.json({ success: true, plan });
  } catch (err: any) {
    console.error('Failed to generate daily action plan:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate daily action plan' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entitlement = await subscriptionService.getOrganizationEntitlement(auth.orgId);
    if (!entitlement.hasAccess) {
      return NextResponse.json(
        { error: 'QuoteFlow Pro subscription required to use Business Operator.' },
        { status: 402 }
      );
    }

    const body = await req.json();
    const { action, operatorActionId, actionKey, draftPayload, confirmed, ruleId, enabled } = body;

    if (action === 'toggle_automation') {
      const updated = await businessOperatorEngine.toggleAutomationRule(auth.orgId, ruleId, Boolean(enabled));
      return NextResponse.json({ success: true, updated });
    }

    if (action === 'dismiss') {
      const updated = await operatorRecommendationManager.updateRecommendationStatus(
        auth.orgId,
        operatorActionId,
        'DISMISSED',
        'DISMISSED'
      );
      return NextResponse.json({ success: true, updated });
    }

    if (action === 'complete') {
      const updated = await operatorRecommendationManager.updateRecommendationStatus(
        auth.orgId,
        operatorActionId,
        'COMPLETED',
        'MANUAL'
      );
      return NextResponse.json({ success: true, updated });
    }

    // Default: execute controlled action
    const result = await controlledActionRegistry.executeAction(
      actionKey,
      draftPayload || {},
      {
        organizationId: auth.orgId,
        userId: auth.userId,
        userEmail: auth.email,
        userRole: auth.role as any,
      },
      confirmed
    );

    if (result.success && operatorActionId) {
      await operatorRecommendationManager.updateRecommendationStatus(
        auth.orgId,
        operatorActionId,
        'COMPLETED',
        'CONTACTED',
        draftPayload?.value
      );
    }

    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      requiresConfirmation: result.requiresConfirmation,
      confirmationMessage: result.confirmationMessage,
      draftPayload: result.draftPayload,
    });
  } catch (err: any) {
    console.error('Operator action execution failed:', err);
    return NextResponse.json(
      { error: err.message || 'Action execution failed' },
      { status: 500 }
    );
  }
}
