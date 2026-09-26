import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate, formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Download,
  Share2,
  Edit,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  Clock,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Building2,
  History,
  Paperclip,
  FileText,
} from 'lucide-react';
import {
  parseLogoUrl,
  getLogoShapeClass,
  getLogoFitClass,
  getCompanyInitials,
} from '@/lib/utils/logo';
import { QuotationActionButtons } from '@/components/quotations/quotation-action-buttons';
import { QuotationPaymentButton } from '@/components/quotations/quotation-payment-button';
import { QuotationChatPanel } from '@/components/quotations/quotation-chat-panel';
import { QuotationAuditHistory } from '@/components/quotations/quotation-audit-history';

import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

interface QuotationDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuotationDetailPage({ params }: QuotationDetailPageProps) {
  const { id } = await params;
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
  const quotation = await store.getQuotationById(id, orgId);

  if (!quotation) notFound();

  // Mark customer chat as read ONLY when this quotation is opened from the dashboard
  await store.markQuotationChatRead(id, quotation.organization_id, auth?.fullName || auth?.email || 'Staff');

  const org = quotation.organization;
  const customer = quotation.customer;
  const grandTotalFormatted = formatCurrency(quotation.grand_total, quotation.currency);

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/q/${quotation.public_token}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {quotation.quotation_number}
              </h1>
              {quotation.revision_number > 1 && (
                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                  Revision v{quotation.revision_number}
                </span>
              )}
              <StatusBadge
                status={quotation.status}
                isPaid={quotation.is_paid}
                completedUnpaid={quotation.completed_unpaid}
              />
            </div>
            <p className="text-xs text-slate-500">
              Created on {formatDate(quotation.created_at)} • Valid until {formatDate(quotation.valid_until)}
            </p>
          </div>

          {/* Action Buttons Component */}
          <QuotationActionButtons
            quotationId={quotation.id}
            quotationNumber={quotation.quotation_number}
            status={quotation.status}
            publicToken={quotation.public_token}
            grandTotalFormatted={grandTotalFormatted}
            customerName={customer?.name}
            quotation={quotation}
            organization={org}
            customer={customer}
            currentUserRole={auth?.role || 'STAFF'}
          />
        </div>

