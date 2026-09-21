import { NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export async function GET() {
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
  const notifications = await store.getNotifications(orgId);
  return NextResponse.json({ success: true, notifications });
}
