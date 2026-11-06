'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Quotation, PaymentMethod, PaymentRecord } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate } from '@/lib/utils';
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
  Banknote,
  QrCode,
  PlusCircle,
  Trash2,
  Clock,
  History,
  ShieldCheck,
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
  { value: 'CASH', label: 'Cash Payment' },
  { value: 'CHEQUE', label: 'Cheque / Demand Draft' },
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
  const isIndia = Boolean(
    (quotation.organization?.business_country || '').toUpperCase() === 'IN' ||
    (quotation.organization?.country || '').toLowerCase() === 'india' ||
    (quotation.organization?.country || '').toUpperCase() === 'IN' ||
    quotation.organization?.billing_region === 'INDIA' ||
    quotation.currency === 'INR'
  );

  const currency = quotation.currency || (isIndia ? 'INR' : 'USD');

  const availablePaymentMethods: { value: PaymentMethod; label: string }[] = isIndia
    ? [
        { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT / RTGS' },
        { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm / QR)' },
        { value: 'CASH', label: 'Cash Payment' },
        { value: 'CHEQUE', label: 'Cheque / Demand Draft' },
        { value: 'CARD', label: 'Credit / Debit Card' },
        { value: 'OTHER', label: 'Other Electronic Remittance' },
      ]
    : [
        { value: 'BANK_TRANSFER', label: 'Bank Wire / Remittance' },
        { value: 'PAYMENT_LINK', label: 'Online Payment Link (Card / Stripe / PayPal)' },
        { value: 'CARD', label: 'Credit / Debit Card' },
        { value: 'CASH', label: 'Cash Payment' },
        { value: 'CHEQUE', label: 'Cheque / Wire Transfer' },
        { value: 'OTHER', label: 'Other Electronic Remittance' },
      ];

  // Extract existing payment records or synthesize from existing paid_amount
  const getExistingRecords = (): PaymentRecord[] => {
    if (Array.isArray(quotation.payment_records) && quotation.payment_records.length > 0) {
      return quotation.payment_records;
    }
    const priorPaid = quotation.paid_amount ?? (quotation.is_paid ? grandTotal : 0);
    if (priorPaid > 0) {
      return [
        {
          id: 'rec_prior_1',
          amount: priorPaid,
          percentage: quotation.advance_percentage || (grandTotal > 0 ? Math.round((priorPaid / grandTotal) * 100) : 100),
          method: quotation.payment_method || 'BANK_TRANSFER',
          date: quotation.paid_at ? quotation.paid_at.split('T')[0] : new Date().toISOString().split('T')[0],
          notes: quotation.payment_notes || quotation.advance_payment_notes || undefined,
          is_cash: quotation.payment_method === 'CASH',
          created_at: quotation.paid_at || new Date().toISOString(),
        },
      ];
    }
    return [];
  };

  const [records, setRecords] = useState<PaymentRecord[]>([]);

  // Calculate cumulative stats from records
  const existingTotalPaid = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const existingBalance = Math.max(0, grandTotal - existingTotalPaid);
  const existingPaidPct = grandTotal > 0 ? Math.round((existingTotalPaid / grandTotal) * 100) : 0;

  // Payment mode: 'INSTALLMENT' | 'FULL_SETTLEMENT' | 'UNPAID'
  const [paymentMode, setPaymentMode] = useState<'INSTALLMENT' | 'FULL_SETTLEMENT' | 'UNPAID'>('INSTALLMENT');

  // Installment input states
  const [installmentPreset, setInstallmentPreset] = useState<number | 'custom'>(20);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [paidAt, setPaidAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [transactionRef, setTransactionRef] = useState<string>('');
  
  // Cash-specific fields
  const [cashReceiptNo, setCashReceiptNo] = useState<string>('');
  const [cashReceivedBy, setCashReceivedBy] = useState<string>('');
  const [cashNotes, setCashNotes] = useState<string>('');

  const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialRecords = getExistingRecords();
      setRecords(initialRecords);

      const priorTotal = initialRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const remaining = Math.max(0, grandTotal - priorTotal);

      if (remaining <= 0 && grandTotal > 0) {
        setPaymentMode('FULL_SETTLEMENT');
      } else {
        setPaymentMode('INSTALLMENT');
      }

      // Default installment preset to 20% or remaining balance if less
      const defaultAdd = Math.min(remaining, Math.round(grandTotal * 0.2));
      setInstallmentPreset(remaining <= Math.round(grandTotal * 0.2) ? 'custom' : 20);
      setCustomAmount(defaultAdd > 0 ? defaultAdd : remaining);

      setPaidAt(new Date().toISOString().split('T')[0]);
      setPaymentMethod('BANK_TRANSFER');
      setTransactionRef('');
      setCashReceiptNo('');
      setCashReceivedBy('');
      setCashNotes('');
      setPaymentConfirmed(true);
      setError(null);
    }
  }, [isOpen, quotation, grandTotal]);

  // Calculated active installment amount
  const activeInstallmentAmount = (() => {
    if (paymentMode === 'UNPAID') return 0;
    if (paymentMode === 'FULL_SETTLEMENT') return existingBalance;
    if (installmentPreset === 'custom') {
      return Math.max(0, Math.min(existingBalance, customAmount || 0));
    }
    const calculated = Math.round((grandTotal * (Number(installmentPreset) || 20)) / 100);
    return Math.max(0, Math.min(existingBalance, calculated));
  })();

  const projectedTotalPaid = Math.min(grandTotal, existingTotalPaid + activeInstallmentAmount);
  const projectedBalance = Math.max(0, grandTotal - projectedTotalPaid);
  const projectedPaidPct = grandTotal > 0 ? Math.round((projectedTotalPaid / grandTotal) * 100) : 0;
  const installmentPct = grandTotal > 0 ? Math.round((activeInstallmentAmount / grandTotal) * 100) : 0;

  const isCash = paymentMethod === 'CASH';

  // Handle removing a previous payment record
  const handleRemoveRecord = (recordId: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
  };

  const handleSavePayment = async () => {
    setIsLoading(true);
    setError(null);

    const targetId = quotation.id || quotation.quotation_number;
    if (!targetId) {
      setError('Quotation identifier is missing');
      setIsLoading(false);
      return;
    }

    const sendPaymentRequest = async (payload: any) => {
      let res: Response;
      try {
        res = await fetch(`/api/quotations/${encodeURIComponent(targetId)}/payment`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (netErr: any) {
        throw new Error(netErr?.message || 'Network error updating payment');
      }

      const contentType = res.headers.get('content-type') || '';
      // If payment sub-route returns 404 or non-JSON HTML, try falling back to /api/quotations/[id]
      if (!res.ok && (!contentType.includes('application/json') || res.status === 404)) {
        try {
          const fallbackRes = await fetch(`/api/quotations/${encodeURIComponent(targetId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'UPDATE_PAYMENT',
              ...payload,
            }),
          });
          if (fallbackRes.ok) {
            res = fallbackRes;
          }
        } catch (fbErr) {
          console.warn('Fallback payment update call failed:', fbErr);
        }
      }

      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      if (isJson) {
        let data: any;
        try {
          data = await res.json();
        } catch {
          throw new Error('Received invalid server response. Please try again.');
        }
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update payment');
        }
        return data;
      } else {
        const text = await res.text();
        if (!res.ok) {
          throw new Error(`Server returned error (${res.status}): ${text.slice(0, 100) || 'Operation failed'}`);
        }
        return { success: true };
      }
    };

    try {
      if (paymentMode === 'UNPAID') {
        const data = await sendPaymentRequest({
          is_paid: false,
          paid_amount: 0,
          balance_amount: grandTotal,
          advance_percentage: 0,
          payment_status: 'UNPAID',
          payment_confirmed_by_company: false,
          paid_at: null,
          payment_method: null,
          payment_notes: null,
          advance_payment_notes: null,
          final_payment_notes: null,
          payment_records: [],
        });

        if (onPaymentUpdated && data.quotation) onPaymentUpdated(data.quotation);
        router.refresh();
        onClose();
        setTimeout(() => {
          if (typeof window !== 'undefined') window.location.reload();
        }, 200);
        return;
      }

      // Build new payment record for this transaction
      let updatedRecords = [...records];
      if (activeInstallmentAmount > 0) {
        const effectiveNotes = isCash
          ? [
              cashReceiptNo ? `Receipt #${cashReceiptNo}` : '',
              cashReceivedBy ? `Received by: ${cashReceivedBy}` : '',
              cashNotes,
            ]
              .filter(Boolean)
              .join(' • ') || 'Cash Payment'
          : transactionRef.trim() || 'Electronic Remittance';

        const newRecord: PaymentRecord = {
          id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          amount: activeInstallmentAmount,
          percentage: installmentPct,
          method: paymentMethod,
          date: paidAt || new Date().toISOString().split('T')[0],
          notes: effectiveNotes,
          is_cash: isCash,
          cash_receipt_no: isCash && cashReceiptNo ? cashReceiptNo.trim() : undefined,
          cash_received_by: isCash && cashReceivedBy ? cashReceivedBy.trim() : undefined,
          created_at: new Date().toISOString(),
        };

        updatedRecords.push(newRecord);
      }

      const finalTotalPaid = updatedRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const finalBalance = Math.max(0, grandTotal - finalTotalPaid);
      const finalPaidPct = grandTotal > 0 ? Math.round((finalTotalPaid / grandTotal) * 100) : 0;
      const isFullyPaid = finalBalance <= 0 && finalTotalPaid > 0;
      const paymentStatus = isFullyPaid ? 'PAID' : (finalTotalPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

      // Build summary notes from records
      const summaryNotes = updatedRecords
        .map((r, idx) => `P${idx + 1}: ${formatCurrency(r.amount, currency)} (${r.method}) ${r.notes ? `- ${r.notes}` : ''}`)
        .join('; ');

      const data = await sendPaymentRequest({
        is_paid: isFullyPaid,
        paid_amount: finalTotalPaid,
        balance_amount: finalBalance,
        advance_percentage: finalPaidPct,
        payment_status: paymentStatus,
        payment_confirmed_by_company: paymentConfirmed,
        paid_at: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
        payment_method: paymentMethod,
        payment_notes: summaryNotes,
        advance_payment_notes: updatedRecords[0]?.notes || null,
        final_payment_notes: isFullyPaid ? (updatedRecords[updatedRecords.length - 1]?.notes || null) : null,
        payment_records: updatedRecords,
      });

      if (onPaymentUpdated && data.quotation) onPaymentUpdated(data.quotation);
      router.refresh();
      onClose();
      setTimeout(() => {
        if (typeof window !== 'undefined') window.location.reload();
      }, 200);
    } catch (err: any) {
      setError(err.message || 'Error updating payment');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 backdrop-blur-[4px] p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      {/* Background click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        className="relative z-10 w-full max-w-[660px] overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(16,185,129,0.24)] my-auto max-h-[92vh] flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative top gradient glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-emerald-100/70 via-teal-50/30 to-transparent" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative z-10 px-5 pb-6 pt-7 sm:px-8 sm:pb-8 overflow-y-auto space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4 mb-2">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 text-white shadow-[0_10px_25px_rgba(16,185,129,0.32)]">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="payment-modal-title" className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  Record Payment
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {quotation.quotation_number}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Client: <strong className="text-slate-700">{quotation.customer?.name || 'Valued Client'}</strong>
              </p>
            </div>
          </div>

          {/* Bill Summary Banner - Premium gradient card */}
          <div className="overflow-hidden rounded-[22px] border border-emerald-100 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/50 p-4 sm:p-5 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Quotation Total</p>
                  <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {formatCurrency(grandTotal, currency)}
                  </p>
                  <p className="text-[11px] font-semibold text-emerald-700">
                    Paid: {formatCurrency(existingTotalPaid, currency)} ({existingPaidPct}%)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 sm:border-l sm:border-emerald-100 sm:pl-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Balance Outstanding</p>
                  <p className={`text-xl font-extrabold mt-0.5 ${existingBalance <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {existingBalance <= 0 ? '✓ Fully Settled' : formatCurrency(existingBalance, currency)}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {existingBalance <= 0 ? 'All dues cleared' : `${100 - existingPaidPct}% pending`}
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-4 pt-3.5 border-t border-emerald-100/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                <span>Settlement Progress</span>
                <span>
                  {existingPaidPct}% Paid
                  {paymentMode === 'INSTALLMENT' && activeInstallmentAmount > 0 && (
                    <span className="text-teal-600 font-bold"> → {projectedPaidPct}% Projected</span>
                  )}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                <div
                  className="bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, existingPaidPct)}%` }}
                />
                {paymentMode === 'INSTALLMENT' && activeInstallmentAmount > 0 && (
                  <div
                    className="bg-teal-400 animate-pulse transition-all duration-300"
                    style={{ width: `${Math.min(100 - existingPaidPct, installmentPct)}%` }}
                  />
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Existing Payment Records List (if any) */}
          {records.length > 0 && (
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <History className="h-4 w-4 text-indigo-600" />
                  Previous Payment History ({records.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
                >
                  {showHistory ? 'Collapse' : 'View'}
                </button>
              </div>

              {showHistory && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
                  {records.map((rec, idx) => (
                    <div
                      key={rec.id || idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs shadow-2xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800">
                            {formatCurrency(rec.amount, currency)} ({rec.percentage || Math.round((rec.amount / grandTotal) * 100)}%)
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {rec.method}
                          </span>
                          <span className="text-slate-400 text-[10px]">{formatDate(rec.date)}</span>
                        </div>
                        {rec.notes && (
                          <p className="text-[11px] text-slate-600">
                            {rec.is_cash && <span className="font-semibold text-emerald-700">Cash: </span>}
                            {rec.notes}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecord(rec.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove this installment record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payment Action Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Select Payment Action</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('INSTALLMENT')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  paymentMode === 'INSTALLMENT'
                    ? 'border-teal-500 bg-teal-50/80 text-teal-950 ring-2 ring-teal-500/20 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold'
                }`}
              >
                <div className="text-xs font-bold">Add Installment</div>
                <div className="text-[10px] text-slate-500 mt-0.5">e.g. +20%, +50%</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('FULL_SETTLEMENT')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  paymentMode === 'FULL_SETTLEMENT'
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold'
                }`}
              >
                <div className="text-xs font-bold">Settle Full Balance</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Pay {formatCurrency(existingBalance, currency)}</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('UNPAID')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  paymentMode === 'UNPAID'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-950 ring-2 ring-amber-500/20 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold'
                }`}
              >
                <div className="text-xs font-bold">Mark Unpaid</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Reset to 0%</div>
              </button>
            </div>
          </div>

          {/* Installment Amount Selection */}
          {paymentMode === 'INSTALLMENT' && existingBalance > 0 && (
            <div className="rounded-2xl border border-teal-200/80 bg-teal-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-950">Installment Amount</span>
                <span className="text-xs font-extrabold text-teal-700">
                  + {formatCurrency(activeInstallmentAmount, currency)} ({installmentPct}%)
                </span>
              </div>

              {/* Quick Percentage Shortcuts */}
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 25, 50].map((pct) => {
                  const amount = Math.min(existingBalance, Math.round((grandTotal * pct) / 100));
                  const isSelected = installmentPreset === pct;
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setInstallmentPreset(pct);
                        setCustomAmount(amount);
                      }}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-transparent shadow-xs'
                          : 'bg-white text-slate-700 border-teal-200 hover:bg-teal-100/50'
                      }`}
                    >
                      +{pct}%
                      <div className={`text-[10px] font-normal ${isSelected ? 'text-teal-100' : 'text-slate-500'}`}>
                        {formatCurrency(amount, currency)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Amount Field */}
              <div className="pt-1">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Custom Installment Amount ({currency})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={existingBalance}
                    step="any"
                    value={customAmount}
                    onChange={(e) => {
                      setInstallmentPreset('custom');
                      setCustomAmount(Math.max(0, Math.min(existingBalance, parseFloat(e.target.value) || 0)));
                    }}
                    className="w-full h-10 px-3.5 pr-24 text-xs font-bold text-slate-900 bg-white border border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-teal-700">
                    {grandTotal > 0 ? Math.round(((customAmount || 0) / grandTotal) * 100) : 0}% of Total
                  </span>
                </div>
              </div>

              {/* Live Calculation Preview Banner */}
              <div className="p-3 rounded-xl bg-white border border-teal-200 flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  Paid: <strong>{formatCurrency(existingTotalPaid, currency)}</strong> + 
                  Installment: <strong className="text-teal-700">{formatCurrency(activeInstallmentAmount, currency)}</strong>
                </span>
                <span className="font-extrabold text-slate-900">
                  New Total: {formatCurrency(projectedTotalPaid, currency)} ({projectedPaidPct}%)
                </span>
              </div>
            </div>
          )}

          {/* Transaction Details Form (Only when NOT Unpaid) */}
          {paymentMode !== 'UNPAID' && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
                <CreditCard className="h-4 w-4 text-teal-600" />
                <span>Transaction &amp; Remittance Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  >
                    {availablePaymentMethods.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CONDITIONAL: CASH-SPECIFIC TRANSACTION DETAILS */}
              {isCash ? (
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/90 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <Banknote className="h-4 w-4 text-emerald-700" />
                    <span>Cash Payment Particulars</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-emerald-950 block mb-1">
                        Cash Receipt / Voucher # (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CR-1049, Cash Slip #42"
                        value={cashReceiptNo}
                        onChange={(e) => setCashReceiptNo(e.target.value)}
                        className="w-full h-9 px-3 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-emerald-950 block mb-1">
                        Cash Received By / Handed To (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Counter Cashier / Store Manager"
                        value={cashReceivedBy}
                        onChange={(e) => setCashReceivedBy(e.target.value)}
                        className="w-full h-9 px-3 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-emerald-950 block mb-1">
                      Cash Handover Details / Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Received full cash at store billing desk"
                      value={cashNotes}
                      onChange={(e) => setCashNotes(e.target.value)}
                      className="w-full h-9 px-3 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    {isIndia
                      ? 'Transaction / Reference # (UTR, Cheque, or UPI Ref)'
                      : 'Transaction / Reference # (Wire, Card, or Payment Link Ref)'}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      isIndia
                        ? 'e.g. UTR-9821382910, Cheque #49281, UPI txn ID'
                        : 'e.g. Wire-9821382910, Stripe #ch_123, PayPal Txn ID'
                    }
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                </div>
              )}

              {/* Company verification check */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={paymentConfirmed}
                  onChange={(e) => setPaymentConfirmed(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Confirm payment received and verified by company
                </span>
              </label>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition focus:outline-none cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSavePayment}
              disabled={isLoading}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-lg transition-all transform active:scale-[0.98] cursor-pointer ${
                paymentMode === 'UNPAID'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:via-teal-700 hover:to-indigo-700 shadow-emerald-500/25'
              }`}
            >
              {isLoading ? (
                <span>Recording Payment...</span>
              ) : (
                <>
                  <span>
                    {paymentMode === 'UNPAID'
                      ? 'Confirm Reset to Unpaid'
                      : paymentMode === 'FULL_SETTLEMENT'
                      ? `Confirm Full Settlement (${formatCurrency(existingBalance, currency)})`
                      : `Record Payment (+${formatCurrency(activeInstallmentAmount, currency)})`}
                  </span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
