'use client';

import React, { useState } from 'react';
import { Invoice } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import {
  X,
  AlertTriangle,
  Ban,
  ShieldAlert,
  Loader2,
  ArrowRight,
  ArrowLeft,
  FileCheck2,
} from 'lucide-react';

interface InvoiceCancelModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedInvoice: Invoice) => void;
  userRole?: string;
}

export function InvoiceCancelModal({
  invoice,
  isOpen,
  onClose,
  onSuccess,
  userRole = 'ADMIN',
}: InvoiceCancelModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [actionType, setActionType] = useState<'CANCEL' | 'VOID'>('CANCEL');
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isStaff = userRole === 'STAFF';
  const trimmedReason = reason.trim();
  const isReasonValid = trimmedReason.length >= 5 && trimmedReason.length <= 500;
  const isConfirmValid = confirmText.trim().toUpperCase() === 'CONFIRM';

  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReasonValid) {
      setErrorMessage('Please provide a valid cancellation reason between 5 and 500 characters.');
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  const handleSubmitCancellation = async () => {
    if (!isConfirmValid) {
      setErrorMessage("Please type 'CONFIRM' to authorize this permanent change.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          reason: trimmedReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel invoice');
      }

      onSuccess(data.invoice);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while cancelling invoice');
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    if (isSubmitting) return;
    setStep(1);
    setReason('');
    setConfirmText('');
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
              <Ban className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Cancel or Void Invoice {invoice.invoice_number}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Step {step} of 2 • Financial Audit Trail Protection
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isStaff ? (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <span>Permission Restricted</span>
            </div>
            <p>
              Staff members cannot cancel or void issued invoices. Please contact an Administrator or Account Owner to cancel this document.
            </p>
            <div className="pt-2">
              <Button size="sm" variant="outline" onClick={handleResetAndClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            {step === 1 ? (
              <form onSubmit={handleProceedToStep2} className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750 text-slate-600 dark:text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    Why can't this invoice be deleted?
                  </p>
                  <p>
                    Under tax regulations and accounting standards, issued invoices cannot be permanently erased once created. You must record a formal reason for voiding or cancellation, which will be logged in the immutable audit trail.
                  </p>
                </div>

                {/* Action Type Selector */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Action Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setActionType('CANCEL')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        actionType === 'CANCEL'
                          ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                        <span>Cancel Invoice</span>
                      </div>
                      <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-1">
                        Order cancelled, duplicated, or client requested stop.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionType('VOID')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        actionType === 'VOID'
                          ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                        <span>Void Document</span>
                      </div>
                      <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-1">
                        Issued in error with incorrect amounts or client info.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Reason Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Cancellation Reason <span className="text-rose-500">*</span>
                    </label>
                    <span
                      className={`text-[11px] ${
                        trimmedReason.length < 5
                          ? 'text-amber-500'
                          : trimmedReason.length > 500
                          ? 'text-rose-500 font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {trimmedReason.length}/500 chars (min 5)
                    </span>
                  </div>
                  <Textarea
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Provide a clear, detailed explanation for cancelling or voiding this invoice..."
                    rows={4}
                    className="text-xs"
                    required
                  />
                </div>

                {errorMessage && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetAndClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!isReasonValid}
                    className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 font-bold"
                  >
                    <span>Proceed to Confirmation</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>
            ) : (
              /* Step 2: Final Confirmation */
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Warning: This action is permanent and irreversible</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    Once marked as <strong>{actionType === 'VOID' ? 'VOIDED' : 'CANCELLED'}</strong>:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                    <li>The status cannot be changed back to Issued or Paid.</li>
                    <li>
                      Your reason <q className="italic font-medium text-slate-800 dark:text-slate-200">"{trimmedReason}"</q> will be indelibly saved with your name and timestamp.
                    </li>
                    <li>All future PDF downloads will render a bold watermark and void header.</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Type <span className="font-mono text-rose-600 dark:text-rose-400">CONFIRM</span> to proceed:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="CONFIRM"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                    autoFocus
                  />
                </div>

                {errorMessage && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStep(1);
                      setConfirmText('');
                      setErrorMessage(null);
                    }}
                    disabled={isSubmitting}
                    className="gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetAndClose}
                      disabled={isSubmitting}
                    >
                      Abort
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={!isConfirmValid || isSubmitting}
                      onClick={handleSubmitCancellation}
                      className="bg-rose-600 hover:bg-rose-700 text-white gap-2 font-bold shadow-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Cancelling...</span>
                        </>
                      ) : (
                        <>
                          <Ban className="h-4 w-4" />
                          <span>Yes, Permanently {actionType === 'VOID' ? 'Void' : 'Cancel'}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
