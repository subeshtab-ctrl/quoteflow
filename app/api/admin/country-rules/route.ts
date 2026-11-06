import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { isAuthorizedDeveloperAdmin, getAdminActorContext, hasAdminPermission } from '@/lib/billing/dev-admin-auth';
import { store } from '@/lib/supabase/data-store';
import { ALL_COUNTRIES } from '@/lib/billing/country-rules';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rules = await store.getPaymentCountryRules();
    return NextResponse.json({
      success: true,
      rules,
      allCountries: ALL_COUNTRIES,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const actor = await getAdminActorContext(req);
    const { allowed } = await hasAdminPermission(req, 'manage_system_settings');
    if (!allowed && !actor.authorized) {
      return NextResponse.json({ error: 'Forbidden: Missing permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { country_code, razorpay_enabled, nowpayments_enabled, active } = body;

    if (!country_code || typeof country_code !== 'string') {
      return NextResponse.json({ error: 'country_code is required' }, { status: 400 });
    }

    const updated = await store.updatePaymentCountryRule(country_code, {
      ...(typeof razorpay_enabled === 'boolean' ? { razorpay_enabled } : {}),
      ...(typeof nowpayments_enabled === 'boolean' ? { nowpayments_enabled } : {}),
      ...(typeof active === 'boolean' ? { active } : {}),
    });

    await store.logAdminAudit({
      id: crypto.randomUUID(),
      admin_user_id: actor.email,
      admin_email: actor.email,
      action: 'UPDATE_PAYMENT_COUNTRY_RULE',
      target_type: 'payment_country_rule',
      target_id: country_code.toUpperCase(),
      metadata: {
        country_code: country_code.toUpperCase(),
        updates: { razorpay_enabled, nowpayments_enabled, active },
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      rule: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
