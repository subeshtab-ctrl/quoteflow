'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CountrySelect } from '@/components/billing/country-select';
import { Globe, ShieldCheck, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { isOwnerOrAdminRole } from '@/types/staff';

interface BusinessCountryModalProps {
  orgId: string;
  hasSavedCountry: boolean;
  userRole?: string;
}

export function BusinessCountryModal({
  orgId,
  hasSavedCountry,
  userRole = 'OWNER',
}: BusinessCountryModalProps) {
  // Never show modal to staff members - the business country is inherited from admin
  if (!isOwnerOrAdminRole(userRole)) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(!hasSavedCountry);
  const [countryCode, setCountryCode] = useState('IN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If initial prop says saved or user is staff, do not open
  useEffect(() => {
    if (!isOwnerOrAdminRole(userRole) || hasSavedCountry) {
      setIsOpen(false);
      return;
    }

    let isMounted = true;
    fetch('/api/billing/eligibility')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;
        if (data.needsCountrySelection) {
          setIsOpen(true);
          if (data.businessCountry) {
            setCountryCode(data.businessCountry);
          }
        } else {
          setIsOpen(false);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [hasSavedCountry]);

  if (!isOpen) return null;

  const handleSaveCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/billing/country', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country_code: countryCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save business country');
      }

      setIsOpen(false);
      // Hard refresh so all components re-render with the saved country and appropriate currency
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <Card className="w-full max-w-lg p-6 sm:p-8 rounded-3xl shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shadow-inner">
            <Globe className="h-7 w-7 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Set Your Business Location
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Please confirm your registered business country to ensure correct billing currency, regional pricing, and available payment methods.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSaveCountry} className="space-y-5">
          <CountrySelect
            value={countryCode}
            onChange={setCountryCode}
            label="Business location"
            description="Select the country where your business is registered. This determines your billing currency, subscription price and available payment methods."
            required
          />

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Billing Details for this Region</span>
            </div>
            {countryCode === 'IN' ? (
              <p className="leading-relaxed">
                <span className="font-bold text-slate-900 dark:text-slate-100">India:</span> Local domestic billing in INR, processed securely via <span className="font-semibold text-slate-800 dark:text-slate-200">Razorpay</span>.
              </p>
            ) : (
              <p className="leading-relaxed">
                <span className="font-bold text-slate-900 dark:text-slate-100">International:</span> Global billing in USD, payable securely with cryptocurrency via <span className="font-semibold text-slate-800 dark:text-slate-200">NOWPayments</span>.
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full h-11 text-sm font-bold shadow-lg shadow-indigo-500/20 rounded-xl flex items-center justify-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>Saving Location...</span>
            ) : (
              <>
                <span>Confirm & Continue to Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-[11px] text-center text-slate-400 leading-tight">
            This selection is saved to your account. Once an active paid subscription begins, changing regional billing requires admin review.
          </p>
        </form>
      </Card>
    </div>
  );
}
