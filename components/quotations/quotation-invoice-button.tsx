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

  // Business rule: Invoice is available when marked as PAID for approved or completed quotations
  if (!['APPROVED', 'PAYMENT_COMPLETED', 'COMPLETED'].includes(quotation.status) || !quotation.is_paid) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors text-xs font-semibold shadow-sm"
        title="View & Edit Commercial Tax Invoice"
      >
        <Receipt className="h-3.5 w-3.5 text-emerald-600" />
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
