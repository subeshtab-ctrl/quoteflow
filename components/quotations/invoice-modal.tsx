'use client';

import React from 'react';
import { Quotation, Organization, Customer } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Printer, Download, Receipt, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation;
  organization?: Organization | null;
  customer?: Customer | null;
}

export function InvoiceModal({
  isOpen,
  onClose,
  quotation,
  organization,
  customer,
}: InvoiceModalProps) {
  const invoiceNumber = `INV-${quotation.quotation_number.replace(/^Q-/, '')}`;
  const currency = quotation.currency || 'INR';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.open(`/api/public/pdf?id=${quotation.id}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Tax Invoice - ${invoiceNumber}`}
      description="Official commercial tax invoice generated from approved quotation."
      maxWidth="2xl"
    >
      <div className="space-y-6 print:p-0">
        {/* Printable Invoice Sheet */}
        <div id="invoice-sheet" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 text-slate-800 shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                Commercial Tax Invoice
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                {organization?.name || 'QuoteFlow Organization'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {organization?.address_line1 && `${organization.address_line1}, `}
                {organization?.city && `${organization.city}, `}
                {organization?.state} {organization?.postal_code}
                <br />
                Email: {organization?.email} | Tel: {organization?.phone || 'N/A'}
                {organization?.gst_vat_number && (
                  <>
                    <br />
                    <span className="font-semibold text-slate-700">GSTIN / Tax ID:</span> {organization.gst_vat_number}
                  </>
                )}
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <h3 className="text-xl font-mono font-black text-indigo-700">{invoiceNumber}</h3>
              <p className="text-xs text-slate-500">
                Ref Quotation: <span className="font-bold text-slate-700">{quotation.quotation_number}</span>
              </p>
              <p className="text-xs text-slate-500">
                Invoice Date: <span className="font-semibold text-slate-800">{formatDate(quotation.updated_at || quotation.issue_date)}</span>
              </p>
              <p className="text-xs text-slate-500">
                Due Date: <span className="font-semibold text-slate-800">{formatDate(quotation.valid_until)}</span>
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Approved & Billed</span>
                </span>
              </div>
            </div>
          </div>

          {/* Billed To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50/80 p-4 border border-slate-100 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Billed To (Customer)
              </span>
              <p className="font-bold text-sm text-slate-900 mt-1">
                {customer?.company_name || customer?.name || 'Valued Client'}
              </p>
              {customer?.company_name && customer?.name && (
                <p className="text-slate-600">Attn: {customer.name}</p>
              )}
              <p className="text-slate-500 mt-0.5">
                {customer?.billing_address && `${customer.billing_address}, `}
                {customer?.city && `${customer.city}, `}
                {customer?.state} {customer?.postal_code}
              </p>
              <p className="text-slate-500">Email: {customer?.email} | Tel: {customer?.phone || 'N/A'}</p>
              {customer?.tax_number && (
                <p className="font-semibold text-slate-700 mt-1">
                  Customer Tax ID / GSTIN: {customer.tax_number}
                </p>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Service / Project Title
              </span>
              <p className="font-bold text-sm text-slate-900 mt-1">{quotation.title}</p>
              <div className="mt-2 text-slate-500 space-y-0.5">
                <p>Payment Terms: Net 30 Days</p>
                <p>Mode: Electronic Funds Transfer / UPI</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-center">Tax %</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {(quotation.items || []).map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="py-3 px-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{item.description}</td>
                    <td className="py-3 px-3 text-center text-slate-600">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(item.unit_price, currency)}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-500">
                      {item.tax_rate > 0 ? `${item.tax_rate}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">
                      {formatCurrency(item.line_total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            <div className="w-full sm:w-1/2 space-y-2 text-xs">
              <span className="font-bold text-slate-700">Bank / Remittance Details:</span>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-slate-600 space-y-1 font-mono text-[11px]">
                <p>Bank: HDFC Bank / Axis Bank</p>
                <p>Account Name: {organization?.name}</p>
                <p>Account Number: 50200012345678</p>
                <p>IFSC Code: HDFC0001234</p>
              </div>
              {organization?.invoice_footer && (
                <p className="text-[11px] text-slate-400 italic pt-1">{organization.invoice_footer}</p>
              )}
            </div>

            <div className="w-full sm:w-5/12 space-y-2 text-xs rounded-xl bg-slate-50 p-4 border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(quotation.subtotal, currency)}
                </span>
              </div>
              {quotation.discount_amount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount</span>
                  <span className="font-semibold">
                    -{formatCurrency(quotation.discount_amount, currency)}
                  </span>
                </div>
              )}
              {quotation.tax_amount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({quotation.tax_rate}%)</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(quotation.tax_amount, currency)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900">Total Due</span>
                <span className="text-xl font-black text-indigo-700">
                  {formatCurrency(quotation.grand_total, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex justify-end gap-3 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="h-3.5 w-3.5" />
            <span>Print Invoice</span>
          </Button>
          <Button variant="primary" size="sm" onClick={handleDownloadPdf} className="gap-1.5 text-xs shadow-md">
            <Download className="h-3.5 w-3.5" />
            <span>Download Invoice PDF</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
