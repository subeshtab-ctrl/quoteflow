'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  TrendingUp,
  FileText,
  Clock,
  Users,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Mail,
  Receipt,
  X,
  AlertCircle,
  Copy,
  ChevronRight,
  Flame,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OperatorDailyPlan, OperatorActionItem, OperatorActionCategory } from '@/types/business-operator';
import { formatCurrency } from '@/lib/quotations/calculations';
import { CurrencyCode } from '@/types/database';

interface OperatorDailyPlanCardProps {
  plan: OperatorDailyPlan;
  onActionComplete?: (actionId: string) => void;
  onClose?: () => void;
}

export function OperatorDailyPlanCard({
  plan,
  onActionComplete,
  onClose,
}: OperatorDailyPlanCardProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | OperatorActionCategory>('ALL');
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  const [toastMap, setToastMap] = useState<Record<string, string>>({});
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  const { summary, actions } = plan;

  const filteredActions = actions.filter((act) => {
    if (completedMap[act.id]) return false;
    if (filter === 'ALL') return true;
    return act.type === filter;
  });

  const handleDismiss = async (act: OperatorActionItem) => {
    setCompletedMap((prev) => ({ ...prev, [act.id]: true }));
    try {
      await fetch('/api/ai/operator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss',
          operatorActionId: act.id,
        }),
      });
    } catch {}
    if (onActionComplete) onActionComplete(act.id);
  };

  const handleExecute = async (act: OperatorActionItem) => {
    setIsProcessingId(act.id);

    try {
      // 1. WhatsApp Follow-Up or Payment Reminder
      if (act.actionKey === 'send_whatsapp_followup' || act.actionKey === 'send_whatsapp_reminder') {
        const cleanPhone = (act.customerPhone || '').replace(/[^\d+]/g, '');
        const message = act.suggestedMessage || act.description;
        if (cleanPhone) {
          const encoded = encodeURIComponent(message);
          window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
          setToastMap((prev) => ({ ...prev, [act.id]: 'WhatsApp chat opened' }));
        } else {
          // Fallback: copy message to clipboard
          navigator.clipboard.writeText(message);
          setCopiedMap((prev) => ({ ...prev, [act.id]: true }));
          setTimeout(() => setCopiedMap((prev) => ({ ...prev, [act.id]: false })), 2000);
          setToastMap((prev) => ({ ...prev, [act.id]: 'Message copied to clipboard' }));
        }

        setCompletedMap((prev) => ({ ...prev, [act.id]: true }));
        await fetch('/api/ai/operator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'complete',
            operatorActionId: act.id,
            actionKey: act.actionKey,
            draftPayload: act.draftPayload,
          }),
        });

        if (onActionComplete) onActionComplete(act.id);
        return;
      }

      // 2. Convert Approved Quote -> Create Invoice Draft
      if (act.actionKey === 'create_invoice_draft') {
        setCompletedMap((prev) => ({ ...prev, [act.id]: true }));
        setToastMap((prev) => ({ ...prev, [act.id]: 'Navigating to invoice builder...' }));

        // Mark as completed
        await fetch('/api/ai/operator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'complete',
            operatorActionId: act.id,
            actionKey: 'create_invoice_draft',
            draftPayload: act.draftPayload,
          }),
        });

        if (onActionComplete) onActionComplete(act.id);
        if (onClose) onClose();
        router.push(`/invoices/new?from_quote=${act.resourceId}`);
        return;
      }

      // 3. Draft Reorder Quote for Repeat Customer
      if (act.type === 'REPEAT_CUSTOMER') {
        setCompletedMap((prev) => ({ ...prev, [act.id]: true }));
        if (onActionComplete) onActionComplete(act.id);
        if (onClose) onClose();
        router.push(`/quotations/new?customer_id=${act.customerId}`);
        return;
      }

      // 4. Email Follow-up / Copy Text
      if (act.actionKey === 'send_email_followup' || act.actionKey === 'send_email_reminder') {
        const message = act.suggestedMessage || act.description;
        navigator.clipboard.writeText(message);
        setCopiedMap((prev) => ({ ...prev, [act.id]: true }));
        setToastMap((prev) => ({ ...prev, [act.id]: 'Email text copied to clipboard' }));
        setTimeout(() => setCopiedMap((prev) => ({ ...prev, [act.id]: false })), 2000);

        setCompletedMap((prev) => ({ ...prev, [act.id]: true }));
        await fetch('/api/ai/operator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'complete',
            operatorActionId: act.id,
            actionKey: act.actionKey,
            draftPayload: act.draftPayload,
          }),
        });

        if (onActionComplete) onActionComplete(act.id);
        return;
      }

      // Fallback: View resource
      if (act.resourceType === 'quote') {
        if (onClose) onClose();
        router.push(`/quotations/${act.resourceId}`);
      } else if (act.resourceType === 'invoice') {
        if (onClose) onClose();
        router.push(`/invoices/${act.resourceId}`);
      }
    } catch (err) {
      console.error('Failed to execute operator action:', err);
    } finally {
      setIsProcessingId(null);
    }
  };

  const formattedTotalAtStake = formatCurrency(
    summary.totalValueAtStake,
    summary.currency as CurrencyCode
  );

  return (
    <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-b from-white via-indigo-50/20 to-white dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 shadow-sm overflow-hidden text-xs">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 border-b border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm tracking-tight">
                Daily Business Action Plan
              </h3>
              {summary.highUrgencyCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-300/40 text-[10px] font-bold text-white flex items-center gap-1">
                  <Flame className="h-3 w-3 text-rose-300 animate-pulse" />
                  <span>{summary.highUrgencyCount} High Urgency</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-indigo-100/90 mt-0.5">
              {summary.totalActions} priority recommendations identified · <strong className="text-white">{formattedTotalAtStake}</strong> value at stake
            </p>
          </div>
        </div>

        {/* Total Value Pill */}
        <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-right shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-indigo-200 block font-medium">Pipeline at Stake</span>
          <span className="font-mono font-bold text-sm text-white">{formattedTotalAtStake}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
            filter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          All ({actions.length})
        </button>

        {summary.categories.quoteFollowups > 0 && (
          <button
            type="button"
            onClick={() => setFilter('QUOTE_FOLLOWUP')}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              filter === 'QUOTE_FOLLOWUP'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Quote Follow-ups ({summary.categories.quoteFollowups})
          </button>
        )}

        {summary.categories.approvedUninvoiced > 0 && (
          <button
            type="button"
            onClick={() => setFilter('CONVERT_APPROVED_QUOTE')}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              filter === 'CONVERT_APPROVED_QUOTE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Ready to Invoice ({summary.categories.approvedUninvoiced})
          </button>
        )}

        {summary.categories.overdueInvoices > 0 && (
          <button
            type="button"
            onClick={() => setFilter('OVERDUE_INVOICE')}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              filter === 'OVERDUE_INVOICE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Overdue Invoices ({summary.categories.overdueInvoices})
          </button>
        )}

        {summary.categories.repeatCustomers > 0 && (
          <button
            type="button"
            onClick={() => setFilter('REPEAT_CUSTOMER')}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              filter === 'REPEAT_CUSTOMER'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Repeat Clients ({summary.categories.repeatCustomers})
          </button>
        )}
      </div>

      {/* Action Items List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[460px] overflow-y-auto">
        {filteredActions.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              No pending actions in this category. QuoteFlow AI will notify you when new opportunities emerge.
            </p>
          </div>
        ) : (
          filteredActions.map((act) => {
            const valDisplay = act.value > 0 ? formatCurrency(act.value, act.currency as CurrencyCode) : null;
            const isProcessing = isProcessingId === act.id;
            const isCopied = copiedMap[act.id];
            const toast = toastMap[act.id];

            return (
              <div
                key={act.id}
                className="p-4 hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 group"
              >
                {/* Left Side: Detail & Signals */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Urgency Badge */}
                    {act.urgency === 'HIGH' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold">
                        <Flame className="h-3 w-3 text-rose-500" />
                        <span>Urgent</span>
                      </span>
                    ) : act.urgency === 'MEDIUM' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-semibold">
                        <span>High Impact</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-medium">
                        <span>Follow-up</span>
                      </span>
                    )}

                    {/* Category Label */}
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {act.type === 'QUOTE_FOLLOWUP' && 'Quote Follow-Up'}
                      {act.type === 'CONVERT_APPROVED_QUOTE' && 'Ready to Invoice'}
                      {act.type === 'OVERDUE_INVOICE' && 'Overdue Payment'}
                      {act.type === 'REPEAT_CUSTOMER' && 'Repeat Opportunity'}
                    </span>

                    {/* Expiry / Due Date Tag */}
                    {act.dueOrExpiryText && (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {act.dueOrExpiryText}
                      </span>
                    )}

                    {/* Value */}
                    {valDisplay && (
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                        {valDisplay}
                      </span>
                    )}
                  </div>

                  {/* Title & Customer */}
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                    {act.title}
                  </h4>

                  {/* Reason */}
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    {act.description}
                  </p>

                  {/* Feedback toast if action was taken */}
                  {toast && (
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                      <Check className="h-3 w-3" />
                      <span>{toast}</span>
                    </div>
                  )}
                </div>

                {/* Right Side: Action CTA Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleExecute(act)}
                    disabled={isProcessing}
                    className="h-8 px-3 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs gap-1.5"
                  >
                    {isProcessing ? (
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                    ) : act.actionKey.includes('whatsapp') ? (
                      <MessageSquare className="h-3.5 w-3.5" />
                    ) : act.actionKey === 'create_invoice_draft' ? (
                      <Receipt className="h-3.5 w-3.5" />
                    ) : act.actionKey.includes('email') ? (
                      <Mail className="h-3.5 w-3.5" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    <span>{isCopied ? 'Copied!' : act.actionLabel}</span>
                  </Button>

                  {act.secondaryActionLabel && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (act.resourceType === 'quote') {
                          if (onClose) onClose();
                          router.push(`/quotations/${act.resourceId}`);
                        } else if (act.resourceType === 'invoice') {
                          if (onClose) onClose();
                          router.push(`/invoices/${act.resourceId}`);
                        }
                      }}
                      className="h-8 px-2.5 text-[11px] border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                    >
                      <span>{act.secondaryActionLabel}</span>
                    </Button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDismiss(act)}
                    title="Dismiss recommendation"
                    className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
