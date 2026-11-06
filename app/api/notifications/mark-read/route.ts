import { NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export async function POST() {
  const auth = await getAuthenticatedUserContext();
  if (!auth || !auth.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const orgId = auth.orgId;
  await store.markAllNotificationsRead(orgId);
  return NextResponse.json({ success: true });
}
