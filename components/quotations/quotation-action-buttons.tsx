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
  AlertTriangle,
  Lock,
  Clock,
  Play,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Quotation, Organization, Customer, QuotationStatus } from '@/types/database';
import { InvoiceModal } from '@/components/quotations/invoice-modal';
import { PaymentModal } from '@/components/quotations/payment-modal';
import { Modal } from '@/components/ui/modal';
import { formatDate } from '@/lib/utils';

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
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSettingInProgress, setIsSettingInProgress] = useState(false);
  const [isExtendingTime, setIsExtendingTime] = useState(false);

  // Modals state
  const [isUnpaidWarningOpen, setIsUnpaidWarningOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isInProgressModalOpen, setIsInProgressModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isCompletionConfirmOpen, setIsCompletionConfirmOpen] = useState(false);

  // Form states for In Progress & Extend Time
  const [estimatedDaysInput, setEstimatedDaysInput] = useState<number>(7);
  const [estimatedNotesInput, setEstimatedNotesInput] = useState<string>('');
  const [additionalDaysInput, setAdditionalDaysInput] = useState<number>(7);
  const [extendReasonInput, setExtendReasonInput] = useState<string>('');

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

  const handleSetInProgress = async () => {
    try {
      setIsSettingInProgress(true);
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          estimated_days: Number(estimatedDaysInput) || 7,
          estimated_time_text: estimatedNotesInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update quotation to In Progress');

      if (data.quotation) {
        setCurrentQuotation(data.quotation);
        setCurrentStatus('IN_PROGRESS');
      }

      setIsInProgressModalOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error setting quotation to In Progress');
    } finally {
      setIsSettingInProgress(false);
    }
  };

  const handleExtendTime = async () => {
    try {
      setIsExtendingTime(true);
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EXTEND_TIME',
          additional_days: Number(additionalDaysInput) || 7,
          reason: extendReasonInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend completion time');

      if (data.quotation) {
        setCurrentQuotation(data.quotation);
      }

      setIsExtendModalOpen(false);
      setExtendReasonInput('');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error extending quotation time');
    } finally {
      setIsExtendingTime(false);
    }
  };

  const executeMarkCompleted = async (options: { unpaid: boolean }) => {
    try {
      setIsCompleting(true);
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          unpaid: options.unpaid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark quotation as completed');

      if (data.quotation) {
        setCurrentQuotation(data.quotation);
        setCurrentStatus('COMPLETED');
      }

      setIsUnpaidWarningOpen(false);
      setIsCompletionConfirmOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error completing quotation');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleMarkCompletedClick = () => {
    // If it has estimated days or is in progress, ask confirmation popup with extend time option
    if (currentStatus === 'IN_PROGRESS' || currentQuotation?.estimated_days) {
      setIsCompletionConfirmOpen(true);
      return;
    }

    if (!currentQuotation?.is_paid) {
      setIsUnpaidWarningOpen(true);
    } else {
      if (
        !confirm(
          `Mark quotation ${quotationNumber} as COMPLETED? This quotation is fully paid. Once marked as completed, it will be permanently saved and locked.`
        )
      ) {
        return;
      }
      executeMarkCompleted({ unpaid: false });
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
      const res = await fetch(
        `/api/public/pdf?id=${encodeURIComponent(quotationId)}${publicToken ? `&token=${encodeURIComponent(publicToken)}` : ''}`
      );
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
        {/* COMPLETED Quotation View - Locked Lifecycle */}
        {currentStatus === 'COMPLETED' && currentQuotation && (
          <>
            {currentQuotation.is_paid ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-xs select-none">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Completed • Locked</span>
              </div>
            ) : (currentQuotation.payment_status === 'PARTIALLY_PAID' || (currentQuotation.paid_amount && currentQuotation.paid_amount > 0)) ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 border border-cyan-300 text-cyan-800 text-xs font-bold shadow-xs select-none">
                <AlertTriangle className="h-3.5 w-3.5 text-cyan-600" />
                <span>Completed (Partially Paid) • Locked</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold shadow-xs select-none">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span>Completed (Unpaid) • Locked</span>
              </div>
            )}

            {currentQuotation.is_paid ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInvoiceOpen(true)}
                  className="gap-1.5 text-xs text-indigo-700 border-indigo-300 hover:bg-indigo-50 font-semibold shadow-xs"
                  title="View / Print Commercial Tax Invoice"
                >
                  <Receipt className="h-3.5 w-3.5 text-indigo-600" />
                  <span>View Invoice</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaymentOpen(true)}
                  className="gap-1.5 text-xs font-semibold shadow-sm bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900"
                  title="Payment received - click to view details"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Paid</span>
                </Button>
              </>
            ) : (currentQuotation.payment_status === 'PARTIALLY_PAID' || (currentQuotation.paid_amount && currentQuotation.paid_amount > 0)) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentOpen(true)}
                className="gap-1.5 text-xs font-semibold shadow-sm bg-cyan-50 text-cyan-800 border-cyan-300 hover:bg-cyan-100 hover:text-cyan-900"
                title="Payment details - click to view or update"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Partial ({currentQuotation.advance_percentage || Math.round(((currentQuotation.paid_amount || 0) / currentQuotation.grand_total) * 100)}%)</span>
              </Button>
            ) : null}

            <Link href="/invoices">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-50 font-semibold shadow-xs"
                title="Go to Invoices Dashboard"
              >
                <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                <span>Invoices Tab</span>
              </Button>
            </Link>
          </>
        )}

        {/* Approved Quotation Actions: In Progress, Create Invoice, Mark as Completed */}
        {currentStatus === 'APPROVED' && currentQuotation && (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsInProgressModalOpen(true)}
              className="gap-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white shadow-sm font-semibold"
              title="Set this quotation to In Progress and specify estimated completion time"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Mark as In Progress</span>
            </Button>

            {currentQuotation.is_paid ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInvoiceOpen(true)}
                className="gap-1.5 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-sm font-semibold"
                title="View / Edit Commercial Tax Invoice"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>Invoice</span>
              </Button>
            ) : (
              <Link href={`/invoices/new?from_quote_id=${quotationId}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-sm font-semibold"
                  title="Create an Invoice from this approved quotation"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Create Invoice</span>
                </Button>
              </Link>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkCompletedClick}
              isLoading={isCompleting}
              className="gap-1.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-50 font-semibold shadow-xs"
              title="Mark this quotation lifecycle as Completed"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Mark as Completed</span>
            </Button>

            {currentQuotation.is_paid ? (
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
            ) : (currentQuotation.payment_status === 'PARTIALLY_PAID' || (currentQuotation.paid_amount && currentQuotation.paid_amount > 0)) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentOpen(true)}
                className="gap-1.5 text-xs font-semibold shadow-sm bg-cyan-50 text-cyan-800 border-cyan-300 hover:bg-cyan-100 hover:text-cyan-900"
                title={`Partial payment recorded (${currentQuotation.advance_percentage || Math.round(((currentQuotation.paid_amount || 0) / currentQuotation.grand_total) * 100)}%) - click to update`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Partial ({currentQuotation.advance_percentage || Math.round(((currentQuotation.paid_amount || 0) / currentQuotation.grand_total) * 100)}%)</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentOpen(true)}
                className="gap-1.5 text-xs font-semibold shadow-sm bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:text-amber-900"
                title="Record customer payment"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Mark as Paid</span>
              </Button>
            )}
          </>
        )}

        {/* IN_PROGRESS Quotation Actions */}
        {currentStatus === 'IN_PROGRESS' && currentQuotation && (
          <>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-bold shadow-xs select-none">
              <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
              <span>In Progress ({currentQuotation.estimated_days || 7} Days)</span>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleMarkCompletedClick}
              isLoading={isCompleting}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
              title="Mark this in-progress quotation as Completed"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Mark as Completed</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAdditionalDaysInput(7);
                setIsExtendModalOpen(true);
              }}
              className="gap-1.5 text-xs text-sky-700 border-sky-300 hover:bg-sky-50 font-semibold shadow-xs"
              title="Extend estimated completion time"
            >
              <Clock className="h-3.5 w-3.5 text-sky-600" />
              <span>Extend Time</span>
            </Button>

            {currentQuotation.is_paid ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInvoiceOpen(true)}
                className="gap-1.5 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-sm font-semibold"
                title="View / Edit Commercial Tax Invoice"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>Invoice</span>
              </Button>
            ) : (
              <Link href={`/invoices/new?from_quote_id=${quotationId}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-sm font-semibold"
                  title="Create an Invoice from this quotation"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Create Invoice</span>
                </Button>
              </Link>
            )}

            {currentQuotation.is_paid ? (
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
            ) : (currentQuotation.payment_status === 'PARTIALLY_PAID' || (currentQuotation.paid_amount && currentQuotation.paid_amount > 0)) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentOpen(true)}
                className="gap-1.5 text-xs font-semibold shadow-sm bg-cyan-50 text-cyan-800 border-cyan-300 hover:bg-cyan-100 hover:text-cyan-900"
                title={`Partial payment recorded (${currentQuotation.advance_percentage || Math.round(((currentQuotation.paid_amount || 0) / currentQuotation.grand_total) * 100)}%) - click to update`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Partial ({currentQuotation.advance_percentage || Math.round(((currentQuotation.paid_amount || 0) / currentQuotation.grand_total) * 100)}%)</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentOpen(true)}
                className="gap-1.5 text-xs font-semibold shadow-sm bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:text-amber-900"
                title="Record customer payment"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Mark as Paid</span>
              </Button>
            )}
          </>
        )}

        {/* PAYMENT_COMPLETED fallback */}
        {currentStatus === 'PAYMENT_COMPLETED' && currentQuotation && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkCompletedClick}
              isLoading={isCompleting}
              className="gap-1.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-50 font-semibold shadow-xs"
              title="Mark this quotation lifecycle as Completed"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Mark as Completed</span>
            </Button>
          </>
        )}

        {/* Mark Approved Option for Pending/Sent Quotes */}
        {['DRAFT', 'PENDING', 'SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(currentStatus) && (
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

        {/* Change Rates / Edit (Hidden for APPROVED, IN_PROGRESS, PAYMENT_COMPLETED, and COMPLETED locked quotes) */}
        {!['APPROVED', 'IN_PROGRESS', 'PAYMENT_COMPLETED', 'COMPLETED', 'EXPIRED', 'REJECTED'].includes(currentStatus) && (
          <Link href={`/quotations/${quotationId}/edit`}>
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
              <Edit className="h-3.5 w-3.5" />
              <span>Change Rates</span>
            </Button>
          </Link>
        )}

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

      {/* Set In Progress Modal */}
      <Modal
        isOpen={isInProgressModalOpen}
        onClose={() => !isSettingInProgress && setIsInProgressModalOpen(false)}
        title="Start Work • Mark as In Progress"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Transition quotation <strong>{quotationNumber}</strong> into execution. You can configure an estimated timeline for completion, which will be visible to your client on their live quotation portal.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Estimated Days to Complete</label>
            <div className="flex items-center gap-2">
              {[3, 7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setEstimatedDaysInput(days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    estimatedDaysInput === days
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {days} Days {days === 7 ? '(Default)' : ''}
                </button>
              ))}
            </div>
            <div className="pt-1 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={estimatedDaysInput}
                onChange={(e) => setEstimatedDaysInput(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <span className="text-xs text-slate-500 font-medium">calendar days</span>
            </div>
          </div>

          {/* Target completion date preview */}
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
              <Calendar className="h-4 w-4 text-sky-600" />
              <span>Target Completion Date</span>
            </div>
            <p className="text-xs font-bold text-sky-800">
              {formatDate(new Date(Date.now() + (Number(estimatedDaysInput) || 7) * 86400000).toISOString())}
            </p>
            <p className="text-[11px] text-sky-700">
              Client portal will display this timeline and status bar.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Scope / Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Design review complete, manufacturing & assembly starting"
              value={estimatedNotesInput}
              onChange={(e) => setEstimatedNotesInput(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsInProgressModalOpen(false)}
              disabled={isSettingInProgress}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSetInProgress}
              isLoading={isSettingInProgress}
              className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-sm"
            >
              <Play className="h-3.5 w-3.5 fill-current mr-1" />
              <span>Confirm &amp; Start Work</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Extend Time Modal */}
      <Modal
        isOpen={isExtendModalOpen}
        onClose={() => !isExtendingTime && setIsExtendModalOpen(false)}
        title="Extend Estimated Completion Time"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <div className="flex items-center justify-between font-semibold">
              <span>Current Estimate:</span>
              <span className="font-bold text-slate-900">{currentQuotation?.estimated_days || 7} Days</span>
            </div>
            {currentQuotation?.estimated_completion_date && (
              <div className="flex items-center justify-between text-slate-500">
                <span>Current Target:</span>
                <span>{formatDate(currentQuotation.estimated_completion_date)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Add Days to Timeline</label>
            <div className="flex items-center gap-2">
              {[3, 7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setAdditionalDaysInput(days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    additionalDaysInput === days
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  +{days} Days
                </button>
              ))}
            </div>
            <div className="pt-1 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={90}
                value={additionalDaysInput}
                onChange={(e) => setAdditionalDaysInput(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <span className="text-xs text-slate-500 font-medium">additional days</span>
            </div>
          </div>

          {/* New target preview */}
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
              <Clock className="h-4 w-4 text-sky-600" />
              <span>New Target Completion Date</span>
            </div>
            <p className="text-xs font-bold text-sky-800">
              {formatDate(
                new Date(
                  (currentQuotation?.estimated_completion_date
                    ? new Date(currentQuotation.estimated_completion_date).getTime()
                    : Date.now()) + (Number(additionalDaysInput) || 7) * 86400000
                ).toISOString()
              )}
            </p>
            <p className="text-[11px] text-sky-700">
              Total timeline: {(currentQuotation?.estimated_days || 7) + (Number(additionalDaysInput) || 7)} days
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Reason / Update Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Additional specifications requested by client"
              value={extendReasonInput}
              onChange={(e) => setExtendReasonInput(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsExtendModalOpen(false)}
              disabled={isExtendingTime}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExtendTime}
              isLoading={isExtendingTime}
              className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-sm"
            >
              <Clock className="h-3.5 w-3.5 mr-1" />
              <span>Save &amp; Update Portal</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Completion Confirmation Modal with Extend Time Option */}
      <Modal
        isOpen={isCompletionConfirmOpen}
        onClose={() => !isCompleting && setIsCompletionConfirmOpen(false)}
        title="Confirm Work Completion"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <h4 className="text-xs font-bold text-slate-900">
                Quotation {quotationNumber} Completion Check
              </h4>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              You set an estimated completion timeline of <strong>{currentQuotation?.estimated_days || 7} days</strong>
              {currentQuotation?.estimated_completion_date && (
                <> (Target: <strong>{formatDate(currentQuotation.estimated_completion_date)}</strong>)</>
              )}.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Have all project deliverables, services, and handover items been completely finalized? If more time is required, you can extend the delivery timeline instead.
            </p>
          </div>

          {!currentQuotation?.is_paid && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Payment Notice:</strong> This quotation has not been marked as paid ({grandTotalFormatted}). Confirming completion will save and lock it as Completed (Unpaid).
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCompletionConfirmOpen(false);
                setAdditionalDaysInput(7);
                setIsExtendModalOpen(true);
              }}
              className="text-xs text-sky-700 border-sky-300 hover:bg-sky-50 font-semibold w-full sm:w-auto"
            >
              <Clock className="h-3.5 w-3.5 text-sky-600 mr-1" />
              <span>Extend Time Instead</span>
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCompletionConfirmOpen(false)}
                disabled={isCompleting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => executeMarkCompleted({ unpaid: !currentQuotation?.is_paid })}
                isLoading={isCompleting}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                <span>Confirm &amp; Complete</span>
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Unpaid Warning Modal for direct Mark as Completed */}
      <Modal
        isOpen={isUnpaidWarningOpen}
        onClose={() => !isCompleting && setIsUnpaidWarningOpen(false)}
        title="Warning: Quotation Not Paid"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-900">Quotation Payment Has Not Been Received!</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Quotation <strong>{quotationNumber}</strong> has <strong>not been marked as paid</strong>.
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Are you sure you want to mark it as completed? Once confirmed, this quotation will be permanently saved and locked as <strong>Completed (Unpaid)</strong>. You will not be able to make any changes, rate edits, or revisions.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUnpaidWarningOpen(false)}
              disabled={isCompleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => executeMarkCompleted({ unpaid: true })}
              isLoading={isCompleting}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              <span>Confirm Mark as Completed (Unpaid)</span>
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
