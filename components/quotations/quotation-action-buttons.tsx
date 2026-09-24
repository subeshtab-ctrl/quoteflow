'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Download,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  RotateCcw,
  Edit,
  ExternalLink,
  MessageSquare,
  Trash2,
  Receipt,
  CreditCard,
} from 'lucide-react';
import { Quotation, Organization, Customer, QuotationStatus } from '@/types/database';
import { InvoiceModal } from '@/components/quotations/invoice-modal';
import { PaymentModal } from '@/components/quotations/payment-modal';

interface QuotationActionButtonsProps {
  quotationId: string;
  quotationNumber: string;
  status: QuotationStatus;
  publicToken: string;
  grandTotalFormatted: string;
  customerName?: string;
  quotation?: Quotation;
  organization?: Organization | null;
  customer?: Customer | null;
  currentUserRole?: string;
}

export function QuotationActionButtons({
  quotationId,
  quotationNumber,
  status,
  publicToken,
  grandTotalFormatted,
  customerName = 'Valued Customer',
  quotation,
  organization,
  customer,
  currentUserRole,
}: QuotationActionButtonsProps) {
  const router = useRouter();
  const [currentQuotation, setCurrentQuotation] = useState<Quotation | undefined>(quotation);
  const [currentStatus, setCurrentStatus] = useState<QuotationStatus>(status);
  const [copied, setCopied] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  React.useEffect(() => {
    setCurrentQuotation(quotation);
    setCurrentStatus(status);
  }, [quotation, status]);

  const handlePaymentUpdated = (updatedQuote: Quotation) => {
    setCurrentQuotation(updatedQuote);
    if (updatedQuote.status) {
      setCurrentStatus(updatedQuote.status);
    }
    router.refresh();
  };

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/q/${publicToken}`;

  const handleFinalizeDraft = async () => {
    try {
      setIsFinalizing(true);
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save and finalize quotation');

      if (data.quotation) {
        setCurrentQuotation(data.quotation);
        setCurrentStatus(data.quotation.status);
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error finalizing quotation');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleMarkApproved = async () => {
    if (
      !confirm(
        `Mark quotation ${quotationNumber} as APPROVED? This will register official approval. (Tax Invoices are generated once marked as PAID).`
      )
    ) {
      return;
    }

    try {
      setIsApproving(true);
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED', approver_name: 'Admin' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark quotation as approved');

      if (data.quotation) {
        setCurrentQuotation(data.quotation);
        setCurrentStatus('APPROVED');
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error approving quotation');
    } finally {
      setIsApproving(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Link copied to clipboard!');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const res = await fetch(`/api/public/pdf?id=${quotationId}`);
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quotation-${quotationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Could not download PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCreateRevision = async () => {
    if (
      !confirm(
        'Create a new revision for this quotation? The current quotation will be preserved as immutable history.'
      )
    ) {
      return;
    }

    try {
      setIsRevising(true);
      const res = await fetch(`/api/quotations/${quotationId}/revision`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create revision');

      router.push(`/quotations/${data.quotation.id}/edit`);
    } catch (err: any) {
      alert(err.message || 'Error creating revision');
    } finally {
      setIsRevising(false);
    }
  };

  const handleDeleteQuotation = async () => {
    if (
      !confirm(
        `Are you sure you want to permanently delete quotation ${quotationNumber}? This will remove all associated items, history, and signatures.`
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete quotation');

      router.push('/quotations');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting quotation');
      setIsDeleting(false);
    }
  };

  const whatsappMsg = encodeURIComponent(
    `Hello ${customerName}, please review quotation ${quotationNumber} (${grandTotalFormatted}). View and digitally sign online here: ${publicUrl}`
  );

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Approved Quotation Actions: Invoice is ONLY shown when marked as PAID */}
        {currentStatus === 'APPROVED' && currentQuotation && (
          <>
            {currentQuotation.is_paid ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsInvoiceOpen(true)}
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
                  title="Generate & View Commercial Tax Invoice"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Generate Tax Invoice</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaymentOpen(true)}
                  className="gap-1.5 text-xs font-semibold shadow-sm bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900"
                  title="Payment received - click to view/edit details"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Paid</span>
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentOpen(true)}
                className="gap-1.5 text-xs font-semibold shadow-sm bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:text-amber-900"
                title="Mark as paid to unlock invoice generation"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Mark as Paid</span>
              </Button>
            )}
          </>
        )}

        {/* Mark Approved Option for Unapproved Quotes */}
        {currentStatus !== 'APPROVED' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkApproved}
            isLoading={isApproving}
            className="gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 shadow-sm font-semibold"
          >
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>Mark Approved</span>
          </Button>
        )}

        {/* If Draft: Show Save & Generate Approval Link Button */}
        {currentStatus === 'DRAFT' && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleFinalizeDraft}
            isLoading={isFinalizing}
            className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold"
            title="Finalize draft and generate official customer approval link"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Save & Generate Approval Link</span>
          </Button>
        )}

        {/* Change Rates / Edit */}
        <Link href={`/quotations/${quotationId}/edit`}>
          <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
            <Edit className="h-3.5 w-3.5" />
            <span>Change Rates</span>
          </Button>
        </Link>

        {/* Customer Approval Links: ONLY generated & accessible after quotation is finalized/saved (status !== 'DRAFT') */}
        {currentStatus !== 'DRAFT' && (
          <>
            {/* Copy Public Link */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1.5 text-xs shadow-sm"
              title="Copy customer approval link"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Copy Link</span>
                </>
              )}
            </Button>

            {/* WhatsApp Share */}
            <a
              href={`https://wa.me/?text=${whatsappMsg}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 shadow-sm"
                title="Send customer approval link via WhatsApp"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </Button>
            </a>

            {/* Open Public Portal View in New Tab */}
            <Link href={`/q/${publicToken}`} target="_blank">
              <Button variant="primary" size="sm" className="gap-1.5 text-xs shadow-sm">
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Client View</span>
              </Button>
            </Link>
          </>
        )}

        {/* Download PDF */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPdf}
          isLoading={isDownloadingPdf}
          className="gap-1.5 text-xs shadow-sm"
        >
          <Download className="h-3.5 w-3.5 text-slate-500" />
          <span>PDF</span>
        </Button>

        {/* Create Revision (for approved quotations) */}
        {currentStatus === 'APPROVED' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCreateRevision}
            isLoading={isRevising}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Create Revision</span>
          </Button>
        )}

        {/* Delete Quotation (Hidden for STAFF) */}
        {currentUserRole !== 'STAFF' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteQuotation}
            isLoading={isDeleting}
            className="gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 shadow-sm"
            title="Permanently Delete Quotation"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
            <span>Delete</span>
          </Button>
        )}
      </div>

      {/* Commercial Tax Invoice Modal - Only accessible when quotation is marked as PAID */}
      {currentQuotation && currentQuotation.is_paid && (
        <InvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          quotation={currentQuotation}
          organization={organization}
          customer={customer}
        />
      )}

      {/* Payment Status Modal */}
      {currentQuotation && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          quotation={currentQuotation}
          onPaymentUpdated={handlePaymentUpdated}
        />
      )}
    </>
  );
}
