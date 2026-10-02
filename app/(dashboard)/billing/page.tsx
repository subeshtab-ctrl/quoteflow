import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { subscriptionService, DEFAULT_PLANS } from '@/lib/billing/subscription-service';
import { store } from '@/lib/supabase/data-store';
import { BillingView } from '@/components/billing/billing-view';

export const metadata = {
  title: 'Subscription & Billing | QuoteFlow',
  description: 'Manage your QuoteFlow plans, promotional cycles, and payments.',
};

export default async function BillingPage() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) {
    redirect('/login');
  }

  const [subscription, access, isEligibleForPromo, payments] = await Promise.all([
    store.getBusinessSubscription(auth.orgId),
    subscriptionService.getBusinessSubscriptionAccess(auth.orgId),
    subscriptionService.isEligibleForPromotion(auth.orgId),
    store.getSubscriptionPayments(auth.orgId, 20),
  ]);

  const initialData = {
    subscription,
    access,
    isEligibleForPromo,
    promoPlan: DEFAULT_PLANS.PROMO_99,
    plans: [DEFAULT_PLANS.FREE_TRIAL, DEFAULT_PLANS.STANDARD_199],
    payments,
  };

  return <BillingView initialData={initialData} />;
}
