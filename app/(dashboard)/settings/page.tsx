import React from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { SettingsClientView } from '@/components/settings/settings-client-view';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export default async function SettingsPage() {
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
  const organization = await store.getOrganization(orgId);

  return (
    <DashboardLayout>
      <SettingsClientView
        initialOrganization={organization!}
        currentUserRole={auth?.role || 'OWNER'}
        currentUserId={auth?.userId || ''}
        currentUserEmail={auth?.email || ''}
      />
    </DashboardLayout>
  );
}
