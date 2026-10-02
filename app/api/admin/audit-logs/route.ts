import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedDeveloperAdmin } from '@/lib/billing/dev-admin-auth';
import { store } from '@/lib/supabase/data-store';

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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const logs = await store.getAdminAuditLogs(limit);
    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    console.error('Error fetching admin audit logs:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
