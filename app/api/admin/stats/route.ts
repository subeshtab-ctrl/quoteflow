import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || (auth.role !== 'OWNER' && auth.email.toLowerCase() !== 'subeshtab@gmail.com')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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
