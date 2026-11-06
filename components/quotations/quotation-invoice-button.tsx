'use client';

import React, { useState } from 'react';
import { Quotation, Organization, Customer } from '@/types/database';
import { InvoiceModal } from '@/components/quotations/invoice-modal';
import { Receipt } from 'lucide-react';

interface QuotationInvoiceButtonProps {
  quotation: Quotation;
  organization?: Organization | null;
  customer?: Customer | null;
}

export function QuotationInvoiceButton({
  quotation,
  organization,
  customer,
}: QuotationInvoiceButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Business rule: Invoices can be issued/viewed for APPROVED, IN_PROGRESS, PAYMENT_COMPLETED, or COMPLETED quotations
  // even if partially paid or completed unpaid, so the business can bill the client and collect remaining balances.
  if (!['APPROVED', 'PAYMENT_COMPLETED', 'COMPLETED', 'IN_PROGRESS'].includes(quotation.status)) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 hover:text-indigo-800 transition-colors text-xs font-semibold shadow-xs"
        title={quotation.has_issued_invoice ? 'View & Edit Commercial Tax Invoice' : 'Issue Commercial Tax Invoice'}
      >
        <Receipt className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
        <span className="hidden sm:inline">
          {quotation.has_issued_invoice ? 'Invoice' : 'Issue Invoice'}
        </span>
      </button>

      <InvoiceModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        quotation={quotation}
        organization={organization}
        customer={customer}
        onInvoiceIssued={(inv) => {
          quotation.has_issued_invoice = true;
          quotation.issued_invoice_id = inv.id;
          quotation.invoice_number = inv.invoice_number;
        }}
      />
    </>
  );
}
