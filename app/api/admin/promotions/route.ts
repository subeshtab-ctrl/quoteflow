import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedDeveloperAdmin, DEVELOPER_ADMIN_EMAIL } from '@/lib/billing/dev-admin-auth';
import { store } from '@/lib/supabase/data-store';
import { Promotion } from '@/types/database';
import crypto from 'crypto';

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

    const promotions = await store.getPromotions();
    return NextResponse.json({ success: true, promotions });
  } catch (err: any) {
    console.error('Error fetching promotions:', err);
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
    const { name, code, promotional_price, duration_months, description } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    }

    const newPromo: Promotion = {
      id: crypto.randomUUID(),
      name,
      code: code.toUpperCase().trim(),
      description: description || null,
      discount_type: 'FIXED',
      discount_value: 100,
      promotional_price: promotional_price || 9900,
      currency: 'INR',
      duration_months: duration_months || 3,
      max_redemptions: null,
      redemption_count: 0,
      starts_at: new Date().toISOString(),
      ends_at: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await store.logAdminAudit({
      id: crypto.randomUUID(),
      admin_user_id: 'dev_admin_root',
      admin_email: DEVELOPER_ADMIN_EMAIL,
      action: 'CREATE_PROMOTION',
      target_type: 'promotion',
      target_id: newPromo.id,
      metadata: { code: newPromo.code, promotional_price: newPromo.promotional_price },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, promotion: newPromo });
  } catch (err: any) {
    console.error('Error creating promotion:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
