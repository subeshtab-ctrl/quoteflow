'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Eye,
  TrendingUp,
  CheckCircle2,
  Send,
  MessageSquare,
  Mail,
  ExternalLink,
  Bot,
  ArrowRight,
  ShieldAlert,
  Flame,
  Check,
  Calendar,
  History,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { DailyBusinessBriefing, AiAttentionItem } from '@/lib/ai/proactive-engine';
import { formatCurrency } from '@/lib/quotations/calculations';
import { useThemeCustomization } from '@/lib/theme/theme-customization-context';

export function AiDashboardBriefing({
  firstName = 'there',
}: {
  firstName?: string;
}) {
  const router = useRouter();
  const { openAiModal } = useThemeCustomization();
  const [briefing, setBriefing] = useState<DailyBusinessBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [actionDoneMap, setActionDoneMap] = useState<Record<string, boolean>>({});
  const [toastMessageMap, setToastMessageMap] = useState<Record<string, string>>({});
  const [errorMessageMap, setErrorMessageMap] = useState<Record<string, string>>({});
  const [isProcessingActionMap, setIsProcessingActionMap] = useState<Record<string, boolean>>({});
  const [snoozeTarget, setSnoozeTarget] = useState<AiAttentionItem | null>(null);
  const [customSnoozeDate, setCustomSnoozeDate] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [clientGreeting, setClientGreeting] = useState<string>('');
  const [isDismissedForToday, setIsDismissedForToday] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    try {
      const dismissedDate = localStorage.getItem('quoteflow_ai_attention_dismissed_date');
      if (dismissedDate === todayStr) {
        setIsDismissedForToday(true);
      }
    } catch {}
  }, [todayStr]);

  const handleDismissForToday = () => {
    try {
      localStorage.setItem('quoteflow_ai_attention_dismissed_date', todayStr);
      setIsDismissedForToday(true);
    } catch {}
  };

  useEffect(() => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    setClientGreeting(`${timeGreeting}, ${firstName} 👋`);
  }, [firstName]);

  useEffect(() => {
    const hour = new Date().getHours();
    fetch(`/api/ai/proactive?hour=${hour}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load briefing');
        return res.json();
      })
      .then((data) => {
        if (data && data.metrics) {
          setBriefing(data);
        }
      })
      .catch((err) => {
        console.warn('AI Proactive briefing load note:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !briefing || isDismissedForToday) return null;

  const m = briefing.metrics;
  const currency = briefing.currency || 'USD';

  const handleAction = async (item: AiAttentionItem, actionKey: string, payload?: any) => {
    if (actionKey === 'view_quote' && item.targetId) {
      router.push(`/quotations/${item.targetId}`);
      return;
    }
    if (actionKey === 'view_invoice' && item.targetId) {
      router.push(`/invoices/${item.targetId}`);
      return;
    }

    if (actionKey === 'send_whatsapp') {
      const cleanPhone = (payload?.recipientPhone || '').replace(/[^\d+]/g, '');
      const encodedMsg = encodeURIComponent(payload?.message || '');
      if (cleanPhone) {
        window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
      }

      setIsProcessingActionMap((p) => ({ ...p, [item.id]: true }));
      try {
        const res = await fetch('/api/ai/proactive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'whatsapp_sent',
            recommendationId: item.id,
            recommendationKey: item.recommendationKey,
            targetId: item.targetId,
            targetNumber: item.targetNumber,
            customerName: item.customerName,
          }),
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setErrorMessageMap((p) => ({ ...p, [item.id]: j.error || 'Failed to record WhatsApp action' }));
          return;
        }

        setToastMessageMap((p) => ({ ...p, [item.id]: '✓ WhatsApp reminder sent successfully' }));
        setTimeout(() => {
          setActionDoneMap((prev) => ({ ...prev, [item.id]: true }));
        }, 1200);
      } catch (err: any) {
        setErrorMessageMap((p) => ({ ...p, [item.id]: err.message || 'Network error' }));
      } finally {
        setIsProcessingActionMap((p) => ({ ...p, [item.id]: false }));
      }
      return;
    }

    if (actionKey === 'send_email') {
      setIsProcessingActionMap((p) => ({ ...p, [item.id]: true }));
      setErrorMessageMap((p) => ({ ...p, [item.id]: '' }));
      try {
        const res = await fetch('/api/ai/proactive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'email_sent',
            recommendationId: item.id,
            recommendationKey: item.recommendationKey,
            targetId: item.targetId,
            targetNumber: item.targetNumber,
            customerName: item.customerName,
            messagePayload: payload,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMessageMap((p) => ({
            ...p,
            [item.id]: data.error || 'Email reminder could not be sent. Please try again.',
          }));
          return;
        }

        setToastMessageMap((p) => ({ ...p, [item.id]: '✓ Email reminder sent successfully' }));
        setTimeout(() => {
          setActionDoneMap((prev) => ({ ...prev, [item.id]: true }));
        }, 1200);
      } catch (e: any) {
        setErrorMessageMap((p) => ({ ...p, [item.id]: e.message || 'Failed to send email' }));
      } finally {
        setIsProcessingActionMap((p) => ({ ...p, [item.id]: false }));
      }
      return;
    }

    if (actionKey === 'remind_later') {
      setSnoozeTarget(item);
      return;
    }

    if (actionKey === 'dismiss') {
      setIsProcessingActionMap((p) => ({ ...p, [item.id]: true }));
      try {
        await fetch('/api/ai/proactive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'dismiss',
            recommendationId: item.id,
            recommendationKey: item.recommendationKey,
            targetId: item.targetId,
            targetNumber: item.targetNumber,
          }),
        });
        setActionDoneMap((prev) => ({ ...prev, [item.id]: true }));
      } catch {}
      return;
    }

    if (actionKey === 'ignore') {
      setIsProcessingActionMap((p) => ({ ...p, [item.id]: true }));
      try {
        await fetch('/api/ai/proactive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ignore',
            recommendationId: item.id,
            recommendationKey: item.recommendationKey,
            targetId: item.targetId,
            targetNumber: item.targetNumber,
          }),
        });
        setActionDoneMap((prev) => ({ ...prev, [item.id]: true }));
      } catch {}
      return;
    }

    if (actionKey === 'review_batch') {
      openAiModal();
      return;
    }
  };

  const executeSnooze = async (item: AiAttentionItem, days?: number, customDate?: string) => {
    try {
      await fetch('/api/ai/proactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'snooze',
          snoozeDays: days,
          snoozeDate: customDate,
          recommendationId: item.id,
          recommendationKey: item.recommendationKey,
          targetId: item.targetId,
          targetNumber: item.targetNumber,
        }),
      });
      const label = customDate ? customDate : `${days} day${days === 1 ? '' : 's'}`;
      setToastMessageMap((p) => ({ ...p, [item.id]: `✓ Snoozed for ${label}` }));
      setTimeout(() => {
        setActionDoneMap((prev) => ({ ...prev, [item.id]: true }));
        setSnoozeTarget(null);
      }, 1000);
    } catch {
      setActionDoneMap((prev) => ({ ...prev, [item.id]: true }));
      setSnoozeTarget(null);
    }
  };

  const visibleRecommendations = briefing.attentionItems
    .filter((it) => it.priority !== 'INFORMATION' && !actionDoneMap[it.id])
    .slice(0, 4);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-200/90 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 p-4 sm:p-5 shadow-xs transition-all">
      {/* Top Banner Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100/80 dark:border-indigo-900/40">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {clientGreeting || briefing.greeting}
              </h3>
              <span className="rounded-full bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                AI Business Briefing
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Here is your proactive QuoteFlow activity review for the last 7 days:
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={openAiModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Open AI Assistant</span>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={handleDismissForToday}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            title="Dismiss for today"
            aria-label="Dismiss for today"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="pt-3.5 space-y-4 animate-in fade-in duration-150">
          {/* Last 7 Days Compact Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Last 7 Days Summary
              </span>
              {briefing.comparison?.summaryText && (
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  {briefing.comparison.summaryText}
                </span>
              )}
            </div>

            <div className={`grid grid-cols-2 sm:grid-cols-4 ${m.quotesDeleted > 0 ? 'lg:grid-cols-9' : 'lg:grid-cols-8'} gap-2`}>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block truncate">Quotes Created</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {m.quotesCreated}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block truncate">Total Quoted</span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(m.quoteValue, currency)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-center">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block truncate">Approved</span>
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  {m.quotesApproved}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-center">
                <span className="text-[10px] text-amber-700 dark:text-amber-400 block truncate">Awaiting Approval</span>
                <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                  {m.quotesAwaitingApproval}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 text-center">
                <span className="text-[10px] text-violet-700 dark:text-violet-400 block truncate">Viewed, Unapproved</span>
                <span className="text-sm font-bold text-violet-800 dark:text-violet-300">
                  {m.quotesViewedUnapproved}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block truncate">Not Yet Viewed</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {m.quotesNotYetViewed}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block truncate">Payments Pending</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(m.outstandingPayments, currency)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-center">
                <span className="text-[10px] text-rose-700 dark:text-rose-400 block truncate">Overdue Invoices</span>
                <span className="text-sm font-bold text-rose-800 dark:text-rose-300">
                  {m.overdueInvoicesCount}
                </span>
              </div>

              {m.quotesDeleted !== undefined && m.quotesDeleted > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Quotes Deleted</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {m.quotesDeleted}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* AI Recommendations Section */}
          {visibleRecommendations.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span>AI Recommendations &amp; Direct Actions:</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {visibleRecommendations.map((rec) => {
                  const isUrgent = rec.priority === 'URGENT';
                  const isOpp = rec.priority === 'OPPORTUNITY';

                  return (
                    <div
                      key={rec.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                        isUrgent
                          ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20'
                          : isOpp
                          ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
                          : 'border-indigo-100 dark:border-indigo-900/40 bg-white dark:bg-slate-850'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {rec.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                              isUrgent
                                ? 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300'
                                : isOpp
                                ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {rec.priority.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          {rec.description}
                        </p>
                      </div>

                      {/* Positive Feedback Toast */}
                      {toastMessageMap[rec.id] && (
                        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 text-xs font-bold animate-in fade-in">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{toastMessageMap[rec.id]}</span>
                        </div>
                      )}

                      {/* Error Alert on failure */}
                      {errorMessageMap[rec.id] && (
                        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 text-xs font-semibold animate-in fade-in">
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                          <span>{errorMessageMap[rec.id]}</span>
                        </div>
                      )}

                      {/* Interactive Snooze / Remind Later Picker */}
                      {snoozeTarget?.id === rec.id && (
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/95 border border-slate-300 dark:border-slate-700 space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-indigo-500" />
                              <span>Remind Me Later:</span>
                            </span>
                            <button
                              onClick={() => setSnoozeTarget(null)}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              onClick={() => executeSnooze(rec, 1)}
                              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600"
                            >
                              1 Day
                            </button>
                            <button
                              onClick={() => executeSnooze(rec, 3)}
                              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600"
                            >
                              3 Days
                            </button>
                            <button
                              onClick={() => executeSnooze(rec, 7)}
                              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600"
                            >
                              7 Days
                            </button>
                            <input
                              type="date"
                              value={customSnoozeDate}
                              onChange={(e) => setCustomSnoozeDate(e.target.value)}
                              className="px-1.5 py-0.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-[10px] text-slate-700 dark:text-slate-200"
                            />
                            {customSnoozeDate && (
                              <button
                                onClick={() => executeSnooze(rec, undefined, customSnoozeDate)}
                                className="px-2 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold"
                              >
                                Snooze
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Direct 1-Click Action Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                        {rec.actions.map((act) => (
                          <button
                            key={act.id}
                            disabled={isProcessingActionMap[rec.id]}
                            onClick={() => handleAction(rec, act.actionKey, act.payload)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-200 text-[11px] font-medium transition-colors shadow-2xs disabled:opacity-50"
                          >
                            {isProcessingActionMap[rec.id] && <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />}
                            {!isProcessingActionMap[rec.id] && act.actionKey === 'send_whatsapp' && (
                              <MessageSquare className="h-3 w-3 text-emerald-500" />
                            )}
                            {!isProcessingActionMap[rec.id] && act.actionKey === 'send_email' && (
                              <Mail className="h-3 w-3 text-indigo-500" />
                            )}
                            {!isProcessingActionMap[rec.id] && act.actionKey === 'view_quote' && (
                              <ExternalLink className="h-3 w-3 text-slate-400" />
                            )}
                            {!isProcessingActionMap[rec.id] && act.actionKey === 'view_invoice' && (
                              <ExternalLink className="h-3 w-3 text-slate-400" />
                            )}
                            {!isProcessingActionMap[rec.id] && act.actionKey === 'review_batch' && (
                              <Sparkles className="h-3 w-3 text-amber-500" />
                            )}
                            <span>{act.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent AI Actions & History Section (Item 25) */}
          {briefing.recentActions && briefing.recentActions.length > 0 && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <History className="h-3.5 w-3.5 text-indigo-500" />
                <span>Recent AI Actions &amp; History ({briefing.recentActions.length})</span>
                {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showHistory && (
                <div className="mt-2 space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800 text-xs animate-in fade-in duration-150">
                  {briefing.recentActions.map((act) => {
                    const actionLabel =
                      act.action_taken === 'whatsapp_sent'
                        ? 'WhatsApp reminder sent'
                        : act.action_taken === 'email_sent'
                        ? 'Email reminder sent'
                        : act.action_taken === 'dismissed'
                        ? 'Recommendation dismissed'
                        : act.action_taken === 'ignored'
                        ? 'Recommendation ignored'
                        : act.action_taken === 'snoozed'
                        ? `Snoozed until ${act.snooze_until ? new Date(act.snooze_until).toLocaleDateString() : 'later'}`
                        : act.status === 'resolved'
                        ? `Resolved (${act.resolved_reason || 'completed'})`
                        : 'Action taken';

                    return (
                      <div
                        key={act.id}
                        className="flex items-center justify-between gap-2 py-1 border-b last:border-b-0 border-slate-200/40 dark:border-slate-800/40 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {actionLabel}
                          </span>
                          {(act.customer_name || act.quote_number || act.invoice_number) && (
                            <span className="text-slate-500">
                              — {act.customer_name || act.quote_number || act.invoice_number}
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400 text-[10px] shrink-0">
                          {act.user_name ? `${act.user_name} · ` : ''}
                          {new Date(act.action_taken_at || act.updated_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
