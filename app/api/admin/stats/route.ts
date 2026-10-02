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

    const [stats, mrrData] = await Promise.all([
      store.getSubscriptionStats(),
      store.calculateMRR(),
    ]);

    return NextResponse.json({
      success: true,
      stats,
      mrr: mrrData,
    });
  } catch (err: any) {
    console.error('Error fetching admin subscription stats:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
