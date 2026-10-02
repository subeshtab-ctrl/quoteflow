import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedDeveloperAdmin, DEVELOPER_ADMIN_EMAIL } from '@/lib/billing/dev-admin-auth';
import { store } from '@/lib/supabase/data-store';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

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
    const { promotion_id, business_id, action } = body;

    if (!promotion_id || !business_id) {
      return NextResponse.json(
        { error: 'promotion_id and business_id are required' },
        { status: 400 }
      );
    }

    if (action === 'revoke') {
      await store.updatePromotionAssignmentStatus(business_id, promotion_id, 'revoked');
      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: 'dev_admin_root',
        admin_email: DEVELOPER_ADMIN_EMAIL,
        action: 'REVOKE_PROMOTION',
        target_type: 'promotion_assignment',
        target_id: `${business_id}:${promotion_id}`,
        metadata: { business_id, promotion_id },
        created_at: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, message: 'Promotion revoked' });
    }

    const assignment = await store.assignPromotion({
      id: crypto.randomUUID(),
      promotion_id,
      business_id,
      status: 'eligible',
      assigned_at: new Date().toISOString(),
      redeemed_at: null,
      expires_at: null,
      created_by: 'dev_admin_root',
    });

    await store.logAdminAudit({
      id: crypto.randomUUID(),
      admin_user_id: 'dev_admin_root',
      admin_email: DEVELOPER_ADMIN_EMAIL,
      action: 'ASSIGN_PROMOTION',
      target_type: 'promotion_assignment',
      target_id: assignment.id,
      metadata: { business_id, promotion_id, assignment_id: assignment.id },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, assignment });
  } catch (err: any) {
    console.error('Error assigning promotion:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
