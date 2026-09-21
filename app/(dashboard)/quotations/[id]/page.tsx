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
} from 'lucide-react';
import { QuotationActionButtons } from '@/components/quotations/quotation-action-buttons';

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
              <StatusBadge status={quotation.status} />
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
          />
        </div>

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
                This quotation has been officially approved. You can generate a Commercial Tax Invoice or download the PDF below.
              </p>
            )}
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
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">{org?.name}</h3>
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
                  Project Title
                </span>
                <p className="font-bold text-slate-900 mt-1">{quotation.title}</p>
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
                      <td className="py-3 px-4 font-medium text-slate-800">{item.description}</td>
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
                  <span className="font-bold text-slate-900">Grand Total</span>
                  <span className="text-lg font-black text-indigo-700">
                    {grandTotalFormatted}
                  </span>
                </div>
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

          {/* Right Side: Chronological Activity History / Audit Trail */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Audit History</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {quotation.events?.length || 0} events
              </span>
            </div>

            {/* Timeline UI */}
            <div className="space-y-4 pt-1">
              {(quotation.events || []).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No audit records recorded.</p>
              ) : (
                (quotation.events || []).map((evt, idx) => {
                  let badgeColor = 'bg-slate-100 text-slate-600';
                  if (evt.event_type === 'APPROVED') badgeColor = 'bg-emerald-100 text-emerald-800';
                  if (evt.event_type === 'SENT') badgeColor = 'bg-blue-100 text-blue-800';
                  if (evt.event_type === 'VIEWED') badgeColor = 'bg-purple-100 text-purple-800';
                  if (evt.event_type === 'REJECTED') badgeColor = 'bg-rose-100 text-rose-800';

                  return (
                    <div key={evt.id || idx} className="relative pl-6 pb-2 group">
                      {/* Timeline dot & line */}
                      <span className="absolute left-1.5 top-1.5 -ml-px h-full w-0.5 bg-slate-200 group-last:hidden" />
                      <span
                        className={`absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-white shadow-sm ${
                          evt.event_type === 'APPROVED'
                            ? 'bg-emerald-500 ring-2 ring-emerald-200'
                            : evt.event_type === 'REJECTED'
                            ? 'bg-rose-500 ring-2 ring-rose-200'
                            : evt.event_type === 'VIEWED'
                            ? 'bg-purple-500 ring-2 ring-purple-200'
                            : 'bg-indigo-500 ring-2 ring-indigo-200'
                        }`}
                      />

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}
                          >
                            {evt.event_type}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDateTime(evt.created_at)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800">
                          {evt.actor_name || evt.actor_type}
                        </p>
                        {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                          <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg font-mono">
                            {Object.entries(evt.metadata).map(([k, v]) => (
                              <div key={k}>
                                <span className="text-slate-400">{k}:</span> {String(v)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Portal Views Tracking Box */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Customer Views:</span>
                <span className="font-bold text-slate-900">{quotation.view_count || 0}</span>
              </div>
              {quotation.first_viewed_at && (
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>First Opened:</span>
                  <span>{formatDateTime(quotation.first_viewed_at)}</span>
                </div>
              )}
              {quotation.last_viewed_at && (
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Last Opened:</span>
                  <span>{formatDateTime(quotation.last_viewed_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
