import { NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export async function GET() {
  const auth = await getAuthenticatedUserContext();
  if (!auth || !auth.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const orgId = auth.orgId;
  const org = auth?.organization || (await store.getOrganization(orgId));
  const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';
  const notifications = await store.getNotifications(orgId, { environment: env });
  return NextResponse.json({ success: true, notifications });
}

