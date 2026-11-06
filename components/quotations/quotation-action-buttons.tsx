'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Download,
  Printer,
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
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  ArrowRight,
  Mail,
  ChevronDown,
} from 'lucide-react';
import { Quotation, Organization, Customer, QuotationStatus } from '@/types/database';
import { InvoiceModal } from '@/components/quotations/invoice-modal';
import { PaymentModal } from '@/components/quotations/payment-modal';
import { SendQuotationWhatsAppModal } from '@/components/quotations/send-whatsapp-modal';
import { SendQuotationEmailModal, QuotationEmailTemplate } from '@/components/quotations/send-email-modal';
import { Modal } from '@/components/ui/modal';
import { formatDate } from '@/lib/utils';
import { formatCurrency, getSanitizedPdfFilename } from '@/lib/quotations/calculations';
import { buildWhatsAppMessage, getWhatsAppUrl } from '@/lib/whatsapp/automation';
import {
  checkQuotationInProgressOverdue,
  InProgressOverdueInfo,
} from '@/lib/quotations/timeline';
import { CommentButton } from '@/components/quotations/comments/comment-button';

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
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailNotification, setEmailNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isUnpaidWarningOpen, setIsUnpaidWarningOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isInProgressModalOpen, setIsInProgressModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isOverdueWarningModalOpen, setIsOverdueWarningModalOpen] = useState(false);
  const [isCompletionConfirmOpen, setIsCompletionConfirmOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedWhatsAppTemplate, setSelectedWhatsAppTemplate] = useState<'quotation_created' | 'quotation_reminder' | 'payment_reminder'>('quotation_created');
  const [isWhatsAppDropdownOpen, setIsWhatsAppDropdownOpen] = useState(false);
  const whatsappDropdownRef = React.useRef<HTMLDivElement>(null);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<QuotationEmailTemplate>('quotation_created');
  const [isEmailDropdownOpen, setIsEmailDropdownOpen] = useState(false);
  const emailDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close email and WhatsApp dropdowns on outside click
  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (emailDropdownRef.current && !emailDropdownRef.current.contains(event.target as Node)) {
        setIsEmailDropdownOpen(false);
      }
      if (whatsappDropdownRef.current && !whatsappDropdownRef.current.contains(event.target as Node)) {
        setIsWhatsAppDropdownOpen(false);
      }
    };
    if (isEmailDropdownOpen || isWhatsAppDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isEmailDropdownOpen, isWhatsAppDropdownOpen]);

  // Client PIN Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState<string>(quotation?.pin || (quotation as any)?.demo_pin || '');
  const [showPin, setShowPin] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedLinkAndPin, setCopiedLinkAndPin] = useState(false);
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [pinUpdateSuccess, setPinUpdateSuccess] = useState(false);

  // Form states for In Progress & Extend Time
  type ProgressMode = 'without_days' | 'today' | 'days';
  const [progressMode, setProgressMode] = useState<ProgressMode>('days');
  const [targetTimeInput, setTargetTimeInput] = useState<string>('18:00');
  const [isMarkDoneModalOpen, setIsMarkDoneModalOpen] = useState(false);
  const [estimatedDaysInput, setEstimatedDaysInput] = useState<number | null>(7);
  const [estimatedNotesInput, setEstimatedNotesInput] = useState<string>('');
  const [additionalDaysInput, setAdditionalDaysInput] = useState<number>(7);
  const [extendReasonInput, setExtendReasonInput] = useState<string>('');

  React.useEffect(() => {
    if (quotation) {
      setCurrentQuotation(quotation);
      if (quotation.pin) {
        setCurrentPin(quotation.pin);
      } else if ((quotation as any)?.demo_pin) {
        setCurrentPin((quotation as any).demo_pin);
      }
    }
    if (status) {
      setCurrentStatus((prev) => {
        // Prevent temporary backward reversion during revalidations
        if (prev === 'IN_PROGRESS' && status === 'APPROVED') {
          return prev;
        }
        if (prev === 'COMPLETED' && (status === 'APPROVED' || status === 'IN_PROGRESS')) {
          return prev;
        }
        return status;
      });
    }
  }, [quotation, status]);

  // Fetch fresh quotation details if PIN modal opened and PIN is missing
  React.useEffect(() => {
    if (isPinModalOpen && !currentPin) {
      fetch(`/api/quotations/${quotationId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.quotation?.pin) {
            setCurrentPin(data.quotation.pin);
            if (currentQuotation) {
              setCurrentQuotation({ ...currentQuotation, pin: data.quotation.pin, pin_protection_enabled: true });
            }
          }
        })
        .catch(() => {});
    }
  }, [isPinModalOpen, quotationId, currentPin, currentQuotation]);

  const isPinProtectionActive = Boolean(
    currentQuotation?.pin_protection_enabled ||
    currentQuotation?.pin ||
    (currentQuotation as any)?.demo_pin ||
    currentPin
  );

  const handleCopyPinOnly = () => {
    if (!currentPin) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentPin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2500);
    }
  };

  const handleCopyLinkAndPin = () => {
    const text = `Quotation #${quotationNumber} (${grandTotalFormatted})\nLink: ${publicUrl}\nAccess PIN: ${currentPin || '1234'}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedLinkAndPin(true);
      setTimeout(() => setCopiedLinkAndPin(false), 2500);
    }
  };

  const handleSaveNewPin = async () => {
    if (newPinInput.length !== 4) return;
    try {
      setIsUpdatingPin(true);
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin_protection_enabled: true,
          pin: newPinInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update PIN');

      setCurrentPin(newPinInput);
      if (currentQuotation) {
        setCurrentQuotation({
          ...currentQuotation,
          pin: newPinInput,
          pin_protection_enabled: true,
        });
      }
      setIsEditingPin(false);
      setPinUpdateSuccess(true);
      setTimeout(() => setPinUpdateSuccess(false), 3000);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update PIN');
    } finally {
      setIsUpdatingPin(false);
    }
  };

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
      setEmailNotification(null);
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

      if (customer?.email && !customer.email.endsWith('@mobile.client') && !customer.email.endsWith('@client.local')) {
        setEmailNotification({
          type: 'success',
          message: `Quotation finalized & sent to ${customer.email}`,
        });
        setTimeout(() => setEmailNotification(null), 8000);
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error finalizing quotation');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleSendEmail = async () => {
    if (isSendingEmail) return;
    setIsSendingEmail(true);
    setEmailNotification(null);
    try {
      const res = await fetch(`/api/quotations/${quotationId}/send`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch quotation email');
      }
      setEmailNotification({
        type: 'success',
        message: data.message || `Quotation email successfully sent to ${customer?.email || 'client'}`,
      });
      router.refresh();
      setTimeout(() => setEmailNotification(null), 8000);
    } catch (err: any) {
      setEmailNotification({
        type: 'error',
        message: err.message || 'Failed to dispatch quotation email',
      });
      setTimeout(() => setEmailNotification(null), 8000);
    } finally {
      setIsSendingEmail(false);
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
      let daysPayload: number | null = null;
      let targetIsoPayload: string | undefined = undefined;

      if (progressMode === 'without_days') {
        daysPayload = null;
        targetIsoPayload = undefined;
      } else if (progressMode === 'today') {
        daysPayload = 0;
        const now = new Date();
        const [hh, mm] = (targetTimeInput || '18:00').split(':').map(Number);
        const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh || 18, mm || 0, 0);
        targetIsoPayload = targetDate.toISOString();
      } else {
        daysPayload = Number(estimatedDaysInput) || 1;
        const targetDate = new Date(Date.now() + daysPayload * 86400000);
        targetIsoPayload = targetDate.toISOString();
      }

      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          estimated_days: daysPayload,
          estimated_completion_date: targetIsoPayload,
          notes: estimatedNotesInput,
          estimated_time_text:
            progressMode === 'today'
              ? `Today by ${targetTimeInput || '18:00'}${estimatedNotesInput ? ` - ${estimatedNotesInput}` : ''}`
              : estimatedNotesInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update quotation to In Progress');

      if (data.quotation) {
        setCurrentQuotation(data.quotation);
        setCurrentStatus('IN_PROGRESS');
      } else {
        setCurrentStatus('IN_PROGRESS');
      }

      setIsInProgressModalOpen(false);
      router.refresh();
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 200);
    } catch (err: any) {
      alert(err.message || 'Error setting quotation to In Progress');
    } finally {
      setIsSettingInProgress(false);
    }
  };

  const handleMarkDone = async () => {
    try {
      setIsCompleting(true);
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          unpaid: !currentQuotation?.is_paid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark quotation as done');

      if (data.quotation) {
        setCurrentQuotation(data.quotation);
        setCurrentStatus('COMPLETED');
      } else {
        setCurrentStatus('COMPLETED');
      }

      setIsMarkDoneModalOpen(false);
      setIsInProgressModalOpen(false);
      router.refresh();
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 200);
    } catch (err: any) {
      alert(err.message || 'Error marking quotation as done');
    } finally {
      setIsCompleting(false);
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
          notes: extendReasonInput,
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
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 200);
    } catch (err: any) {
      alert(err.message || 'Error extending quotation time');
    } finally {
      setIsExtendingTime(false);
    }
  };

  const handleExtendTimeline = handleExtendTime;

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

      // 1. First attempt: Client-side generation (0ms server CPU, completely immune to Cloudflare Error 1102)
      let targetQuote = quotation;
      if (!targetQuote && quotationId) {
        try {
          const qRes = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}`);
          if (qRes.ok) {
            targetQuote = await qRes.json();
          }
        } catch {}
      }

      const sanitizedFilename = getSanitizedPdfFilename('quotation', quotationNumber);

      if (targetQuote) {
        const fullQuote = {
          ...targetQuote,
          organization: organization || targetQuote.organization,
          customer: customer || targetQuote.customer,
        };
        const { downloadQuotationPdfClient } = await import('@/lib/pdf/client-download');
        const success = await downloadQuotationPdfClient(fullQuote, sanitizedFilename);
        if (success) {
          return;
        }
      }

      // 2. Secondary fallback: Server endpoint
      const res = await fetch(
        `/api/public/pdf?id=${encodeURIComponent(quotationId)}${publicToken ? `&token=${encodeURIComponent(publicToken)}` : ''}`
      );
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = sanitizedFilename;
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

  const hasIssuedInvoice = Boolean(
    currentQuotation?.has_issued_invoice ||
    currentQuotation?.issued_invoice_id ||
    currentQuotation?.invoice_number
  );
  const isLockedStatus = ['APPROVED', 'IN_PROGRESS', 'PAYMENT_COMPLETED', 'COMPLETED'].includes(currentStatus);
  const hasPayments = Boolean(currentQuotation?.is_paid || (currentQuotation?.paid_amount && currentQuotation.paid_amount > 0));
  const isLockedOrCommitted = isLockedStatus || hasIssuedInvoice || hasPayments;

  const canDeleteQuote = currentUserRole !== 'STAFF' && !isLockedOrCommitted;

  const handleDeleteQuotation = async () => {
    if (isLockedOrCommitted) {
      alert(
        `Quotation ${quotationNumber} cannot be deleted because it is ${currentStatus.replace('_', ' ').toLowerCase()}${
          hasIssuedInvoice ? ' and has an issued commercial tax invoice' : ''
        }. Completed, approved, or invoiced orders are protected under statutory commercial accounting standards.`
      );
      return;
    }

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

  const pinMsgSuffix = (isPinProtectionActive && (currentPin || currentQuotation?.pin))
    ? `\n🔑 Access PIN: ${currentPin || currentQuotation?.pin}`
    : '';

  const targetCust = customer || currentQuotation?.customer || null;
  const targetOrg = organization || currentQuotation?.organization || null;
  const targetPhone = targetCust?.phone;
  const targetCountryCode = targetCust?.phone_country_code || (targetCust?.country === 'India' || !targetCust?.country ? '+91' : '+1');

  const isPendingReview = ['SENT', 'VIEWED', 'PENDING'].includes(currentStatus);
  const isPaid = Boolean((currentQuotation as any)?.is_paid || currentStatus === 'PAYMENT_COMPLETED');
  const isPendingPayment = !isPaid && ['APPROVED', 'IN_PROGRESS', 'COMPLETED', 'SENT', 'VIEWED'].includes(currentStatus);

  const quoteReadyMsg = buildWhatsAppMessage({
    type: 'QUOTE_READY',
    template: targetOrg?.whatsapp_template_quote,
    customer: targetCust,
    quotation: currentQuotation || quotation,
    organization: targetOrg,
    baseUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
  });

  const quoteReminderMsg = buildWhatsAppMessage({
    type: 'QUOTE_REMINDER',
    template: targetOrg?.whatsapp_template_reminder,
    customer: targetCust,
    quotation: currentQuotation || quotation,
    organization: targetOrg,
    baseUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
  });

  const paymentReminderMsg = buildWhatsAppMessage({
    type: 'PAYMENT_REMINDER',
    customer: targetCust,
    quotation: currentQuotation || quotation,
    organization: targetOrg,
    baseUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
  });

  const whatsappText = isPendingPayment ? paymentReminderMsg : isPendingReview ? quoteReminderMsg : quoteReadyMsg;
  const whatsappUrl = getWhatsAppUrl({
    targetPhone,
    countryCode: targetCountryCode,
    message: whatsappText,
  });

  const overdueInfo = checkQuotationInProgressOverdue(currentQuotation);

  return (
    <>
      {emailNotification && (
        <div
          className={`mb-2 text-xs px-3 py-2 rounded-xl flex items-center justify-between gap-2 transition-all ${
            emailNotification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
              : 'bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-1.5 font-medium">
            {emailNotification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{emailNotification.message}</span>
          </div>
          <button
            onClick={() => setEmailNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* COMPLETED Quotation View - Locked Lifecycle */}
        {currentStatus === 'COMPLETED' && currentQuotation && (
          <>
            {currentQuotation.is_paid ? (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-bold shadow-2xs select-none">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Completed • Locked</span>
              </div>
            ) : (currentQuotation.payment_status === 'PARTIALLY_PAID' || (currentQuotation.paid_amount && currentQuotation.paid_amount > 0)) ? (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-50 border border-cyan-300 text-cyan-800 text-[11px] font-bold shadow-2xs select-none">
                <AlertTriangle className="h-3 w-3 text-cyan-600" />
                <span>Completed (Partially Paid) • Locked</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-bold shadow-2xs select-none">
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                <span>Completed (Unpaid) • Locked</span>
              </div>
            )}

            {/* Commercial Tax Invoice Action - Always available on COMPLETED */}
            <Button
              variant="outline"
              size="xs"
              onClick={() => setIsInvoiceOpen(true)}
              className="gap-1 text-[11px] text-indigo-700 border-indigo-300 hover:bg-indigo-50 font-semibold shadow-2xs"
              title="View / Issue Commercial Tax Invoice"
            >
              <Receipt className="h-3 w-3 text-indigo-600" />
              <span>{currentQuotation.has_issued_invoice ? 'View Invoice' : 'Issue Invoice'}</span>
            </Button>

            {/* Payment Actions for COMPLETED Quotations */}
            {currentQuotation.is_paid ? (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsPaymentOpen(true)}
                className="gap-1 text-[11px] font-semibold shadow-2xs bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900"
                title="Payment received in full - click to view details or history"
              >
                <CreditCard className="h-3 w-3" />
                <span>Paid</span>
              </Button>
            ) : (currentQuotation.payment_status === 'PARTIALLY_PAID' || (currentQuotation.paid_amount && currentQuotation.paid_amount > 0)) ? (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsPaymentOpen(true)}
                className="gap-1 text-[11px] font-semibold shadow-2xs bg-cyan-50 text-cyan-800 border-cyan-300 hover:bg-cyan-100 hover:text-cyan-900"
                title="Record remaining balance payment"
              >
                <CreditCard className="h-3 w-3 text-cyan-600" />
                <span>Record Balance ({formatCurrency(currentQuotation.balance_amount ?? (currentQuotation.grand_total - (currentQuotation.paid_amount || 0)), currentQuotation.currency)} due)</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsPaymentOpen(true)}
                className="gap-1 text-[11px] font-semibold shadow-2xs bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:text-amber-900"
                title="Record payment for this completed quotation"
              >
                <CreditCard className="h-3 w-3 text-amber-600" />
                <span>Record Payment</span>
              </Button>
            )}

            <Link href="/invoices">
              <Button
                variant="outline"
                size="xs"
                className="gap-1 text-[11px] text-slate-700 border-slate-300 hover:bg-slate-50 font-semibold shadow-2xs"
                title="Go to Invoices Dashboard"
              >
                <ExternalLink className="h-3 w-3 text-slate-500" />
                <span>Invoices Tab</span>
              </Button>
            </Link>
          </>
        )}

        {/* Approved Quotation Actions: In Progress, Mark as Done, Create Invoice */}
        {currentStatus === 'APPROVED' && currentQuotation && (
          <>
            <Button
              variant="primary"
              size="xs"
              onClick={() => {
                setProgressMode('days');
                setIsInProgressModalOpen(true);
              }}
              className="gap-1 text-[11px] bg-sky-600 hover:bg-sky-700 text-white shadow-2xs font-semibold"
              title="Set this quotation to In Progress and specify estimated completion time"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Mark as In Progress</span>
            </Button>

            <Button
              variant="outline"
              size="xs"
              onClick={() => setIsMarkDoneModalOpen(true)}
              className="gap-1 text-[11px] text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 font-semibold shadow-2xs"
              title="Work is completed - client will see work is done and can make payment"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>Mark as Done</span>
            </Button>

            <Button
              variant="outline"
              size="xs"
              onClick={() => setIsInvoiceOpen(true)}
              className="gap-1 text-[11px] bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-2xs font-semibold"
              title="View / Issue Commercial Tax Invoice"
            >
              <Receipt className="h-3 w-3" />
              <span>{currentQuotation.has_issued_invoice ? 'Invoice' : 'Issue Invoice'}</span>
            </Button>

            <Button
              variant="outline"
              size="xs"
              onClick={handleMarkCompletedClick}
              isLoading={isCompleting}
              className="gap-1 text-[11px] text-slate-700 border-slate-300 hover:bg-slate-50 font-semibold shadow-2xs"
              title="Mark this quotation lifecycle as Completed"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>Completed</span>
            </Button>

            {currentQuotation.is_paid ? (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsPaymentOpen(true)}
                className="gap-1 text-[11px] font-semibold shadow-2xs bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900"
                title="Payment received - click to view/edit details"
              >
                <CreditCard className="h-3 w-3" />
                <span>Paid</span>
              </Button>
            ) : (currentQuotation.payment_status === 'PARTIALLY_PAID' || (currentQuotation.paid_amount && currentQuotation.paid_amount > 0)) ? (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsPaymentOpen(true)}
                className="gap-1 text-[11px] font-semibold shadow-2xs bg-cyan-50 text-cyan-800 border-cyan-300 hover:bg-cyan-100 hover:text-cyan-900"
                title={`Partial payment recorded (${currentQuotation.advance_percentage || Math.round(((currentQuotation.paid_amount || 0) / currentQuotation.grand_total) * 100)}%) - click to update`}
              >
                <CreditCard className="h-3 w-3" />
                <span>Partial ({currentQuotation.advance_percentage || Math.round(((currentQuotation.paid_amount || 0) / currentQuotation.grand_total) * 100)}%)</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsPaymentOpen(true)}
                className="gap-1 text-[11px] font-semibold shadow-2xs bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:text-amber-900"
                title="Record customer payment"
              >
                <CreditCard className="h-3 w-3" />
                <span>Mark as Paid</span>
              </Button>
            )}
          </>
        )}

        {/* IN_PROGRESS Quotation Actions */}
        {currentStatus === 'IN_PROGRESS' && currentQuotation && (
          <>
            {overdueInfo.isOverdue ? (
              <button
                type="button"
                onClick={() => setIsOverdueWarningModalOpen(true)}
                className="group relative inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 hover:from-rose-600 hover:via-rose-700 hover:to-amber-700 text-white text-[11px] font-bold shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer border border-rose-400/40 ring-2 ring-rose-400/20"
                title="Timeline Overdue • Click to extend timeline or adjust completion"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300" />
                </span>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-100 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="tracking-tight">In Progress</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-black/20 text-white text-[10px] font-semibold border border-white/15">
                  {overdueInfo.overdueText || 'Overdue'}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-white/20 text-white px-1.5 py-0.5 rounded-md border border-white/25">
                  Overdue
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setProgressMode(
                    currentQuotation.estimated_days === 0
                      ? 'today'
                      : typeof currentQuotation.estimated_days === 'number'
                      ? 'days'
                      : 'without_days'
                  );
                  setIsInProgressModalOpen(true);
                }}
                className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 hover:border-sky-400 text-[11px] font-semibold shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                title="Work in Progress • Click to view or adjust timeline"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                </span>
                <span>
                  {currentQuotation.estimated_days === 0
                    ? 'In Progress (Today)'
                    : typeof currentQuotation.estimated_days === 'number'
                    ? `In Progress (${currentQuotation.estimated_days} Days)`
                    : 'In Progress'}
                </span>
                <Clock className="h-3 w-3 text-sky-600 opacity-60 group-hover:opacity-100 transition-opacity ml-0.5" />
              </button>
            )}

            <Button
              variant="primary"
              size="xs"
              onClick={() => setIsMarkDoneModalOpen(true)}
              isLoading={isCompleting}
              className="gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs font-semibold"
              title="Mark work as Done - client will see work is completed and can make payment"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Mark as Done</span>
            </Button>

            <Button
              variant="outline"
              size="xs"
              onClick={() => setIsInvoiceOpen(true)}
              className="gap-1 text-[11px] bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-2xs font-semibold"
              title="View / Issue Commercial Tax Invoice"
            >
              <Receipt className="h-3 w-3" />
              <span>{currentQuotation.has_issued_invoice ? 'Invoice' : 'Issue Invoice'}</span>
            </Button>

            {currentQuotation.is_paid ? (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsPaymentOpen(true)}
                className="gap-1 text-[11px] font-semibold shadow-2xs bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900"
                title="Payment received - click to view/edit details"
              >
                <CreditCard className="h-3 w-3" />
                <span>Paid</span>
              </Button>
            ) : (currentQuotation.payment_status === 'PARTIALLY_PAID' || (currentQuotation.paid_amount && currentQuotation.paid_amount > 0)) ? (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsPaymentOpen(true)}
                className="gap-1 text-[11px] font-semibold shadow-2xs bg-cyan-50 text-cyan-800 border-cyan-300 hover:bg-cyan-100 hover:text-cyan-900"
                title={`Partial payment recorded (${currentQuotation.advance_percentage || Math.round(((currentQuotation.paid_amount || 0) / currentQuotation.grand_total) * 100)}%) - click to update`}
              >
                <CreditCard className="h-3 w-3" />
                <span>Partial ({currentQuotation.advance_percentage || Math.round(((currentQuotation.paid_amount || 0) / currentQuotation.grand_total) * 100)}%)</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsPaymentOpen(true)}
                className="gap-1 text-[11px] font-semibold shadow-2xs bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:text-amber-900"
                title="Record customer payment"
              >
                <CreditCard className="h-3 w-3" />
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
              size="xs"
              onClick={handleMarkCompletedClick}
              isLoading={isCompleting}
              className="gap-1 text-[11px] text-slate-700 border-slate-300 hover:bg-slate-50 font-semibold shadow-2xs"
              title="Mark this quotation lifecycle as Completed"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>Mark as Completed</span>
            </Button>
          </>
        )}

        {/* Mark Approved Option for Pending/Sent Quotes */}
        {['DRAFT', 'PENDING', 'SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(currentStatus) && (
          <Button
            variant="outline"
            size="xs"
            onClick={handleMarkApproved}
            isLoading={isApproving}
            className="gap-1 text-[11px] text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 shadow-2xs font-semibold"
          >
            <Check className="h-3 w-3 text-emerald-600" />
            <span>Mark Approved</span>
          </Button>
        )}

        {/* If Draft: Show Save & Generate Approval Link Button */}
        {currentStatus === 'DRAFT' && (
          <Button
            variant="primary"
            size="xs"
            onClick={handleFinalizeDraft}
            isLoading={isFinalizing}
            className="gap-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs font-semibold"
            title="Finalize draft and generate official customer approval link"
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Save & Generate Approval Link</span>
          </Button>
        )}

        {/* Edit Quotation: Enabled for unapproved, approved, and in-progress quotations (Locked if completed) */}
        {!['COMPLETED', 'PAYMENT_COMPLETED'].includes(currentStatus) && (
          <Link href={`/quotations/${quotationId}/edit`}>
            <Button
              variant="secondary"
              size="xs"
              className="gap-1 text-[11px] font-medium"
              title={
                ['APPROVED', 'IN_PROGRESS'].includes(currentStatus)
                  ? 'Editing this quotation will create a new revision (REV01, REV02...) and require customer re-approval'
                  : 'Edit quotation'
              }
            >
              <Edit className="h-3 w-3" />
              <span>Edit Quote</span>
            </Button>
          </Link>
        )}

        {/* Customer Approval Links: ONLY generated & accessible after quotation is finalized/saved (status !== 'DRAFT') */}
        {currentStatus !== 'DRAFT' && (
          <>
            {/* Copy Public Link */}
            <Button
              variant="outline"
              size="xs"
              onClick={handleCopyLink}
              className="gap-1 text-[11px] shadow-2xs"
              title="Copy customer approval link"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 text-slate-500" />
                  <span>Copy Link</span>
                </>
              )}
            </Button>

            {/* WhatsApp Send / Resend / Follow-up / Payment Reminder Action */}
            <div className="relative inline-flex items-center" ref={whatsappDropdownRef}>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => {
                  const defaultTmpl = isPendingPayment
                    ? 'payment_reminder'
                    : isPendingReview
                    ? 'quotation_reminder'
                    : 'quotation_created';
                  setSelectedWhatsAppTemplate(defaultTmpl);
                  setIsWhatsAppModalOpen(true);
                }}
                className="gap-1 text-[11px] text-emerald-700 border-emerald-200 hover:bg-emerald-50 shadow-2xs rounded-r-none"
                title="Send quotation, follow-up or payment reminder via WhatsApp"
              >
                <MessageSquare className="h-3 w-3 text-emerald-600" />
                <span>
                  {isPendingPayment
                    ? 'WhatsApp Reminder'
                    : isPendingReview
                    ? 'WhatsApp Follow-up'
                    : 'WhatsApp'}
                </span>
              </Button>
              <button
                type="button"
                onClick={() => setIsWhatsAppDropdownOpen((prev) => !prev)}
                className="h-[26px] px-1 text-[11px] text-emerald-700 bg-white dark:bg-slate-900 border border-l-0 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-r-md flex items-center justify-center transition-colors shadow-2xs"
                title="Choose WhatsApp option (Resend / Follow-up / Payment Reminder)"
              >
                <ChevronDown className="h-3 w-3 text-emerald-600" />
              </button>

              {/* WhatsApp Dropdown Menu */}
              {isWhatsAppDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1 text-xs space-y-0.5 animate-in fade-in-50 zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWhatsAppTemplate('quotation_created');
                      setIsWhatsAppModalOpen(true);
                      setIsWhatsAppDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Resend WhatsApp</div>
                      <div className="text-[10px] text-slate-500">Initial quotation details &amp; link</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWhatsAppTemplate('quotation_reminder');
                      setIsWhatsAppModalOpen(true);
                      setIsWhatsAppDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-amber-700 dark:text-amber-400">Follow-up WhatsApp</div>
                      <div className="text-[10px] text-slate-500">Gentle quotation reminder</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWhatsAppTemplate('payment_reminder');
                      setIsWhatsAppModalOpen(true);
                      setIsWhatsAppDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <CreditCard className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-emerald-700 dark:text-emerald-400">Payment Reminder</div>
                      <div className="text-[10px] text-slate-500">Pending payment &amp; balance notice</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Email Send / Resend / Follow-up / Payment Reminder Action */}
            <div className="relative inline-flex items-center" ref={emailDropdownRef}>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => {
                  const defaultTmpl = isPendingPayment
                    ? 'payment_reminder'
                    : isPendingReview
                    ? 'quotation_reminder'
                    : 'quotation_created';
                  setSelectedEmailTemplate(defaultTmpl);
                  setIsEmailModalOpen(true);
                }}
                className="gap-1 text-[11px] text-blue-700 border-blue-200 hover:bg-blue-50 shadow-2xs rounded-r-none"
                title="Send quotation, follow-up or payment reminder email to customer"
              >
                <Mail className="h-3 w-3 text-blue-600" />
                <span>
                  {isPendingPayment
                    ? 'Payment Reminder'
                    : isPendingReview
                    ? 'Email Follow-up'
                    : 'Resend Email'}
                </span>
              </Button>
              <button
                type="button"
                onClick={() => setIsEmailDropdownOpen((prev) => !prev)}
                className="h-[26px] px-1 text-[11px] text-blue-700 bg-white dark:bg-slate-900 border border-l-0 border-blue-200 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-r-md flex items-center justify-center transition-colors shadow-2xs"
                title="Choose email template option (Resend / Follow-up / Payment Reminder)"
              >
                <ChevronDown className="h-3 w-3 text-blue-600" />
              </button>

              {/* Dropdown Menu */}
              {isEmailDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1 text-xs space-y-0.5 animate-in fade-in-50 zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEmailTemplate('quotation_created');
                      setIsEmailModalOpen(true);
                      setIsEmailDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Resend Email</div>
                      <div className="text-[10px] text-slate-500">Initial quotation details</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEmailTemplate('quotation_reminder');
                      setIsEmailModalOpen(true);
                      setIsEmailDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-amber-700 dark:text-amber-400">Follow-up Email</div>
                      <div className="text-[10px] text-slate-500">Gentle quotation reminder</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEmailTemplate('payment_reminder');
                      setIsEmailModalOpen(true);
                      setIsEmailDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <CreditCard className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-emerald-700 dark:text-emerald-400">Payment Reminder</div>
                      <div className="text-[10px] text-slate-500">Pending payment &amp; balance notice</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Open Public Portal View in New Tab */}
            <Link href={`/q/${publicToken}`} target="_blank">
              <Button variant="primary" size="xs" className="gap-1 text-[11px] shadow-2xs">
                <ExternalLink className="h-3 w-3" />
                <span>Client View</span>
              </Button>
            </Link>

            {/* View Client PIN (Shown when PIN protection is enabled) */}
            {isPinProtectionActive && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setIsPinModalOpen(true)}
                className="gap-1 text-[11px] text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100 hover:text-amber-900 font-semibold shadow-2xs"
                title="Click to view Client Portal Access PIN"
              >
                <KeyRound className="h-3 w-3 text-amber-600" />
                <span>Client PIN</span>
              </Button>
            )}
          </>
        )}

        {/* Download PDF */}
        <Button
          variant="outline"
          size="xs"
          onClick={handleDownloadPdf}
          isLoading={isDownloadingPdf}
          className="gap-1 text-[11px] shadow-2xs"
        >
          <Download className="h-3 w-3 text-slate-500" />
          <span>PDF</span>
        </Button>

        {/* Print Quotation */}
        <Button
          variant="outline"
          size="xs"
          onClick={() => window.print()}
          className="gap-1.5 h-[28px] sm:h-[30px] px-2.5 sm:px-3 text-[11px] font-semibold rounded-lg shadow-2xs"
          title="Print official quotation"
        >
          <Printer className="h-3.5 w-3.5 text-slate-500" />
          <span>Print</span>
        </Button>

        {/* Internal Staff Comments Button (Apple-style with smart unread/mention indicator) */}
        <CommentButton
          quotationId={quotationId}
          quotationNumber={quotationNumber}
        />

        {/* Create Revision (for approved quotations) */}
        {currentStatus === 'APPROVED' && (
          <Button
            variant="secondary"
            size="xs"
            onClick={handleCreateRevision}
            isLoading={isRevising}
            className="gap-1 text-[11px]"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Create Revision</span>
          </Button>
        )}

        {/* Delete Quotation (Hidden for STAFF, completed, approved, or invoiced orders) */}
        {canDeleteQuote && (
          <Button
            variant="outline"
            size="xs"
            onClick={handleDeleteQuotation}
            isLoading={isDeleting}
            className="gap-1 text-[11px] text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 shadow-2xs"
            title="Permanently Delete Quotation"
          >
            <Trash2 className="h-3 w-3 text-rose-500" />
            <span>Delete</span>
          </Button>
        )}
      </div>

      {/* Commercial Tax Invoice Modal */}
      {currentQuotation && (
        <InvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          quotation={currentQuotation}
          organization={organization}
          customer={customer}
          onInvoiceIssued={(inv) => {
            setCurrentQuotation((prev) =>
              prev
                ? {
                    ...prev,
                    has_issued_invoice: true,
                    issued_invoice_id: inv.id,
                    invoice_number: inv.invoice_number,
                  }
                : prev
            );
            router.refresh();
          }}
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

      {/* Set In Progress / Fulfillment Timeline Modal — Redesigned with Welcome Popup Aesthetics */}
      {isInProgressModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-[4px] overflow-y-auto animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 -z-10"
            onClick={() => !isSettingInProgress && setIsInProgressModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
            {/* Top Glow Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black border border-sky-200/80 shrink-0">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      Fulfillment &amp; Work Progress
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 text-[11px] font-bold text-sky-700 dark:text-sky-300">
                      #{quotationNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure work timelines. Your client sees real-time milestone progress on their portal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSettingInProgress && setIsInProgressModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              {/* Timeline Mode Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Choose Fulfillment Option
                </label>
                <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setProgressMode('without_days')}
                    className={`py-2 px-1.5 rounded-xl text-center transition-all cursor-pointer ${
                      progressMode === 'without_days'
                        ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProgressMode('today');
                      setEstimatedDaysInput(0);
                    }}
                    className={`py-2 px-1.5 rounded-xl text-center transition-all cursor-pointer ${
                      progressMode === 'today'
                        ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProgressMode('days');
                      if (!estimatedDaysInput || estimatedDaysInput <= 0) setEstimatedDaysInput(7);
                    }}
                    className={`py-2 px-1.5 rounded-xl text-center transition-all cursor-pointer ${
                      progressMode === 'days'
                        ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Set Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsInProgressModalOpen(false);
                      setIsMarkDoneModalOpen(true);
                    }}
                    className="py-2 px-1.5 rounded-xl text-center bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-all font-bold cursor-pointer"
                  >
                    ✓ Done
                  </button>
                </div>
              </div>

              {/* Mode 1: Without Days */}
              {progressMode === 'without_days' && (
                <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/80 text-xs text-sky-950 dark:text-sky-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sky-900 dark:text-sky-300 text-sm">
                    <Play className="h-4 w-4 fill-sky-600 text-sky-600" />
                    <span>In Progress • Flexible Scope</span>
                  </div>
                  <p className="text-xs text-sky-800 dark:text-sky-300/90 leading-relaxed">
                    Quotation displays as <strong>In Progress</strong> with no artificial deadline. Ideal for retainer work, open milestones, or ongoing consulting.
                  </p>
                </div>
              )}

              {/* Mode 2: Same Day / Today (0d) */}
              {progressMode === 'today' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 text-sm">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span>Same-Day Completion (Finishes Today)</span>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                      Your client portal displays a live <strong>countdown timer</strong> ticking down to the target hour today.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Target Completion Time (Today)
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { label: '+2 Hours', hours: 2 },
                        { label: '+4 Hours', hours: 4 },
                        { label: '5:00 PM', time: '17:00' },
                        { label: '8:00 PM', time: '20:00' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            if (preset.hours) {
                              const d = new Date();
                              d.setHours(d.getHours() + preset.hours);
                              const hh = String(d.getHours()).padStart(2, '0');
                              const mm = String(d.getMinutes()).padStart(2, '0');
                              setTargetTimeInput(`${hh}:${mm}`);
                            } else if (preset.time) {
                              setTargetTimeInput(preset.time);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            targetTimeInput === preset.time
                              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <input
                        type="time"
                        value={targetTimeInput}
                        onChange={(e) => setTargetTimeInput(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <span className="text-xs text-slate-500">Target completion time today</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 3: Specific Calendar Days */}
              {progressMode === 'days' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 space-y-3">
                    <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300 block">
                      Estimated Duration (Calendar Days)
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {[3, 7, 14, 21, 30, 45].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setEstimatedDaysInput(days)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            estimatedDaysInput === days
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {days}d {days === 7 ? '★' : ''}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={estimatedDaysInput || 1}
                        onChange={(e) => setEstimatedDaysInput(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">calendar days</span>
                    </div>

                    {/* Target Date Pill */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 flex items-center justify-between text-xs">
                      <span className="text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                        Target Completion Date:
                      </span>
                      <span className="font-black text-slate-900 dark:text-white">
                        {formatDate(new Date(Date.now() + (Number(estimatedDaysInput) || 7) * 86400000).toISOString())}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Deliverable Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder={progressMode === 'today' ? 'e.g. Design started, delivery today by 5 PM' : 'e.g. Sprint 1 deliverables started'}
                  value={estimatedNotesInput}
                  onChange={(e) => setEstimatedNotesInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInProgressModalOpen(false)}
                  disabled={isSettingInProgress}
                  className="rounded-xl px-5 h-10 font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSetInProgress}
                  isLoading={isSettingInProgress}
                  className="bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold rounded-xl px-6 h-10 shadow-lg shadow-indigo-600/20 gap-1.5 border border-indigo-500/20 text-xs"
                >
                  <Play className="h-3.5 w-3.5 fill-current mr-0.5" />
                  <span>Confirm Fulfillment Timeline</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark Work as Done Modal — Redesigned with QuoteFlow Welcome Popup Aesthetics */}
      {isMarkDoneModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-[4px] overflow-y-auto animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 -z-10"
            onClick={() => !isCompleting && setIsMarkDoneModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
            {/* Top Glow Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500" />

            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black border border-emerald-200/80 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    Mark Work as Done
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Confirm that all deliverables for #{quotationNumber} are finished.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isCompleting && setIsMarkDoneModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span>Deliverables Finished &amp; Ready!</span>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Marking as <strong>Done</strong> confirms that all service scope and items for quotation <strong>#{quotationNumber}</strong> have been completed.
                </p>
                {currentQuotation?.is_paid ? (
                  <div className="p-2.5 rounded-xl bg-emerald-100/90 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-semibold text-xs flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>Quotation is fully paid. Status will advance to Completed.</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-amber-800 dark:text-amber-300">Payment Status: Balance Pending</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                        {formatCurrency(currentQuotation?.grand_total || 0, currentQuotation?.currency || 'USD')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      The client portal will display <strong>&quot;Work is Done • Please Make Payment&quot;</strong> with direct payment options so your client can settle immediately.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMarkDoneModalOpen(false)}
                  disabled={isCompleting}
                  className="rounded-xl px-5 h-10 font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleMarkDone}
                  isLoading={isCompleting}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl px-6 h-10 shadow-lg shadow-emerald-600/20 gap-1.5 border border-emerald-500/20 text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-0.5" />
                  <span>Confirm Deliverables Complete</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extend Time Modal — Redesigned with QuoteFlow Welcome Popup Aesthetics */}
      {isExtendModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-[4px] overflow-y-auto animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 -z-10"
            onClick={() => !isExtendingTime && setIsExtendModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
            {/* Top Glow Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-sky-500" />

            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black border border-amber-200/80 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    Extend Completion Time
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Add extra days for #{quotationNumber} with live timeline updates.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isExtendingTime && setIsExtendModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Current Timeline: <strong>{currentQuotation?.estimated_days || 7} Days</strong></span>
                {currentQuotation?.estimated_completion_date && (
                  <span className="text-slate-500">({formatDate(currentQuotation.estimated_completion_date)})</span>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-3">
                <label className="text-xs font-bold text-amber-900 dark:text-amber-300 block">
                  Add Additional Days
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setAdditionalDaysInput(days)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        additionalDaysInput === days
                          ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      +{days}d
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={additionalDaysInput}
                    onChange={(e) => setAdditionalDaysInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">additional calendar days</span>
                </div>

                {/* New target preview */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-amber-100 dark:border-amber-900 flex items-center justify-between text-xs">
                  <span className="text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-600" />
                    New Target Completion:
                  </span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {formatDate(
                      new Date(
                        (currentQuotation?.estimated_completion_date
                          ? new Date(currentQuotation.estimated_completion_date).getTime()
                          : Date.now()) + (Number(additionalDaysInput) || 7) * 86400000
                      ).toISOString()
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for Extension (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scope extension, client feedback revisions"
                  value={extendReasonInput}
                  onChange={(e) => setExtendReasonInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsExtendModalOpen(false)}
                  disabled={isExtendingTime}
                  className="rounded-xl px-5 h-10 font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleExtendTimeline}
                  isLoading={isExtendingTime}
                  className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-xl px-6 h-10 shadow-lg shadow-amber-600/20 gap-1.5 border border-amber-500/20 text-xs"
                >
                  <span>Update Completion Timeline</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Client Access PIN Modal */}
      <Modal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setIsEditingPin(false);
          setPinUpdateSuccess(false);
        }}
        title={`Client Portal Access PIN - ${quotationNumber}`}
        maxWidth="md"
      >
        <div className="space-y-4 pt-1">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="text-xs space-y-1">
              <p className="font-semibold text-amber-950">
                This quotation is protected with a 4-digit security PIN.
              </p>
              <p className="text-amber-800 leading-relaxed">
                When your client opens the <strong>Client View</strong> link, they must enter this PIN to view the quotation.
              </p>
            </div>
          </div>

          {/* Current PIN Display */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                4-Digit Client Access PIN
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Protection Active
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-2xl font-black tracking-widest text-indigo-700 select-all">
                  {showPin ? (currentPin || '••••') : '••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                  title={showPin ? 'Hide PIN' : 'Reveal PIN'}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleCopyPinOnly}
                  disabled={!currentPin}
                  className="gap-1 text-xs font-semibold"
                >
                  {copiedPin ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedPin ? 'Copied' : 'Copy PIN'}</span>
                </Button>
              </div>
            </div>

            {/* Quick Share Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleCopyLinkAndPin}
                className="gap-1.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-100 font-semibold w-full justify-center"
                title="Copy client portal link and PIN together"
              >
                {copiedLinkAndPin ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied Link + PIN!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    <span>Copy Link + PIN</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => {
                  setIsPinModalOpen(false);
                  setIsWhatsAppModalOpen(true);
                }}
                className="gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-semibold w-full justify-center"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                <span>Share on WhatsApp</span>
              </Button>
            </div>
          </div>

          {/* Change PIN toggle / section */}
          {isEditingPin ? (
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Set New 4-Digit PIN
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingPin(false)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                >
                  Cancel
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={4}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  placeholder="e.g. 1234"
                  className="h-9 w-28 text-center font-mono font-bold text-base tracking-widest rounded-lg border border-indigo-300 bg-white text-indigo-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setNewPinInput(Math.floor(1000 + Math.random() * 9000).toString())}
                  className="h-9 text-xs"
                >
                  Randomize
                </Button>
                <Button
                  type="button"
                  size="xs"
                  onClick={handleSaveNewPin}
                  isLoading={isUpdatingPin}
                  disabled={newPinInput.length !== 4}
                  className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Save PIN
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setNewPinInput(currentPin || Math.floor(1000 + Math.random() * 9000).toString());
                  setIsEditingPin(true);
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Change or reset this PIN &rarr;
              </button>

              {pinUpdateSuccess && (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>PIN updated!</span>
                </span>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPinModalOpen(false);
                setIsEditingPin(false);
              }}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Timeline Overdue Warning Modal */}
      {isOverdueWarningModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-[4px] overflow-y-auto animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 -z-10"
            onClick={() => !isExtendingTime && !isCompleting && setIsOverdueWarningModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
            {/* Top Amber-Rose Glow Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black border border-amber-500/30 shrink-0 shadow-xs">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      Timeline Overdue
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
                      {overdueInfo.overdueText}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Quotation #{quotationNumber} has exceeded scheduled completion time.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isExtendingTime && !isCompleting && setIsOverdueWarningModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4">
              {/* Short Warning Message Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50/60 dark:from-amber-950/30 dark:to-rose-950/20 border border-amber-200/90 dark:border-amber-800/80 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-200 text-sm">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Delivery Deadline Passed</span>
                </div>
                <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed font-medium">
                  The scheduled in-progress delivery time or days for this quotation have already passed, but deliverables are not yet marked as completed.
                </p>
                {overdueInfo.targetDate && (
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 pt-1 flex-wrap">
                    <span className="font-semibold text-slate-500">Scheduled Target:</span>
                    <span className="font-black font-mono">{formatDate(overdueInfo.targetDate)}</span>
                    <span className="text-rose-600 font-bold">({overdueInfo.overdueText})</span>
                  </div>
                )}
              </div>

              {/* Client Portal Reassurance Note (Crucial requirement: client portal does NOT see warning) */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-slate-900 dark:text-slate-200">Client Portal Protected:</strong> Your customer does <em>not</em> see this overdue warning. Their portal calmly displays &ldquo;Final Handover in Progress • Wrapping up deliverables&rdquo; to protect client trust and relationship.
                </p>
              </div>

              {/* Action Choices Section */}
              <div className="space-y-3 pt-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  How would you like to proceed?
                </p>

                {/* Option A: Extend Timeline */}
                <div className="p-4 rounded-2xl border border-sky-200 dark:border-sky-800/70 bg-sky-50/50 dark:bg-sky-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-extrabold text-xs text-sky-900 dark:text-sky-200">
                      <Clock className="h-4 w-4 text-sky-600 shrink-0" />
                      <span>Option 1: Extend Completion Timeline</span>
                    </div>
                    <span className="text-[11px] text-sky-700 dark:text-sky-300 font-semibold">
                      Adds extra days
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 5, 7, 14].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setAdditionalDaysInput(days)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          additionalDaysInput === days
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        +{days} Days
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={additionalDaysInput}
                        onChange={(e) => setAdditionalDaysInput(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <span className="text-xs text-slate-500 font-medium">days</span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        await handleExtendTimeline();
                        setIsOverdueWarningModalOpen(false);
                      }}
                      isLoading={isExtendingTime}
                      className="border-sky-300 text-sky-700 hover:bg-sky-100 font-bold text-xs h-9 rounded-xl px-4 gap-1.5"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Extend by +{additionalDaysInput}d</span>
                    </Button>
                  </div>
                </div>

                {/* Option B: Mark as Done / Complete */}
                <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-extrabold text-xs text-emerald-900 dark:text-emerald-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Option 2: Deliverables Finished</span>
                    </div>
                    <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                      Work is ready. Advances status to Completed.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={async () => {
                      setIsOverdueWarningModalOpen(false);
                      await handleMarkDone();
                    }}
                    isLoading={isCompleting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl px-4 shadow-sm gap-1.5 shrink-0"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Mark as Done</span>
                  </Button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOverdueWarningModalOpen(false)}
                  disabled={isExtendingTime || isCompleting}
                  className="rounded-xl px-4 h-9 font-semibold text-xs text-slate-600"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official WhatsApp Business Modal */}
      <SendQuotationWhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        quotation={currentQuotation || quotation!}
        customer={customer || currentQuotation?.customer}
        organization={organization || currentQuotation?.organization}
        initialTemplate={selectedWhatsAppTemplate}
      />

      {/* Quotation Email Modal (Initial Send & Follow-up Reminder) */}
      <SendQuotationEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        quotation={currentQuotation || quotation!}
        customer={customer || currentQuotation?.customer}
        organization={organization || currentQuotation?.organization}
        initialTemplate={selectedEmailTemplate}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </>
  );
}
