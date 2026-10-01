import { NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export async function GET() {
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
  const org = await store.getOrganization(orgId);
  const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';
  const notifications = await store.getNotifications(orgId, { environment: env });
  return NextResponse.json({ success: true, notifications });
}
