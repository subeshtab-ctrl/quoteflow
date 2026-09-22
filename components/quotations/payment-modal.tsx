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

  const [isPaid, setIsPaid] = useState<boolean>(
    quotation.is_paid !== undefined ? Boolean(quotation.is_paid) : true
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

  useEffect(() => {
    if (isOpen) {
      // Default to true so opening modal immediately records as paid unless explicitly changed
      setIsPaid(quotation.is_paid ? true : true);
      setPaidAt(
        quotation.paid_at
          ? quotation.paid_at.split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setPaymentMethod(quotation.payment_method || 'BANK_TRANSFER');
      setPaymentNotes(quotation.payment_notes || '');
      setError(null);
    }
  }, [quotation, isOpen]);

  const handleSavePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/quotations/${quotation.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_paid: isPaid,
          paid_at: isPaid ? (paidAt ? new Date(paidAt).toISOString() : new Date().toISOString()) : null,
          payment_method: isPaid ? paymentMethod : null,
          payment_notes: isPaid ? paymentNotes.trim() : null,
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

      // Ensure mobile browser reloads with fresh server state
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
    setIsPaid(false);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/quotations/${quotation.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_paid: false,
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
      title="Payment Status & Remittance"
      description={`Manage invoice payment status for quotation ${quotation.quotation_number}`}
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Bill Summary Banner */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Invoiced Amount
            </span>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {formatCurrency(quotation.grand_total, quotation.currency)}
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
                <span>Currently Paid</span>
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

        {/* Payment State Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Payment Status
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsPaid(true)}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                isPaid
                  ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isPaid ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Mark as Paid</p>
                <p className="text-[11px] text-slate-500">Payment received</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsPaid(false)}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                !isPaid
                  ? 'border-amber-500 bg-amber-50/80 text-amber-950 ring-2 ring-amber-500/20 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  !isPaid ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Mark as Unpaid</p>
                <p className="text-[11px] text-slate-500">Payment awaiting</p>
              </div>
            </button>
          </div>
        </div>

        {/* Detailed Payment Input Fields (Active when isPaid is true) */}
        {isPaid && (
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 uppercase tracking-wider">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span>Payment Details</span>
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
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
              label="Transaction / Reference # (Optional)"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. UTR-9821382910, Cheque #49281, or UPI Ref"
            />
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div>
            {quotation.is_paid && (
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Save Payment Status
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
