import React from 'react';

export const dynamic = 'force-dynamic';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { SettingsClientView } from '@/components/settings/settings-client-view';

export default async function SettingsPage() {
  const organization = await store.getOrganization();

  return (
    <DashboardLayout>
      <SettingsClientView initialOrganization={organization!} />
    </DashboardLayout>
  );
}
