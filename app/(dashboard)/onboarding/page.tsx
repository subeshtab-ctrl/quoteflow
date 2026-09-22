import React from 'react';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { OnboardingClientView } from '@/components/onboarding/onboarding-client-view';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OnboardingPage() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) {
    redirect('/login');
  }

  const organization = await store.getOrganization(auth.orgId);
  if (!organization) {
    redirect('/dashboard');
  }

  return (
    <DashboardLayout>
      <OnboardingClientView initialOrg={organization} />
    </DashboardLayout>
  );
}
