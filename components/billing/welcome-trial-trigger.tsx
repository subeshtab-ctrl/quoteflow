'use client';

import React, { useEffect, useState } from 'react';
import { WelcomeTrialModal } from './welcome-trial-modal';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface WelcomeTrialTriggerProps {
  orgId: string;
  trialEndsAt?: string | null;
  isTrial?: boolean;
}

export function WelcomeTrialTrigger({ orgId, trialEndsAt, isTrial }: WelcomeTrialTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

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

  return <WelcomeTrialModal isOpen={isOpen} onClose={handleClose} trialEndsAt={trialEndsAt} />;
}
