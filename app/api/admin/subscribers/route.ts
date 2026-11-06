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
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const country = searchParams.get('country') || undefined;
    const region = searchParams.get('region') || undefined;
    const gateway = searchParams.get('gateway') || undefined;
    const currency = searchParams.get('currency') || undefined;
    const plan = searchParams.get('plan') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result = await store.getAllSubscribers({
      status,
      search,
      country,
      region,
      gateway,
      currency,
      plan,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
      page,
      limit,
    });
  } catch (err: any) {
    console.error('Error fetching subscribers:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
