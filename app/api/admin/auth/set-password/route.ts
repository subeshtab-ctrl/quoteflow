import { NextRequest, NextResponse } from 'next/server';
import {
  isAuthorizedDeveloperAdmin,
  setDeveloperAdminPassword,
  DEVELOPER_ADMIN_EMAIL,
} from '@/lib/billing/dev-admin-auth';
import { store } from '@/lib/supabase/data-store';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { error: 'Forbidden: Active developer admin verification required to set password.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const newPassword = body.newPassword || '';

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    setDeveloperAdminPassword(newPassword);

    await store.logAdminAudit({
      id: crypto.randomUUID(),
      admin_user_id: 'dev_admin_root',
      admin_email: DEVELOPER_ADMIN_EMAIL,
      action: 'UPDATE_ADMIN_PASSWORD',
      target_type: 'developer_admin_config',
      target_id: DEVELOPER_ADMIN_EMAIL,
      metadata: {
        message: 'Developer Admin password updated successfully',
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Developer Admin password configured successfully.',
    });
  } catch (err: any) {
    console.error('Error setting developer admin password:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
