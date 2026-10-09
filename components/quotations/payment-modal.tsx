'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Quotation, PaymentMethod, PaymentRecord } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const currency = quotation.currency || 'INR';

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

    try {
      if (paymentMode === 'UNPAID') {
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
            advance_payment_notes: null,
            final_payment_notes: null,
            payment_records: [],
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reset payment status');

        if (onPaymentUpdated) onPaymentUpdated(data.quotation);
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

      const res = await fetch(`/api/quotations/${quotation.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payment');

      if (onPaymentUpdated) onPaymentUpdated(data.quotation);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Payment Records & Installments"
      description={`Record payments and track balances for quotation ${quotation.quotation_number}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Bill Summary Banner */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quotation Total
            </span>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {formatCurrency(grandTotal, currency)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Client: {quotation.customer?.name || 'Valued Client'}
            </p>
          </div>

          <div className="flex sm:flex-col items-end gap-1">
            <span className="text-xs font-semibold text-slate-600">
              Paid: <strong className="text-emerald-700 font-bold">{formatCurrency(existingTotalPaid, currency)}</strong> ({existingPaidPct}%)
            </span>
            <span className="text-xs font-semibold text-slate-600">
              Balance: <strong className="text-rose-700 font-bold">{formatCurrency(existingBalance, currency)}</strong>
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>Payment Progress</span>
            <span>
              {existingPaidPct}% Paid
              {paymentMode === 'INSTALLMENT' && activeInstallmentAmount > 0 && (
                <span className="text-sky-600 font-bold"> → {projectedPaidPct}% Projected</span>
              )}
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
            {/* Existing paid bar */}
            <div
              className="bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(100, existingPaidPct)}%` }}
            />
            {/* New installment bar preview */}
            {paymentMode === 'INSTALLMENT' && activeInstallmentAmount > 0 && (
              <div
                className="bg-sky-400 animate-pulse transition-all duration-300"
                style={{ width: `${Math.min(100 - existingPaidPct, installmentPct)}%` }}
              />
            )}
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* Existing Payment Records List (if any) */}
        {records.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-indigo-600" />
                Previous Payment History ({records.length})
              </span>
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-indigo-600 hover:underline font-semibold"
              >
                {showHistory ? 'Collapse' : 'View'}
              </button>
            </div>

            {showHistory && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
                {records.map((rec, idx) => (
                  <div
                    key={rec.id || idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          {formatCurrency(rec.amount, currency)} ({rec.percentage || Math.round((rec.amount / grandTotal) * 100)}%)
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
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
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
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
          <label className="text-xs font-bold text-slate-700 block">Select Action</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMode('INSTALLMENT')}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                paymentMode === 'INSTALLMENT'
                  ? 'border-sky-500 bg-sky-50 text-sky-950 ring-2 ring-sky-500/20 font-bold shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold'
              }`}
            >
              <div className="text-xs">Add Installment</div>
              <div className="text-[10px] text-slate-500 mt-0.5">e.g. +20%, +50%</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('FULL_SETTLEMENT')}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                paymentMode === 'FULL_SETTLEMENT'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 font-bold shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold'
              }`}
            >
              <div className="text-xs">Settle Full Balance</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Pay remaining {formatCurrency(existingBalance, currency)}</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('UNPAID')}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                paymentMode === 'UNPAID'
                  ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20 font-bold shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold'
              }`}
            >
              <div className="text-xs">Mark Unpaid</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Reset to 0%</div>
            </button>
          </div>
        </div>

        {/* Installment Amount Selection */}
        {paymentMode === 'INSTALLMENT' && existingBalance > 0 && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-900">Installment Amount</span>
              <span className="text-xs font-bold text-sky-700">
                + {formatCurrency(activeInstallmentAmount, currency)} ({installmentPct}%)
              </span>
            </div>

            {/* Quick Percentage Shortcuts */}
            <div className="grid grid-cols-4 gap-1.5">
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
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-white text-slate-700 border-sky-200 hover:bg-sky-100'
                    }`}
                  >
                    +{pct}%
                    <div className="text-[10px] font-normal opacity-90">{formatCurrency(amount, currency)}</div>
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Field */}
            <div className="pt-1">
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
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
                  className="w-full h-9 px-3 pr-20 text-xs bg-white border border-sky-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold text-slate-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-sky-600">
                  {grandTotal > 0 ? Math.round(((customAmount || 0) / grandTotal) * 100) : 0}% of Total
                </span>
              </div>
            </div>

            {/* Live Calculation Preview Banner */}
            <div className="p-2.5 rounded-lg bg-white border border-sky-200 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Paid: <strong>{formatCurrency(existingTotalPaid, currency)}</strong> + 
                Installment: <strong className="text-sky-700">{formatCurrency(activeInstallmentAmount, currency)}</strong>
              </span>
              <span className="font-extrabold text-slate-900">
                New Total: {formatCurrency(projectedTotalPaid, currency)} ({projectedPaidPct}%)
              </span>
            </div>
          </div>
        )}

        {/* Transaction Details Form (Only when NOT Unpaid) */}
        {paymentMode !== 'UNPAID' && (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
              <CreditCard className="h-4 w-4 text-indigo-600" />
              <span>Transaction &amp; Remittance Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Payment Date *</label>
                <input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CONDITIONAL: CASH-SPECIFIC TRANSACTION DETAILS */}
            {isCash ? (
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/90 p-3 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <Banknote className="h-4 w-4 text-emerald-700" />
                  <span>Cash Payment Particulars</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                      Cash Receipt / Voucher # (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CR-1049, Cash Slip #42"
                      value={cashReceiptNo}
                      onChange={(e) => setCashReceiptNo(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                      Cash Received By / Handed To (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Counter Cashier / Store Manager"
                      value={cashReceivedBy}
                      onChange={(e) => setCashReceivedBy(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                    Cash Handover Details / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Received full cash at store billing desk"
                    value={cashNotes}
                    onChange={(e) => setCashNotes(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Transaction / Reference # (UTR, Cheque, or UPI Ref)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-9821382910, Cheque #49281, UPI txn ID"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            )}

            {/* Company verification check */}
            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={paymentConfirmed}
                onChange={(e) => setPaymentConfirmed(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span className="text-xs font-semibold text-slate-700">
                Confirm payment received and verified by company
              </span>
            </label>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs h-8"
            >
              Cancel
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSavePayment}
              isLoading={isLoading}
              className={`text-xs h-8 px-4 font-semibold shadow-sm ${
                paymentMode === 'UNPAID'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {paymentMode === 'UNPAID'
                ? 'Confirm Reset to Unpaid'
                : paymentMode === 'FULL_SETTLEMENT'
                ? `Confirm Full Settlement (${formatCurrency(existingBalance, currency)})`
                : `Record Payment (+${formatCurrency(activeInstallmentAmount, currency)})`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