        {/* Draft Notice Banner */}
        {quotation.status === 'DRAFT' && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 shadow-sm space-y-1 text-amber-900">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Clock className="h-5 w-5 text-amber-600" />
              <span>Draft Mode • Customer Approval Link Inactive</span>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              This quotation is currently saved as a draft. Customer approval links and online signing are hidden. Click <strong>&ldquo;Save &amp; Generate Approval Link&rdquo;</strong> above to issue this quotation and generate approval links for your client.
            </p>
          </div>
        )}

        {/* Rejection / Approval Banner */}
        {quotation.status === 'APPROVED' && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>Quotation Officially Approved & Ready for Billing</span>
            </div>
            {quotation.signature ? (
              <p className="text-xs text-emerald-700 leading-relaxed">
                Digitally approved and signed by <strong>{quotation.signature.signer_name}</strong> ({quotation.signature.signer_email}) on{' '}
                {formatDateTime(quotation.signature.signed_at)}. Verification hash:{' '}
                <span className="font-mono text-[11px] bg-emerald-100/80 px-1.5 py-0.5 rounded">
                  {quotation.signature.document_hash.substring(0, 24)}...
                </span>
              </p>
            ) : (
              <p className="text-xs text-emerald-700 leading-relaxed">
                This quotation has been officially approved.{' '}
                {quotation.is_paid
                  ? 'Commercial Tax Invoice is generated and available for viewing and printing.'
                  : 'Commercial Tax Invoice will be generated once payment is marked as PAID.'}
              </p>
            )}

            {/* Payment Received or Pending Status Row */}
            <div className="pt-3 border-t border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {quotation.is_paid ? (
                  <>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black tracking-wider uppercase shadow-xs">
                      ✓ PAID
                    </span>
                    <span className="text-xs font-semibold text-emerald-800">
                      Payment received
                      {quotation.paid_at ? ` on ${formatDate(quotation.paid_at)}` : ''}
                      {quotation.payment_method ? ` via ${quotation.payment_method}` : ''}
                      {quotation.payment_notes ? ` (${quotation.payment_notes})` : ''}
                      {' — Tax invoice unlocked.'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold uppercase">
                      Payment Pending (UNPAID)
                    </span>
                    <span className="text-xs text-slate-600">
                      Outstanding balance: {grandTotalFormatted} — <strong className="text-amber-800 font-semibold">Mark as paid to generate invoice</strong>
                    </span>
                  </>
                )}
              </div>
              <QuotationPaymentButton quotation={quotation} variant="button" />
            </div>
          </div>
        )}

        {quotation.status === 'REJECTED' && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <XCircle className="h-5 w-5 text-rose-600" />
              <span>Customer Declined Quotation</span>
            </div>
            <p className="text-xs text-rose-700">
              <strong>Reason:</strong> {quotation.rejection_reason || 'Revisions requested'}
            </p>
            {quotation.rejection_comments && (
              <p className="text-xs text-rose-600 italic bg-white/60 p-3 rounded-lg border border-rose-100">
                &ldquo;{quotation.rejection_comments}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* Two Column Layout: Left Quotation Document (8 cols), Right Audit Log Timeline (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Quotation Sheet */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-2">
                <div className="flex items-center gap-3 mb-1">
                  {(() => {
                    const logoConfig = parseLogoUrl(org?.logo_url);
                    if (logoConfig.cleanUrl) {
                      return (
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center bg-white border border-slate-200 shadow-xs ring-2 ring-indigo-500/10 overflow-hidden ${getLogoShapeClass(
                            logoConfig.shape
                          )}`}
                        >
                          <img
                            src={logoConfig.cleanUrl}
                            alt={org?.name || 'Company Logo'}
                            className={`h-full w-full ${getLogoShapeClass(
                              logoConfig.shape
                            )} ${getLogoFitClass(logoConfig.fit)}`}
                          />
                        </div>
                      );
                    }
                    return (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black text-base tracking-wider select-none shadow-xs">
                        {getCompanyInitials(org?.name)}
                      </div>
                    );
                  })()}
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">{org?.name}</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {org?.address_line1}, {org?.city}, {org?.state} {org?.postal_code}
                  <br />
                  Email: {org?.email} | Tel: {org?.phone || 'N/A'}
                  {org?.gst_vat_number && (
                    <>
                      <br />
                      GST/Tax ID: {org?.gst_vat_number}
                    </>
                  )}
                </p>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Quotation
                </span>
                <h2 className="text-xl font-black text-slate-900">{quotation.quotation_number}</h2>
                <div className="text-xs text-slate-500">
                  <p>Issue Date: {formatDate(quotation.issue_date)}</p>
                  <p>Valid Until: {formatDate(quotation.valid_until)}</p>
                </div>
              </div>
            </div>

            {/* Recipient & Project Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Customer
                </span>
                <p className="font-bold text-slate-900 mt-1">
                  {customer?.company_name || customer?.name}
                </p>
                {customer?.company_name && customer?.name && (
                  <p className="text-slate-600">Attn: {customer.name}</p>
                )}
                <p className="text-slate-500 mt-0.5">
                  {customer?.email} {customer?.phone ? `| ${customer.phone}` : ''}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Project / Scope Title
                </span>
                <p className="font-bold text-slate-900 mt-1">{quotation.title}</p>
                <p className="text-slate-500 mt-1 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                  <span>
                    Validity:{' '}
                    {(() => {
                      if (!quotation.issue_date || !quotation.valid_until) return '14 days';
                      const [sy, sm, sd] = String(quotation.issue_date).split('T')[0].split('-').map(Number);
                      const [ey, em, ed] = String(quotation.valid_until).split('T')[0].split('-').map(Number);
                      const diff = Math.max(
                        0,
                        Math.round((Date.UTC(ey, (em || 1) - 1, ed || 1) - Date.UTC(sy, (sm || 1) - 1, sd || 1)) / (1000 * 60 * 60 * 24))
                      );
                      return `${diff} ${diff === 1 ? 'day' : 'days'} from issuance`;
                    })()}
                  </span>
                </p>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-10 text-center">#</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-center">Tax %</th>
                    <th className="py-3 px-4 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(quotation.items || []).map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="py-3 px-4 text-center text-xs text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{item.description}</p>
                        {item.classification_code && (
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                            <span className="text-slate-400">
                              {item.classification_type || (item.item_type === 'SERVICE' ? 'SAC' : 'HSN')}:
                            </span>{' '}
                            <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.classification_code}
                            </span>
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        {formatCurrency(item.unit_price, quotation.currency)}
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-slate-500">
                        {item.tax_rate > 0 ? `${item.tax_rate}%` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {formatCurrency(item.line_total, quotation.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Attachments Section */}
            {quotation.attachments && quotation.attachments.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-indigo-500" />
                    <span>Quotation Attachments & Documents ({quotation.attachments.length})</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Visible and downloadable on client link</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {quotation.attachments.map((att: any) => (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all text-xs group"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{att.name}</span>
                      </div>
                      <Download className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Totals Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
              <div className="w-full sm:w-1/2 space-y-2 text-xs">
                {quotation.notes && (
                  <div>
                    <span className="font-bold text-slate-700">Notes:</span>
                    <p className="text-slate-500 whitespace-pre-line">{quotation.notes}</p>
                  </div>
                )}
                {quotation.terms_conditions && (
                  <div>
                    <span className="font-bold text-slate-700">Terms & Conditions:</span>
                    <p className="text-slate-500 whitespace-pre-line leading-relaxed">
                      {quotation.terms_conditions}
                    </p>
                  </div>
                )}
              </div>

              <div className="w-full sm:w-5/12 space-y-2 text-xs rounded-xl bg-slate-50 p-4 border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(quotation.subtotal, quotation.currency)}
                  </span>
                </div>
                {quotation.discount_amount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount</span>
                    <span className="font-semibold">
                      -{formatCurrency(quotation.discount_amount, quotation.currency)}
                    </span>
                  </div>
                )}
                {quotation.tax_amount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({quotation.tax_rate}%)</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(quotation.tax_amount, quotation.currency)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-900">Total Value</span>
                  <span className="text-lg font-black text-indigo-700">
                    {grandTotalFormatted}
                  </span>
                </div>
                {Boolean(quotation.paid_amount && quotation.paid_amount > 0) && (
                  <div className="flex justify-between text-emerald-600 font-semibold text-xs pt-1">
                    <span>
                      Amount Paid
                      {quotation.advance_percentage ? ` (${quotation.advance_percentage}% Advance)` : ''}
                    </span>
                    <span>-{formatCurrency(quotation.paid_amount || 0, quotation.currency)}</span>
                  </div>
                )}
                {Boolean(quotation.paid_amount && quotation.balance_amount !== undefined) && (
                  <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 text-xs">
                    <span className="font-bold text-slate-900">Remaining Balance Due</span>
                    <span
                      className={`font-black ${
                        quotation.balance_amount === 0 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {formatCurrency(quotation.balance_amount || 0, quotation.currency)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Verified Digital Signature Box (if approved) */}
            {quotation.status === 'APPROVED' && quotation.signature && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Verified Customer Signature</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <div>
                    <p><strong>Signer:</strong> {quotation.signature.signer_name} ({quotation.signature.signer_email})</p>
                    <p><strong>Timestamp:</strong> {formatDateTime(quotation.signature.signed_at)}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Hash: {quotation.signature.document_hash}
                    </p>
                  </div>
                  <div className="bg-white p-1 rounded border border-emerald-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={quotation.signature.signature_data_url}
                      alt="Signature"
                      className="h-10 w-auto max-w-[150px] object-contain"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Customer Chat & Collapsible Audit History Button */}
          <div className="lg:col-span-4 space-y-6">
            <QuotationChatPanel
              quotationId={quotation.id}
              quotationNumber={quotation.quotation_number}
              customerName={customer?.name}
            />

            <QuotationAuditHistory
              events={quotation.events || []}
              viewCount={quotation.view_count || 0}
              firstViewedAt={quotation.first_viewed_at}
              lastViewedAt={quotation.last_viewed_at}
              currentUserRole={auth?.role || 'OWNER'}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
