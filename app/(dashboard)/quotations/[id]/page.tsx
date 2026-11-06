import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { formatCurrency, harmonizePaymentTerms, harmonizeTermsAndConditions } from '@/lib/quotations/calculations';
import { getEffectiveDocumentLanguage, getLocalizedTerm } from '@/lib/tax/gcc-translations';
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
  CreditCard,
  Landmark,
  QrCode,
  Bitcoin,
  Banknote,
  Link as LinkIcon,
  AlertTriangle,
} from 'lucide-react';
import { checkQuotationInProgressOverdue } from '@/lib/quotations/timeline';
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
import { QuotationFlowChart } from '@/components/quotations/quotation-flow-chart';

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

  // Cross-environment guard: in test mode, only show test quotations
  const organization = await store.getOrganization(orgId);
  const activeEnv = organization?.mode === 'test' ? 'test' : 'live';
  if (activeEnv === 'test' && quotation.environment !== 'test') {
    notFound();
  }

  // Mark customer chat as read ONLY when this quotation is opened from the dashboard
  try {
    await store.markQuotationChatRead(id, quotation.organization_id, auth?.fullName || auth?.email || 'Staff');
  } catch (chatErr) {
    console.error('Failed to mark quotation chat as read:', chatErr);
  }

  const org = quotation.organization;
  const docLang = getEffectiveDocumentLanguage(org);
  const customer = quotation.customer;
  const grandTotalFormatted = formatCurrency(quotation.grand_total, quotation.currency);

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/q/${quotation.public_token}`;

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-4">
        {/* Top Header & Toolbar (Apple-Style Minimal & Compact) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/90 dark:border-slate-800">
          <div className="space-y-0.5 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                {quotation.quotation_number}
              </h1>
              {(quotation.revision_number > 1 || quotation.quotation_number.includes('-REV')) && (
                <span className="rounded-md bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
                  {quotation.quotation_number.match(/[-_](REV|rev)[-_]?(\d+)/i)?.[0]?.replace(/^[-_]/, '') || `REV ${quotation.revision_number - 1}`}
                </span>
              )}
              <StatusBadge
                status={quotation.status}
                isPaid={quotation.is_paid}
                completedUnpaid={quotation.completed_unpaid}
                paymentStatus={quotation.payment_status}
                paidAmount={quotation.paid_amount}
                quotation={quotation}
                className="text-[10.5px] px-2 py-0.5"
              />
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
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

        {/* Visual Lifecycle Flow Chart */}
        <QuotationFlowChart quotation={quotation} />

        {/* Draft Notice Banner (Compact) */}
        {quotation.status === 'DRAFT' && (
          <div className="rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3 shadow-2xs space-y-0.5 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Draft Mode • Customer Approval Link Inactive</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
              This quotation is currently saved as a draft. Customer approval links and online signing are hidden. Click <strong>&ldquo;Save &amp; Generate Approval Link&rdquo;</strong> above to issue this quotation and generate approval links for your client.
            </p>
          </div>
        )}

        {/* Compact Overdue / In Progress Warning Bar */}
        {quotation.status === 'IN_PROGRESS' && (() => {
          const overdueStatus = checkQuotationInProgressOverdue(quotation);
          return overdueStatus.isOverdue ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-gradient-to-r from-rose-50/90 via-amber-50/60 to-white dark:from-rose-950/40 dark:via-slate-900 dark:to-slate-900 shadow-2xs text-xs">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 shrink-0 border border-rose-200 dark:border-rose-800">
                  <AlertTriangle className="h-4 w-4 animate-pulse" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 dark:text-white">Work In Progress</span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-extrabold text-[10px] border border-rose-300 dark:border-rose-800">
                    <span>Timeline Overdue</span>
                    <span>({overdueStatus.overdueText})</span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Target delivery timeline has passed. (Client portal safely displays normal in-progress status).
                  </span>
                </div>
              </div>

              {quotation.estimated_completion_date && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shrink-0 text-[11px] self-end sm:self-auto font-medium">
                  <Calendar className="h-3.5 w-3.5 text-rose-600" />
                  <span className="text-slate-400">Target:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatDate(quotation.estimated_completion_date)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border border-sky-200/90 dark:border-sky-900/60 bg-gradient-to-r from-sky-50/90 via-indigo-50/40 to-white dark:from-slate-900 dark:to-slate-850 shadow-2xs text-xs">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400 shrink-0 border border-sky-200 dark:border-sky-800">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 dark:text-white">Work In Progress</span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 font-bold text-[10px] border border-sky-300 dark:border-sky-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-ping" />
                    {quotation.estimated_days === 0
                      ? 'Same Day (Today)'
                      : typeof quotation.estimated_days === 'number'
                      ? `${quotation.estimated_days} Days Scheduled`
                      : 'Active Timeline'}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {quotation.estimated_days === 0
                      ? `Target completion is scheduled for Today${quotation.estimated_time_text ? ` (${quotation.estimated_time_text})` : ''}.`
                      : quotation.estimated_completion_date
                      ? `Target delivery date: ${formatDate(quotation.estimated_completion_date)}.`
                      : 'Execution actively underway.'}
                  </span>
                </div>
              </div>

              {quotation.estimated_completion_date && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shrink-0 text-[11px] self-end sm:self-auto font-medium">
                  <Calendar className="h-3.5 w-3.5 text-sky-600" />
                  <span className="text-slate-400">Target:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatDate(quotation.estimated_completion_date)}
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Work Completed Banner (Compact) */}
        {quotation.status === 'COMPLETED' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border border-emerald-200/90 dark:border-emerald-900/60 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-white dark:from-slate-900 dark:to-slate-850 shadow-2xs text-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shrink-0 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 dark:text-white">
                  Work Completed • Deliverables Finished
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                  quotation.is_paid 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' 
                    : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                }`}>
                  {quotation.is_paid ? '✓ Fully Settled' : 'Payment Due from Client'}
                </span>
              </div>
            </div>

            {quotation.completed_at && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 self-end sm:self-auto font-medium">
                Completed on {formatDate(quotation.completed_at)}
              </div>
            )}
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
                  {quotation.signature.document_hash ? `${quotation.signature.document_hash.substring(0, 24)}...` : 'Verified'}
                </span>
              </p>
            ) : (
              <p className="text-xs text-emerald-700 leading-relaxed">
                This quotation has been officially approved.{' '}
                {quotation.is_paid
                  ? 'Commercial Tax Invoice is generated and available for viewing and printing.'
                  : (quotation.payment_status === 'PARTIALLY_PAID' || (quotation.paid_amount && quotation.paid_amount > 0))
                  ? 'Advance payment has been logged. Commercial Tax Invoice will be unlocked upon full payment settlement.'
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
                ) : (quotation.payment_status === 'PARTIALLY_PAID' || (quotation.paid_amount && quotation.paid_amount > 0)) ? (
                  <>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300 text-[10px] font-black tracking-wider uppercase shadow-xs">
                      ⚡ PARTIALLY PAID ({quotation.advance_percentage || Math.round(((quotation.paid_amount || 0) / quotation.grand_total) * 100)}%)
                    </span>
                    <span className="text-xs font-semibold text-cyan-950">
                      Paid: {formatCurrency(quotation.paid_amount || 0, quotation.currency)}
                      {' • '}
                      Remaining balance: <strong className="text-amber-800">{formatCurrency(quotation.balance_amount !== undefined ? quotation.balance_amount : (quotation.grand_total - (quotation.paid_amount || 0)), quotation.currency)}</strong>
                      {quotation.paid_at ? ` on ${formatDate(quotation.paid_at)}` : ''}
                      {quotation.payment_method ? ` via ${quotation.payment_method}` : ''}
                      {quotation.payment_notes ? ` (${quotation.payment_notes})` : ''}
                      {quotation.payment_confirmed_by_company ? ' — ✓ Confirmed' : ' — Awaiting Verification'}
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
          <div
            id="quotation-sheet"
            dir={docLang === 'ar' ? 'rtl' : 'ltr'}
            className="lg:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-8 printable-document-sheet"
          >
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
                      {getLocalizedTerm('trn_tax_id', docLang)}: {org?.gst_vat_number}
                    </>
                  )}
                </p>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  {getLocalizedTerm('quotation', docLang)}
                </span>
                <h2 className="text-xl font-black text-slate-900">{quotation.quotation_number}</h2>
                <div className="text-xs text-slate-500">
                  <p>{getLocalizedTerm('issue_date', docLang)}: {formatDate(quotation.issue_date)}</p>
                  <p>{getLocalizedTerm('valid_until', docLang)}: {formatDate(quotation.valid_until)}</p>
                </div>
              </div>
            </div>

            {/* Recipient & Project Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {getLocalizedTerm('quoted_to', docLang, 'Customer')}
                </span>
                <p className="font-bold text-slate-900 mt-1">
                  {customer?.company_name || customer?.name}
                </p>
                {customer?.company_name && customer?.name && (
                  <p className="text-slate-600">{getLocalizedTerm('attn', docLang)}: {customer.name}</p>
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
                    <th className="py-3 px-4 w-10 text-center">{getLocalizedTerm('hash', docLang)}</th>
                    <th className="py-3 px-4">{getLocalizedTerm('item_description', docLang, 'Description')}</th>
                    <th className="py-3 px-4 text-center">{getLocalizedTerm('quantity', docLang)}</th>
                    <th className="py-3 px-4 text-right">{getLocalizedTerm('rate', docLang, 'Unit Price')}</th>
                    <th className="py-3 px-4 text-center">{getLocalizedTerm('tax', docLang)} %</th>
                    <th className="py-3 px-4 text-right">{getLocalizedTerm('total', docLang, 'Line Total')}</th>
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
                      {harmonizeTermsAndConditions(quotation.advance_percentage, quotation.terms_conditions)}
                    </p>
                  </div>
                )}
                {(() => {
                  const isIndia = Boolean(
                    (quotation.organization?.business_country || org?.business_country || '').toUpperCase() === 'IN' ||
                    (quotation.organization?.country || org?.country || '').toLowerCase() === 'india' ||
                    (quotation.organization?.country || org?.country || '').toUpperCase() === 'IN' ||
                    quotation.organization?.billing_region === 'INDIA' ||
                    org?.billing_region === 'INDIA' ||
                    quotation.currency === 'INR' ||
                    org?.default_currency === 'INR'
                  );

                  const bankInfo = quotation.bank_details || org?.default_bank_details;
                  const upiInfo = quotation.upi_details || org?.default_upi_details;
                  const cryptoInfo = quotation.crypto_details || org?.default_crypto_details;
                  const paymentLinkUrl = quotation.payment_link || org?.default_payment_link;
                  const paymentLinkLabel = quotation.payment_link_label || org?.default_payment_link_label || 'Pay Online';
                  let showPaymentLink = quotation.show_payment_link ?? org?.default_show_payment_link ?? Boolean(paymentLinkUrl);

                  const mode = quotation.payment_display_mode || org?.default_payment_display_mode || 'BOTH';
                  let showBank = quotation.show_bank_details ?? org?.default_show_bank_details ?? true;
                  let showUpi = quotation.show_upi_details ?? org?.default_show_upi_details ?? true;
                  let showCash = quotation.show_cash_details ?? org?.default_show_cash_details ?? true;
                  let showCrypto = quotation.show_crypto_details ?? org?.default_show_crypto_details ?? false;
                  const cashInstructions = quotation.cash_instructions || org?.default_cash_instructions;

                  if (mode === 'CRYPTO_ONLY') {
                    showBank = false;
                    showUpi = false;
                    showCash = false;
                    showCrypto = true;
                    showPaymentLink = false;
                  } else if (mode === 'BANK_ONLY') {
                    showBank = true;
                    showUpi = false;
                    showCash = false;
                    showCrypto = false;
                    showPaymentLink = false;
                  } else if (mode === 'UPI_ONLY') {
                    showBank = false;
                    showUpi = true;
                    showCash = false;
                    showCrypto = false;
                    showPaymentLink = false;
                  } else if (mode === 'PAYMENT_LINK_ONLY') {
                    showBank = false;
                    showUpi = false;
                    showCash = false;
                    showCrypto = false;
                    showPaymentLink = true;
                  } else if (mode === 'ALL') {
                    showBank = true;
                    showUpi = true;
                    showCash = true;
                    showCrypto = true;
                    showPaymentLink = true;
                  }

                  // Country enforcement:
                  if (!isIndia) {
                    showUpi = false;
                  }
                  if (isIndia) {
                    showPaymentLink = false;
                  }

                  const hasPaymentInfo =
                    Boolean(quotation.payment_terms_instructions) ||
                    (quotation.advance_percentage !== undefined && quotation.advance_percentage !== null) ||
                    Boolean(quotation.accepted_payment_methods && quotation.accepted_payment_methods.length > 0) ||
                    Boolean(showBank && (bankInfo?.bank_name || bankInfo?.account_number)) ||
                    Boolean(showUpi && (upiInfo?.upi_id || upiInfo?.qr_code_url)) ||
                    Boolean(!isIndia && showPaymentLink && paymentLinkUrl) ||
                    Boolean(showCash && cashInstructions) ||
                    Boolean(showCrypto && (cryptoInfo?.wallet_address || cryptoInfo?.qr_code_url));

                  if (!hasPaymentInfo) return null;

                  return (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 mt-2">
                      <div className="flex justify-between items-center text-slate-800 font-bold border-b border-slate-200/60 pb-2">
                        <span className="flex items-center gap-1.5 text-xs">
                          <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Payment Details & Instructions</span>
                        </span>
                        {quotation.advance_percentage !== undefined && quotation.advance_percentage !== null && quotation.advance_percentage > 0 && (
                          <span className="text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {quotation.advance_percentage}% Advance
                          </span>
                        )}
                      </div>

                      {/* Bank Details */}
                      {showBank && (bankInfo?.bank_name || bankInfo?.account_number) && (
                        <div className="rounded-lg bg-white p-3 border border-indigo-100 space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <Landmark className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Bank Remittance</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                            {bankInfo.bank_name && <div><span className="text-slate-400">Bank:</span> {bankInfo.bank_name}</div>}
                            {bankInfo.account_name && <div><span className="text-slate-400">Account:</span> {bankInfo.account_name}</div>}
                            {bankInfo.account_number && <div><span className="text-slate-400">A/C No / IBAN:</span> <span className="font-mono font-bold text-slate-800">{bankInfo.account_number}</span></div>}
                            {bankInfo.ifsc_code && <div><span className="text-slate-400">IFSC:</span> <span className="font-mono font-bold text-slate-800">{bankInfo.ifsc_code}</span></div>}
                            {bankInfo.swift_code && <div><span className="text-slate-400">SWIFT:</span> <span className="font-mono font-bold text-slate-800">{bankInfo.swift_code}</span></div>}
                            {bankInfo.branch_name && <div><span className="text-slate-400">Branch:</span> {bankInfo.branch_name}</div>}
                          </div>
                        </div>
                      )}

                      {/* Online Payment Link (International) */}
                      {!isIndia && showPaymentLink && paymentLinkUrl && (
                        <div className="rounded-lg bg-white p-3 border border-blue-100 flex items-center justify-between text-xs">
                          <div className="space-y-1 max-w-[70%]">
                            <div className="flex items-center gap-1.5 font-bold text-blue-900">
                              <LinkIcon className="h-3.5 w-3.5 text-blue-600" />
                              <span>Online Payment Link ({paymentLinkLabel || 'Checkout'})</span>
                            </div>
                            <p className="font-mono text-[11px] text-slate-700 truncate">{paymentLinkUrl}</p>
                          </div>
                          <a
                            href={paymentLinkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 shrink-0"
                          >
                            <span>Open Link</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      {/* UPI Details & QR (India Only) */}
                      {showUpi && isIndia && (upiInfo?.upi_id || upiInfo?.qr_code_url) && (
                        <div className="rounded-lg bg-white p-3 border border-emerald-100 flex items-center justify-between text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                              <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                              <span>UPI Payment</span>
                            </div>
                            {upiInfo.upi_id && (
                              <p className="font-mono text-emerald-800 font-bold text-xs">{upiInfo.upi_id}</p>
                            )}
                            {upiInfo.payee_name && (
                              <p className="text-[11px] text-slate-500">{upiInfo.payee_name}</p>
                            )}
                          </div>
                          {(() => {
                            const upiQrSrc = upiInfo.qr_code_url || (
                              upiInfo.upi_id
                                ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${upiInfo.upi_id}&pn=${encodeURIComponent(upiInfo.payee_name || quotation.organization?.name || 'SUBESH M LLC')}&cu=INR`)}`
                                : ''
                            );
                            return upiQrSrc ? (
                              <img
                                src={upiQrSrc}
                                alt="UPI QR"
                                className="h-14 w-14 object-contain rounded border border-slate-200 bg-white p-0.5"
                              />
                            ) : null;
                          })()}
                        </div>
                      )}

                      {/* Crypto Details & QR */}
                      {showCrypto && (cryptoInfo?.wallet_address || cryptoInfo?.qr_code_url) && (
                        <div className="rounded-lg bg-white p-3 border border-amber-100 flex items-center justify-between text-xs">
                          <div className="space-y-1 max-w-[70%]">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900">
                              <Bitcoin className="h-3.5 w-3.5 text-amber-600" />
                              <span>Crypto Settlement ({cryptoInfo.currency || 'USDT'} - {cryptoInfo.network || 'TRC20'})</span>
                            </div>
                            {cryptoInfo.wallet_address && (
                              <p className="font-mono text-[10px] text-slate-700 truncate">{cryptoInfo.wallet_address}</p>
                            )}
                          </div>
                          {(() => {
                            const cryptoQrSrc = cryptoInfo.qr_code_url || (
                              cryptoInfo.wallet_address
                                ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(cryptoInfo.wallet_address)}`
                                : ''
                            );
                            return cryptoQrSrc ? (
                              <img
                                src={cryptoQrSrc}
                                alt="Crypto QR"
                                className="h-14 w-14 object-contain rounded border border-slate-200 bg-white p-0.5"
                              />
                            ) : null;
                          })()}
                        </div>
                      )}

                      {/* Cash Payment / Counter Handover */}
                      {showCash && cashInstructions && (
                        <div className="rounded-lg bg-white p-3 border border-amber-100 flex items-center justify-between text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900">
                              <Banknote className="h-3.5 w-3.5 text-amber-600" />
                              <span>Cash Payment / Counter Handover</span>
                            </div>
                            <p className="text-[11px] text-slate-700 font-medium">{cashInstructions}</p>
                          </div>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            Cash Accepted
                          </span>
                        </div>
                      )}

                      {quotation.payment_terms_instructions && (
                        <p className="text-[11px] text-slate-600 italic whitespace-pre-line leading-relaxed">
                          {harmonizePaymentTerms(quotation.advance_percentage, quotation.payment_terms_instructions)}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="w-full sm:w-5/12 space-y-2 text-xs rounded-xl bg-slate-50 p-4 border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>{getLocalizedTerm('subtotal', docLang)}</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(quotation.subtotal, quotation.currency)}
                  </span>
                </div>
                {quotation.discount_amount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>{getLocalizedTerm('discount', docLang)}</span>
                    <span className="font-semibold">
                      -{formatCurrency(quotation.discount_amount, quotation.currency)}
                    </span>
                  </div>
                )}
                {quotation.tax_amount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>{getLocalizedTerm('tax_amount', docLang, 'Tax')} ({quotation.tax_rate}%)</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(quotation.tax_amount, quotation.currency)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-900">{getLocalizedTerm('grand_total', docLang, 'Total Value')}</span>
                  <span className="text-lg font-black text-indigo-700">
                    {grandTotalFormatted}
                  </span>
                </div>
                {Boolean(quotation.paid_amount && quotation.paid_amount > 0) && (
                  <div className="flex justify-between text-emerald-600 font-semibold text-xs pt-1">
                    <span>
                      {getLocalizedTerm('paid_amount', docLang)}
                      {quotation.advance_percentage ? ` (${quotation.advance_percentage}% Advance)` : ''}
                    </span>
                    <span>-{formatCurrency(quotation.paid_amount || 0, quotation.currency)}</span>
                  </div>
                )}
                {Boolean(quotation.paid_amount && quotation.balance_amount !== undefined) && (
                  <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 text-xs">
                    <span className="font-bold text-slate-900">{getLocalizedTerm('balance_due', docLang, 'Remaining Balance Due')}</span>
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
