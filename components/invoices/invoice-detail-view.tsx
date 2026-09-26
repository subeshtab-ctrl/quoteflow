'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Invoice, Organization } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate } from '@/lib/utils';
import { InvoiceStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Printer,
  Download,
  CreditCard,
  Building2,
  Calendar,
  FileText,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  Paperclip,
} from 'lucide-react';
import {
  parseLogoUrl,
  getLogoShapeClass,
  getLogoFitClass,
  getCompanyInitials,
} from '@/lib/utils/logo';
import { getCountryProfile } from '@/lib/tax/country-config';
import { InvoiceStatusModal } from '@/components/invoices/invoice-status-modal';

interface InvoiceDetailViewProps {
  invoice: Invoice;
  currentUserRole?: string;
}

export function InvoiceDetailView({
  invoice: initialInvoice,
  currentUserRole = 'ADMIN',
}: InvoiceDetailViewProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice>(initialInvoice);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const org = invoice.organization;
  const customer = invoice.customer;
  const currency = invoice.currency;
  const countryProfile = getCountryProfile(org?.country || 'IN');

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete invoice ${invoice.invoice_number}?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/invoices');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting invoice');
      setIsDeleting(false);
    }
  };

  const logoConfig = parseLogoUrl(org?.logo_url);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Header Controls (Hidden during print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {invoice.invoice_number}
              </h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Issued {formatDate(invoice.issue_date)} • Due {formatDate(invoice.due_date)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStatusModalOpen(true)}
            className="gap-1.5 text-xs"
          >
            <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
            <span>Update Status</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / PDF</span>
          </Button>

          {currentUserRole !== 'STAFF' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </Button>
          )}
        </div>
      </div>

      {/* Printable Invoice Sheet */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Company Header & Invoice Details */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-1">
              {logoConfig.cleanUrl ? (
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center bg-white border border-slate-200 shadow-xs ring-2 ring-indigo-500/10 overflow-hidden ${getLogoShapeClass(
                    logoConfig.shape
                  )}`}
                >
                  <img
                    src={logoConfig.cleanUrl}
                    alt={org?.name || 'Company Logo'}
                    className={`h-full w-full ${getLogoShapeClass(logoConfig.shape)} ${getLogoFitClass(
                      logoConfig.fit
                    )}`}
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black text-base tracking-wider select-none shadow-xs">
                  {getCompanyInitials(org?.name)}
                </div>
              )}
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {org?.name || 'QuoteFlow Workspace'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {org?.address_line1}, {org?.city} {org?.state} {org?.postal_code}
              <br />
              Email: {org?.email} | Tel: {org?.phone || 'N/A'}
              {org?.gst_vat_number && (
                <>
                  <br />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {countryProfile.taxLabel.split(' ')[0]}: {org?.gst_vat_number}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Tax Invoice
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">{invoice.invoice_number}</h1>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <p>Invoice Date: {formatDate(invoice.issue_date)}</p>
              <p>Due Date: {formatDate(invoice.due_date)}</p>
              {invoice.po_number && <p className="font-semibold">PO #: {invoice.po_number}</p>}
            </div>
          </div>
        </div>

        {/* Bill To Customer & Payment Status Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Billed To
            </span>
            <p className="font-bold text-slate-900 dark:text-slate-100 mt-1 text-sm">
              {customer?.company_name || customer?.name}
            </p>
            {customer?.company_name && customer?.name && (
              <p className="text-slate-600 dark:text-slate-400">Attn: {customer.name}</p>
            )}
            {customer?.billing_address && (
              <p className="text-slate-500 mt-0.5">
                {customer.billing_address}, {customer.city} {customer.state} {customer.postal_code}
              </p>
            )}
            {customer?.tax_number && (
              <p className="text-slate-700 dark:text-slate-300 font-semibold mt-1">
                Tax ID / GST: {customer.tax_number}
              </p>
            )}
          </div>

          <div className="space-y-1 sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Settlement Status
            </span>
            <div>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            {invoice.is_paid && invoice.paid_at && (
              <p className="text-emerald-600 font-semibold mt-1">
                Settled in full on {formatDate(invoice.paid_at)}
                {invoice.payment_method && ` via ${invoice.payment_method}`}
              </p>
            )}
            {invoice.payment_notes && (
              <p className="text-slate-500 text-[11px]">Ref: {invoice.payment_notes}</p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-[10px] text-slate-400 tracking-wider">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Type / Code</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Rate</th>
                <th className="py-2.5 px-3 text-right">Tax</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {(invoice.items || []).map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="py-3 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100 max-w-sm">
                    {item.description}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">
                    {item.classification_code ? (
                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                        {item.classification_type || (item.item_type === 'GOODS' ? 'HSN' : 'SAC')}: {item.classification_code}
                      </span>
                    ) : (
                      <span className="text-slate-400">{item.item_type || 'Item'}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-medium">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 px-3 text-right font-medium">
                    {formatCurrency(item.unit_price, currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-500">
                    {item.tax_rate}%
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(item.line_total, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="space-y-3 max-w-sm">
            {invoice.notes && (
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">
                  Notes
                </span>
                <p className="text-slate-500 mt-0.5 leading-relaxed">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms_conditions && (
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">
                  Payment Terms
                </span>
                <p className="text-slate-500 mt-0.5 whitespace-pre-line leading-relaxed">
                  {invoice.terms_conditions}
                </p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-72 space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(invoice.subtotal, currency)}
              </span>
            </div>

            {Boolean(invoice.discount_amount && invoice.discount_amount > 0) && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount</span>
                <span>-{formatCurrency(invoice.discount_amount || 0, currency)}</span>
              </div>
            )}

            {/* Tax Breakdown */}
            {(invoice.tax_breakdown && invoice.tax_breakdown.length > 0) ? (
              invoice.tax_breakdown.map((tb, i) => (
                <div key={i} className="flex justify-between text-slate-500">
                  <span>{tb.label}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(tb.amount, currency)}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-slate-500">
                <span>Tax Total</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(invoice.tax_amount, currency)}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Total Due</span>
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                {formatCurrency(invoice.grand_total, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* File Attachments (if any) */}
        {invoice.attachments && invoice.attachments.length > 0 && (
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-2 print:hidden">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-indigo-500" />
              <span>Supporting Documents & Attachments ({invoice.attachments.length})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {invoice.attachments.map((file) => (
                <a
                  key={file.id}
                  href={file.url}
                  download={file.name}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {file.name}
                    </span>
                  </div>
                  <Download className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-2" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        {org?.invoice_footer && (
          <div className="pt-8 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400 italic">
            {org.invoice_footer}
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      <InvoiceStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        invoice={invoice}
        onStatusUpdated={(updated) => setInvoice(updated)}
      />
    </div>
  );
}
