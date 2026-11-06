'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  ArrowRight,
  Building2,
  Users,
  FileText,
  Send,
  PartyPopper,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChecklistStep {
  id: string;
  label: string;
  completed: boolean;
  required: boolean;
}

export function OnboardingChecklistCard() {
  const [data, setData] = useState<{
    checklist: ChecklistStep[];
    checklistStats: { completed: number; total: number; allCompleted: boolean; hasApprovedQuote: boolean };
    checklistDismissed: boolean;
    setupStatus?: any;
    businessName: string;
  } | null>(null);

  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [celebrationToast, setCelebrationToast] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/welcome/onboarding')
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (res && res.success) {
          setData(res);
          if (res.checklistDismissed) {
            setIsDismissed(true);
          }

          // Trigger subtle celebrations based on milestone achievements
          if (res.checklistStats?.hasApprovedQuote) {
            const celebrated = localStorage.getItem('quoteflow_celebrated_first_approval');
            if (!celebrated) {
              setCelebrationToast('Great news — your first QuoteFlow quote was approved 🎉');
              localStorage.setItem('quoteflow_celebrated_first_approval', 'true');
            }
          } else if (res.checklistStats?.completed >= 4) {
            const celebrated = localStorage.getItem('quoteflow_celebrated_first_send');
            if (!celebrated) {
              setCelebrationToast('Your first quote has been sent. Tracking is active!');
              localStorage.setItem('quoteflow_celebrated_first_send', 'true');
            }
          } else if (res.checklistStats?.completed >= 3) {
            const celebrated = localStorage.getItem('quoteflow_celebrated_first_quote');
            if (!celebrated) {
              setCelebrationToast('Your first quote is ready 🎉');
              localStorage.setItem('quoteflow_celebrated_first_quote', 'true');
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = async () => {
    setIsDismissed(true);
    fetch('/api/welcome/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss_checklist' }),
    }).catch(() => {});
  };

  // If dismissed or everything completed and closed, do not take dashboard space
  if (isDismissed || !data || (data.checklistStats.allCompleted && isMinimized)) {
    return null;
  }

  const { checklist, checklistStats } = data;
  const progressPercent = Math.round((checklistStats.completed / checklistStats.total) * 100);

  return (
    <div className="space-y-3">
      {/* Subtle First Success Celebration Toast */}
      {celebrationToast && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <PartyPopper className="h-4 w-4 shrink-0 text-amber-200" />
            <span>{celebrationToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setCelebrationToast(null)}
            className="p-1 hover:bg-white/20 rounded-lg text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Checklist Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Let&apos;s Set Up QuoteFlow
                </h3>
                <span className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  {checklistStats.completed} of {checklistStats.total} Complete
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Quick steps to get your quotes flowing and start getting paid faster.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isMinimized ? 'Expand checklist' : 'Minimize checklist'}
            >
              {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Dismiss checklist"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Expanded Steps List */}
        {!isMinimized && (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            {checklist.map((step) => {
              const hrefMap: Record<string, string> = {
                account_created: '#',
                business_profile: '/settings',
                add_customer: '/customers',
                create_quote: '/quotations/new',
                send_quote: '/quotations',
              };

              const iconMap: Record<string, any> = {
                account_created: CheckCircle2,
                business_profile: Building2,
                add_customer: Users,
                create_quote: FileText,
                send_quote: Send,
              };

              const Icon = iconMap[step.id] || Circle;

              return (
                <Link
                  key={step.id}
                  href={hrefMap[step.id] || '#'}
                  className={`p-3 rounded-xl border text-left transition-all block ${
                    step.completed
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 hover:bg-white dark:hover:bg-slate-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Icon
                      className={`h-4 w-4 ${
                        step.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                      }`}
                    />
                    {step.completed ? (
                      <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                        Done ✓
                      </span>
                    ) : (
                      <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-indigo-600" />
                    )}
                  </div>
                  <div
                    className={`text-xs font-bold leading-snug ${
                      step.completed
                        ? 'text-emerald-950 dark:text-emerald-200 line-through opacity-80'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {step.label}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
