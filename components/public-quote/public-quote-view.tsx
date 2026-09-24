'use client';

import React, { useState } from 'react';
import { Quotation } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate, formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApprovalModal } from '@/components/public-quote/approval-modal';
import { RejectionModal } from '@/components/public-quote/rejection-modal';
import {
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import {
  parseLogoUrl,
  getLogoShapeClass,
  getLogoFitClass,
  getCompanyInitials,
} from '@/lib/utils/logo';

interface PublicQuoteViewProps {
  initialQuotation: Quotation;
  token: string;
}

export function PublicQuoteView({ initialQuotation, token }: PublicQuoteViewProps) {
  const [quotation, setQuotation] = useState<Quotation>(initialQuotation);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isRejectionOpen, setIsRejectionOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const org = quotation.organization;
  const customer = quotation.customer;
  const grandTotalFormatted = formatCurrency(quotation.grand_total, quotation.currency);

  const isExpired =
    new Date(quotation.valid_until).getTime() < new Date().setHours(0, 0, 0, 0) &&
    quotation.status !== 'APPROVED';

  const canTakeAction =
    !isExpired &&
    !quotation.is_token_revoked &&
    quotation.status !== 'APPROVED' &&
    quotation.status !== 'CANCELLED' &&
    quotation.status !== 'DRAFT';

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const res = await fetch(`/api/public/pdf?token=${encodeURIComponent(token)}`);
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quotation-${quotation.quotation_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('PDF error:', err);
      alert('Could not download PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleApproved = (updatedQuote?: Quotation) => {
    if (updatedQuote) {
      setQuotation(updatedQuote);
    } else {
      setQuotation((prev) => ({ ...prev, status: 'APPROVED' }));
    }
    refreshQuotationData();
  };

  const refreshQuotationData = async () => {
    try {
      const res = await fetch(`/api/public/quote?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.quotation) {
          setQuotation(data.quotation);
        }
      }
    } catch {
      // Fallback local status update
      setQuotation((prev) => ({ ...prev, status: 'APPROVED' }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16 pt-4 sm:pt-8 px-3 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Sticky Action Banner for Mobile & Desktop */}
        <div className="sticky top-4 z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 p-3.5 sm:p-4 shadow-lg backdrop-blur-md border border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
            <StatusBadge status={quotation.status} />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              isLoading={isDownloadingPdf}
              className="gap-1.5 shadow-sm"
            >
              <Download className="h-4 w-4 text-slate-600" />
              <span className="hidden sm:inline">Download</span> PDF
            </Button>

            {canTakeAction && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRejectionOpen(true)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                >
                  <XCircle className="h-4 w-4 mr-1 text-rose-500" />
                  Decline
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setIsApprovalOpen(true)}
                  className="gap-1.5 shadow-md hover:shadow-lg font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve & Sign
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status Alerts */}
        {quotation.status === 'DRAFT' && (
          <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-900 shadow-sm">
            <Clock className="h-6 w-6 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Draft Preview Mode</h4>
              <p className="text-xs text-amber-700">
                This quotation is currently saved in draft mode and has not yet been finalized or issued for customer approval. Customer sign-off is disabled.
              </p>
            </div>
          </div>
        )}

        {quotation.status === 'APPROVED' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base">Quotation Approved & Signed</h4>
                <p className="text-xs sm:text-sm text-emerald-700">
                  {quotation.signature
                    ? `Signed by ${quotation.signature.signer_name} on ${formatDateTime(quotation.signature.signed_at)}.`
                    : 'This quotation has been officially approved.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-900 shadow-sm">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Quotation Expired</h4>
              <p className="text-xs text-amber-700">
                This quotation expired on {formatDate(quotation.valid_until)}. Please contact {org?.name || 'the business'} for a revised estimate.
              </p>
            </div>
          </div>
        )}

        {quotation.status === 'REJECTED' && (
          <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-900 shadow-sm">
            <XCircle className="h-6 w-6 text-rose-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Quotation Declined</h4>
              <p className="text-xs text-rose-700">
                Reason: {quotation.rejection_reason || 'Changes requested'}
                {quotation.rejection_comments && ` - "${quotation.rejection_comments}"`}
              </p>
            </div>
          </div>
        )}

        {/* Main Quotation Document Sheet */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xl space-y-8">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-3">
                {(() => {
                  const logoConfig = parseLogoUrl(org?.logo_url);
                  if (logoConfig.cleanUrl) {
                    return (
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center bg-white border border-slate-200/80 shadow-xs ring-2 ring-indigo-500/10 overflow-hidden ${getLogoShapeClass(
                            logoConfig.shape
                          )}`}
                        >
                          <img
                            src={logoConfig.cleanUrl}
                            alt={org?.name || 'Company'}
                            className={`h-full w-full ${getLogoShapeClass(
                              logoConfig.shape
                            )} ${getLogoFitClass(logoConfig.fit)}`}
                          />
                        </div>
                        <span className="text-xl font-black text-slate-900 tracking-tight">
                          {org?.name || 'QuoteFlow'}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-2.5">
                      <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-200 text-sm tracking-wider select-none">
                        {getCompanyInitials(org?.name)}
                      </div>
                      <span className="text-xl font-black text-slate-900 tracking-tight">
                        {org?.name || 'QuoteFlow'}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                {org?.address_line1 && `${org.address_line1}, `}
                {org?.city && `${org.city}, `}
                {org?.state} {org?.postal_code}
                <br />
                {org?.email} {org?.phone ? `• ${org.phone}` : ''}
                {org?.gst_vat_number && (
                  <>
                    <br />
                    <span className="font-medium text-slate-600">GST / Tax ID: {org.gst_vat_number}</span>
                  </>
                )}
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                Official Estimate
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {quotation.quotation_number}
              </h2>
              <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                <p>
                  <span className="font-medium text-slate-600">Issue Date:</span>{' '}
                  {formatDate(quotation.issue_date)}
                </p>
                <p>
                  <span className="font-medium text-slate-600">Valid Until:</span>{' '}
                  {formatDate(quotation.valid_until)}
                </p>
              </div>
            </div>
          </div>

          {/* Quotation Subject & Prepared For */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/80 rounded-xl p-5 border border-slate-100">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Quotation For
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {customer?.company_name || customer?.name || 'Valued Client'}
              </h3>
              {customer?.company_name && customer?.name && (
                <p className="text-xs text-slate-600 font-medium">Attn: {customer.name}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {customer?.billing_address && `${customer.billing_address}, `}
                {customer?.city} {customer?.state} {customer?.postal_code}
                <br />
                Email: {customer?.email} {customer?.phone ? `| Tel: ${customer.phone}` : ''}
                {customer?.tax_number && (
                  <>
                    <br />
                    Tax ID: {customer.tax_number}
                  </>
                )}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Project / Scope Title
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">{quotation.title}</h3>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                <span>Validity: 30 days from issuance</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-center">Tax</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(quotation.items || []).map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-center text-xs text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{item.description}</p>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600">
                      {item.quantity} <span className="text-xs text-slate-400">{item.unit}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-700">
                      {formatCurrency(item.unit_price, quotation.currency)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs text-slate-500 font-medium">
                      {item.tax_rate > 0 ? `${item.tax_rate}%` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                      {formatCurrency(item.line_total, quotation.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            <div className="w-full sm:w-1/2 space-y-3">
              {quotation.notes && (
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Notes & Specifications
                  </h4>
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                    {quotation.notes}
                  </p>
                </div>
              )}

              {quotation.terms_conditions && (
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Terms & Conditions
                  </h4>
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                    {quotation.terms_conditions}
                  </p>
                </div>
              )}
            </div>

            <div className="w-full sm:w-5/12 space-y-2.5 rounded-xl bg-slate-50/70 p-5 border border-slate-200">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(quotation.subtotal, quotation.currency)}
                </span>
              </div>

              {quotation.discount_amount > 0 && (
                <div className="flex justify-between text-xs text-rose-600">
                  <span>
                    Discount ({quotation.discount_type === 'PERCENTAGE' ? `${quotation.discount_value}%` : 'Fixed'})
                  </span>
                  <span className="font-semibold">
                    -{formatCurrency(quotation.discount_amount, quotation.currency)}
                  </span>
                </div>
              )}

              {quotation.tax_amount > 0 && (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Taxes & Levies ({quotation.tax_rate}%)</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(quotation.tax_amount, quotation.currency)}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900">Grand Total</span>
                <span className="text-xl font-extrabold text-indigo-700">
                  {grandTotalFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Electronic Signature Audit Seal (When Approved) */}
          {quotation.status === 'APPROVED' && (
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-6 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <span>Legally Binding Electronic Signature Seal</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
                <div>
                  <p><span className="text-slate-500">Signer Name:</span> <strong>{quotation.signature?.signer_name || 'Authorized Approver'}</strong></p>
                  <p><span className="text-slate-500">Signer Email:</span> {quotation.signature?.signer_email || customer?.email || 'Registered Contact'}</p>
                  {quotation.signature?.signer_company && (
                    <p><span className="text-slate-500">Company:</span> {quotation.signature.signer_company}</p>
                  )}
                  <p><span className="text-slate-500">Signed At:</span> {formatDateTime(quotation.signature?.signed_at || quotation.approved_at || quotation.updated_at)}</p>
                  {quotation.approved_document_hash && (
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      Document SHA-256: {quotation.approved_document_hash.substring(0, 32)}...
                    </p>
                  )}
                </div>

                {quotation.signature?.signature_data_url && (
                  <div className="flex flex-col items-center sm:items-end justify-center">
                    <span className="text-[11px] text-slate-400 mb-1">Signature Image</span>
                    <div className="rounded-lg bg-white p-2 border border-emerald-200 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={quotation.signature.signature_data_url}
                        alt="Customer Signature"
                        className="h-12 w-auto max-w-[200px] object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            <p className="font-medium">
              {(() => {
                const companyName = org?.name || 'our company';
                if (!org?.invoice_footer) {
                  return `Thank you for partnering with ${companyName}.`;
                }
                return org.invoice_footer.replace(/The Mining Future/gi, companyName);
              })()}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Powered by QuoteFlow Digital Approval Platform
            </p>
          </div>
        </div>

        {/* Bottom CTA for Mobile */}
        {canTakeAction && (
          <div className="rounded-2xl bg-indigo-600 p-6 text-white text-center shadow-xl space-y-4">
            <h3 className="text-lg font-bold">Ready to approve this quotation?</h3>
            <p className="text-xs sm:text-sm text-indigo-100 max-w-md mx-auto">
              You can digitally sign with touch or mouse. No account creation or login required.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => setIsRejectionOpen(true)}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Request Changes
              </Button>
              <Button
                variant="success"
                onClick={() => setIsApprovalOpen(true)}
                className="font-bold text-sm px-6 shadow-lg"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Sign & Approve Quotation
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ApprovalModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        quotationNumber={quotation.quotation_number}
        grandTotalFormatted={grandTotalFormatted}
        token={token}
        customerName={customer?.name}
        customerEmail={customer?.email}
        customerCompany={customer?.company_name}
        onApproved={handleApproved}
      />

      <RejectionModal
        isOpen={isRejectionOpen}
        onClose={() => setIsRejectionOpen(false)}
        quotationNumber={quotation.quotation_number}
        token={token}
        onRejected={refreshQuotationData}
      />
    </div>
  );
}
