'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Invoice, InvoiceStatus } from '@/types/database';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { CreditCard, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/quotations/calculations';

interface InvoiceStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onStatusUpdated?: (updated: Invoice) => void;
}

export function InvoiceStatusModal({
  isOpen,
  onClose,
  invoice,
  onStatusUpdated,
}: InvoiceStatusModalProps) {
  const router = useRouter();
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status);
  const [paymentMethod, setPaymentMethod] = useState(invoice.payment_method || 'BANK_TRANSFER');
  const [paymentNotes, setPaymentNotes] = useState(invoice.payment_notes || '');

  const hasPriorAdvance = Boolean(
    invoice.advance_payment_notes ||
    (invoice.paid_amount && invoice.paid_amount > 0 && invoice.paid_amount < invoice.grand_total)
  );

  const [advancePaymentNotes, setAdvancePaymentNotes] = useState(
    invoice.advance_payment_notes ||
    (invoice.paid_amount && invoice.paid_amount < invoice.grand_total ? invoice.payment_notes || '' : '')
  );
  const [finalPaymentNotes, setFinalPaymentNotes] = useState(
    invoice.final_payment_notes ||
    (invoice.status === 'PAID' && (invoice.advance_payment_notes || invoice.paid_amount) ? invoice.payment_notes || '' : '')
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    let effectiveAdvRef: string | null = null;
    let effectiveFinalRef: string | null = null;
    let effectiveGeneralRef: string | null = null;

    if (status === 'PAID') {
      if (hasPriorAdvance || advancePaymentNotes.trim()) {
        effectiveAdvRef = advancePaymentNotes.trim() || invoice.advance_payment_notes || null;
        effectiveFinalRef = finalPaymentNotes.trim() || paymentNotes.trim() || null;
        effectiveGeneralRef = effectiveFinalRef || effectiveAdvRef;
      } else {
        effectiveAdvRef = null;
        effectiveFinalRef = finalPaymentNotes.trim() || paymentNotes.trim() || null;
        effectiveGeneralRef = effectiveFinalRef;
      }
    }

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          payment_method: status === 'PAID' ? paymentMethod : null,
          payment_notes: status === 'PAID' ? effectiveGeneralRef : null,
          advance_payment_notes: status === 'PAID' ? effectiveAdvRef : null,
          final_payment_notes: status === 'PAID' ? effectiveFinalRef : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update invoice status');

      if (onStatusUpdated && data.invoice) {
        onStatusUpdated(data.invoice);
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error updating invoice');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Invoice Payment Status">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Invoice Number</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-500">Total Amount</p>
            <p className="text-sm font-black text-slate-900 dark:text-slate-100">
              {formatCurrency(invoice.grand_total, invoice.currency)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Invoice Status
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStatus('PAID')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                status === 'PAID'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Mark Paid</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus('ISSUED')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                status === 'ISSUED'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Issued / Unpaid</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus('CANCELLED')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                status === 'CANCELLED'
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <XCircle className="h-4 w-4 text-rose-600" />
              <span>Cancelled</span>
            </button>
          </div>
        </div>

        {status === 'PAID' && (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="BANK_TRANSFER">Bank Wire / NEFT / RTGS</option>
                <option value="UPI">UPI / Instant Pay</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="CHEQUE">Cheque / Demand Draft</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other Gateway / Wallet</option>
              </select>
            </div>

            {hasPriorAdvance || invoice.advance_payment_notes || advancePaymentNotes ? (
              <div className="space-y-3 pt-1">
                <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-2.5 text-xs text-amber-900 leading-relaxed">
                  <span className="font-bold">Two-Stage Settlement</span>: Save both the advance reference and final settlement reference. They will be formatted under Note on the invoice.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Advance Payment Ref #"
                    value={advancePaymentNotes}
                    onChange={(e) => setAdvancePaymentNotes(e.target.value)}
                    placeholder="e.g. UTR-ADV-001"
                  />
                  <Input
                    label="Final Settlement Ref #"
                    value={finalPaymentNotes}
                    onChange={(e) => {
                      setFinalPaymentNotes(e.target.value);
                      setPaymentNotes(e.target.value);
                    }}
                    placeholder="e.g. UTR-FINAL-002"
                  />
                </div>
              </div>
            ) : (
              <Input
                label="Transaction ID / Payment Ref (Optional)"
                value={paymentNotes || finalPaymentNotes}
                onChange={(e) => {
                  setPaymentNotes(e.target.value);
                  setFinalPaymentNotes(e.target.value);
                }}
                placeholder="e.g. UTR / NEFT / Stripe Ref..."
              />
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            Save Status
          </Button>
        </div>
      </form>
    </Modal>
  );
}
