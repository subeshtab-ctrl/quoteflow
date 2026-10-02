import { NextRequest, NextResponse } from 'next/server';
import {
  isAuthorizedDeveloperAdmin,
  getDeveloperAdminConfig,
  updateRazorpayPlansConfig,
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

    const cfg = getDeveloperAdminConfig();
    const keyId = razorpayService.getKeyId();
    const mode = razorpayService.getMode();
    const isConfigured = razorpayService.isConfigured();

    return NextResponse.json({
      success: true,
      razorpay: {
        isConfigured,
        mode,
        keyId: keyId ? `${keyId.substring(0, 8)}...` : 'Not Set',
        hasSecret: isConfigured,
        promoPlanId: cfg.razorpayPlanIdPromo99 || '',
        standardPlanId: cfg.razorpayPlanIdStandard199 || '',
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
    const { action, promo_plan_id, standard_plan_id } = body;

    if (action === 'save_plans') {
      const updated = updateRazorpayPlansConfig(promo_plan_id, standard_plan_id);
      return NextResponse.json({
        success: true,
        message: 'Razorpay Plan IDs saved successfully.',
        promoPlanId: updated.razorpayPlanIdPromo99 || '',
        standardPlanId: updated.razorpayPlanIdStandard199 || '',
      });
    }

    if (action === 'test_connection') {
      const cfg = getDeveloperAdminConfig();
      const pId = promo_plan_id !== undefined ? promo_plan_id : cfg.razorpayPlanIdPromo99;
      const sId = standard_plan_id !== undefined ? standard_plan_id : cfg.razorpayPlanIdStandard199;
      const result = await razorpayService.testConnection(pId, sId);
      return NextResponse.json({
        success: true,
        testResult: result,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error handling Razorpay admin request:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
