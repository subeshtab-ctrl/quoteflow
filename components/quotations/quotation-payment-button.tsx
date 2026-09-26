'use client';

import React, { useState } from 'react';
import { Quotation } from '@/types/database';
import { PaymentModal } from '@/components/quotations/payment-modal';
import { CheckCircle2, CreditCard, Clock } from 'lucide-react';

interface QuotationPaymentButtonProps {
  quotation: Quotation;
  variant?: 'badge' | 'button';
  onUpdated?: (updated: Quotation) => void;
}

export function QuotationPaymentButton({
  quotation,
  variant = 'badge',
  onUpdated,
}: QuotationPaymentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentQuotation, setCurrentQuotation] = useState<Quotation>(quotation);

  React.useEffect(() => {
    setCurrentQuotation(quotation);
  }, [quotation]);

  const isApproved =
    currentQuotation.status === 'APPROVED' ||
    currentQuotation.status === 'PAYMENT_COMPLETED' ||
    currentQuotation.status === 'COMPLETED' ||
    Boolean(currentQuotation.approved_at);

  if (!isApproved) {
    return null;
  }

  const isPaid = Boolean(currentQuotation.is_paid);
  const isPartiallyPaid =
    !isPaid &&
    (currentQuotation.payment_status === 'PARTIALLY_PAID' ||
      (Number(currentQuotation.paid_amount || 0) > 0));
  const advancePct =
    currentQuotation.advance_percentage ||
    (currentQuotation.paid_amount && currentQuotation.grand_total
      ? Math.round((currentQuotation.paid_amount / currentQuotation.grand_total) * 100)
      : null);

  const handlePaymentUpdated = (updated: Quotation) => {
    setCurrentQuotation(updated);
    if (onUpdated) {
      onUpdated(updated);
    }
  };

  return (
    <>
      {variant === 'badge' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all shadow-xs ${
            isPaid
              ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
              : isPartiallyPaid
              ? 'bg-cyan-100/90 text-cyan-800 border border-cyan-300 hover:bg-cyan-200'
              : 'bg-amber-100/90 text-amber-800 border border-amber-300 hover:bg-amber-200'
          }`}
          title={
            isPaid
              ? 'Payment Received (Click to view/edit)'
              : isPartiallyPaid
              ? `Partial Payment (${advancePct || 0}% paid) - Click to update`
              : 'Payment Pending (Click to mark as paid)'
          }
        >
          {isPaid ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>PAID</span>
            </>
          ) : isPartiallyPaid ? (
            <>
              <CreditCard className="h-3 w-3 text-cyan-600" />
              <span>PARTIAL {advancePct ? `(${advancePct}%)` : ''}</span>
            </>
          ) : (
            <>
              <Clock className="h-3 w-3 text-amber-600" />
              <span>UNPAID</span>
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors shadow-sm ${
            isPaid
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800'
              : isPartiallyPaid
              ? 'bg-cyan-50 text-cyan-800 border-cyan-300 hover:bg-cyan-100 hover:text-cyan-900'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800'
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          <span>
            {isPaid
              ? 'Payment Received'
              : isPartiallyPaid
              ? `Update Payment (${advancePct ? `${advancePct}% Paid` : 'Partial'})`
              : 'Record Payment'}
          </span>
        </button>
      )}

      <PaymentModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        quotation={currentQuotation}
        onPaymentUpdated={handlePaymentUpdated}
      />
    </>
  );
}
