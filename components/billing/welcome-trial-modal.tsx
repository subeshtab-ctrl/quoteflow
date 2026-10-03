'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Sparkles, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';

interface WelcomeTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  trialEndsAt?: string | null;
}

export function WelcomeTrialModal({ isOpen, onClose, trialEndsAt }: WelcomeTrialModalProps) {
  const formattedDate = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'in 30 days';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="p-6 text-center space-y-6">
        {/* Confetti / Icon Header */}
        <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25">
          <Sparkles className="h-8 w-8 animate-pulse" />
        </div>

        {/* Welcome Headline */}
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            🎉 Welcome to QuoteFlow!
          </h2>
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Your 30-day free trial is active.
          </p>
        </div>

        {/* Details Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4.5 space-y-3.5 text-xs text-left">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-indigo-500" />
              <span>Trial ends:</span>
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm">
              {formattedDate}
            </span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 font-medium">After your trial:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
              ₹99 / month
            </span>
          </div>

          <div className="pt-1 flex items-start gap-2 text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              You can start your subscription anytime during your trial with zero disruption.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <Button
            onClick={onClose}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 rounded-xl gap-2"
          >
            <span>Continue to QuoteFlow</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
