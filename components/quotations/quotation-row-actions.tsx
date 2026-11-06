'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye,
  MoreHorizontal,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Download,
  MessageSquare,
  Trash2,
  Loader2,
  Receipt,
  Edit,
} from 'lucide-react';
import { Quotation, Organization, Customer } from '@/types/database';
import { QuotationInvoiceButton } from '@/components/quotations/quotation-invoice-button';
import { QuotationChatActionButton } from '@/components/quotations/quotation-chat-action-button';
import { buildWhatsAppMessage, getWhatsAppUrl } from '@/lib/whatsapp/automation';

interface QuotationRowActionsProps {
  quotation: Quotation;
  organization?: Organization | null;
  customer?: Customer | null;
  currentUserRole?: string;
  whatsappUrl?: string;
  publicLink: string;
}

export function QuotationRowActions({
  quotation,
  organization,
  customer,
  currentUserRole,
  whatsappUrl,
  publicLink,
}: QuotationRowActionsProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const effectiveWhatsAppUrl = React.useMemo(() => {
    if (whatsappUrl) return whatsappUrl;
    try {
      const isPendingReview = ['SENT', 'VIEWED', 'PENDING'].includes(quotation.status);
      const msg = buildWhatsAppMessage({
        type: isPendingReview ? 'QUOTE_REMINDER' : 'QUOTE_READY',
        template: isPendingReview
          ? organization?.whatsapp_template_reminder
          : organization?.whatsapp_template_quote,
        customer: customer || quotation.customer,
        quotation,
        organization,
      });
      return getWhatsAppUrl({
        targetPhone: customer?.phone || quotation.customer?.phone,
        countryCode:
          customer?.phone_country_code ||
          quotation.customer?.phone_country_code ||
          (customer?.country === 'India' || !customer?.country ? '+91' : '+1'),
        message: msg,
      });
    } catch {
      return '#';
    }
  }, [whatsappUrl, quotation, organization, customer]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleCopyLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${publicLink}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const hasIssuedInvoice = Boolean(
    quotation.has_issued_invoice ||
    quotation.issued_invoice_id ||
    quotation.invoice_number
  );
  const isLockedStatus = ['APPROVED', 'IN_PROGRESS', 'PAYMENT_COMPLETED', 'COMPLETED'].includes(quotation.status);
  const hasPayments = Boolean(quotation.is_paid || (quotation.paid_amount && quotation.paid_amount > 0));
  const isLockedOrCommitted = isLockedStatus || hasIssuedInvoice || hasPayments;

  const canDelete = currentUserRole !== 'STAFF' && !isLockedOrCommitted;

  const handleDelete = async () => {
    setIsMenuOpen(false);
    if (isLockedOrCommitted) {
      alert(
        `Quotation ${quotation.quotation_number} cannot be deleted because it is ${quotation.status.replace('_', ' ').toLowerCase()}${
          hasIssuedInvoice ? ' and has an issued commercial tax invoice' : ''
        }. Completed, approved, or invoiced orders are protected under statutory commercial accounting standards.`
      );
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete quotation ${quotation.quotation_number}? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/quotations/${quotation.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete quotation');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting quotation');
      setIsDeleting(false);
    }
  };

  const isInvoiceEligible = ['APPROVED', 'PAYMENT_COMPLETED', 'COMPLETED', 'IN_PROGRESS'].includes(
    quotation.status
  );

  return (
    <div className="flex items-center justify-end gap-1.5 relative">
      {/* 1. Tax Invoice Trigger (if approved / in progress) */}
      {isInvoiceEligible && (
        <QuotationInvoiceButton
          quotation={quotation}
          organization={organization}
          customer={customer}
        />
      )}

      {/* 2. Chat Trigger with unread pulse badge */}
      <QuotationChatActionButton
        quotationId={quotation.id}
        initialHasUnread={Boolean(quotation.has_unread_chat)}
        initialUnreadCount={quotation.unread_chat_count || 0}
      />

      {/* 3. Primary "View" Action Button */}
      <Link
        href={`/quotations/${quotation.id}`}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-semibold shadow-2xs transition-colors"
        title="View Quotation Details & Audit Log"
      >
        <Eye className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600" />
        <span className="hidden sm:inline">View</span>
      </Link>

      {/* 4. Sleek Secondary Action Dropdown (•••) */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors border ${
            isMenuOpen
              ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
              : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="More actions"
          aria-expanded={isMenuOpen}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-950/10 dark:shadow-black/40 z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
            {/* Edit Quotation (Enabled for unapproved, approved, in-progress; locked if completed) */}
            {!['COMPLETED', 'PAYMENT_COMPLETED'].includes(quotation.status) && (
              <Link
                href={`/quotations/${quotation.id}/edit`}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-medium transition-colors border-b border-slate-100 dark:border-slate-800"
              >
                <Edit className="h-3.5 w-3.5 text-indigo-600" />
                <span className="font-semibold text-slate-900 dark:text-slate-100">Edit Quotation</span>
              </Link>
            )}

            {/* Open Client Portal */}
            <Link
              href={publicLink}
              target="_blank"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-medium transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-indigo-500" />
              <span>Open Client Portal</span>
            </Link>

            {/* Copy Approval Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-medium transition-colors text-left"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  <span>Copy Approval Link</span>
                </>
              )}
            </button>

            {/* Share via WhatsApp */}
            <a
              href={effectiveWhatsAppUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
              <span>Share via WhatsApp</span>
            </a>

            {/* Download PDF */}
            <a
              href={`/api/public/pdf?id=${quotation.id}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-medium transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Download PDF</span>
            </a>

            {canDelete && (
              <>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium transition-colors text-left disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  )}
                  <span>Delete Quotation</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
