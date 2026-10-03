import { NextRequest, NextResponse } from 'next/server';
import {
  isAuthorizedDeveloperAdmin,
  getDeveloperAdminConfig,
  updateRazorpayPlansConfig,
  updateRazorpayApiConfig,
  syncCloudAdminConfig,
} from '@/lib/billing/dev-admin-auth';
import { razorpayService } from '@/lib/billing/razorpay';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { error: 'Forbidden: Strict developer admin access required.' },
        { status: 403 }
      );
    }

    await syncCloudAdminConfig();
    const cfg = getDeveloperAdminConfig();
    const keyId = razorpayService.getKeyId();
    const mode = cfg.razorpayMode || razorpayService.getMode();
    const isConfigured = razorpayService.isConfigured();

    return NextResponse.json({
      success: true,
      razorpay: {
        isConfigured,
        mode,
        keyId: keyId || '',
        maskedKeyId: keyId ? `${keyId.substring(0, 8)}...` : 'Not Set',
        hasSecret: isConfigured,
        hasCustomKey: Boolean(cfg.razorpayKeyId),
        promoPlanId: cfg.razorpayPlanIdPromo99 || 'plan_Tj1uiAIYxdedEa',
        standardPlanId: cfg.razorpayPlanIdStandard199 || 'plan_Tj1uiAIYxdedEa',
      },
    });
  } catch (err: any) {
    console.error('Error fetching Razorpay admin configuration:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { error: 'Forbidden: Strict developer admin access required.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action, key_id, key_secret, promo_plan_id, standard_plan_id, mode } = body;

    if (action === 'toggle_mode') {
      const targetMode: 'live' | 'test' = mode === 'test' ? 'test' : 'live';
      const updated = await updateRazorpayApiConfig({ mode: targetMode });
      razorpayService.reloadCredentials();
      return NextResponse.json({
        success: true,
        message: `Razorpay switched to ${targetMode.toUpperCase()} mode.`,
        mode: targetMode,
      });
    }

    if (action === 'save_credentials' || action === 'save_plans') {
      const updated = await updateRazorpayApiConfig({
        keyId: key_id,
        keySecret: key_secret,
        promoPlanId: promo_plan_id || 'plan_Tj1uiAIYxdedEa',
        standardPlanId: standard_plan_id || promo_plan_id || 'plan_Tj1uiAIYxdedEa',
        mode: mode || (key_id?.startsWith('rzp_live_') ? 'live' : undefined),
      });
      razorpayService.reloadCredentials();

      return NextResponse.json({
        success: true,
        message: 'Razorpay configuration updated successfully.',
        keyId: razorpayService.getKeyId() || '',
        promoPlanId: updated.razorpayPlanIdPromo99 || 'plan_Tj1uiAIYxdedEa',
        standardPlanId: updated.razorpayPlanIdStandard199 || 'plan_Tj1uiAIYxdedEa',
        mode: updated.razorpayMode || 'live',
      });
    }

    if (action === 'test_connection') {
      if (key_id || key_secret || promo_plan_id !== undefined || standard_plan_id !== undefined) {
        await updateRazorpayApiConfig({
          keyId: key_id,
          keySecret: key_secret,
          promoPlanId: promo_plan_id,
          standardPlanId: standard_plan_id,
        });
        razorpayService.reloadCredentials();
      }
      const cfg = getDeveloperAdminConfig();
      const pId = promo_plan_id !== undefined ? promo_plan_id : cfg.razorpayPlanIdPromo99;
      const sId = standard_plan_id !== undefined ? standard_plan_id : cfg.razorpayPlanIdStandard199;
      const result = await razorpayService.testConnection(pId, sId);

      // If matching plans were auto-detected from the account and not yet explicitly set, auto-save them
      if (
        (result.promoPlanDetails?.isAutoDetected && !cfg.razorpayPlanIdPromo99) ||
        (result.standardPlanDetails?.isAutoDetected && !cfg.razorpayPlanIdStandard199)
      ) {
        await updateRazorpayApiConfig({
          promoPlanId: result.promoPlanDetails?.id,
          standardPlanId: result.standardPlanDetails?.id,
        });
      }

      return NextResponse.json({
        success: true,
        testResult: result,
      });
    }

    if (action === 'auto_create_plans') {
      if (key_id || key_secret) {
        await updateRazorpayApiConfig({
          keyId: key_id,
          keySecret: key_secret,
        });
        razorpayService.reloadCredentials();
      }

      if (!razorpayService.isConfigured()) {
        return NextResponse.json(
          { error: 'Razorpay API credentials not configured.' },
          { status: 400 }
        );
      }

      // Create QuoteFlow Pro ₹99/month recurring plan (Requirement 1: ONLY ₹99 plan exists)
      const proPlan = await razorpayService.createPlan({
        name: 'QuoteFlow Pro',
        amount: 9900,
        currency: 'INR',
        period: 'monthly',
        interval: 1,
        description: 'QuoteFlow Pro ₹99/month recurring subscription',
      });

      // Update config with the newly created plan ID
      const updated = await updateRazorpayApiConfig({
        promoPlanId: proPlan.id,
        standardPlanId: proPlan.id,
      });

      const testResult = await razorpayService.testConnection(proPlan.id, proPlan.id);

      return NextResponse.json({
        success: true,
        message: 'Successfully created and linked QuoteFlow Pro (₹99/month) plan in your Razorpay account!',
        promoPlanId: proPlan.id,
        standardPlanId: proPlan.id,
        testResult,
      });
    }

    if (action === 'auto_link_plans') {
      const updated = await updateRazorpayApiConfig({
        promoPlanId: promo_plan_id,
        standardPlanId: standard_plan_id,
      });
      const testResult = await razorpayService.testConnection(
        updated.razorpayPlanIdPromo99,
        updated.razorpayPlanIdStandard199
      );
      return NextResponse.json({
        success: true,
        message: 'Selected plans linked successfully.',
        promoPlanId: updated.razorpayPlanIdPromo99 || '',
        standardPlanId: updated.razorpayPlanIdStandard199 || '',
        testResult,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error handling Razorpay admin request:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
