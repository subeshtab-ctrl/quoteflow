'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Snowflake,
  Zap,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Mail,
  ExternalLink,
  ChevronRight,
  Target,
  Percent,
  Check,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PipelineTemperatureAnalysis,
  LeadRecoveryItem,
  WinLossDisparityAnalysis,
} from '@/types/business-operator';
import { formatCurrency } from '@/lib/quotations/calculations';
import { CurrencyCode } from '@/types/database';

// =============================================================================
// 1. PIPELINE TEMPERATURE CARD
// =============================================================================
interface PipelineTemperatureCardProps {
  analysis: PipelineTemperatureAnalysis;
  onClose?: () => void;
}

export function PipelineTemperatureCard({ analysis, onClose }: PipelineTemperatureCardProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'HOT' | 'WARM' | 'COLD'>('ALL');
  const [toast, setToast] = useState<string | null>(null);

  const { summary, deals, currency } = analysis;

  const filteredDeals = deals.filter((d) => {
    if (filter === 'ALL') return true;
    return d.temperature === filter;
  });

  const handleAction = (deal: (typeof deals)[0]) => {
    if (deal.actionKey === 'send_whatsapp_followup' && deal.customerPhone) {
      const cleanPhone = deal.customerPhone.replace(/[^\d+]/g, '');
      const msg = encodeURIComponent(
        `Hi ${deal.customerName}, following up regarding quote ${deal.quotationNumber}. Please let us know if you have any questions!`
      );
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
      setToast(`WhatsApp opened for ${deal.customerName}`);
      setTimeout(() => setToast(null), 3000);
    } else if (deal.publicUrl) {
      window.open(deal.publicUrl, '_blank');
    } else {
      router.push(`/quotations/${deal.id}`);
      if (onClose) onClose();
    }
  };

  return (
    <div className="mt-3 w-full rounded-2xl border border-slate-200 dark:border-[#263653] bg-white dark:bg-[#0D1525] p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Sales Pipeline & Deal Temperature
            </h4>
            <p className="text-xs text-slate-500 dark:text-[#A8B4CA]">
              {deals.length} active deals representing{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrency(summary.totalPipelineValue, currency as CurrencyCode)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <div className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          {toast}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setFilter(filter === 'HOT' ? 'ALL' : 'HOT')}
          className={`p-2.5 rounded-xl border text-left transition-all ${
            filter === 'HOT'
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-slate-200 dark:border-[#263653] bg-slate-50 dark:bg-[#141F36]'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
            <Flame className="h-3.5 w-3.5" />
            <span>HOT ({summary.hotDealsCount})</span>
          </div>
          <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
            {formatCurrency(summary.hotDealsValue, currency as CurrencyCode)}
          </div>
        </button>

        <button
          onClick={() => setFilter(filter === 'WARM' ? 'ALL' : 'WARM')}
          className={`p-2.5 rounded-xl border text-left transition-all ${
            filter === 'WARM'
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-slate-200 dark:border-[#263653] bg-slate-50 dark:bg-[#141F36]'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Zap className="h-3.5 w-3.5" />
            <span>WARM ({summary.warmDealsCount})</span>
          </div>
          <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
            {formatCurrency(summary.warmDealsValue, currency as CurrencyCode)}
          </div>
        </button>

        <button
          onClick={() => setFilter(filter === 'COLD' ? 'ALL' : 'COLD')}
          className={`p-2.5 rounded-xl border text-left transition-all ${
            filter === 'COLD'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-200 dark:border-[#263653] bg-slate-50 dark:bg-[#141F36]'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Snowflake className="h-3.5 w-3.5" />
            <span>COLD ({summary.coldDealsCount})</span>
          </div>
          <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
            {formatCurrency(summary.coldDealsValue, currency as CurrencyCode)}
          </div>
        </button>
      </div>

      {/* Deals List */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {filteredDeals.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 dark:text-[#A8B4CA]">
            No deals currently in this category.
          </div>
        ) : (
          filteredDeals.map((deal) => {
            const isHot = deal.temperature === 'HOT';
            const isCold = deal.temperature === 'COLD';
            return (
              <div
                key={deal.id}
                className="p-3 rounded-xl border border-slate-100 dark:border-[#1E2C48] bg-slate-50/60 dark:bg-[#101A2D] hover:border-slate-300 dark:hover:border-[#304468] transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isHot
                          ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                          : isCold
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {deal.temperature} ({deal.score}%)
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {deal.customerName}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-[#6C7D9B]">
                      {deal.quotationNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-[#9FB1D1] mt-0.5 line-clamp-1">
                    {deal.reason}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {formatCurrency(deal.value, deal.currency as CurrencyCode)}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-[#6C7D9B]">
                      {deal.viewCount} views
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(deal)}
                    className="h-7 px-2.5 text-xs border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  >
                    {deal.customerPhone ? <MessageSquare className="h-3 w-3 mr-1" /> : <ExternalLink className="h-3 w-3 mr-1" />}
                    Act
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// =============================================================================
// 2. LEAD RECOVERY CARD
// =============================================================================
interface LeadRecoveryCardProps {
  items: LeadRecoveryItem[];
  currency?: string;
  onClose?: () => void;
}

export function LeadRecoveryCard({ items, currency = 'INR', onClose }: LeadRecoveryCardProps) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const totalRecoverable = items.reduce((sum, item) => sum + item.value, 0);

  const handleCopy = (item: LeadRecoveryItem) => {
    navigator.clipboard.writeText(item.suggestedMessage);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRevive = (item: LeadRecoveryItem) => {
    router.push(`/quotations/new?from_quote=${item.quoteId}`);
    if (onClose) onClose();
  };

  return (
    <div className="mt-3 w-full rounded-2xl border border-slate-200 dark:border-[#263653] bg-white dark:bg-[#0D1525] p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Internal Lead Recovery
            </h4>
            <p className="text-xs text-slate-500 dark:text-[#A8B4CA]">
              {items.length} dropped quotes representing{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrency(totalRecoverable, currency as CurrencyCode)}
              </span>{' '}
              in recoverable pipeline
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 dark:text-[#A8B4CA]">
            No dropped or expired leads requiring recovery right now!
          </div>
        ) : (
          items.map((item) => {
            const badgeLabel =
              item.recoveryType === 'UNOPENED'
                ? 'Unopened'
                : item.recoveryType === 'VIEWED_UNAPPROVED'
                ? 'Viewed'
                : item.recoveryType === 'EXPIRED_REVIVAL'
                ? 'Expired'
                : 'Rejected';

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-slate-100 dark:border-[#1E2C48] bg-slate-50/60 dark:bg-[#101A2D] space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
                      {badgeLabel}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {item.customerName}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-[#6C7D9B]">
                      {item.quoteNumber}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white shrink-0">
                    {formatCurrency(item.value, item.currency as CurrencyCode)}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-[#9FB1D1]">
                  {item.reason}
                </p>

                <div className="flex items-center justify-between pt-1 gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy(item)}
                    className="h-7 px-2 text-[11px] text-slate-600 dark:text-[#A8B4CA]"
                  >
                    {copiedId === item.id ? (
                      <Check className="h-3 w-3 mr-1 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    {copiedId === item.id ? 'Copied' : 'Copy Message'}
                  </Button>

                  <div className="flex items-center gap-1.5">
                    {item.recoveryType === 'EXPIRED_REVIVAL' ? (
                      <Button
                        size="sm"
                        onClick={() => handleRevive(item)}
                        className="h-7 px-2.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Revive Quote
                      </Button>
                    ) : item.customerPhone ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          const cleanPhone = item.customerPhone!.replace(/[^\d+]/g, '');
                          window.open(
                            `https://wa.me/${cleanPhone}?text=${encodeURIComponent(item.suggestedMessage)}`,
                            '_blank'
                          );
                        }}
                        className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        WhatsApp
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleCopy(item)}
                        className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Follow Up
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// =============================================================================
// 3. WIN / LOSS INSIGHTS CARD
// =============================================================================
interface WinLossCardProps {
  analysis: WinLossDisparityAnalysis;
}

export function WinLossCard({ analysis }: WinLossCardProps) {
  const { metrics, discountImpact, lostOpportunities } = analysis;

  return (
    <div className="mt-3 w-full rounded-2xl border border-slate-200 dark:border-[#263653] bg-white dark:bg-[#0D1525] p-4 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            Win/Loss & Conversion Analysis
          </h4>
          <p className="text-xs text-slate-500 dark:text-[#A8B4CA]">
            Insights derived across {metrics.totalQuotesAnalyzed} quotes in your workspace
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-[#263653] bg-slate-50 dark:bg-[#141F36]">
          <div className="text-[11px] text-slate-400 dark:text-[#6C7D9B]">Approval Rate</div>
          <div className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
            {metrics.approvalRate}%
          </div>
          <div className="text-[10px] text-slate-500 dark:text-[#A8B4CA]">
            {metrics.approvedQuotesCount} approved / {metrics.totalQuotesAnalyzed} total
          </div>
        </div>

        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-[#263653] bg-slate-50 dark:bg-[#141F36]">
          <div className="text-[11px] text-slate-400 dark:text-[#6C7D9B]">Avg Time to Decision</div>
          <div className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
            {metrics.averageTimeToApprovalDays} days
          </div>
          <div className="text-[10px] text-slate-500 dark:text-[#A8B4CA]">
            Rejections take ~{metrics.averageTimeToRejectionDays} days
          </div>
        </div>
      </div>

      {/* Discount Impact Box */}
      <div className="p-3 rounded-xl border border-amber-200/60 dark:border-amber-800/60 bg-amber-500/5 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <Percent className="h-3.5 w-3.5" />
          <span>Discount Disparity Insight</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300">
          {discountImpact.insight}
        </p>
      </div>

      {/* Recommendations */}
      {lostOpportunities.recommendations.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-[#A8B4CA]">
            Actionable Recommendations
          </div>
          <div className="space-y-1 text-xs text-slate-600 dark:text-[#9FB1D1]">
            {lostOpportunities.recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="text-indigo-500 font-bold shrink-0">•</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
