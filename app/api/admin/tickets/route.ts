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
    const category = searchParams.get('category') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const search = searchParams.get('search') || undefined;

    const tickets = await store.getSupportTickets({
      status,
      category,
      priority,
      search,
    });

    return NextResponse.json({ success: true, tickets });
  } catch (err: any) {
    console.error('Error fetching admin tickets:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
