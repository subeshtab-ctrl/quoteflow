'use client';

import React, { useEffect, useState } from 'react';
import { WelcomeTrialModal } from './welcome-trial-modal';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { SUBSCRIPTION_CONFIG } from '@/lib/billing/subscription-config';
import { isOwnerOrAdminRole } from '@/types/staff';

interface WelcomeTrialTriggerProps {
  orgId: string;
  userId?: string;
  trialEndsAt?: string | null;
  isTrial?: boolean;
  businessCountry?: string | null;
  billingCurrency?: string | null;
  userRole?: string;
  isStaff?: boolean;
  isOwner?: boolean;
}

export function WelcomeTrialTrigger({
  orgId,
  userId,
  trialEndsAt,
  isTrial,
  businessCountry: initialCountry,
  billingCurrency,
  userRole,
  isStaff,
  isOwner,
}: WelcomeTrialTriggerProps) {
  // Staff accounts must NEVER receive or see the welcome trial modal.
  // Strictly reserved for the confirmed workspace OWNER.
  if (isStaff === true || isOwner === false || userRole !== 'OWNER') {
    return null;
  }
  const [isOpen, setIsOpen] = useState(false);
  const [currentCountry, setCurrentCountry] = useState<string | null>(initialCountry || null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (initialCountry) {
      setCurrentCountry(initialCountry);
    }
  }, [initialCountry]);

  // Also query eligibility to ensure we have the live saved country from DB
  useEffect(() => {
    let isMounted = true;
    fetch('/api/billing/eligibility')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;
        if (data.businessCountry) {
          setCurrentCountry(data.businessCountry);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isTrial || !orgId) return;

    const storageKey = `quoteflow_welcomed_${orgId}`;
    const hasSeenWelcome = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : 'true';
    const welcomeParam = searchParams.get('welcome');

    if (welcomeParam === 'true' || (!hasSeenWelcome && isTrial)) {
      setIsOpen(true);
    }
  }, [isTrial, orgId, searchParams]);

  const handleClose = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`quoteflow_welcomed_${orgId}`, 'true');
    }
    // Clean up url if welcome param was present
    if (searchParams.get('welcome')) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('welcome');
      const newQuery = params.toString() ? `?${params.toString()}` : '';
      router.replace(`${pathname}${newQuery}`);
    }
  };

  const isIndia = (currentCountry || 'IN').toUpperCase() === 'IN' || (billingCurrency || '').toUpperCase() === 'INR';
  const planPrice = isIndia ? SUBSCRIPTION_CONFIG.INDIA.formattedMonthly : SUBSCRIPTION_CONFIG.GLOBAL.formattedMonthly;

  return (
    <WelcomeTrialModal
      isOpen={isOpen}
      onClose={handleClose}
      trialEndsAt={trialEndsAt}
      businessCountry={currentCountry}
      billingCurrency={billingCurrency}
      planPrice={planPrice}
    />
  );
}
