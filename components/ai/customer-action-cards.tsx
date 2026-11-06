'use client';

import React, { useState } from 'react';
import {
  UserCheck,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Edit,
  Send,
  ExternalLink,
  X,
  Loader2,
  Sparkles,
  Plus,
  MessageSquare,
  Download,
} from 'lucide-react';
import { Customer } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';

interface MultipleCustomerMatchesProps {
  candidateMatches: Array<{ customer: Customer; score?: number; reason?: string }>;
  pendingQuotePayload?: any;
  onSelectCustomer: (customer: Customer, pendingPayload: any) => void;
}

/**
 * Multiple customer matches card:
 * Displays selectable customer cards with full contact info and location.
 */
export function MultipleCustomerMatchesCard({
  candidateMatches,
  pendingQuotePayload,
  onSelectCustomer,
}: MultipleCustomerMatchesProps) {
  if (!candidateMatches || candidateMatches.length === 0) return null;

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] p-4 sm:p-5 shadow-sm dark:shadow-xl space-y-3.5 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-[#263653]/60 text-slate-700 dark:text-slate-200">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-[#5638F5]/20 border border-indigo-100 dark:border-[#5638F5]/30 flex items-center justify-center text-[#5638F5] dark:text-[#2388FF]">
          <Building2 className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold tracking-tight">Select Customer</h4>
          <p className="text-[11px] text-slate-500 dark:text-[#A8B4CA]">
            I found {candidateMatches.length} matching customers. Select one to proceed:
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {candidateMatches.map((cand, idx) => {
          const c = cand.customer;
          const displayName = c.company_name || c.name;
          const hasDifferentContact = Boolean(c.company_name && c.name && c.company_name !== c.name);
          const location = [c.city, c.state, c.country].filter(Boolean).join(', ');
          const taxId = c.tax_number || (c as any).customer_gstin;

          return (
            <div
              key={c.id || idx}
              className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#101A2D] border border-slate-200/80 dark:border-[#263653] hover:border-[#5638F5]/70 transition-all shadow-xs"
            >
              {/* Customer Info */}
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] flex items-center justify-center text-[#5638F5] dark:text-[#2388FF] shrink-0 mt-0.5">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-[#F5F7FF] truncate">
                      {displayName}
                    </span>
                    {hasDifferentContact && (
                      <span className="text-[10px] text-slate-500 dark:text-[#A8B4CA] truncate">
                        ({c.name})
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5 text-[11px] text-slate-600 dark:text-[#A8B4CA]">
                    {c.phone && (
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.phone}</span>
                      </span>
                    )}
                    {c.email && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[170px]">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{c.email}</span>
                      </span>
                    )}
                    {location && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{location}</span>
                      </span>
                    )}
                    {taxId && (
                      <span className="font-mono text-[10px] text-slate-500">
                        TRN: {taxId}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => onSelectCustomer(c, pendingQuotePayload)}
                className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5638F5] to-[#2388FF] hover:opacity-95 active:scale-98 shadow-sm transition-all shrink-0"
              >
                Select
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface QuoteDraftPreviewProps {
  customer?: Customer;
  pendingQuotePayload?: any;
  onCreateQuote: (customer?: Customer, pendingPayload?: any) => void;
  onEditDraft?: () => void;
  onAddItem?: () => void;
  isCreating?: boolean;
}

/**
 * Step 5 — Prepare Quote Draft:
 * Clean preview showing Customer, Items Table (Item, Qty, Rate, Amount), Subtotal, Tax, Total
 * with actions: [Create Quote], [Edit Draft], [Add Item].
 * Does NOT save to database until user clicks [Create Quote].
 */
export function QuoteDraftPreviewCard({
  customer,
  pendingQuotePayload,
  onCreateQuote,
  onEditDraft,
  onAddItem,
  isCreating = false,
}: QuoteDraftPreviewProps) {
  const targetCust = customer || pendingQuotePayload?.customer;
  const items = pendingQuotePayload?.items || [];
  const currency = pendingQuotePayload?.currency || 'USD';
  const subtotal = items.reduce((s: number, it: any) => s + (it.unit_price * it.quantity), 0);
  const taxRate = pendingQuotePayload?.taxRate !== undefined ? pendingQuotePayload.taxRate : 0;
  const discountVal = pendingQuotePayload?.discountValue || 0;
  const discountAmount = pendingQuotePayload?.discountType === 'PERCENTAGE'
    ? (subtotal * discountVal) / 100
    : discountVal;
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxable * taxRate) / 100;
  const grandTotal = Math.round(taxable + taxAmount);

  const displayName = targetCust?.company_name || targetCust?.name || 'Customer';
  const location = targetCust ? [targetCust.city, targetCust.state, targetCust.country].filter(Boolean).join(', ') : '';
  const taxId = targetCust?.tax_number || (targetCust as any)?.customer_gstin;

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] p-4 sm:p-5 shadow-sm dark:shadow-xl space-y-3.5 animate-in fade-in duration-200">
      {/* Customer Selected Indicator */}
      {targetCust && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 pb-1 border-b border-emerald-100 dark:border-emerald-950/50">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{displayName} selected.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#263653]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-[#5638F5]/20 border border-indigo-100 dark:border-[#5638F5]/30 flex items-center justify-center text-[#5638F5] dark:text-[#2388FF] shadow-xs">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#F5F7FF] tracking-tight">
              Quote Draft
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-[#A8B4CA]">
              Customer: <span className="font-semibold text-slate-800 dark:text-slate-200">{displayName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#A8B4CA]">
          <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#101A2D] border border-slate-200 dark:border-[#263653]">
            {currency}
          </span>
          <span className="hidden sm:inline">Valid for: {pendingQuotePayload?.validityDays || 15} days</span>
        </div>
      </div>

      {/* Customer Compact Details */}
      {targetCust && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-[#101A2D] p-3 rounded-xl border border-slate-200/80 dark:border-[#263653]">
          <div className="space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{displayName}</div>
            {targetCust.email && (
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#A8B4CA]">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{targetCust.email}</span>
              </div>
            )}
            {targetCust.phone && (
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#A8B4CA]">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{targetCust.phone}</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            {location && (
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#A8B4CA]">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{location}</span>
              </div>
            )}
            {taxId && (
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#A8B4CA]">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono text-[11px]">TRN: {taxId}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items Table: Desktop Table + Mobile Stacked List */}
      {items.length > 0 && (
        <div className="space-y-2">
          {/* Desktop & Tablet Table */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 dark:border-[#263653]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 dark:bg-[#101A2D] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#A8B4CA] border-b border-slate-200 dark:border-[#263653]">
                <tr>
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((it: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-[#101A2D]/50">
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {it.description}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 dark:text-[#A8B4CA]">
                      {it.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-[#A8B4CA]">
                      {formatCurrency(it.unit_price, currency as any)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-[#F5F7FF]">
                      {formatCurrency(it.unit_price * it.quantity, currency as any)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked List matching mockup */}
          <div className="block sm:hidden space-y-1.5">
            {items.map((it: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#101A2D] border border-slate-200/80 dark:border-[#263653] text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{it.description}</div>
                  <div className="text-[11px] text-slate-500 dark:text-[#A8B4CA]">
                    {it.quantity} × {formatCurrency(it.unit_price, currency as any)}
                  </div>
                </div>
                <div className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(it.unit_price * it.quantity, currency as any)}
                </div>
              </div>
            ))}
          </div>

          {/* Subtotal & Totals Breakdown */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#101A2D] border border-slate-200/80 dark:border-[#263653] space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-[#A8B4CA]">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(subtotal, currency as any)}</span>
            </div>
            {discountVal > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Discount ({discountVal}%):</span>
                <span className="font-mono">-{formatCurrency(discountAmount, currency as any)}</span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-[#A8B4CA]">
                <span>Tax ({taxRate}%):</span>
                <span className="font-mono">+{formatCurrency(taxAmount, currency as any)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-[#263653] font-bold text-slate-900 dark:text-[#F5F7FF]">
              <span>Total:</span>
              <span className="text-sm font-black text-indigo-600 dark:text-[#2388FF]">
                {formatCurrency(grandTotal, currency as any)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons: Create Quote | Edit Draft | Add Item */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          disabled={isCreating}
          onClick={() => onCreateQuote(targetCust, pendingQuotePayload)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5638F5] to-[#2388FF] hover:opacity-95 active:scale-98 shadow-md shadow-[#5638F5]/25 transition-all disabled:opacity-50"
        >
          {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          <span>Create Quote</span>
        </button>

        {onEditDraft && (
          <button
            type="button"
            onClick={onEditDraft}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#101A2D] hover:bg-slate-200 dark:hover:bg-[#17243B] border border-slate-200 dark:border-[#263653] transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Draft</span>
          </button>
        )}

        {onAddItem && (
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#101A2D] hover:bg-slate-200 dark:hover:bg-[#17243B] border border-slate-200 dark:border-[#263653] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Alias for backwards-compatibility
export const ExactCustomerMatchCard = QuoteDraftPreviewCard;

interface QuoteCreatedSuccessProps {
  quotation: any;
  sentDetails?: any;
  onSendWhatsApp?: () => void;
  onSendEmail?: () => void;
  onViewQuote?: (quoteId: string) => void;
  onDownloadPdf?: () => void;
}

/**
 * Step 6 Completion Card:
 * Once quote is saved in database, renders confirmation with:
 * Send via WhatsApp | Send via Email | View Quote | Download PDF
 */
export function QuoteCreatedSuccessCard({
  quotation,
  sentDetails,
  onSendWhatsApp,
  onSendEmail,
  onViewQuote,
  onDownloadPdf,
}: QuoteCreatedSuccessProps) {
  const quoteNumber = quotation?.quotation_number || sentDetails?.quoteNumber || 'Quotation';
  const customerName = quotation?.customer?.name || sentDetails?.customerName || 'Customer';
  const amount = quotation?.grand_total || sentDetails?.amount || 0;
  const currency = quotation?.currency || sentDetails?.currency || 'USD';
  const quoteId = quotation?.id || sentDetails?.quoteId || '';
  const publicToken = quotation?.public_token || sentDetails?.publicToken;

  const handleDefaultWhatsApp = () => {
    if (onSendWhatsApp) {
      onSendWhatsApp();
      return;
    }
    const phone = sentDetails?.phone || quotation?.customer?.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.blendandbold.com';
    const link = publicToken ? `${appUrl}/q/${publicToken}` : `${appUrl}/quotations/${quoteId}`;
    const text = encodeURIComponent(
      `Hello ${customerName}, here is your quotation #${quoteNumber} for ${formatCurrency(amount, currency)}: ${link}\n\nPlease review and approve online.`
    );
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`, '_blank');
  };

  const handleDefaultPdf = () => {
    if (onDownloadPdf) {
      onDownloadPdf();
      return;
    }
    if (publicToken) {
      window.open(`/api/public/pdf?token=${publicToken}`, '_blank');
    } else if (quoteId) {
      window.open(`/api/quotations/${quoteId}/pdf`, '_blank');
    }
  };

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#17243B] border border-emerald-200 dark:border-emerald-900/60 p-4 sm:p-5 shadow-sm dark:shadow-xl space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-emerald-100 dark:border-emerald-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Quotation Created
              </span>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                {quoteNumber}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-[#A8B4CA]">
              Client: <strong className="text-slate-800 dark:text-slate-100">{customerName}</strong>
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total</span>
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatCurrency(amount, currency as any)}
          </span>
        </div>
      </div>

      {/* Relevant Next Actions: WhatsApp | Email | View Quote | Download PDF */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-bold">
        <button
          type="button"
          onClick={handleDefaultWhatsApp}
          className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="truncate">WhatsApp</span>
        </button>

        {onSendEmail && (
          <button
            type="button"
            onClick={onSendEmail}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-white bg-gradient-to-r from-[#5638F5] to-[#2388FF] hover:opacity-95 shadow-sm transition-all"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="truncate">Send Email</span>
          </button>
        )}

        {onViewQuote && (
          <button
            type="button"
            onClick={() => onViewQuote(quoteId)}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#101A2D] hover:bg-slate-200 dark:hover:bg-[#17243B] border border-slate-200 dark:border-[#263653] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="truncate">View Quote</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleDefaultPdf}
          className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#101A2D] hover:bg-slate-200 dark:hover:bg-[#17243B] border border-slate-200 dark:border-[#263653] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="truncate">PDF</span>
        </button>
      </div>
    </div>
  );
}

interface CustomerNotFoundProps {
  searchedTerm?: string;
  pendingQuotePayload?: any;
  onOpenAddModal: (searchedTerm: string, pendingPayload: any) => void;
}

export function CustomerNotFoundCard({
  searchedTerm,
  pendingQuotePayload,
  onOpenAddModal,
}: CustomerNotFoundProps) {
  const term = searchedTerm || 'this customer';

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#17243B] border border-rose-200 dark:border-rose-900/60 p-4 sm:p-5 shadow-sm dark:shadow-xl space-y-3 animate-in fade-in duration-200">
      <div className="flex items-center gap-2.5 text-rose-800 dark:text-rose-300">
        <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold tracking-tight">Customer Not Found</h4>
          <p className="text-[11px] text-slate-600 dark:text-[#A8B4CA]">
            I couldn&apos;t find <strong>&quot;{term}&quot;</strong> in your QuoteFlow customer database.
          </p>
        </div>
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={() => onOpenAddModal(searchedTerm || '', pendingQuotePayload)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5638F5] to-[#2388FF] hover:opacity-95 shadow-md shadow-[#5638F5]/25 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add New Customer</span>
        </button>
      </div>
    </div>
  );
}

interface InteractiveQuoteDraftProps {
  quotation: any;
  onSendQuote: () => void;
  onEditQuote: (quoteId: string) => void;
}

export function InteractiveQuoteDraftCard({
  quotation,
  onSendQuote,
  onEditQuote,
}: InteractiveQuoteDraftProps) {
  if (!quotation) return null;

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#17243B] border border-indigo-200 dark:border-[#263653] p-4 sm:p-5 shadow-sm dark:shadow-xl space-y-3.5 animate-in fade-in duration-200">
      {/* Draft Header */}
      <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-[#263653]/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#5638F5]/15 border border-[#5638F5]/30 flex items-center justify-center text-[#5638F5]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-[#F5F7FF]">
                Quotation Draft
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-[#5638F5]/20 text-indigo-700 dark:text-[#a5b4fc] font-bold border border-indigo-200 dark:border-[#5638F5]/30">
                {quotation.quotation_number}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#A8B4CA]">
              Customer: <strong className="text-slate-800 dark:text-[#F5F7FF]">{quotation.customer?.name || 'Client'}</strong>
            </p>
          </div>
        </div>

        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
          Draft
        </span>
      </div>

      {/* Items List */}
      <div className="space-y-1.5 py-1 text-xs">
        {(quotation.items || []).map((it: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {it.description}
            </span>
            <div className="flex items-center gap-3 text-slate-500 dark:text-[#A8B4CA]">
              <span>Qty {it.quantity}</span>
              <span className="font-semibold text-slate-900 dark:text-[#F5F7FF]">
                {formatCurrency(it.unit_price * it.quantity, quotation.currency)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals Summary */}
      <div className="pt-2 space-y-1 text-xs border-t border-slate-200 dark:border-[#263653]">
        <div className="flex justify-between text-slate-500 dark:text-[#A8B4CA]">
          <span>Subtotal</span>
          <span>{formatCurrency(quotation.subtotal, quotation.currency)}</span>
        </div>
        <div className="flex justify-between text-slate-500 dark:text-[#A8B4CA]">
          <span>Tax ({quotation.tax_rate || 0}%)</span>
          <span>{formatCurrency(quotation.tax_amount || 0, quotation.currency)}</span>
        </div>
        <div className="flex justify-between font-bold text-slate-900 dark:text-[#F5F7FF] pt-1.5 border-t border-slate-100 dark:border-slate-800">
          <span>Grand Total</span>
          <span className="text-sm font-black text-indigo-600 dark:text-[#2388FF]">
            {formatCurrency(quotation.grand_total, quotation.currency)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5 pt-1">
        <button
          type="button"
          onClick={onSendQuote}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5638F5] to-[#2388FF] hover:opacity-95 shadow-md shadow-[#5638F5]/25 transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Confirm &amp; Send Quote</span>
        </button>

        <button
          type="button"
          onClick={() => onEditQuote(quotation.id)}
          className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#101A2D] hover:bg-slate-200 dark:hover:bg-[#17243B] border border-slate-200 dark:border-[#263653] transition-colors"
        >
          <Edit className="w-3.5 h-3.5" />
          <span>Edit Quote</span>
        </button>
      </div>
    </div>
  );
}

interface InlineAddCustomerModalProps {
  searchedTerm: string;
  onClose: () => void;
  onSaveCustomer: (customerData: any) => Promise<void>;
  isSaving: boolean;
}

export function InlineAddCustomerModal({
  searchedTerm,
  onClose,
  onSaveCustomer,
  isSaving,
}: InlineAddCustomerModalProps) {
  const [form, setForm] = useState({
    name: searchedTerm || '',
    company_name: searchedTerm || '',
    email: '',
    phone: '',
    country: 'United Arab Emirates',
    billing_address: '',
    tax_number: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || isSaving) return;
    await onSaveCustomer(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#263653]/60">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#5638F5]" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FF]">
              Add New Customer
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-[#A8B4CA]">
          Add customer details. Once saved, your quotation will automatically continue with your specified items!
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-[#F5F7FF] mb-1">
              Customer / Contact Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#263653] bg-slate-50 dark:bg-[#101A2D] text-slate-900 dark:text-[#F5F7FF] outline-none focus:border-[#5638F5]"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-[#F5F7FF] mb-1">
              Company Name (optional)
            </label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#263653] bg-slate-50 dark:bg-[#101A2D] text-slate-900 dark:text-[#F5F7FF] outline-none focus:border-[#5638F5]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-slate-700 dark:text-[#F5F7FF] mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="client@example.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#263653] bg-slate-50 dark:bg-[#101A2D] text-slate-900 dark:text-[#F5F7FF] outline-none focus:border-[#5638F5]"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-[#F5F7FF] mb-1">
                Phone
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+971 50 000 0000"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#263653] bg-slate-50 dark:bg-[#101A2D] text-slate-900 dark:text-[#F5F7FF] outline-none focus:border-[#5638F5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-slate-700 dark:text-[#F5F7FF] mb-1">
                Country
              </label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#263653] bg-slate-50 dark:bg-[#101A2D] text-slate-900 dark:text-[#F5F7FF] outline-none focus:border-[#5638F5]"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-[#F5F7FF] mb-1">
                TRN / Tax Number
              </label>
              <input
                type="text"
                value={form.tax_number}
                onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
                placeholder="100..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#263653] bg-slate-50 dark:bg-[#101A2D] text-slate-900 dark:text-[#F5F7FF] outline-none focus:border-[#5638F5]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#263653] text-slate-600 dark:text-[#A8B4CA] hover:bg-slate-100 dark:hover:bg-[#101A2D] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.name.trim() || isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold bg-gradient-to-r from-[#5638F5] to-[#2388FF] hover:opacity-95 disabled:opacity-50 shadow-md"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>Save &amp; Continue Quote</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
