'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Quotation, PaymentMethod } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  FileText,
  DollarSign,
  Receipt,
  X,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation;
  onPaymentUpdated?: (updatedQuotation: Quotation) => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT / RTGS' },
  { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm / QR)' },
  { value: 'CHEQUE', label: 'Cheque / Demand Draft' },
  { value: 'CASH', label: 'Cash Payment' },
  { value: 'CARD', label: 'Credit / Debit Card' },
  { value: 'OTHER', label: 'Other Electronic Remittance' },
];

export function PaymentModal({
  isOpen,
  onClose,
  quotation,
  onPaymentUpdated,
}: PaymentModalProps) {
  const router = useRouter();

  const grandTotal = Number(quotation.grand_total) || 0;
  const currency = quotation.currency || 'INR';

  // Determine initial payment mode: 'FULL' | 'ADVANCE' | 'UNPAID'
  const getInitialMode = (): 'FULL' | 'ADVANCE' | 'UNPAID' => {
    if (quotation.is_paid) return 'FULL';
    if (quotation.paid_amount && quotation.paid_amount > 0 && quotation.paid_amount < grandTotal) {
      return 'ADVANCE';
    }
    return 'FULL';
  };

  const [paymentMode, setPaymentMode] = useState<'FULL' | 'ADVANCE' | 'UNPAID'>(getInitialMode());
  const [advancePreset, setAdvancePreset] = useState<number | 'custom'>(() => {
    if (quotation.advance_percentage && [10, 20, 50].includes(quotation.advance_percentage)) {
      return quotation.advance_percentage;
    }
    return 20; // Default preset 20%
  });
  const [customPaidAmount, setCustomPaidAmount] = useState<number>(
    quotation.paid_amount && quotation.paid_amount < grandTotal
      ? quotation.paid_amount
      : Math.round(grandTotal * 0.2)
  );

  const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(
    quotation.payment_confirmed_by_company !== undefined
      ? Boolean(quotation.payment_confirmed_by_company)
      : true
  );

  const [paidAt, setPaidAt] = useState<string>(
    quotation.paid_at
      ? quotation.paid_at.split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    quotation.payment_method || 'BANK_TRANSFER'
  );
  const [paymentNotes, setPaymentNotes] = useState<string>(
    quotation.payment_notes || ''
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Computed amounts
  const activePaidAmount = (() => {
    if (paymentMode === 'UNPAID') return 0;
    if (paymentMode === 'FULL') return grandTotal;
    if (advancePreset === 'custom') return Math.max(0, Math.min(grandTotal, customPaidAmount || 0));
    return Math.round((grandTotal * (Number(advancePreset) || 20)) / 100);
  })();

  const activeBalanceAmount = Math.max(0, grandTotal - activePaidAmount);
  const activeAdvancePercentage = grandTotal > 0 ? Math.round((activePaidAmount / grandTotal) * 100) : 0;

  useEffect(() => {
    if (isOpen) {
      const mode = getInitialMode();
      setPaymentMode(mode);
      if (quotation.advance_percentage && [10, 20, 50].includes(quotation.advance_percentage)) {
        setAdvancePreset(quotation.advance_percentage);
      } else if (quotation.paid_amount && quotation.paid_amount < grandTotal) {
        setAdvancePreset('custom');
        setCustomPaidAmount(quotation.paid_amount);
      } else {
        setAdvancePreset(20);
        setCustomPaidAmount(Math.round(grandTotal * 0.2));
      }
      setPaymentConfirmed(
        quotation.payment_confirmed_by_company !== undefined
          ? Boolean(quotation.payment_confirmed_by_company)
          : true
      );
      setPaidAt(
        quotation.paid_at
          ? quotation.paid_at.split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setPaymentMethod(quotation.payment_method || 'BANK_TRANSFER');
      setPaymentNotes(quotation.payment_notes || '');
      setError(null);
    }
  }, [quotation, isOpen, grandTotal]);

  const handleSavePayment = async () => {
    setIsLoading(true);
    setError(null);

    const isFullyPaid = paymentMode === 'FULL' || (paymentMode === 'ADVANCE' && activeBalanceAmount <= 0);
    const isUnpaid = paymentMode === 'UNPAID' || activePaidAmount <= 0;

    try {
      const res = await fetch(`/api/quotations/${quotation.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_paid: isFullyPaid,
          paid_amount: isUnpaid ? 0 : activePaidAmount,
          balance_amount: isUnpaid ? grandTotal : activeBalanceAmount,
          advance_percentage: isUnpaid ? 0 : activeAdvancePercentage,
          payment_status: isFullyPaid ? 'PAID' : (activePaidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID'),
          payment_confirmed_by_company: isUnpaid ? false : paymentConfirmed,
          paid_at: isUnpaid ? null : (paidAt ? new Date(paidAt).toISOString() : new Date().toISOString()),
          payment_method: isUnpaid ? null : paymentMethod,
          payment_notes: isUnpaid ? null : paymentNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update payment status');
      }

      if (onPaymentUpdated) {
        onPaymentUpdated(data.quotation);
      }

      router.refresh();
      onClose();

      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 250);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving payment details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsUnpaid = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/quotations/${quotation.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_paid: false,
          paid_amount: 0,
          balance_amount: grandTotal,
          advance_percentage: 0,
          payment_status: 'UNPAID',
          payment_confirmed_by_company: false,
          paid_at: null,
          payment_method: null,
          payment_notes: null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update payment status');
      }

      if (onPaymentUpdated) {
        onPaymentUpdated(data.quotation);
      }

      router.refresh();
      onClose();

      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 250);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Payment Status & Advance Remittance"
      description={`Record full settlement, advance payment, or pending status for quotation ${quotation.quotation_number}`}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Bill Summary Banner */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Quotation Value
            </span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {formatCurrency(grandTotal, currency)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Client: {quotation.customer?.name || 'Valued Client'}
              {quotation.customer?.company_name ? ` (${quotation.customer.company_name})` : ''}
            </p>
          </div>

          <div>
            {quotation.is_paid ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Fully Paid (100%)</span>
              </span>
            ) : quotation.paid_amount && quotation.paid_amount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-300">
                <Receipt className="h-3.5 w-3.5 text-indigo-600" />
                <span>Advance Paid ({quotation.advance_percentage || Math.round((quotation.paid_amount / grandTotal) * 100)}%)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <span>Payment Pending</span>
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* Payment Mode Selector: Full, Advance, Unpaid */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Payment Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Full Payment Button */}
            <button
              type="button"
              onClick={() => setPaymentMode('FULL')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                paymentMode === 'FULL'
                  ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  paymentMode === 'FULL' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-sm">Full 100%</p>
                <p className="text-[11px] text-slate-500">Paid in full</p>
              </div>
            </button>

            {/* Advance / Partial Payment Button */}
            <button
              type="button"
              onClick={() => setPaymentMode('ADVANCE')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                paymentMode === 'ADVANCE'
                  ? 'border-indigo-500 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  paymentMode === 'ADVANCE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-sm">Advance / Partial</p>
                <p className="text-[11px] text-slate-500">10%, 20%, 50% or custom</p>
              </div>
            </button>

            {/* Unpaid Button */}
            <button
              type="button"
              onClick={() => setPaymentMode('UNPAID')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                paymentMode === 'UNPAID'
                  ? 'border-amber-500 bg-amber-50/80 text-amber-950 ring-2 ring-amber-500/20 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  paymentMode === 'UNPAID' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-sm">Mark as Unpaid</p>
                <p className="text-[11px] text-slate-500">Payment pending</p>
              </div>
            </button>
          </div>
        </div>

        {/* Advance Percentage Presets & Custom Amount (Only active when Advance mode is selected) */}
        {paymentMode === 'ADVANCE' && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                Advance Payment Presets
              </span>
              <span className="text-xs font-semibold text-indigo-700">
                Selected: {activeAdvancePercentage}% ({formatCurrency(activePaidAmount, currency)})
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 50].map((pct) => {
                const isSelected = advancePreset === pct;
                const calculated = Math.round((grandTotal * pct) / 100);
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setAdvancePreset(pct);
                      setCustomPaidAmount(calculated);
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs font-bold'
                        : 'border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50 font-semibold'
                    }`}
                  >
                    <div className="text-xs font-black">{pct}% Advance</div>
                    <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {formatCurrency(calculated, currency)}
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setAdvancePreset('custom')}
                className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                  advancePreset === 'custom'
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs font-bold'
                    : 'border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50 font-semibold'
                }`}
              >
                <div className="text-xs font-black">Custom</div>
                <div className={`text-[10px] mt-0.5 ${advancePreset === 'custom' ? 'text-indigo-100' : 'text-slate-500'}`}>
                  Custom Amount
                </div>
              </button>
            </div>

            {advancePreset === 'custom' && (
              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Custom Advance Amount ({currency}) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={grandTotal}
                    step="any"
                    value={customPaidAmount}
                    onChange={(e) => setCustomPaidAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Enter advance amount received"
                    className="w-full h-10 px-3 pr-24 text-sm bg-white border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600">
                    {grandTotal > 0 ? Math.round(((customPaidAmount || 0) / grandTotal) * 100) : 0}% of Total
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Balance Summary Calculation (Visible when FULL or ADVANCE) */}
        {paymentMode !== 'UNPAID' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
            <div>
              <span className="text-slate-500 block">Total Quotation</span>
              <span className="font-bold text-slate-800 text-sm">{formatCurrency(grandTotal, currency)}</span>
            </div>
            <div>
              <span className="text-emerald-700 block font-semibold">Amount Received</span>
              <span className="font-extrabold text-emerald-700 text-sm">
                {formatCurrency(activePaidAmount, currency)} ({activeAdvancePercentage}%)
              </span>
            </div>
            <div>
              <span className="text-rose-700 block font-semibold">Remaining Balance</span>
              <span className="font-extrabold text-rose-700 text-sm">{formatCurrency(activeBalanceAmount, currency)}</span>
            </div>
          </div>
        )}

        {/* Detailed Payment Inputs & Company Confirmation Toggle (Active when FULL or ADVANCE) */}
        {paymentMode !== 'UNPAID' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
              <CreditCard className="h-4 w-4 text-indigo-600" />
              <span>Remittance Particulars</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Payment Date *"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                required
              />

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="Transaction / Reference # (UTR, Cheque, or UPI ID)"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. UTR-9821382910, Cheque #49281, or UPI Ref"
            />

            {/* Company Payment Confirmation Checkbox */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={paymentConfirmed}
                  onChange={(e) => setPaymentConfirmed(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs font-bold text-slate-800">
                  Confirm payment verified in company account
                </span>
              </label>
              <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
                When confirmed, the client can immediately download their official **Payment Receipt** in the client portal. If unconfirmed, the client sees payment as verification pending.
              </p>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div>
            {(quotation.is_paid || (quotation.paid_amount && quotation.paid_amount > 0)) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMarkAsUnpaid}
                isLoading={isLoading}
                className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                Clear Payment Record
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSavePayment}
              isLoading={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Save Payment Record
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
