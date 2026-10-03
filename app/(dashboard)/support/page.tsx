import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';
import { SupportView } from '@/components/support/support-view';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Developer Support | QuoteFlow',
  description: 'Submit technical issues, billing inquiries, and feature requests directly to engineering.',
};

export default async function SupportPage() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) {
    redirect('/login');
  }

  const tickets = await store.getSupportTickets({ businessId: auth.orgId });

  return <SupportView initialTickets={tickets} />;
}
