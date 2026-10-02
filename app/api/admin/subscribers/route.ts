import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || (auth.role !== 'OWNER' && auth.email.toLowerCase() !== 'subeshtab@gmail.com')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await store.getAllSubscribers({
      status,
      search,
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
