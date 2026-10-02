import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { AdminDashboardView } from '@/components/admin/admin-dashboard-view';

export const metadata = {
  title: 'Developer & Admin Dashboard | QuoteFlow',
  description: 'SaaS subscribers, MRR metrics, promotions, and developer support.',
};

export default async function AdminPage() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) {
    redirect('/login');
  }

  const isDeveloperOrAdmin =
    auth.role === 'OWNER' || auth.email?.toLowerCase() === 'subeshtab@gmail.com';

  if (!isDeveloperOrAdmin) {
    redirect('/dashboard');
  }

  return <AdminDashboardView />;
}
