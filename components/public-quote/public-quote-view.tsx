'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Quotation, QuotationChatMessage } from '@/types/database';
import { formatCurrency, calculateQuotationTotals, isValidDocumentText, sanitizeTaxBreakdown, harmonizePaymentTerms, harmonizeTermsAndConditions } from '@/lib/quotations/calculations';
import { getCountryProfile } from '@/lib/tax/country-config';
import { getEffectiveDocumentLanguage, getLocalizedTerm, isGccCountry } from '@/lib/tax/gcc-translations';
import { formatDate, formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApprovalModal } from '@/components/public-quote/approval-modal';
import { RejectionModal } from '@/components/public-quote/rejection-modal';
import {
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  Smartphone,
  Layers,
  MessageSquare,
  Send,
  CheckCheck,
  Paperclip,
  FileText,
  Lock,
  CreditCard,
  QrCode,
  Landmark,
  Bitcoin,
  Banknote,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Link as LinkIcon,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import {
  parseLogoUrl,
  getLogoShapeClass,
  getLogoFitClass,
  getCompanyInitials,
} from '@/lib/utils/logo';
import { getSanitizedPdfFilename } from '@/lib/quotations/calculations';
import { PortalPinGate } from '@/components/public-quote/portal-pin-gate';
import { QuotationFlowChart } from '@/components/quotations/quotation-flow-chart';
import { QuotationCountdownWidget } from '@/components/public-quote/quotation-countdown-widget';
import { getBusinessDirectWhatsAppUrl } from '@/lib/whatsapp/automation';

interface PublicQuoteViewProps {
  initialQuotation: Quotation;
  allQuotations?: Quotation[];
  token: string;
}

export function PublicQuoteView({ initialQuotation, allQuotations, token }: PublicQuoteViewProps) {
  const [quotation, setQuotation] = useState<Quotation>(initialQuotation);
  const [selectedOptionalIds, setSelectedOptionalIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    (initialQuotation.items || []).forEach((it) => {
      if (it.is_optional && it.is_selected !== false) {
        set.add(it.id || it.description);
      }
    });
    return set;
  });
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isRejectionOpen, setIsRejectionOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
  const [clientCategory, setClientCategory] = useState<string>('ALL');
  const [isProposalMenuOpen, setIsProposalMenuOpen] = useState(false);
  const [switchingToken, setSwitchingToken] = useState<string | null>(null);

  // Client Portal PIN Auth Gate state
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [authMethod, setAuthMethod] = useState<'MOBILE' | 'EMAIL' | 'BOTH'>('MOBILE');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [customerPhoneMasked, setCustomerPhoneMasked] = useState('');
  const [customerEmailMasked, setCustomerEmailMasked] = useState('');

  // Unopened / "NEW" quotation tracking
  const [openedQuoteIds, setOpenedQuoteIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const saved = localStorage.getItem('quoteflow_client_opened_quotes');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Customer Chat Popup state
  const [chatMessages, setChatMessages] = useState<QuotationChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatAttachment, setChatAttachment] = useState<{
    name: string;
    url: string;
    type: string;
    size: number;
    is_payment_proof?: boolean;
  } | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [senderName, setSenderName] = useState(
    initialQuotation.customer?.name || initialQuotation.customer?.company_name || ''
  );
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isChatPopupOpen, setIsChatPopupOpen] = useState(false);
  const isChatPopupOpenRef = useRef<boolean>(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const prevChatCountRef = useRef<number>(0);

  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const isImg = file.type.startsWith('image/');
      setChatAttachment({
        name: file.name,
        url: dataUrl,
        type: file.type || 'application/octet-stream',
        size: file.size,
        is_payment_proof:
          isImg ||
          file.name.toLowerCase().includes('payment') ||
          file.name.toLowerCase().includes('receipt') ||
          file.name.toLowerCase().includes('screenshot'),
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const unreadStaffCount = chatMessages.filter(
    (m) => m.sender_role === 'STAFF' && !m.is_read
  ).length;

  const org = quotation.organization || initialQuotation.organization;
  const docLang = getEffectiveDocumentLanguage(org);
  const brandColor = org?.brand_color || (quotation as any)?.brand_color || '#4f46e5';
  const customer = quotation.customer;

  const businessWhatsAppUrl = getBusinessDirectWhatsAppUrl({
    businessWhatsAppNumber: org?.whatsapp_number,
    businessCountryCode: org?.whatsapp_country_code || '+91',
    quotationNumber: quotation.quotation_number,
    companyName: org?.name,
    customerName: customer?.name || customer?.company_name,
  });
  const taxMode = quotation.tax_mode || org?.default_tax_mode || 'exclusive';
  const placeOfSupply =
    quotation.place_of_supply ||
    customer?.place_of_supply ||
    customer?.billing_state ||
    customer?.state ||
    null;

  const countryNameOrCode =
    quotation.organization?.country ||
    org?.country ||
    quotation.organization?.business_country ||
    org?.business_country ||
    '';

  const isIndia = Boolean(
    (quotation.organization?.business_country || org?.business_country || '').toUpperCase() === 'IN' ||
    (quotation.organization?.country || org?.country || '').toLowerCase() === 'india' ||
    (quotation.organization?.country || org?.country || '').toUpperCase() === 'IN' ||
    quotation.organization?.billing_region === 'INDIA' ||
    org?.billing_region === 'INDIA' ||
    quotation.currency === 'INR' ||
    org?.default_currency === 'INR'
  );

  const isUAE = Boolean(
    (quotation.organization?.business_country || org?.business_country || '').toUpperCase() === 'AE' ||
    (quotation.organization?.country || org?.country || '').toLowerCase().includes('emirates') ||
    (quotation.organization?.country || org?.country || '').toLowerCase() === 'uae' ||
    quotation.currency === 'AED' ||
    org?.default_currency === 'AED'
  );

  const countryProfile = getCountryProfile(countryNameOrCode || (isUAE ? 'AE' : (isIndia ? 'IN' : 'US')));

  const effectiveTaxName = !isIndia
    ? (quotation.tax_name && !quotation.tax_name.toUpperCase().includes('GST')
        ? quotation.tax_name
        : (isUAE ? 'VAT' : (org?.tax_label && !org?.tax_label.toUpperCase().includes('GST') ? org.tax_label : 'Tax')))
    : (quotation.tax_name || org?.tax_label || 'GST');

  const calculated = calculateQuotationTotals(
    (quotation.items || []).map((it) => {
      const isSel = it.is_optional ? selectedOptionalIds.has(it.id || it.description) : true;
      return {
        quantity: Number(it.quantity) || 0,
        unit_price: Number(it.unit_price) || 0,
        tax_rate: (it.tax_rate !== undefined && it.tax_rate !== null && it.tax_rate !== '')
          ? Number(it.tax_rate)
          : Number(quotation.tax_rate || 0),
        is_optional: it.is_optional,
        is_selected: isSel,
      };
    }),
    quotation.discount_type || null,
    Number(quotation.discount_value) || 0,
    {
      taxMode,
      currency: quotation.currency,
      country: countryNameOrCode || (isUAE ? 'AE' : (isIndia ? 'IN' : 'US')),
      taxName: effectiveTaxName,
      isIndiaGst: isIndia,
      taxRate: Number(quotation.tax_rate || 0),
      businessState: org?.business_state || org?.state || null,
      placeOfSupply,
    }
  );

  const hasOptionalItemsToggled = (quotation.items || []).some(
    (it) => it.is_optional && !selectedOptionalIds.has(it.id || it.description)
  );

  const displaySubtotal = (!hasOptionalItemsToggled && Number(quotation.subtotal) > 0)
    ? Number(quotation.subtotal)
    : calculated.subtotal;
  const displayDiscount = (!hasOptionalItemsToggled && Number(quotation.discount_amount) > 0)
    ? Number(quotation.discount_amount)
    : calculated.discount_amount;
  const displayTax = (!hasOptionalItemsToggled && Number(quotation.tax_amount) > 0)
    ? Number(quotation.tax_amount)
    : calculated.tax_amount;
  const displayTotal = (!hasOptionalItemsToggled && Number(quotation.grand_total) > 0)
    ? Number(quotation.grand_total)
    : calculated.grand_total;

  const displayTaxBreakdown = sanitizeTaxBreakdown(
    quotation.tax_breakdown && quotation.tax_breakdown.length > 0
      ? quotation.tax_breakdown
      : calculated.tax_breakdown,
    isIndia,
    effectiveTaxName,
    displayTax,
    quotation.tax_rate || calculated.tax_rate || (isUAE ? 5 : 0)
  );
  const grandTotalFormatted = formatCurrency(displayTotal, quotation.currency);
  const isDemo = token === 'sec_8f92m1k4092b' || quotation.quotation_number === 'Q-000042';

  const getValidityEndTime = (validUntil?: string | null) => {
    if (!validUntil) return Infinity;
    const datePart = String(validUntil).split('T')[0];
    const parts = datePart.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999).getTime();
    }
    const d = new Date(validUntil);
    if (isNaN(d.getTime())) return Infinity;
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  };

  const validityCountdown = React.useMemo(() => {
    if (!quotation.valid_until) return null;
    // If the quotation has already been approved, paid, or completed, validity no longer counts down or expires
    if (
      quotation.is_paid ||
      quotation.status === 'APPROVED' ||
      quotation.status === 'IN_PROGRESS' ||
      quotation.status === 'COMPLETED' ||
      quotation.status === 'PAYMENT_COMPLETED'
    ) {
      return null;
    }
    const endTime = getValidityEndTime(quotation.valid_until);
    const now = Date.now();
    const diffMs = endTime - now;
    if (diffMs <= 0) {
      return { isExpired: true, isUrgent: true, days: 0, hours: 0, text: 'Offer Expired' };
    }
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const isUrgent = days <= 3;
    let text = '';
    if (days > 0) {
      text = `${days} ${days === 1 ? 'day' : 'days'} remaining`;
      if (hours > 0 && days <= 2) {
        text += ` and ${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
      }
    } else {
      text = `${hours} ${hours === 1 ? 'hour' : 'hours'} remaining`;
    }
    return { isExpired: false, isUrgent, days, hours, text };
  }, [quotation.valid_until, quotation.status, quotation.is_paid]);

  // Advance payment is ONLY active if explicitly enabled by the business and configured with a valid percentage
  const isAdvanceRequired = Boolean(
    quotation.enable_advance === true &&
    quotation.payment_terms_type !== 'FULL' &&
    quotation.advance_percentage !== null &&
    quotation.advance_percentage !== undefined &&
    Number(quotation.advance_percentage) > 0 &&
    Number(quotation.advance_percentage) < 100
  );

  const amountDueForUpi = React.useMemo(() => {
    if (quotation.payment_status === 'PARTIALLY_PAID' && quotation.balance_amount) {
      return quotation.balance_amount;
    }
    if (
      (!quotation.is_paid || quotation.payment_status === 'UNPAID') &&
      isAdvanceRequired
    ) {
      return Math.round(((displayTotal * quotation.advance_percentage!) / 100 + Number.EPSILON) * 100) / 100;
    }
    return displayTotal;
  }, [quotation, displayTotal, isAdvanceRequired]);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const handleCopy = (text: string, fieldKey: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

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
  // UPI payment option remove from other countries than india
  if (!isIndia) {
    showUpi = false;
  }
  // Payment link and client portal Pay button strictly don't show in india
  if (isIndia) {
    showPaymentLink = false;
  }

  const isPaid = Boolean(quotation.is_paid || quotation.status === 'PAYMENT_COMPLETED');
  const isCompleted = quotation.status === 'COMPLETED' || quotation.status === 'PAYMENT_COMPLETED';
  const hasPaymentRecorded = Boolean(
    quotation.is_paid || ((quotation.paid_amount ?? 0) > 0)
  );
  const isPaymentConfirmed = Boolean(
    quotation.payment_confirmed_by_company ?? quotation.is_paid
  );
  const isPartiallyPaid = Boolean(
    !isPaid &&
      (quotation.payment_status === 'PARTIALLY_PAID' ||
        ((quotation.paid_amount ?? 0) > 0))
  );

  const isExpired =
    quotation.status === 'EXPIRED' ||
    (Date.now() > getValidityEndTime(quotation.valid_until) &&
      quotation.status !== 'APPROVED' &&
      quotation.status !== 'IN_PROGRESS' &&
      quotation.status !== 'COMPLETED' &&
      quotation.status !== 'REJECTED');

  const isAlreadyApprovedOrSigned = Boolean(
    quotation.status === 'APPROVED' ||
    quotation.status === 'IN_PROGRESS' ||
    quotation.status === 'COMPLETED' ||
    quotation.status === 'PAYMENT_COMPLETED' ||
    quotation.approved_at ||
    quotation.signature
  );

  const canTakeAction =
    !isExpired &&
    !isCompleted &&
    !isPaid &&
    !quotation.is_token_revoked &&
    !isAlreadyApprovedOrSigned &&
    ['SENT', 'VIEWED', 'PENDING', 'PENDING_APPROVAL'].includes(quotation.status);

  // Helper: check if timestamp is within 24 hours
  const isWithin24Hours = (dateStr?: string | null): boolean => {
    if (!dateStr) return false;
    const t = new Date(dateStr).getTime();
    if (isNaN(t)) return false;
    const diffMs = Date.now() - t;
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours < 24;
  };

  const isQuoteActionableStatus = (q: Quotation): boolean => {
    const isPastApproval = Boolean(
      q.status === 'APPROVED' ||
      q.status === 'IN_PROGRESS' ||
      q.status === 'COMPLETED' ||
      q.status === 'PAYMENT_COMPLETED' ||
      q.approved_at ||
      q.signature
    );
    const isExp =
      q.status === 'EXPIRED' ||
      (Date.now() > getValidityEndTime(q.valid_until) &&
        !isPastApproval &&
        q.status !== 'REJECTED');
    return (
      !isExp &&
      !isPastApproval &&
      q.status !== 'REJECTED' &&
      q.status !== 'CANCELLED' &&
      q.status !== 'DRAFT' &&
      ['SENT', 'VIEWED', 'PENDING', 'PENDING_APPROVAL'].includes(q.status)
    );
  };

  const isQuoteNew = (q: Quotation): boolean => {
    return isQuoteActionableStatus(q) && isWithin24Hours(q.created_at || q.issue_date);
  };

  const isQuotePending = (q: Quotation): boolean => {
    return isQuoteActionableStatus(q) && !isWithin24Hours(q.created_at || q.issue_date);
  };

  const isQuoteApproved = (q: Quotation): boolean => {
    return (
      q.status === 'APPROVED' ||
      (Boolean(q.approved_at || q.signature) && q.status !== 'IN_PROGRESS' && q.status !== 'COMPLETED')
    );
  };

  const isQuoteInProgress = (q: Quotation): boolean => {
    return q.status === 'IN_PROGRESS';
  };

  const isQuoteRejected = (q: Quotation): boolean => {
    return q.status === 'REJECTED';
  };

  const isQuoteExpired = (q: Quotation): boolean => {
    const isPastApproval = Boolean(
      q.status === 'APPROVED' ||
      q.status === 'IN_PROGRESS' ||
      q.status === 'COMPLETED' ||
      q.status === 'PAYMENT_COMPLETED' ||
      q.approved_at ||
      q.signature
    );
    return (
      q.status === 'EXPIRED' ||
      (Date.now() > getValidityEndTime(q.valid_until) &&
        !isPastApproval &&
        q.status !== 'REJECTED')
    );
  };

  const isQuoteInCategory = (q: Quotation, cat: string): boolean => {
    if (cat === 'ALL') return true;
    if (cat === 'NEW') return isQuoteNew(q);
    if (cat === 'APPROVED') return isQuoteApproved(q);
    if (cat === 'IN_PROGRESS') return isQuoteInProgress(q);
    if (cat === 'PENDING') return isQuotePending(q);
    if (cat === 'REJECTED') return isQuoteRejected(q);
    if (cat === 'EXPIRED') return isQuoteExpired(q);
    return true;
  };

  const clientCategoryTabs = [
    {
      label: 'All',
      value: 'ALL',
      active: 'bg-slate-900 text-white border-slate-900',
      inactive: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
      dot: 'bg-slate-400',
    },
    {
      label: 'New',
      value: 'NEW',
      active: 'bg-blue-600 text-white border-blue-600',
      inactive: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      dot: 'bg-blue-500',
    },
    {
      label: 'Approved',
      value: 'APPROVED',
      active: 'bg-emerald-600 text-white border-emerald-600',
      inactive: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
      dot: 'bg-emerald-500',
    },
    {
      label: 'In Progress',
      value: 'IN_PROGRESS',
      active: 'bg-sky-600 text-white border-sky-600',
      inactive: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
      dot: 'bg-sky-500',
    },
    {
      label: 'Pending',
      value: 'PENDING',
      active: 'bg-amber-500 text-white border-amber-500',
      inactive: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
      dot: 'bg-amber-500',
    },
    {
      label: 'Rejected',
      value: 'REJECTED',
      active: 'bg-rose-600 text-white border-rose-600',
      inactive: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
      dot: 'bg-rose-500',
    },
    {
      label: 'Expired',
      value: 'EXPIRED',
      active: 'bg-slate-700 text-white border-slate-700',
      inactive: 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200',
      dot: 'bg-slate-500',
    },
  ];

  const getCategoryCount = (catValue: string) => {
    if (!allQuotations) return 0;
    return allQuotations.filter((q) => isQuoteInCategory(q, catValue)).length;
  };

  const selectQuotation = (target: Quotation) => {
    if (!target?.public_token) return;
    if (target.id === quotation.id) {
      setIsProposalMenuOpen(false);
      return;
    }
    setSwitchingToken(target.public_token);
    try {
      const saved = localStorage.getItem('quoteflow_client_opened_quotes');
      const set = saved ? new Set(JSON.parse(saved)) : new Set();
      set.add(target.id);
      localStorage.setItem(
        'quoteflow_client_opened_quotes',
        JSON.stringify(Array.from(set))
      );
    } catch {}

    // Clean, robust client navigation to target quotation
    window.location.href = `/q/${target.public_token}`;
  };

  const handleCategoryTabClick = (catValue: string) => {
    setClientCategory(catValue);
    const matching = (allQuotations || []).filter((q) => isQuoteInCategory(q, catValue));
    if (matching.length > 0) {
      const isCurrentInMatches = matching.some((q) => q.id === quotation.id);
      if (!isCurrentInMatches) {
        selectQuotation(matching[0]);
      }
    }
  };

  const validityDays = (() => {
    if (!quotation.issue_date || !quotation.valid_until) return 14;
    const startStr = String(quotation.issue_date).split('T')[0];
    const endStr = String(quotation.valid_until).split('T')[0];
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const startUtc = Date.UTC(sy, (sm || 1) - 1, sd || 1);
    const endUtc = Date.UTC(ey, (em || 1) - 1, ed || 1);
    const diffDays = Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  })();

  const harmonizedPaymentTerms = useMemo(() => {
    return harmonizePaymentTerms(
      isAdvanceRequired ? quotation.advance_percentage : 0,
      quotation.payment_terms_instructions
    );
  }, [isAdvanceRequired, quotation.advance_percentage, quotation.payment_terms_instructions]);

  const currentToken = quotation.public_token || token;

  // Track quotation opened state and remove "NEW" badge
  useEffect(() => {
    if (quotation?.id) {
      setOpenedQuoteIds((prev) => {
        if (prev.has(quotation.id)) return prev;
        const next = new Set(prev);
        next.add(quotation.id);
        try {
          localStorage.setItem(
            'quoteflow_client_opened_quotes',
            JSON.stringify(Array.from(next))
          );
        } catch {}
        return next;
      });
    }
  }, [quotation?.id]);

  // Client Portal PIN Auth Verification
  useEffect(() => {
    let active = true;
    const verifyPortalAuth = async () => {
      try {
        let storedDeviceToken = '';
        if (typeof window !== 'undefined') {
          try {
            storedDeviceToken =
              localStorage.getItem('quoteflow_portal_device_token') ||
              (quotation.customer_id
                ? localStorage.getItem(`quoteflow_portal_cust_${quotation.customer_id}`) || ''
                : '');
          } catch {}
        }

        const url = `/api/public/portal-auth?token=${encodeURIComponent(currentToken)}${
          storedDeviceToken ? `&deviceToken=${encodeURIComponent(storedDeviceToken)}` : ''
        }`;

        const res = await fetch(url, {
          cache: 'no-store',
          headers: storedDeviceToken
            ? { 'x-portal-device-token': storedDeviceToken }
            : undefined,
        });

        if (res.ok) {
          const data = await res.json();
          if (active) {
            setHasPin(Boolean(data.hasPin));
            setIsAuthenticated(Boolean(data.authenticated));
            setCustomerEmailMasked(data.customerEmailMasked || '');
            setCustomerPhoneMasked(data.customerPhoneMasked || '');
            setAuthMethod(data.authMethod || (quotation.customer?.auth_method || 'MOBILE'));
            setPhoneCountryCode(data.phoneCountryCode || quotation.customer?.phone_country_code || '+91');
            setAuthChecked(true);

            if (data.authenticated && data.deviceToken && typeof window !== 'undefined') {
              try {
                localStorage.setItem('quoteflow_portal_device_token', data.deviceToken);
                const custId = data.customerId || quotation.customer_id;
                if (custId) {
                  localStorage.setItem(`quoteflow_portal_cust_${custId}`, data.deviceToken);
                }
              } catch {}
            }
          }
        } else {
          if (active) setAuthChecked(true);
        }
      } catch {
        if (active) setAuthChecked(true);
      }
    };

    verifyPortalAuth();
    return () => {
      active = false;
    };
  }, [currentToken, quotation.customer_id]);

  const loadChatMessages = async (forceMarkRead = false) => {
    try {
      const shouldMarkRead = forceMarkRead || isChatPopupOpenRef.current;
      const res = await fetch(
        `/api/public/chat?token=${encodeURIComponent(currentToken)}${shouldMarkRead ? '&markRead=true' : ''}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          const nextMessages: QuotationChatMessage[] = data.messages;
          const prevCount = prevChatCountRef.current;

          if (nextMessages.length > prevCount && isChatPopupOpenRef.current) {
            setTimeout(() => {
              chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 80);
          }

          prevChatCountRef.current = nextMessages.length;
          setChatMessages(nextMessages);
        }
      }
    } catch {}
  };

  useEffect(() => {
    prevChatCountRef.current = 0;
    // Initial fetch once on mount to populate existing messages
    loadChatMessages(false);
  }, [currentToken]);

  // CPU-Optimized: Fetch once when chat popup is opened; background setInterval & focus polling disabled to save Serverless CPU.
  useEffect(() => {
    if (!isChatPopupOpen) return;
    loadChatMessages(true);
  }, [isChatPopupOpen, currentToken]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && !chatAttachment) || isSendingChat) return;
    try {
      setIsSendingChat(true);
      const res = await fetch('/api/public/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: currentToken,
          sender_name: senderName || customer?.name || 'Customer',
          message: chatInput.trim(),
          attachment: chatAttachment,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatInput('');
        setChatAttachment(null);
        if (Array.isArray(data.messages)) {
          prevChatCountRef.current = data.messages.length;
          setChatMessages(data.messages);
        } else {
          await loadChatMessages(true);
        }
        setTimeout(() => {
          chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      }
    } catch (err) {
      console.error('Failed to send chat:', err);
    } finally {
      setIsSendingChat(false);
    }
  };

  const openChatPopup = () => {
    isChatPopupOpenRef.current = true;
    setIsChatPopupOpen(true);
    loadChatMessages(true);
    setTimeout(() => {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const closeChatPopup = () => {
    isChatPopupOpenRef.current = false;
    setIsChatPopupOpen(false);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const quoteFilename = getSanitizedPdfFilename('quotation', quotation.quotation_number);

      // 1. Client-side generation (0ms Cloudflare CPU usage)
      if (quotation) {
        try {
          const { downloadQuotationPdfClient } = await import('@/lib/pdf/client-download');
          const success = await downloadQuotationPdfClient(quotation, quoteFilename);
          if (success) return;
        } catch {}
      }

      // 2. Server fallback
      const res = await fetch(
        `/api/public/pdf?token=${encodeURIComponent(currentToken || token || '')}&id=${encodeURIComponent(quotation.id)}`
      );
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = quoteFilename;
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

  const handleDownloadReceipt = async () => {
    try {
      setIsDownloadingReceipt(true);
      const receiptFilename = getSanitizedPdfFilename('receipt', quotation.quotation_number);

      // 1. Client-side receipt generation (0ms Cloudflare CPU usage)
      if (quotation) {
        try {
          const { downloadReceiptPdfClient } = await import('@/lib/pdf/client-download');
          const success = await downloadReceiptPdfClient(quotation, receiptFilename);
          if (success) return;
        } catch {}
      }

      // 2. Server fallback
      const res = await fetch(
        `/api/public/receipt-pdf?token=${encodeURIComponent(currentToken || '')}&id=${encodeURIComponent(quotation.id)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error ||
            'Payment receipt is only available once payment is officially confirmed by company finance.'
        );
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = receiptFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Receipt download error:', err);
      alert(err.message || 'Could not download payment receipt.');
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      setIsDownloadingInvoice(true);
      const invoiceFilename = getSanitizedPdfFilename('invoice', quotation.invoice_number || quotation.quotation_number);
      const res = await fetch(
        `/api/public/invoice-pdf?token=${encodeURIComponent(currentToken || '')}&id=${encodeURIComponent(quotation.id)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error ||
            'Commercial Tax Invoice will be available once issued by the business.'
        );
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = invoiceFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Invoice download error:', err);
      alert(err.message || 'Could not download invoice.');
    } finally {
      setIsDownloadingInvoice(false);
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

  const handleRejected = () => {
    setQuotation((prev) => ({ ...prev, status: 'REJECTED' }));
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
    } catch {}
  };

  // If PIN authentication state is still loading, show secure skeleton
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="space-y-4 max-w-sm">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center animate-pulse">
            <Lock className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-slate-300">
            Verifying client portal security...
          </p>
        </div>
      </div>
    );
  }

  // If PIN gate is not passed yet, render PortalPinGate
  if (!isAuthenticated) {
    return (
      <PortalPinGate
        token={currentToken}
        quotationNumber={quotation.quotation_number}
        companyName={org?.name || 'QuoteFlow'}
        hasPin={hasPin}
        authMethod={authMethod}
        phoneCountryCode={phoneCountryCode}
        customerPhoneMasked={customerPhoneMasked}
        customerEmailMasked={customerEmailMasked}
        onAuthenticated={(deviceToken) => {
          if (deviceToken && typeof window !== 'undefined') {
            try {
              localStorage.setItem('quoteflow_portal_device_token', deviceToken);
              if (quotation.customer_id) {
                localStorage.setItem(
                  `quoteflow_portal_cust_${quotation.customer_id}`,
                  deviceToken
                );
              }
            } catch {}
          }
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f5f9] pb-16 pt-4 sm:pt-8 px-3 sm:px-6 relative">
      {/* Background ambient lighting matching QuoteFlow theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl space-y-4">
        {/* Demo Portal Status Banner */}
        {isDemo && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-900 text-white text-xs shadow-md border border-indigo-700 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-xl bg-indigo-700 text-indigo-200">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="font-bold">✨ Live Client Demo Portal (Approval & Signatures)</p>
                <p className="text-[11px] text-indigo-200">
                  Unlocked via Demo PIN <strong className="text-white font-mono">123456</strong>. You can review items, send live chat messages, digitally sign, or download the commercial PDF.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  try {
                    localStorage.removeItem('quoteflow_portal_device_token');
                    if (quotation.customer_id) {
                      localStorage.removeItem(`quoteflow_portal_cust_${quotation.customer_id}`);
                    }
                    document.cookie = `portal_auth_${quotation.id}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
                    document.cookie = 'portal_device_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                  } catch {}
                  window.location.reload();
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all cursor-pointer border border-white/20 shadow-xs"
            >
              Re-test PIN Gate
            </button>
          </div>
        )}

        {/* Sticky Action Banner for Mobile & Desktop */}
        <div className="sticky top-3 z-40 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/95 p-3 sm:p-4 shadow-xl backdrop-blur-md border border-slate-100 ring-1 ring-slate-900/5">
          <div className="flex items-center gap-2.5">
            {/* Multi-Quotation Switcher Dropdown (if multiple quotes available) */}
            {allQuotations && allQuotations.length > 1 ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsProposalMenuOpen(!isProposalMenuOpen)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-800 text-xs font-bold transition-all border border-slate-200/90 cursor-pointer shadow-2xs"
                  title="Switch between your proposals & estimates"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="font-mono">{quotation.quotation_number}</span>
                  <span className="text-slate-400 font-normal">({allQuotations.length})</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isProposalMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isProposalMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsProposalMenuOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Your Proposals & Estimates</span>
                        <span className="text-[11px] font-semibold text-slate-400">{allQuotations.length} available</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto p-1 space-y-1">
                        {allQuotations.map((q) => {
                          const isSelected = q.id === quotation.id;
                          const isSwitching = switchingToken === q.public_token;
                          return (
                            <a
                              key={q.id}
                              href={`/q/${q.public_token}`}
                              onClick={(e) => {
                                e.preventDefault();
                                selectQuotation(q);
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer block no-underline ${
                                isSelected
                                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold ring-1 ring-indigo-500/10'
                                  : 'hover:bg-slate-50 border border-transparent text-slate-700'
                              } ${isSwitching ? 'opacity-70 pointer-events-none' : ''}`}
                            >
                              <div className="flex flex-col min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-900">{q.quotation_number}</span>
                                  {isQuoteNew(q) && (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-blue-600 text-white">
                                      NEW
                                    </span>
                                  )}
                                  {isSwitching && (
                                    <Loader2 className="h-3 w-3 animate-spin text-indigo-600 shrink-0 ml-1" />
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 truncate max-w-[180px]">{q.title}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold text-slate-900">{formatCurrency(q.grand_total, q.currency)}</span>
                                <StatusBadge status={q.status} isPaid={q.is_paid} hideWarning />
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
                {quotation.quotation_number}
              </span>
            )}

            {(quotation.revision_number > 1 || quotation.quotation_number.includes('-REV')) && (
              <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wide">
                {quotation.quotation_number.match(/[-_](REV|rev)[-_]?(\d+)/i)?.[0]?.replace(/^[-_]/, '') || `REV ${quotation.revision_number - 1}`}
              </span>
            )}

            <StatusBadge
              status={quotation.status}
              isPaid={quotation.is_paid}
              completedUnpaid={quotation.completed_unpaid}
              paymentStatus={quotation.payment_status}
              paidAmount={quotation.paid_amount}
              hideWarning
            />

            {isQuoteNew(quotation) && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-blue-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-200 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                <span>NEW</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              isLoading={isDownloadingPdf}
              className="gap-1.5 shadow-2xs text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              <span>PDF</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 shadow-2xs text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              title="Print official quotation"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print</span>
            </Button>

            {hasPaymentRecorded && isPaymentConfirmed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadReceipt}
                isLoading={isDownloadingReceipt}
                className="gap-1.5 shadow-2xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs font-bold"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                <span>Receipt</span>
              </Button>
            )}

            {businessWhatsAppUrl && (
              <a
                href={businessWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs hover:shadow transition-all cursor-pointer"
                title={`Chat directly with ${org?.name || 'our team'} on WhatsApp`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </a>
            )}

            {!isIndia && showPaymentLink && paymentLinkUrl && !isPaid && !isExpired && (
              <a
                href={paymentLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Pay {grandTotalFormatted}</span>
                <ExternalLink className="h-3 w-3 opacity-80" />
              </a>
            )}

            {canTakeAction && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRejectionOpen(true)}
                  className="rounded-2xl text-rose-600 hover:text-rose-700 bg-rose-50/80 hover:bg-rose-100/80 border-rose-200 text-xs font-bold px-3.5 py-2 shadow-2xs transition-all"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1 text-rose-500" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsApprovalOpen(true)}
                  className="rounded-2xl gap-1.5 shadow-md shadow-emerald-600/25 hover:shadow-lg hover:shadow-emerald-600/30 font-black text-white text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Review &amp; Approve
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Multi-Quotation Subtle Indicator (if multiple quotes available) */}
        {allQuotations && allQuotations.length > 1 && (
          <div className="flex items-center justify-between px-2 py-0.5 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-indigo-500" />
              <span>Showing proposal <strong>{quotation.quotation_number}</strong> of {allQuotations.length}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsProposalMenuOpen(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Switch proposal ({allQuotations.length})</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Critical Alerts (Draft / Expired / Declined only) */}
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

        {isExpired && !isPaid && !['APPROVED', 'IN_PROGRESS', 'COMPLETED', 'PAYMENT_COMPLETED'].includes(quotation.status) && (
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

        {/* Visual Lifecycle Stepper Flow Chart for Client (5-Stage with Floating Detail Cards) */}
        <QuotationFlowChart
          quotation={quotation}
          isClientView
          onDownloadReceipt={handleDownloadReceipt}
          isDownloadingReceipt={isDownloadingReceipt}
          paymentLinkUrl={paymentLinkUrl}
        />

        {/* Main Quotation Document Sheet */}
        <div
          id="quotation-sheet"
          dir={docLang === 'ar' ? 'rtl' : 'ltr'}
          className="rounded-3xl border border-slate-100 bg-white text-slate-900 p-6 sm:p-12 shadow-xl space-y-8 relative overflow-hidden printable-document-sheet ring-1 ring-slate-900/5"
        >
          {/* Top Brand Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: brandColor }} />
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
                {org?.business_state || org?.state} {org?.postal_code}
                <br />
                {org?.email} {org?.phone ? `• ${org.phone}` : ''}
                {(org?.gstin || org?.gst_vat_number) && (
                  <>
                    <br />
                    <span className="font-medium text-slate-600">
                      {getLocalizedTerm('trn_tax_id', docLang)}: {org.gstin || org.gst_vat_number}
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span
                className="inline-block text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-md"
                style={{ color: brandColor, backgroundColor: `${brandColor}18` }}
              >
                {getLocalizedTerm('quotation', docLang, 'Official Estimate')}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {quotation.quotation_number}
              </h2>
              <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                <p>
                  <span className="font-medium text-slate-600">{getLocalizedTerm('issue_date', docLang)}:</span>{' '}
                  {formatDate(quotation.issue_date)}
                </p>
                <p>
                  <span className="font-medium text-slate-600">{getLocalizedTerm('valid_until', docLang)}:</span>{' '}
                  {formatDate(quotation.valid_until)}
                </p>
                {displayTax > 0 && (
                  <p>
                    <span className="font-medium text-slate-600">Tax Mode:</span>{' '}
                    <span className="font-semibold text-indigo-700">
                      {taxMode === 'inclusive' ? 'Tax Included' : 'Tax Excluded'}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quotation Subject & Prepared For */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/80 rounded-xl p-5 border border-slate-100">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {getLocalizedTerm('quoted_to', docLang, 'Quotation For')}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {customer?.company_name || customer?.name || 'Valued Client'}
              </h3>
              {customer?.company_name && customer?.name && (
                <p className="text-xs text-slate-600 font-medium">{getLocalizedTerm('attn', docLang)}: {customer.name}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {customer?.billing_address && `${customer.billing_address}, `}
                {customer?.city} {customer?.billing_state || customer?.state} {customer?.postal_code}
                <br />
                Email: {customer?.email} {customer?.phone ? `| Tel: ${customer.phone}` : ''}
                {(quotation.customer_gstin || customer?.customer_gstin || customer?.tax_number) && (
                  <>
                    <br />
                    <span className="font-medium text-slate-700">
                      {getLocalizedTerm('trn_tax_id', docLang)}: {quotation.customer_gstin || customer?.customer_gstin || customer?.tax_number}
                    </span>
                  </>
                )}
                {placeOfSupply && (
                  <>
                    <br />
                    <span className="font-semibold text-indigo-700">
                      {getLocalizedTerm('place_of_supply', docLang)}: {placeOfSupply}
                    </span>
                  </>
                )}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Project / Scope Title
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">{quotation.title}</h3>
              
              {/* Urgency & Validity Countdown Banner (only while awaiting approval) */}
              {validityCountdown && (
                <div className="mt-3">
                  {validityCountdown.isExpired ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                      <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <div>
                        <span className="font-bold">Quotation Expired</span> on {formatDate(quotation.valid_until)}. Offer prices and delivery schedule may require revision.
                      </div>
                    </div>
                  ) : validityCountdown.isUrgent ? (
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium animate-pulse">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold">⏳ Limited-Time Offer:</span> Valid until {formatDate(quotation.valid_until)} ({validityCountdown.text}). Approve today to lock in your pricing.
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-800 text-xs font-medium">
                      <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Offer valid until {formatDate(quotation.valid_until)} ({validityCountdown.text || `${validityDays} days remaining`})</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Interactive Optional Add-ons Info Banner (if any item is optional) */}
          {(quotation.items || []).some((it) => it.is_optional) && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50/80 border border-indigo-100 text-xs text-indigo-900">
              <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Interactive Package Options:</strong> Check or uncheck optional add-ons below. Your quote subtotal and tax recalculate live.
              </span>
            </div>
          )}

          {/* Line Items Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">{getLocalizedTerm('hash', docLang)}</th>
                  <th className="py-3 px-4">{getLocalizedTerm('item_description', docLang, 'Description')}</th>
                  <th className="py-3 px-4 text-center">{getLocalizedTerm('quantity', docLang)}</th>
                  <th className="py-3 px-4 text-right">{getLocalizedTerm('rate', docLang, 'Unit Price')}</th>
                  <th className="py-3 px-4 text-center">{getLocalizedTerm('tax', docLang)}</th>
                  <th className="py-3 px-4 text-right">{getLocalizedTerm('total', docLang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(quotation.items || []).map((item, idx) => {
                  const calcItem = calculated.items[idx];
                  const lineTotal = calcItem ? calcItem.line_total : item.line_total;
                  const isOptional = Boolean(item.is_optional);
                  const isSelected = isOptional ? selectedOptionalIds.has(item.id || item.description) : true;

                  return (
                    <tr
                      key={item.id || idx}
                      className={`transition-colors ${
                        isOptional && !isSelected
                          ? 'bg-slate-50/40 opacity-70 hover:opacity-100'
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center text-xs text-slate-400 font-medium">
                        {isOptional ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!canTakeAction}
                            onChange={(e) => {
                              setSelectedOptionalIds((prev) => {
                                const next = new Set(prev);
                                const key = item.id || item.description;
                                if (e.target.checked) next.add(key);
                                else next.delete(key);
                                return next;
                              });
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                            title={canTakeAction ? 'Toggle optional add-on' : 'Selection locked'}
                          />
                        ) : (
                          idx + 1
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className={`font-semibold ${isOptional && !isSelected ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                            {item.description}
                          </p>
                          {isOptional && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                                isSelected
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {isSelected ? '✓ Optional Added' : 'Optional (Unchecked)'}
                            </span>
                          )}
                        </div>
                        {item.classification_code && (
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                            <span className="text-slate-400">
                              {item.classification_type || (isIndia ? (item.item_type === 'SERVICE' ? 'SAC' : 'HSN') : (item.item_type === 'SERVICE' ? countryProfile.serviceClassificationLabel : countryProfile.goodsClassificationLabel))}:
                            </span>{' '}
                            <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.classification_code}
                            </span>
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600">
                        {item.quantity} <span className="text-xs text-slate-400">{item.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-700">
                        {formatCurrency(item.unit_price, quotation.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs text-slate-500 font-medium">
                        {item.tax_rate > 0
                          ? `${item.tax_rate}%${taxMode === 'inclusive' ? ' (Incl.)' : ''}`
                          : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold">
                        <span className={isOptional && !isSelected ? 'text-slate-400 line-through' : 'text-slate-900'}>
                          {formatCurrency(lineTotal, quotation.currency)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* File Attachments Section for Customer */}
          {quotation.attachments && quotation.attachments.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4 text-indigo-500" />
                  <span>Attachments & Supporting Documents ({quotation.attachments.length})</span>
                </span>
                <span className="text-[11px] text-slate-400">Click to view or download</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {quotation.attachments.map((att: any) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all text-xs group"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 shrink-0">
                      <span>Download</span>
                      <Download className="h-3.5 w-3.5" />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Financial Calculation Summary Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            <div className="w-full sm:w-1/2 space-y-3">
              {isValidDocumentText(quotation.notes) && (
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {getLocalizedTerm('notes', docLang, 'Notes & Specifications')}
                  </h4>
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                    {quotation.notes!.trim()}
                  </p>
                </div>
              )}

              {isValidDocumentText(quotation.terms_conditions) && (
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {getLocalizedTerm('terms_conditions', docLang)}
                  </h4>
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                    {harmonizeTermsAndConditions(
                      isAdvanceRequired ? quotation.advance_percentage : 0,
                      quotation.terms_conditions!.trim().replace(
                        /Quotation valid for \d+ days?/gi,
                        validityDays > 0
                          ? `Quotation valid for ${validityDays} ${validityDays === 1 ? 'day' : 'days'}`
                          : 'Quotation valid on date of issue'
                      )
                    )}
                  </p>
                </div>
              )}
            </div>

            <div
              className="w-full sm:w-5/12 space-y-2.5 rounded-xl bg-slate-50/70 p-5 border border-slate-200"
              style={{ borderTop: `3px solid ${brandColor}` }}
            >
              <div className="flex justify-between text-xs text-slate-600">
                <span>{taxMode === 'inclusive' ? `${getLocalizedTerm('subtotal', docLang)} (Taxable Amount)` : getLocalizedTerm('subtotal', docLang)}</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(displaySubtotal, quotation.currency)}
                </span>
              </div>

              {displayDiscount > 0 && (
                <div className="flex justify-between text-xs text-rose-600">
                  <span>
                    {getLocalizedTerm('discount', docLang)} ({quotation.discount_type === 'PERCENTAGE' ? `${quotation.discount_value}%` : 'Fixed'})
                  </span>
                  <span className="font-semibold">
                    -{formatCurrency(displayDiscount, quotation.currency)}
                  </span>
                </div>
              )}

              {displayTaxBreakdown.length > 0 ? (
                displayTaxBreakdown.map((tb, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-slate-600">
                    <span>{tb.label}</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(tb.amount, quotation.currency)}
                    </span>
                  </div>
                ))
              ) : displayTax > 0 ? (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>
                    {getLocalizedTerm('tax_amount', docLang, effectiveTaxName)} ({quotation.tax_rate || calculated.tax_rate}%{taxMode === 'inclusive' ? ' Included' : ''})
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(displayTax, quotation.currency)}
                  </span>
                </div>
              ) : null}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900">{getLocalizedTerm('grand_total', docLang, 'Total Quotation Value')}</span>
                <span className="text-xl font-extrabold" style={{ color: brandColor }}>
                  {grandTotalFormatted}
                </span>
              </div>

              {hasPaymentRecorded && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
                  <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                    <span>
                      {getLocalizedTerm('paid_amount', docLang)}
                      {isAdvanceRequired && quotation.advance_percentage ? ` (${quotation.advance_percentage}% Advance)` : ''}
                    </span>
                    <span>
                      -{formatCurrency(
                        quotation.paid_amount !== undefined
                          ? quotation.paid_amount
                          : (quotation.is_paid ? quotation.grand_total : 0),
                        quotation.currency
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline pt-1 border-t border-dashed border-slate-200 text-xs">
                    <span className="font-bold text-slate-900">{getLocalizedTerm('balance_due', docLang, 'Remaining Balance Due')}</span>
                    <span
                      className={`font-black text-sm ${
                        (quotation.balance_amount === 0 || quotation.is_paid)
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {formatCurrency(
                        quotation.balance_amount !== undefined
                          ? quotation.balance_amount
                          : (quotation.is_paid ? 0 : quotation.grand_total),
                        quotation.currency
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Full-Width Payment & Remittance Instructions (Expanded Matching Signature Card Width) */}
          {(quotation.payment_terms_instructions ||
            isAdvanceRequired ||
            (quotation.accepted_payment_methods && quotation.accepted_payment_methods.length > 0) ||
            (showBank && (bankInfo?.bank_name || bankInfo?.account_number)) ||
            (showUpi && (upiInfo?.upi_id || upiInfo?.qr_code_url)) ||
            (!isIndia && showPaymentLink && paymentLinkUrl) ||
            (showCash && cashInstructions) ||
            (showCrypto && (cryptoInfo?.wallet_address || cryptoInfo?.qr_code_url))) && (
            <div className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/60 p-5 sm:p-6 space-y-4">
              <div className="flex justify-between items-center text-slate-800 font-bold border-b border-slate-200/60 pb-2.5">
                <span className="flex items-center gap-2 text-xs uppercase tracking-wider">
                  <CreditCard className="h-4 w-4 text-indigo-600" />
                  <span>Payment & Remittance Instructions</span>
                </span>
                {isAdvanceRequired && (
                  <span className="text-indigo-600 bg-indigo-100/70 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    {`${quotation.advance_percentage}% Advance Required`}
                  </span>
                )}
              </div>

              {/* Payment Milestone Schedule Breakdown (Only when advance payment is required) */}
              {isAdvanceRequired && (
                <div className="rounded-xl bg-white p-3.5 border border-indigo-100 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-indigo-50 text-indigo-600">
                        <Layers className="h-3.5 w-3.5" />
                      </div>
                      <h5 className="text-xs font-bold text-slate-900">
                        Payment Schedule & Milestones
                      </h5>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {quotation.payment_terms_type === 'MILESTONES' ? '3-Stage Milestones' : 'Advance Split'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {(quotation.milestones && quotation.milestones.length > 0
                      ? quotation.milestones
                      : [
                          {
                            id: 'm1',
                            name: `Stage 1: ${quotation.advance_percentage}% Advance Payment`,
                            percentage: quotation.advance_percentage!,
                            amount: (displayTotal * quotation.advance_percentage!) / 100,
                            due_stage: 'To commence work upon approval',
                          },
                          {
                            id: 'm2',
                            name: `Stage 2: ${100 - quotation.advance_percentage!}% Balance on Delivery`,
                            percentage: 100 - quotation.advance_percentage!,
                            amount: (displayTotal * (100 - quotation.advance_percentage!)) / 100,
                            due_stage: 'Upon project completion and delivery',
                          },
                        ]
                    ).map((ms, msIdx) => (
                      <div
                        key={ms.id || msIdx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{ms.name}</p>
                          {ms.due_stage && (
                            <p className="text-[10px] text-slate-500">{ms.due_stage}</p>
                          )}
                        </div>
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(ms.amount, quotation.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2-Column Balanced Internal Grid for Remittance & Instant Payment */}
              <div id="payment-details-section" className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {/* Column 1: Bank Transfer Details / Online Payment Link */}
                <div className="space-y-3">
                  {showBank && (bankInfo?.bank_name || bankInfo?.account_number) && (
                    <div className="rounded-xl bg-white p-3.5 border border-indigo-100 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-md bg-indigo-50 text-indigo-600">
                            <Landmark className="h-3.5 w-3.5" />
                          </div>
                          <h5 className="text-xs font-bold text-slate-900">
                            {getLocalizedTerm('bank_details', docLang, 'Bank Transfer / Wire Remittance')}
                          </h5>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {getLocalizedTerm('bank_details', docLang, 'Bank Details')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
                        {bankInfo.bank_name && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">{getLocalizedTerm('bank_name', docLang)}</span>
                            <span className="font-semibold text-slate-800">{bankInfo.bank_name}</span>
                          </div>
                        )}

                        {bankInfo.account_name && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">{getLocalizedTerm('account_name', docLang)}</span>
                            <span className="font-semibold text-slate-800">{bankInfo.account_name}</span>
                          </div>
                        )}

                        {bankInfo.account_number && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">{getLocalizedTerm('account_number', docLang, 'Account Number / IBAN')}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                {bankInfo.account_number}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(bankInfo.account_number!, 'bank_acc')}
                                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                                title="Copy Account Number"
                              >
                                {copiedField === 'bank_acc' ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {bankInfo.ifsc_code && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">IFSC Code (India)</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                {bankInfo.ifsc_code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(bankInfo.ifsc_code!, 'bank_ifsc')}
                                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                                title="Copy IFSC"
                              >
                                {copiedField === 'bank_ifsc' ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {bankInfo.swift_code && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">SWIFT / BIC Code</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                {bankInfo.swift_code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(bankInfo.swift_code!, 'bank_swift')}
                                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                                title="Copy SWIFT"
                              >
                                {copiedField === 'bank_swift' ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {bankInfo.branch_name && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Branch & Location</span>
                            <span className="text-slate-700 font-medium">{bankInfo.branch_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!isIndia && showPaymentLink && paymentLinkUrl && (
                    <div className="rounded-xl bg-white p-3.5 border border-blue-100 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-md bg-blue-50 text-blue-600">
                            <CreditCard className="h-3.5 w-3.5" />
                          </div>
                          <h5 className="text-xs font-bold text-slate-900">
                            Online Payment Link (Card / Stripe / PayPal)
                          </h5>
                        </div>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          Instant Checkout
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                        <div className="space-y-1 text-xs">
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                            Official Checkout Link
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-800 break-all line-clamp-1">
                            {paymentLinkUrl}
                          </span>
                          <p className="text-[11px] text-slate-500">
                            Click to pay securely via Credit/Debit Card, Stripe, PayPal, or Wise.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(paymentLinkUrl, 'payment_link')}
                            className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-300 bg-white shadow-2xs flex items-center gap-1.5 text-xs font-semibold"
                            title="Copy Payment Link"
                          >
                            {copiedField === 'payment_link' ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                          <a
                            href={paymentLinkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                          >
                            <span>{paymentLinkLabel || 'Pay Online'}</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Column 2: UPI Payment & QR Code / Crypto / Cash */}
                <div className="space-y-3">
                  {showUpi && (upiInfo?.upi_id || upiInfo?.qr_code_url) && (
                    <div className="rounded-xl bg-white p-3.5 border border-emerald-100 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                            <QrCode className="h-3.5 w-3.5" />
                          </div>
                          <h5 className="text-xs font-bold text-slate-900">
                            UPI Payment & QR Code (India)
                          </h5>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          Instant UPI
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        {(() => {
                          const upiQrSrc = upiInfo.qr_code_url || (
                            upiInfo.upi_id
                              ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${upiInfo.upi_id}&pn=${encodeURIComponent(upiInfo.payee_name || org?.name || 'SUBESH M LLC')}&cu=INR`)}`
                              : ''
                          );
                          return upiQrSrc ? (
                            <div className="shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                              <img
                                src={upiQrSrc}
                                alt="Scan UPI QR Code"
                                className="h-32 w-32 object-contain rounded-lg bg-white p-1 shadow-2xs"
                                onError={(e) => {
                                  if (upiInfo.upi_id && !e.currentTarget.src.includes('api.qrserver.com')) {
                                    e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${upiInfo.upi_id}&pn=${encodeURIComponent(upiInfo.payee_name || 'SUBESH M LLC')}&cu=INR`)}`;
                                  }
                                }}
                              />
                              <span className="text-[10px] font-bold text-slate-600 text-center">
                                Scan with any UPI App
                              </span>
                            </div>
                          ) : null;
                        })()}

                        <div className="space-y-2 text-xs flex-1 w-full">
                          {upiInfo.upi_id && (
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                                UPI ID / VPA
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
                                  {upiInfo.upi_id}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(upiInfo.upi_id!, 'upi_id')}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200"
                                  title="Copy UPI ID"
                                >
                                  {copiedField === 'upi_id' ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {upiInfo.payee_name && (
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                                Payee Name
                              </span>
                              <span className="font-semibold text-slate-800">{upiInfo.payee_name}</span>
                            </div>
                          )}

                          <p className="text-[11px] text-slate-500 pt-1">
                            Compatible with Google Pay, PhonePe, Paytm, BHIM, Cred, and mobile banking apps.
                          </p>

                          {upiInfo.upi_id && !isPaid && (
                            <div className="pt-2">
                              <a
                                href={`upi://pay?pa=${upiInfo.upi_id}&pn=${encodeURIComponent(upiInfo.payee_name || org?.name || 'QuoteFlow')}&am=${amountDueForUpi}&cu=INR&tn=${encodeURIComponent(`Quotation ${quotation.quotation_number}`)}`}
                                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-[0.98]"
                              >
                                <Smartphone className="h-4 w-4" />
                                <span>⚡ Tap to Pay ₹{amountDueForUpi.toLocaleString()} via UPI App</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {showCrypto && (cryptoInfo?.wallet_address || cryptoInfo?.qr_code_url) && (
                    <div className="rounded-xl bg-white p-3.5 border border-amber-100 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-md bg-amber-50 text-amber-600">
                            <Bitcoin className="h-3.5 w-3.5" />
                          </div>
                          <h5 className="text-xs font-bold text-slate-900">
                            Cryptocurrency Settlement (International)
                          </h5>
                        </div>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          {cryptoInfo.currency || 'USDT'} ({cryptoInfo.network || 'TRC20'})
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        {(() => {
                          const cryptoQrSrc = cryptoInfo.qr_code_url || (
                            cryptoInfo.wallet_address
                              ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(cryptoInfo.wallet_address)}`
                              : ''
                          );
                          return cryptoQrSrc ? (
                            <div className="shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                              <img
                                src={cryptoQrSrc}
                                alt="Scan Crypto QR Code"
                                className="h-28 w-28 object-contain rounded-lg bg-white p-1 shadow-2xs"
                                onError={(e) => {
                                  if (cryptoInfo.wallet_address && !e.currentTarget.src.includes('api.qrserver.com')) {
                                    e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(cryptoInfo.wallet_address)}`;
                                  }
                                }}
                              />
                              <span className="text-[10px] font-bold text-slate-600 text-center">
                                Scan Wallet
                              </span>
                            </div>
                          ) : null;
                        })()}

                        <div className="space-y-2 text-xs flex-1 w-full">
                          {cryptoInfo.wallet_address && (
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                                Wallet Address ({cryptoInfo.network || 'TRC20'})
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono font-medium text-amber-950 bg-amber-50/70 px-2.5 py-1 rounded-lg border border-amber-200 text-[11px] break-all">
                                  {cryptoInfo.wallet_address}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(cryptoInfo.wallet_address!, 'crypto_wallet')}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 shrink-0"
                                  title="Copy Wallet Address"
                                >
                                  {copiedField === 'crypto_wallet' ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          <p className="text-[11px] text-slate-500 pt-1">
                            Please ensure transfers are initiated strictly on the specified network ({cryptoInfo.network || 'TRC20'}) to prevent loss of funds.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {showCash && cashInstructions && (
                    <div className="rounded-xl bg-white p-3.5 border border-amber-100 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-md bg-amber-50 text-amber-600">
                            <Banknote className="h-3.5 w-3.5" />
                          </div>
                          <h5 className="text-xs font-bold text-slate-900">
                            Cash Payment / Counter Handover
                          </h5>
                        </div>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          Cash Accepted
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">
                        {cashInstructions}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Harmonized Payment Terms Instruction at bottom of card */}
              {harmonizedPaymentTerms && (
                <p className="text-[11px] text-slate-600 italic whitespace-pre-line leading-relaxed pt-2 border-t border-slate-200/60">
                  {harmonizedPaymentTerms}
                </p>
              )}
            </div>
          )}

          {/* Payment Status & Commercial Tax Invoice Policy Card */}
          {hasPaymentRecorded && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isPaymentConfirmed
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isPaymentConfirmed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {isPaymentConfirmed
                        ? 'Payment Confirmed by Company Finance'
                        : 'Payment Verification in Progress'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {isPaymentConfirmed
                        ? `Official payment of ${formatCurrency(
                            quotation.paid_amount || (quotation.is_paid ? quotation.grand_total : 0),
                            quotation.currency
                          )} has been confirmed and verified.`
                        : `Payment has been logged and is awaiting verification by company finance before official receipt download is unlocked.`}
                    </p>
                  </div>
                </div>

                {isPaymentConfirmed ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Payment Verified</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 font-medium shrink-0 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Verification in progress</span>
                  </div>
                )}
              </div>

              {/* Commercial Tax Invoice Note / Action */}
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-600 flex items-start gap-3">
                <FileText className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="font-semibold text-slate-800">
                      {quotation.has_issued_invoice
                        ? 'Commercial Tax Invoice Available'
                        : 'Official Tax Invoice'}
                    </p>
                    {quotation.has_issued_invoice && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleDownloadInvoice}
                        isLoading={isDownloadingInvoice}
                        className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download Commercial Tax Invoice</span>
                      </Button>
                    )}
                  </div>
                  <p className="text-slate-500 leading-relaxed">
                    {quotation.has_issued_invoice
                      ? `Your official Commercial Tax Invoice (${quotation.invoice_number || 'INV'}) has been issued by the business with statutory tax and GST/VAT details.`
                      : quotation.is_paid
                        ? 'Quotation payment is recorded. Your official Commercial Tax Invoice will be available for download once issued by the business.'
                        : 'Note: Official Commercial Tax Invoice will be available for download once issued by the business.'}
                  </p>
                </div>
              </div>
            </div>
          )}

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
          <div className="pt-6 border-t border-slate-100 text-center text-xs text-slate-500 space-y-2">
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
              Powered by{' '}
              <a
                href="https://www.blendandbold.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-500 hover:text-indigo-600 transition-colors underline decoration-slate-300 hover:decoration-indigo-500 underline-offset-2 inline-flex items-center gap-0.5 cursor-pointer"
              >
                QuoteFlow Digital Approval Platform
                <ExternalLink className="h-2.5 w-2.5 ml-0.5 opacity-60 inline" />
              </a>
            </p>
          </div>
        </div>

        {/* Bottom CTA ("down side") */}
        {canTakeAction ? (
          <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-7 sm:p-9 text-white text-center shadow-xl space-y-4">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">Ready to approve this quotation?</h3>
            <p className="text-xs sm:text-sm text-indigo-100 max-w-md mx-auto leading-relaxed">
              You can digitally sign with touch or mouse. No account creation or login required.
            </p>
            <div className="flex flex-wrap justify-center items-center gap-3 pt-1">
              <Button
                variant="outline"
                onClick={openChatPopup}
                className="relative rounded-2xl bg-white/10 text-white border-white/20 hover:bg-white/20 font-bold text-xs px-4 py-2"
              >
                <MessageSquare className="h-4 w-4 mr-1.5" />
                Chat
                {unreadStaffCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center gap-1 justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    {unreadStaffCount}
                  </span>
                )}
              </Button>

              {!isIndia && showPaymentLink && paymentLinkUrl && !isPaid && (
                <a
                  href={paymentLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all cursor-pointer"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Pay Now ({grandTotalFormatted})</span>
                  <ExternalLink className="h-4 w-4 opacity-80" />
                </a>
              )}

              <Button
                onClick={() => setIsApprovalOpen(true)}
                className="gap-2 rounded-2xl bg-white text-indigo-700 hover:bg-white/95 font-black text-sm px-6 py-2.5 shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Sign &amp; Approve Quotation
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900 p-5 text-white text-center shadow-xl space-y-3">
            <h3 className="text-base sm:text-lg font-bold">
              {isPaid
                ? 'Quotation Settled & Fully Paid'
                : isCompleted
                  ? 'Work is Done • Ready for Payment'
                  : quotation.status === 'IN_PROGRESS'
                    ? 'Work In Progress'
                    : isExpired
                      ? 'Quotation Expired'
                      : quotation.status === 'REJECTED'
                        ? 'Need to discuss changes or send a message?'
                        : quotation.status === 'APPROVED' || isAlreadyApprovedOrSigned
                          ? 'Quotation Approved'
                          : 'Need assistance with this quotation?'}
            </h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              {isPaid
                ? 'Your payment has been received and confirmed. Contact us anytime if you need receipts or assistance.'
                : isCompleted
                  ? 'All deliverables for this quotation have been completed by our team! Please proceed with payment below to finalize settlement.'
                  : quotation.status === 'IN_PROGRESS'
                    ? 'This quotation is actively in progress. The team is fulfilling deliverables. Reach out via chat anytime.'
                    : isExpired
                      ? 'This quotation validity period has ended. Contact us via chat if you would like a revised estimate.'
                      : quotation.status === 'APPROVED' || isAlreadyApprovedOrSigned
                        ? 'This quotation has been officially approved. You can track progress, download documents, or chat with our team.'
                        : `Click Chat below to open the live chat box with ${org?.name || 'our team'}.`}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-3">
              {paymentLinkUrl && !isPaid && (
                <a
                  href={paymentLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all cursor-pointer"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Pay Now ({grandTotalFormatted})</span>
                  <ExternalLink className="h-4 w-4 opacity-80" />
                </a>
              )}
              {isCompleted && !isPaid && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const el = document.getElementById('payment-details-section') || document.getElementById('quotation-sheet');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 font-bold px-5 shadow-md"
                >
                  <CreditCard className="h-4 w-4 mr-1.5" />
                  <span>View Payment Details</span>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={openChatPopup}
                className="relative bg-white text-slate-900 border-white hover:bg-slate-100 font-bold px-6 shadow-md"
              >
                <MessageSquare className="h-4 w-4 mr-1.5 text-indigo-600" />
                <span>Chat with Team</span>
                {unreadStaffCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center gap-1 justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    {unreadStaffCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Page-level Portal Footer */}
        <div className="mt-8 pt-4 pb-2 border-t border-slate-200/70 text-center text-xs text-slate-400 flex items-center justify-center">
          <p className="text-[11px] font-medium text-slate-500">QuoteFlow 24/7 Digital Approval Platform</p>
        </div>
      </div>

      {/* Compact Floating Chat Button (when popup is closed) */}
      {!isChatPopupOpen && (
        <button
          type="button"
          onClick={openChatPopup}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-slate-900 hover:bg-indigo-600 text-white px-4 py-3 shadow-2xl border border-slate-700 transition-all"
        >
          <MessageSquare className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold">Chat</span>
          {unreadStaffCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              {unreadStaffCount}
            </span>
          )}
        </button>
      )}

      {/* Small Customer Chat Popup (Same compact size as Quotation Dashboard Chat) */}
      {isChatPopupOpen && (
        <div
          id="customer-chat-popup"
          className="fixed bottom-4 right-4 z-50 w-[340px] sm:w-[365px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="border-b border-slate-100 bg-slate-900 px-4 py-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <MessageSquare className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  Chat ({chatMessages.length})
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                  {org?.name || 'Our Team'} • {quotation.quotation_number}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeChatPopup}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Close Chat"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>

          <div className="p-3.5 space-y-2.5">
            {businessWhatsAppUrl && (
              <a
                href={businessWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold transition-all shadow-2xs"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                <span>Chat on Official WhatsApp</span>
                <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
              </a>
            )}
            <div className="h-64 overflow-y-auto space-y-2.5 rounded-xl bg-slate-50 p-3 border border-slate-100">
              {chatMessages.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Send a message below to start live chat with {org?.name || 'our team'}.
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isCustomer = msg.sender_role === 'CUSTOMER';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5 px-1">
                        <span
                          className={`text-[10px] font-bold ${
                            isCustomer ? 'text-indigo-600' : 'text-emerald-700'
                          }`}
                        >
                          {isCustomer ? `${msg.sender_name} (You)` : msg.sender_name}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {formatDateTime(msg.created_at)}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-xs ${
                          isCustomer
                            ? 'bg-slate-900 text-white rounded-br-xs'
                            : 'bg-white text-slate-800 border border-emerald-200 rounded-bl-xs'
                        }`}
                      >
                        {msg.message && <div>{msg.message}</div>}
                        {msg.attachment && (
                          <div className={`mt-2 pt-2 border-t ${isCustomer ? 'border-white/20' : 'border-slate-200'}`}>
                            {msg.attachment.deleted_at ? (
                              <div
                                className={`flex items-start gap-1.5 p-2 rounded-lg text-[10px] leading-snug ${
                                  isCustomer
                                    ? 'bg-white/10 text-amber-300'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span>
                                  {msg.attachment.deleted_reason ||
                                    'Payment screenshot automatically deleted after company payment confirmation.'}
                                </span>
                              </div>
                            ) : msg.attachment.url ? (
                              <div className="space-y-1">
                                {msg.attachment.is_payment_proof && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                    <ShieldCheck className="h-3 w-3" />
                                    Payment Screenshot
                                  </span>
                                )}
                                <a
                                  href={msg.attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block overflow-hidden rounded-lg border border-white/20 hover:opacity-90 transition-opacity"
                                >
                                  {msg.attachment.type?.startsWith('image/') || msg.attachment.url.startsWith('data:image/') ? (
                                    <img
                                      src={msg.attachment.url}
                                      alt={msg.attachment.name || 'Payment screenshot'}
                                      className="max-h-36 max-w-full rounded object-contain bg-black/20"
                                    />
                                  ) : (
                                    <div className="flex items-center gap-1.5 p-2 bg-white/10 text-[11px] rounded">
                                      <FileText className="h-3.5 w-3.5 shrink-0" />
                                      <span className="truncate">{msg.attachment.name}</span>
                                    </div>
                                  )}
                                </a>
                              </div>
                            ) : null}
                          </div>
                        )}
                        {isCustomer && (
                          <div
                            className="mt-1 flex items-center justify-end gap-1"
                            title={msg.is_read ? 'Read by team' : 'Delivered'}
                          >
                            <span
                              className={`text-[9px] font-medium ${
                                msg.is_read ? 'text-emerald-400' : 'text-slate-400'
                              }`}
                            >
                              {msg.is_read ? 'Read' : 'Delivered'}
                            </span>
                            <CheckCheck
                              className={`h-3.5 w-3.5 ${
                                msg.is_read ? 'text-emerald-400' : 'text-slate-400'
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="space-y-2">
              <input
                type="file"
                ref={chatFileInputRef}
                onChange={handleChatFileSelect}
                accept="image/*,.pdf"
                className="hidden"
              />

              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Your Name"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
              />

              {chatAttachment && (
                <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900">
                  <div className="flex items-center gap-1.5 truncate">
                    <Paperclip className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate text-[11px] font-medium">{chatAttachment.name}</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded shrink-0">
                      Payment Proof
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setChatAttachment(null);
                      if (chatFileInputRef.current) chatFileInputRef.current.value = '';
                    }}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-0.5 shrink-0"
                    title="Remove attachment"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => chatFileInputRef.current?.click()}
                  title="Attach payment screenshot or proof"
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors border border-slate-200 shrink-0"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={chatAttachment ? 'Add a note / message...' : 'Type a message...'}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSendingChat}
                  disabled={(!chatInput.trim() && !chatAttachment) || isSendingChat}
                  className="px-3 py-2"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <ApprovalModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        quotationNumber={quotation.quotation_number}
        grandTotalFormatted={grandTotalFormatted}
        token={currentToken}
        authMethod={authMethod}
        customerName={customer?.name || ''}
        customerEmail={customer?.email || ''}
        customerPhone={customer?.phone || ''}
        phoneCountryCode={phoneCountryCode || '+91'}
        customerCompany={customer?.company_name || ''}
        selectedOptionalItemIds={Array.from(selectedOptionalIds)}
        onApproved={handleApproved}
      />

      <RejectionModal
        isOpen={isRejectionOpen}
        onClose={() => setIsRejectionOpen(false)}
        quotationNumber={quotation.quotation_number}
        token={currentToken}
        onRejected={handleRejected}
      />
    </div>
  );
}
