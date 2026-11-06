'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Invoice, Organization } from '@/types/database';
import {
  formatCurrency,
  calculateQuotationTotals,
  isValidDocumentText,
  sanitizeTaxBreakdown,
  getDocumentTitle,
  getSanitizedPdfFilename,
} from '@/lib/quotations/calculations';
import { formatDate, formatDateTime } from '@/lib/utils';
import { InvoiceStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Printer,
  Download,
  FileCode,
  CreditCard,
  Building2,
  Calendar,
  FileText,
  ArrowLeft,
  CheckCircle2,
  Paperclip,
  History,
  Shield,
  Clock,
  UserCheck,
  FlaskConical,
  Ban,
  Trash2,
  AlertTriangle,
  Loader2,
  Star,
  ArrowRight,
  MessageSquare,
  PenTool,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import {
  parseLogoUrl,
  getLogoShapeClass,
  getLogoFitClass,
  getCompanyInitials,
} from '@/lib/utils/logo';
import { getCountryProfile } from '@/lib/tax/country-config';
import { InvoiceStatusModal } from '@/components/invoices/invoice-status-modal';
import { InvoiceCancelModal } from '@/components/invoices/invoice-cancel-modal';
import { SendInvoiceWhatsAppModal } from '@/components/invoices/send-whatsapp-modal';
import { DeliverySignModal } from '@/components/invoices/delivery-sign-modal';
import { buildWhatsAppMessage, getWhatsAppUrl } from '@/lib/whatsapp/automation';
import { downloadUaePintXmlFile } from '@/lib/tax/uae-pint-builder';
import { getEffectiveDocumentLanguage, getLocalizedTerm, isGccCountry } from '@/lib/tax/gcc-translations';

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
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppModalTemplate, setWhatsAppModalTemplate] = useState<'invoice_created' | 'payment_reminder'>('payment_reminder');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [showAuditHistory, setShowAuditHistory] = useState(false);
  const [isDeliverySignOpen, setIsDeliverySignOpen] = useState(false);

  const isDeliveryNote = invoice.document_type === 'delivery_note' || invoice.document_type === 'delivery_challan';

  const org = invoice.organization;
  const customer = invoice.customer;
  const currency = invoice.currency || 'INR';
  const countryNameOrCode = org?.country || org?.business_country || '';

  const isIndia = Boolean(
    (org?.business_country || '').toUpperCase() === 'IN' ||
    (org?.country || '').toLowerCase() === 'india' ||
    (org?.country || '').toUpperCase() === 'IN' ||
    org?.billing_region === 'INDIA' ||
    currency === 'INR' ||
    org?.default_currency === 'INR'
  );

  const isUAE = Boolean(
    (org?.business_country || '').toUpperCase() === 'AE' ||
    (org?.country || '').toLowerCase().includes('emirates') ||
    (org?.country || '').toLowerCase() === 'uae' ||
    currency === 'AED' ||
    org?.default_currency === 'AED'
  );

  const countryProfile = getCountryProfile(countryNameOrCode || (isUAE ? 'AE' : (isIndia ? 'IN' : 'US')));
  const docLang = getEffectiveDocumentLanguage(org);

  const effectiveTaxName = !isIndia
    ? (invoice.tax_name && !invoice.tax_name.toUpperCase().includes('GST')
        ? invoice.tax_name
        : (isUAE ? 'VAT' : (org?.tax_label && !org?.tax_label.toUpperCase().includes('GST') ? org.tax_label : 'Tax')))
    : (invoice.tax_name || org?.tax_label || 'GST');

  const taxMode = invoice.tax_mode || org?.default_tax_mode || 'exclusive';
  const placeOfSupply =
    invoice.place_of_supply ||
    customer?.place_of_supply ||
    customer?.billing_state ||
    customer?.state ||
    null;

  const calculated = calculateQuotationTotals(
    (invoice.items || []).map((it) => ({
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unit_price) || 0,
      tax_rate: Number(it.tax_rate) || 0,
    })),
    invoice.discount_type || null,
    Number(invoice.discount_value) || 0,
    {
      taxMode,
      currency,
      country: countryNameOrCode || (isUAE ? 'AE' : (isIndia ? 'IN' : 'US')),
      taxName: effectiveTaxName,
      isIndiaGst: isIndia,
      businessState: org?.business_state || org?.state || null,
      placeOfSupply,
    }
  );
  const displaySubtotal = calculated.subtotal;
  const displayDiscount = calculated.discount_amount;
  const displayTax = calculated.tax_amount;
  const displayTotal = calculated.grand_total;

  const displayTaxBreakdown = sanitizeTaxBreakdown(
    invoice.tax_breakdown && invoice.tax_breakdown.length > 0
      ? invoice.tax_breakdown
      : calculated.tax_breakdown,
    isIndia,
    effectiveTaxName,
    displayTax,
    invoice.tax_rate || calculated.tax_rate || (isUAE ? 5 : 0)
  );

  const whatsappPaymentMsg = buildWhatsAppMessage({
    type: 'PAYMENT_REMINDER',
    template: org?.whatsapp_template_payment,
    customer,
    invoice,
    organization: org,
  });

  const whatsappPaymentUrl = getWhatsAppUrl({
    targetPhone: customer?.phone,
    countryCode: customer?.phone_country_code || (isIndia ? '+91' : '+1'),
    message: whatsappPaymentMsg,
  });

  const handlePrint = () => {
    window.print();
  };

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('print') === '1') {
        const timer = setTimeout(() => {
          window.print();
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const auditCount = invoice.audit_history?.length || (invoice.created_at ? 1 : 0);
  const logoConfig = parseLogoUrl(org?.logo_url);

  const isTest = invoice.environment === 'test';
  const isDraft = invoice.status === 'DRAFT';
  const isCancelledOrVoid = invoice.status === 'CANCELLED' || invoice.status === 'VOIDED';
  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  const canDelete = isDraft || (isTest && canManage);

  const handleIssueDraftInvoice = async (redirectToList: boolean = true) => {
    setIsIssuing(true);
    setIssueError(null);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ISSUED' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to issue invoice');
      }
      if (data.invoice) {
        setInvoice(data.invoice);
      }
      setIsIssueModalOpen(false);
      setIsIssuing(false);
      if (redirectToList) {
        router.push('/invoices');
      }
      router.refresh();
    } catch (err: any) {
      setIssueError(err.message || 'Error issuing invoice');
      setIsIssuing(false);
    }
  };

  const handleDeleteInvoice = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete invoice');
      }
      router.push(isDraft ? '/invoices?status=DRAFT' : '/invoices');
      router.refresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting invoice');
      setIsDeleting(false);
    }
  };

  const [isConverting, setIsConverting] = useState(false);

  const handleConvertToTaxInvoice = async () => {
    try {
      setIsConverting(true);
      const nextNumRes = await fetch('/api/invoices/next-number').then((r) => r.json());
      const nextInvoiceNumber = nextNumRes.nextInvoiceNumber || `INV-${Date.now()}`;

      const payload = {
        organization_id: invoice.organization_id,
        customer_id: invoice.customer_id,
        quotation_id: invoice.quotation_id,
        invoice_number: nextInvoiceNumber,
        document_type: 'tax_invoice',
        po_number: invoice.po_number,
        status: 'ISSUED',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: invoice.due_date,
        currency: invoice.currency,
        subtotal: invoice.subtotal,
        discount_type: invoice.discount_type,
        discount_value: invoice.discount_value,
        tax_rate: invoice.tax_rate,
        tax_mode: invoice.tax_mode,
        tax_name: invoice.tax_name,
        tax_amount: invoice.tax_amount,
        grand_total: invoice.grand_total,
        place_of_supply: invoice.place_of_supply,
        customer_gstin: invoice.customer_gstin,
        payment_terms: invoice.payment_terms,
        payment_method: invoice.payment_method,
        notes: invoice.notes,
        terms_conditions: invoice.terms_conditions,
        tax_breakdown: invoice.tax_breakdown,
        items: (invoice.items || []).map((it) => ({
          product_id: it.product_id,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unit_price,
          tax_rate: it.tax_rate,
          tax_amount: it.tax_amount,
          line_total: it.line_total,
          sort_order: it.sort_order,
          item_type: it.item_type,
        })),
      };

      const createRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || 'Failed to convert proforma to tax invoice');

      // Update proforma with proforma_converted_invoice_id
      await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proforma_converted_invoice_id: createData.invoice.id }),
      });

      router.push(`/invoices/${createData.invoice.id}`);
    } catch (err: any) {
      alert(err.message || 'Error converting proforma to tax invoice');
      setIsConverting(false);
    }
  };

  const rawCustomerPhone = customer?.phone || '';
  const cleanCustomerPhone = rawCustomerPhone.replace(/[^\d]/g, '');
  const customerDisplayName = customer?.name || customer?.company_name || 'Valued Customer';
  const orgDisplayName = org?.name || 'QuoteFlow';

  // WhatsApp Review Prompt logic
  const googleReviewUrl = org?.google_review_url || '';
  const isPaid = invoice.is_paid || invoice.payment_status === 'PAID' || invoice.status === 'PAID';
  const reviewMsg = googleReviewUrl
    ? `Hello ${customerDisplayName}, thank you for your payment for Invoice ${invoice.invoice_number}! If you were pleased with our service, could you take 30 seconds to give us a 5-star review on Google? It means the world to our team:\n\n${googleReviewUrl}\n\nThank you!\n- ${orgDisplayName}`
    : `Hello ${customerDisplayName}, thank you for your payment for Invoice ${invoice.invoice_number}! We would love to hear your feedback on our service.\n\nThank you!\n- ${orgDisplayName}`;

  const reviewWhatsappHref = cleanCustomerPhone
    ? `https://wa.me/${cleanCustomerPhone}?text=${encodeURIComponent(reviewMsg)}`
    : `https://wa.me/?text=${encodeURIComponent(reviewMsg)}`;

  // WhatsApp Payment Reminder logic
  const outstandingBalance = invoice.balance_amount ?? (invoice.grand_total - (invoice.paid_amount || 0));
  const reminderMsg = `Hello ${customerDisplayName}, this is a gentle reminder from ${orgDisplayName} regarding Invoice ${invoice.invoice_number} for ${formatCurrency(outstandingBalance, currency)}, due on ${formatDate(invoice.due_date)}. Please let us know once payment has been initiated. Thank you!`;
  const reminderWhatsappHref = cleanCustomerPhone
    ? `https://wa.me/${cleanCustomerPhone}?text=${encodeURIComponent(reminderMsg)}`
    : `https://wa.me/?text=${encodeURIComponent(reminderMsg)}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Header Controls (Hidden during print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href={isDraft ? '/invoices?status=DRAFT' : '/invoices'}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {invoice.invoice_number}
              </h1>

              {/* Document Type Badge */}
              {invoice.document_type === 'proforma_invoice' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-800 text-[10px] font-bold uppercase tracking-wider">
                  Proforma Invoice
                </span>
              ) : (invoice.document_type === 'delivery_note' || invoice.document_type === 'delivery_challan') ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-200 border border-cyan-300 dark:border-cyan-800 text-[10px] font-bold uppercase tracking-wider">
                  Delivery Note
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider">
                  Tax Invoice
                </span>
              )}

              {invoice.proforma_converted_invoice_id && (
                <Link
                  href={`/invoices/${invoice.proforma_converted_invoice_id}`}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800 text-[10px] font-bold hover:underline"
                >
                  Converted to Tax Invoice →
                </Link>
              )}

              {isTest ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-[10px] font-bold uppercase tracking-wider">
                  <FlaskConical className="h-3 w-3" />
                  Test
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                  Live
                </span>
              )}
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Issued {formatDate(invoice.issue_date)} • Due {formatDate(invoice.due_date)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {invoice.document_type === 'proforma_invoice' && !invoice.proforma_converted_invoice_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleConvertToTaxInvoice}
              disabled={isConverting}
              className="gap-1.5 text-xs text-purple-700 bg-purple-50 border-purple-300 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 font-bold"
              title="Convert this Proforma Invoice into an official Tax Invoice"
            >
              {isConverting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
              <span>Convert to Tax Invoice</span>
            </Button>
          )}

          {isPaid ? (
            <a
              href={reviewWhatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs font-bold shadow-2xs transition-colors"
              title="Send WhatsApp 5-star Google Review request"
            >
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              <span>Ask Google Review</span>
            </a>
          ) : null}

          {/* Unified Single WhatsApp Action */}
          {!isCancelledOrVoid && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setWhatsAppModalTemplate(invoice.payment_status !== 'PAID' ? 'payment_reminder' : 'invoice_created');
                setIsWhatsAppModalOpen(true);
              }}
              className="gap-1.5 text-xs border-emerald-300 dark:border-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold shadow-2xs transition-colors"
              title="Share document details via WhatsApp"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Share via WhatsApp</span>
            </Button>
          )}

          {/* Digital Signature Confirmation for Delivery Notes */}
          {isDeliveryNote && invoice.delivery_status !== 'DELIVERED' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsDeliverySignOpen(true)}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              title="Record recipient digital signature and confirm delivery"
            >
              <PenTool className="h-3.5 w-3.5" />
              <span>Confirm Delivery / Sign</span>
            </Button>
          )}

          {isDraft && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIssueError(null);
                setIsIssueModalOpen(true);
              }}
              className="gap-1.5 text-xs shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Issue Invoice</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAuditHistory(!showAuditHistory)}
            className={`gap-1.5 text-xs transition-colors ${
              showAuditHistory
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <History className="h-3.5 w-3.5 text-indigo-500" />
            <span>Audit History</span>
            {auditCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                {auditCount}
              </span>
            )}
          </Button>

          {!isCancelledOrVoid && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStatusModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
              <span>Update Status</span>
            </Button>
          )}

          {!isCancelledOrVoid && !isTest && !isDraft && canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(true)}
              className="gap-1.5 text-xs text-rose-600 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Cancel / Void</span>
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="gap-1.5 text-xs text-rose-600 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isDraft ? 'Delete Draft' : 'Delete'}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const filename = getSanitizedPdfFilename(
                invoice.document_type,
                invoice.invoice_number,
                invoice.status,
                isIndia && org?.gst_registered !== false
              );
              try {
                const { downloadInvoicePdfClient } = await import('@/lib/pdf/client-download');
                const success = await downloadInvoicePdfClient(invoice, filename);
                if (success) return;
              } catch {}
              window.open(`/api/invoices/${invoice.id}/pdf`, '_blank');
            }}
            className="gap-1.5 text-xs text-slate-700 dark:text-slate-300"
          >
            <Download className="h-3.5 w-3.5 text-indigo-500" />
            <span>Download PDF</span>
          </Button>

          {/* UAE E-Invoicing PINT-AE XML Download (Strictly when isUAE is true) */}
          {isUAE && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                  downloadUaePintXmlFile(invoice, org);
                } catch (err: any) {
                  alert(err.message || 'Error generating UAE E-Invoice XML');
                }
              }}
              className="gap-1.5 text-xs text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-semibold"
              title="Download official UAE MoF/FTA Peppol PINT-AE XML e-invoice"
            >
              <FileCode className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>UAE E-Invoice (.xml)</span>
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{isDeliveryNote ? 'Print Delivery Note' : invoice.document_type === 'proforma_invoice' ? 'Print Proforma' : 'Print Invoice'}</span>
          </Button>
        </div>
      </div>

      {/* Prominent Environment / Status Notice Banners (Hidden during print) */}
      {isDraft && (
        <div className="print:hidden rounded-xl p-3.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400 shrink-0" />
            <span>
              <strong>DRAFT INVOICE:</strong> This invoice has not been officially issued yet. Printed and downloaded copies include a <strong>DRAFT</strong> watermark. Click <strong>Issue Invoice</strong> to move it to your official Invoices list.
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setIssueError(null);
                setIsIssueModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Issue Invoice</span>
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
            >
              Delete Draft
            </button>
          </div>
        </div>
      )}

      {isTest && (
        <div className="print:hidden rounded-xl p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>TEST INVOICE:</strong> Created for demonstrations, testing, or training. This document does not affect live accounting or tax totals and can be permanently deleted.
            </span>
          </div>
          {canManage && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline shrink-0 cursor-pointer"
            >
              Delete Test Document
            </button>
          )}
        </div>
      )}

      {isCancelledOrVoid && (
        <div className="print:hidden rounded-xl p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300 text-sm">
            <Ban className="h-4 w-4 shrink-0" />
            <span>THIS INVOICE HAS BEEN {invoice.status === 'VOIDED' ? 'VOIDED' : 'CANCELLED'}</span>
          </div>
          {invoice.cancellation_reason && (
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              <strong>Reason:</strong> {invoice.cancellation_reason}
            </p>
          )}
          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
            Action recorded by {invoice.cancelled_by || 'Admin User'}{invoice.cancelled_by_role ? ` (${invoice.cancelled_by_role})` : ''} on {formatDate(invoice.cancelled_at || invoice.updated_at)}. This invoice cannot be modified or reactivated.
          </p>
        </div>
      )}

      {/* Collapsible Audit History (Hidden during print) */}
      {showAuditHistory && (
        <div className="print:hidden rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Invoice Audit Trail & Activity Log
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Every change to this invoice is permanently tracked with the responsible staff or admin. Deletions are strictly prohibited.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAuditHistory(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>

          <div className="space-y-3">
            {invoice.audit_history && invoice.audit_history.length > 0 ? (
              invoice.audit_history.map((audit) => {
                const isOwnerOrAdmin =
                  audit.user_role === 'ADMIN' || audit.user_role === 'OWNER';
                return (
                  <div
                    key={audit.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs shadow-2xs"
                  >
                    <div className="flex items-start sm:items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isOwnerOrAdmin
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {isOwnerOrAdmin ? (
                          <Shield className="h-3.5 w-3.5" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {audit.user_name}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isOwnerOrAdmin
                                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {audit.user_role}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {audit.action}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">{audit.details}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] shrink-0 sm:self-center self-end">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(audit.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg shrink-0 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    <Shield className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {invoice.created_by || 'Admin User'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        ADMIN
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        CREATED
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">Initial invoice created</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Clock className="h-3 w-3" />
                  <span>
                    {invoice.created_at
                      ? new Date(invoice.created_at).toLocaleString()
                      : 'Initial creation'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Invoice / Proforma / Delivery Note Sheet */}
      <div
        id="invoice-sheet"
        dir={docLang === 'ar' ? 'rtl' : 'ltr'}
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 p-6 sm:p-10 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0 print:m-0 printable-document-sheet"
      >
        {/* Diagonal Watermark for DRAFT */}
        {isDraft && (
          <>
            <div className="hidden print:block w-full bg-slate-600 text-white text-center text-[10px] font-bold uppercase tracking-widest py-1.5 mb-4 rounded">
              DRAFT — NOT YET ISSUED AS AN OFFICIAL DOCUMENT
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0 overflow-hidden"
            >
              <span className="-rotate-45 text-[72px] sm:text-[120px] font-black uppercase tracking-[0.22em] text-slate-300/40 print:text-slate-300/60">
                DRAFT
              </span>
            </div>
          </>
        )}

        {/* Company Header & Document Details */}
        <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-slate-200">
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
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-black text-base tracking-wider select-none shadow-xs">
                  {getCompanyInitials(org?.name)}
                </div>
              )}
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {org?.name || 'QuoteFlow Workspace'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {org?.address_line1}, {org?.city} {org?.business_state || org?.state} {org?.postal_code}
              <br />
              Email: {org?.email} | Tel: {org?.phone || 'N/A'}
              {(org?.gstin || org?.gst_vat_number) && (
                <>
                  <br />
                  <span className="font-semibold text-slate-700">
                    {getLocalizedTerm('trn_tax_id', docLang, countryProfile.taxLabel.split(' ')[0])}: {org?.gstin || org?.gst_vat_number}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              {(() => {
                if (isDeliveryNote) {
                  return getLocalizedTerm('delivery_note', docLang);
                }
                if (invoice.document_type === 'proforma_invoice') {
                  return getLocalizedTerm('proforma_invoice', docLang);
                }
                if (isDraft) {
                  return getLocalizedTerm('tax_invoice', docLang, 'Draft Invoice');
                }
                return getLocalizedTerm('tax_invoice', docLang);
              })()}
            </span>
            <h1 className="text-2xl font-black text-slate-900">{invoice.invoice_number}</h1>
            <div className="text-xs text-slate-500">
              <p>
                {isDeliveryNote
                  ? getLocalizedTerm('delivery_date', docLang)
                  : invoice.document_type === 'proforma_invoice'
                  ? getLocalizedTerm('issue_date', docLang, 'Proforma Date')
                  : getLocalizedTerm('invoice_date', docLang)}
                : {formatDate(invoice.issue_date)}
              </p>
              {!isDeliveryNote && invoice.payment_terms !== 'Due on Receipt' && (
                <p>{getLocalizedTerm('due_date', docLang)}: {formatDate(invoice.due_date)}</p>
              )}
              {invoice.po_number && <p className="font-semibold text-slate-700">{getLocalizedTerm('po_number', docLang)}: {invoice.po_number}</p>}
              {!isDeliveryNote && displayTax > 0 && (
                <p className="font-semibold text-indigo-600">
                  Tax Mode: {taxMode === 'inclusive' ? 'Tax Included' : 'Tax Excluded'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* DELIVERY NOTE SPECIFIC LAYOUT                                */}
        {/* ------------------------------------------------------------- */}
        {isDeliveryNote ? (
          <>
            {/* Consignee & Dispatch Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-800">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {getLocalizedTerm('billed_to', docLang, 'DELIVER TO / CONSIGNEE')}
                </span>
                <p className="font-bold text-slate-900 text-sm mt-1">
                  {customer?.company_name || customer?.name || 'Valued Client'}
                </p>
                {(customer?.company_name && customer?.name) && (
                  <p className="text-slate-600">{getLocalizedTerm('attn', docLang)}: {invoice.delivery_contact_person || customer.name}</p>
                )}
                <p className="text-slate-600 mt-0.5">
                  <strong>{getLocalizedTerm('address', docLang, 'Delivery Address')}:</strong>{' '}
                  {invoice.delivery_address || [customer?.billing_address, customer?.city, customer?.billing_state || customer?.state, customer?.postal_code].filter(Boolean).join(', ') || 'Same as billing address'}
                </p>
                {(invoice.delivery_contact_phone || customer?.phone) && (
                  <p className="text-slate-500">{getLocalizedTerm('tel', docLang, 'Contact Tel')}: {invoice.delivery_contact_phone || customer?.phone}</p>
                )}
              </div>

              <div className="space-y-1 sm:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  DISPATCH & ORDER REFERENCE
                </span>
                <p className="text-slate-700 mt-1">
                  <strong>{getLocalizedTerm('delivery_note_number', docLang)}:</strong> <span className="font-mono text-indigo-600 font-bold">{invoice.invoice_number}</span>
                </p>
                <p className="text-slate-600">
                  <strong>{getLocalizedTerm('delivery_date', docLang, 'Dispatch Date')}:</strong> {formatDate(invoice.issue_date)}
                </p>
                {invoice.po_number && (
                  <p className="text-slate-600">
                    <strong>{getLocalizedTerm('po_number', docLang, 'Related PO / Order')}:</strong> {invoice.po_number}
                  </p>
                )}
                {invoice.delivery_vehicle_no && (
                  <p className="text-slate-600">
                    <strong>Vehicle / Tracking:</strong> {invoice.delivery_vehicle_no}
                  </p>
                )}
                <div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    invoice.delivery_status === 'DELIVERED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {invoice.delivery_status === 'DELIVERED' ? 'Delivered & Confirmed' : 'Pending Delivery'}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Note Items Table (NO financial columns: pure quantity and description) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500 bg-slate-50 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">{getLocalizedTerm('hash', docLang)}</th>
                    <th className="py-2.5 px-3">{getLocalizedTerm('item_description', docLang)}</th>
                    <th className="py-2.5 px-3 w-36">{getLocalizedTerm('sku_code', docLang)}</th>
                    <th className="py-2.5 px-3 w-28 text-right">{getLocalizedTerm('quantity', docLang)}</th>
                    <th className="py-2.5 px-3 w-24 text-center">{getLocalizedTerm('unit', docLang)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(invoice.items || []).map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="py-3 px-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {item.description}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-xs">
                        {item.classification_code || '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 text-sm">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500">
                        {item.unit || 'unit'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Delivery Instructions */}
            {isValidDocumentText(invoice.delivery_notes || invoice.notes) && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs space-y-1">
                <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                  Special Delivery Instructions / Notes
                </span>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {(invoice.delivery_notes || invoice.notes)!.trim()}
                </p>
              </div>
            )}

            {/* Digital Delivery Signature Verification (if signed) */}
            {invoice.delivery_status === 'DELIVERED' && invoice.delivery_signature_data_url && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold uppercase text-[10px] tracking-wider">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Verified Digital Delivery Receipt</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700">
                    Status: Verified Delivery
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                  <div>
                    <p className="text-slate-800 font-semibold">
                      Received & Confirmed By: {invoice.delivery_recipient_name || customer?.name || 'Customer'}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Confirmed on: {invoice.delivery_confirmed_at ? formatDateTime(invoice.delivery_confirmed_at) : 'N/A'}
                    </p>
                  </div>
                  <div className="border border-emerald-200 rounded-lg p-1.5 bg-white shrink-0">
                    <img
                      src={invoice.delivery_signature_data_url}
                      alt="Delivery Signature"
                      className="h-10 max-w-[160px] object-contain"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Physical Signatures Grid (Always present for print/paper delivery hand-off) */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-700">
              <div className="space-y-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <p className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                  Delivered By / Carrier
                </p>
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] text-slate-500">Name: ______________________</p>
                  <p className="text-[11px] text-slate-500">Signature: __________________</p>
                  <p className="text-[11px] text-slate-500">Date/Time: __________________</p>
                </div>
              </div>

              <div className="space-y-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <p className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                  Received By / Customer
                </p>
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] text-slate-500">
                    Name: {invoice.delivery_recipient_name || '______________________'}
                  </p>
                  <p className="text-[11px] text-slate-500">Signature: __________________</p>
                  <p className="text-[11px] text-slate-500">Date/Time: __________________</p>
                </div>
              </div>

              <div className="space-y-3 p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/30 flex flex-col items-center justify-center text-center">
                <p className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">
                  Authorized Company Stamp
                </p>
                <div className="h-14 w-28 rounded border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-300">
                  Stamp Here
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ------------------------------------------------------------- */
          /* INVOICE & PROFORMA INVOICE FINANCIAL LAYOUT                   */
          /* ------------------------------------------------------------- */
          <>
            {/* Bill To Customer & Payment Status Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {getLocalizedTerm('billed_to', docLang)}
                </span>
                <p className="font-bold text-slate-900 mt-1 text-sm">
                  {customer?.company_name || customer?.name}
                </p>
                {customer?.company_name && customer?.name && (
                  <p className="text-slate-600">{getLocalizedTerm('attn', docLang)}: {customer.name}</p>
                )}
                {customer?.billing_address && (
                  <p className="text-slate-500 mt-0.5">
                    {customer.billing_address}, {customer.city} {customer.billing_state || customer.state} {customer.postal_code}
                  </p>
                )}
                {(invoice.customer_gstin || customer?.customer_gstin || customer?.tax_number) && (
                  <p className="text-slate-700 font-semibold mt-1">
                    {getLocalizedTerm('trn_tax_id', docLang)}: {invoice.customer_gstin || customer?.customer_gstin || customer?.tax_number}
                  </p>
                )}
                {placeOfSupply && (
                  <p className="text-indigo-600 font-semibold mt-0.5">
                    {getLocalizedTerm('place_of_supply', docLang)}: {placeOfSupply}
                  </p>
                )}
              </div>

              <div className="space-y-1 sm:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {getLocalizedTerm('settlement_status', docLang)}
                </span>
                <div>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
                {invoice.is_paid && invoice.paid_at && (
                  <p className="text-emerald-600 font-semibold mt-1">
                    {getLocalizedTerm('paid_in_full', docLang, 'Settled in full on')} {formatDate(invoice.paid_at)}
                  </p>
                )}
                {(invoice.payment_method || invoice.payment_notes) && (
                  <p className="text-[11px] text-slate-500 italic mt-1 font-serif">
                    {getLocalizedTerm('mode_of_payment', docLang)}: {invoice.payment_method?.replace(/_/g, ' ') || 'Bank Transfer'}{invoice.payment_notes ? ` • Ref/Txn No: ${invoice.payment_notes}` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500 bg-slate-50 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">{getLocalizedTerm('hash', docLang)}</th>
                    <th className="py-2.5 px-3">{getLocalizedTerm('item_description', docLang, 'Description')}</th>
                    <th className="py-2.5 px-3">{getLocalizedTerm('sku_code', docLang, 'Type / Code')}</th>
                    <th className="py-2.5 px-3 text-right">{getLocalizedTerm('quantity', docLang)}</th>
                    <th className="py-2.5 px-3 text-right">{getLocalizedTerm('rate', docLang)}</th>
                    <th className="py-2.5 px-3 text-right">{getLocalizedTerm('tax', docLang)}</th>
                    <th className="py-2.5 px-3 text-right">{getLocalizedTerm('total', docLang)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(invoice.items || []).map((item, idx) => {
                    const calcItem = calculated.items[idx];
                    const lineTotal = calcItem ? calcItem.line_total : item.line_total;
                    return (
                      <tr key={item.id || idx}>
                        <td className="py-3 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900 max-w-sm">
                          {item.description}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {item.classification_code ? (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
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
                          {item.tax_rate > 0
                            ? `${item.tax_rate}%${taxMode === 'inclusive' ? ' (Incl.)' : ''}`
                            : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(lineTotal, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-slate-200 text-xs">
              <div className="space-y-3 max-w-sm">
                {isValidDocumentText(invoice.notes) && (
                  <div>
                    <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                      {getLocalizedTerm('notes', docLang)}
                    </span>
                    <p className="text-slate-500 mt-0.5 leading-relaxed whitespace-pre-line">{invoice.notes!.trim()}</p>
                  </div>
                )}
                {isValidDocumentText(invoice.terms_conditions) && (
                  <div>
                    <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                      {getLocalizedTerm('terms_conditions', docLang)}
                    </span>
                    <p className="text-slate-500 mt-0.5 whitespace-pre-line leading-relaxed">
                      {invoice.terms_conditions!.trim()}
                    </p>
                  </div>
                )}
              </div>

              <div className="w-full sm:w-72 space-y-2">
                <div className="flex justify-between text-slate-500">
                  <span>{taxMode === 'inclusive' ? `${getLocalizedTerm('subtotal', docLang)} (Taxable Amount)` : getLocalizedTerm('subtotal', docLang)}</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(displaySubtotal, currency)}
                  </span>
                </div>

                {displayDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>{getLocalizedTerm('discount', docLang)}</span>
                    <span>-{formatCurrency(displayDiscount, currency)}</span>
                  </div>
                )}

                {/* Tax Breakdown */}
                {displayTaxBreakdown.length > 0 ? (
                  displayTaxBreakdown.map((tb, i) => (
                    <div key={i} className="flex justify-between text-slate-500">
                      <span>{tb.label}</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(tb.amount, currency)}
                      </span>
                    </div>
                  ))
                ) : displayTax > 0 ? (
                  <div className="flex justify-between text-slate-500">
                    <span>
                      {getLocalizedTerm('tax_amount', docLang, effectiveTaxName)} {taxMode === 'inclusive' ? '(Included)' : ''}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(displayTax, currency)}
                    </span>
                  </div>
                ) : null}

                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-900">{getLocalizedTerm('grand_total', docLang, 'Total Amount')}</span>
                  <span className="text-lg font-black text-indigo-600">
                    {formatCurrency(displayTotal, currency)}
                  </span>
                </div>

                {Boolean(
                  !invoice.is_paid &&
                  invoice.status !== 'PAID' &&
                  invoice.paid_amount !== undefined &&
                  invoice.paid_amount > 0
                ) && (
                  <div className="flex justify-between text-emerald-600 font-semibold pt-1">
                    <span>
                      {getLocalizedTerm('paid_amount', docLang)}
                      {invoice.advance_percentage ? ` (${invoice.advance_percentage}% Advance)` : ''}
                    </span>
                    <span>-{formatCurrency(invoice.paid_amount || 0, currency)}</span>
                  </div>
                )}

                {!invoice.is_paid && invoice.status !== 'PAID' && Boolean(invoice.balance_amount !== undefined && invoice.balance_amount > 0) && (
                  <div className="flex justify-between items-baseline pt-1 border-t border-slate-200">
                    <span className="text-sm font-black text-slate-900">
                      {getLocalizedTerm('balance_due', docLang, 'Remaining Balance Due')}
                    </span>
                    <span className="text-base font-black text-amber-600">
                      {formatCurrency(invoice.balance_amount || 0, currency)}
                    </span>
                  </div>
                )}

                {invoice.payment_method && (
                  <p className="text-[11px] text-slate-500 italic mt-2 text-right font-serif">
                    {getLocalizedTerm('mode_of_payment', docLang)}: {invoice.payment_method.replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* File Attachments (if any) */}
        {invoice.attachments && invoice.attachments.length > 0 && (
          <div className="pt-6 border-t border-slate-200 space-y-2 print:hidden">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
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
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 truncate">
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
          <div className="pt-8 border-t border-slate-200 text-center text-xs text-slate-400 italic">
            {org.invoice_footer}
          </div>
        )}
      </div>

      {/* Delivery Confirmation & Signature Modal */}
      <DeliverySignModal
        isOpen={isDeliverySignOpen}
        onClose={() => setIsDeliverySignOpen(false)}
        invoice={invoice}
        onSuccess={(updated) => setInvoice(updated)}
      />

      {/* Status Update Modal */}
      <InvoiceStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        invoice={invoice}
        onStatusUpdated={(updated) => setInvoice(updated)}
      />

      {/* Cancel / Void Modal */}
      <InvoiceCancelModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        invoice={invoice}
        onSuccess={(updated: Invoice) => setInvoice(updated)}
      />

      {/* Issue Draft Invoice Confirmation Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-200 dark:border-emerald-900/40 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Issue Official Tax Invoice?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Convert this draft into an official issued invoice.
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3 text-xs text-emerald-900 dark:text-emerald-200">
              Draft invoice <span className="font-mono font-bold">{invoice.invoice_number}</span> will be officially issued, the <strong>DRAFT</strong> watermark will be removed, and it will move from <strong>Drafts</strong> into your main <strong>Invoices</strong> list.
            </div>

            {issueError && (
              <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/40">
                {issueError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsIssueModalOpen(false)}
                disabled={isIssuing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleIssueDraftInvoice(true)}
                disabled={isIssuing}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isIssuing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Issue Invoice
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Draft / Test Invoice Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/40 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isDraft ? 'Delete Draft Invoice?' : 'Delete Test Invoice?'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isDraft
                    ? 'This draft invoice has not been issued yet and will be permanently removed.'
                    : 'This test invoice will be permanently removed.'}
                </p>
              </div>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3 text-xs text-rose-800 dark:text-rose-300">
              {isDraft ? (
                <>
                  You are deleting draft invoice <span className="font-mono font-bold">{invoice.invoice_number}</span>. Because it is still in Draft status, removing it will not affect issued accounting records.
                </>
              ) : (
                <>
                  You are deleting test invoice <span className="font-mono font-bold">{invoice.invoice_number}</span>. This action is irreversible. (Issued live invoices can never be deleted).
                </>
              )}
            </div>

            {deleteError && (
              <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/40">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteInvoice}
                disabled={isDeleting}
                className="gap-1.5"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isDraft ? 'Delete Draft' : 'Permanently Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Official WhatsApp Business Modal for Invoices */}
      <SendInvoiceWhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        invoice={invoice}
        customer={customer}
        organization={org}
        defaultTemplate={whatsAppModalTemplate}
      />
    </div>
  );
}
