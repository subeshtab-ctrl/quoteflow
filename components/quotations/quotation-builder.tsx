'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Customer,
  Product,
  Organization,
  CurrencyCode,
  DiscountType,
  AttachmentItem,
  BankAccountDetails,
  UpiPaymentDetails,
  CryptoPaymentDetails,
  PaymentDisplayMode,
} from '@/types/database';
import {
  calculateQuotationTotals,
  formatCurrency,
  roundCurrency,
  harmonizePaymentTerms,
  harmonizeTermsAndConditions,
} from '@/lib/quotations/calculations';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Plus,
  Trash2,
  Copy,
  Save,
  Send,
  Eye,
  Building2,
  Calendar,
  DollarSign,
  Percent,
  CheckCircle2,
  Paperclip,
  CreditCard,
  Coins,
  QrCode,
  Landmark,
  Bitcoin,
  Banknote,
  Image as ImageIcon,
  X,
  Smartphone,
  Mail,
  Globe,
  Loader2,
  Lock,
  Link as LinkIcon,
  Package,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { IOSSwitch } from '@/components/ui/ios-switch';
import { formatDate } from '@/lib/utils';
import {
  parseLogoUrl,
  getLogoShapeClass,
  getLogoFitClass,
  getCompanyInitials,
} from '@/lib/utils/logo';
import { getCountryProfile } from '@/lib/tax/country-config';
import { FileAttachmentsUploader } from '@/components/common/file-attachments-uploader';
import { COUNTRY_CODES, getDefaultCountryCode, cleanPhoneNumber } from '@/lib/country-codes';
import { INDIAN_STATES } from '@/lib/tax/india-gst';
import { UAE_EMIRATES, isValidUaeTrn, sanitizeUaeTrn } from '@/lib/tax/uae-tax';

interface QuotationBuilderProps {
  customers: Customer[];
  products: Product[];
  organization: Organization;
  initialQuotation?: any;
  initialCustomerId?: string;
  testMode?: boolean;
}

interface ItemState {
  id?: string;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_type: DiscountType;
  discount_value: number;
  tax_rate: number;
  item_type?: 'GOODS' | 'SERVICE';
  classification_type?: string;
  classification_code?: string;
  is_optional?: boolean;
  is_selected?: boolean;
}

export function QuotationBuilder({
  customers,
  products,
  organization,
  initialQuotation,
  initialCustomerId,
  testMode = false,
}: QuotationBuilderProps) {
  const router = useRouter();

  // Customer state & Quick Add
  const [customerList, setCustomerList] = useState<Customer[]>(customers);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const defaultCountryCode = getDefaultCountryCode(organization?.country);
  const [quickPhoneCountryCode, setQuickPhoneCountryCode] = useState(defaultCountryCode);
  const [quickName, setQuickName] = useState('');
  const [quickCompany, setQuickCompany] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickGstin, setQuickGstin] = useState('');
  const [quickState, setQuickState] = useState('');
  const [quickBillingAddress, setQuickBillingAddress] = useState('');
  const [quickCustomerError, setQuickCustomerError] = useState<string | null>(null);
  const [isSavingQuickCustomer, setIsSavingQuickCustomer] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState<string>(
    initialQuotation?.customer_id || initialCustomerId || customers[0]?.id || ''
  );
  const [title, setTitle] = useState<string>(
    initialQuotation?.title || 'Professional Services & Consulting'
  );
  const [issueDate, setIssueDate] = useState<string>(
    initialQuotation?.issue_date || new Date().toISOString().split('T')[0]
  );
  const [validUntil, setValidUntil] = useState<string>(
    initialQuotation?.valid_until ||
      new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [currency, setCurrency] = useState<CurrencyCode>(
    initialQuotation?.currency || organization.default_currency || 'INR'
  );

  const countryProfile = getCountryProfile(organization?.country);
  const goodsLabel = organization?.goods_classification_label || countryProfile.goodsClassificationLabel;
  const serviceLabel = organization?.service_classification_label || countryProfile.serviceClassificationLabel;

  // Attachments State
  const [attachments, setAttachments] = useState<AttachmentItem[]>(
    initialQuotation?.attachments || []
  );

  // Line items
  const [items, setItems] = useState<ItemState[]>(
    initialQuotation?.items?.map((it: any) => ({
      ...it,
      item_type: it.item_type || 'GOODS',
      classification_type: it.classification_type || (it.item_type === 'SERVICE' ? serviceLabel : goodsLabel),
      classification_code: it.classification_code || '',
    })) || [
      {
        description: 'Cloud Architecture & Implementation',
        quantity: 1,
        unit: 'service',
        unit_price: 25000,
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        tax_rate: organization.default_tax_rate ?? 18,
        item_type: 'SERVICE',
        classification_type: serviceLabel,
        classification_code: countryProfile.isIndiaGst ? '998311' : '',
      },
    ]
  );

  // Quotation-level discount & tax
  const [discountType, setDiscountType] = useState<DiscountType>(
    initialQuotation?.discount_type || 'PERCENTAGE'
  );
  const [discountValue, setDiscountValue] = useState<number>(
    initialQuotation?.discount_value || 0
  );
  const [overallTaxRate, setOverallTaxRate] = useState<number>(
    initialQuotation?.tax_rate !== undefined && initialQuotation.tax_rate !== null
      ? initialQuotation.tax_rate
      : (organization?.default_tax_rate ?? 0)
  );
  const [taxMode, setTaxMode] = useState<'exclusive' | 'inclusive'>(
    initialQuotation?.tax_mode || organization?.default_tax_mode || 'exclusive'
  );
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(
    initialQuotation?.place_of_supply || ''
  );

  // Notes & Terms
  const [notes, setNotes] = useState<string>(
    initialQuotation ? (initialQuotation.notes ?? '') : 'Payment within 30 days of completion.'
  );
  // Payment Details & Instructions
  const [enableAdvance, setEnableAdvance] = useState<boolean>(() => {
    if (initialQuotation) {
      if (initialQuotation.enable_advance !== undefined) {
        return Boolean(initialQuotation.enable_advance);
      }
      return Boolean(
        initialQuotation.advance_percentage !== null &&
        initialQuotation.advance_percentage !== undefined &&
        initialQuotation.advance_percentage > 0 &&
        initialQuotation.payment_terms_type !== 'FULL'
      );
    }
    return false;
  });

  const [terms, setTerms] = useState<string>(() => {
    const raw = initialQuotation ? (initialQuotation.terms_conditions ?? '') : (organization.default_terms || '');
    const hasAdv = initialQuotation ? (initialQuotation.enable_advance && (initialQuotation.advance_percentage || 0) > 0) : false;
    return harmonizeTermsAndConditions(hasAdv ? (initialQuotation?.advance_percentage || 50) : 0, raw);
  });

  const [paymentTermsType, setPaymentTermsType] = useState<'FULL' | 'ADVANCE_SPLIT' | 'MILESTONES'>(
    initialQuotation?.payment_terms_type ||
      (initialQuotation?.enable_advance && initialQuotation.advance_percentage && initialQuotation.advance_percentage > 0
        ? 'ADVANCE_SPLIT'
        : 'FULL')
  );
  const [advancePercentage, setAdvancePercentage] = useState<number>(
    initialQuotation?.advance_percentage !== undefined && initialQuotation.advance_percentage !== null
      ? initialQuotation.advance_percentage
      : (initialQuotation ? 0 : 50)
  );
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<string[]>(
    initialQuotation?.accepted_payment_methods || ['Bank Transfer', 'Online / Card', 'Cheque']
  );
  const [paymentTermsInstructions, setPaymentTermsInstructions] = useState<string>(() => {
    if (initialQuotation?.payment_terms_instructions) {
      return initialQuotation.payment_terms_instructions;
    }
    return 'Payment terms: Full payment due upon completion and invoice issuance.';
  });

  const handleDisableAdvance = () => {
    setEnableAdvance(false);
    setAdvancePercentage(0);
    setPaymentTermsType('FULL');
    setTerms((prev) => harmonizeTermsAndConditions(0, prev));
    setPaymentTermsInstructions('Payment terms: Full payment due upon completion and invoice issuance.');
  };

  const handleUpdateAdvance = (pct: number) => {
    setEnableAdvance(pct > 0);
    setAdvancePercentage(pct);
    setTerms((prev) => harmonizeTermsAndConditions(pct, prev));
    if (!paymentTermsInstructions || /^\s*Payment terms:.*(advance|completion|commence)/i.test(paymentTermsInstructions)) {
      if (pct === 100) {
        setPaymentTermsInstructions('Payment terms: 100% advance required upon approval to commence work.');
      } else if (pct === 0) {
        setPaymentTermsInstructions('Payment terms: 100% full payment due upon project completion and delivery.');
      } else {
        setPaymentTermsInstructions(`Payment terms: ${pct}% advance to commence work, balance upon completion. Remit via Bank Transfer.`);
      }
    }
  };

  // Bank, UPI, Payment Link, Cash, and Crypto Payment Options
  const isIndia = Boolean(
    (organization?.business_country || '').toUpperCase() === 'IN' ||
    (organization?.country || '').toLowerCase() === 'india' ||
    (organization?.country || '').toUpperCase() === 'IN' ||
    organization?.billing_region === 'INDIA' ||
    currency === 'INR' ||
    organization?.default_currency === 'INR'
  );

  const isUAE = Boolean(
    (organization?.business_country || '').toUpperCase() === 'AE' ||
    (organization?.country || '').toLowerCase().includes('emirates') ||
    (organization?.country || '').toLowerCase() === 'uae' ||
    currency === 'AED' ||
    organization?.default_currency === 'AED'
  );

  const effectiveTaxName = !isIndia
    ? (isUAE ? 'VAT' : (organization?.tax_system && !organization.tax_system.toUpperCase().includes('GST') ? organization.tax_system : 'Tax'))
    : (organization?.tax_system || 'GST');

  const [paymentDisplayMode, setPaymentDisplayMode] = useState<PaymentDisplayMode>(
    initialQuotation?.payment_display_mode || organization?.default_payment_display_mode || 'BOTH'
  );
  const [showBankDetails, setShowBankDetails] = useState<boolean>(
    initialQuotation?.show_bank_details ?? organization?.default_show_bank_details ?? true
  );
  const [showUpiDetails, setShowUpiDetails] = useState<boolean>(
    initialQuotation?.show_upi_details ?? organization?.default_show_upi_details ?? true
  );
  const [showPaymentLink, setShowPaymentLink] = useState<boolean>(
    initialQuotation?.show_payment_link ?? organization?.default_show_payment_link ?? (!isIndia && Boolean(organization?.default_payment_link))
  );
  const [paymentLink, setPaymentLink] = useState<string>(
    initialQuotation?.payment_link ?? organization?.default_payment_link ?? ''
  );
  const [paymentLinkLabel, setPaymentLinkLabel] = useState<string>(
    initialQuotation?.payment_link_label ?? organization?.default_payment_link_label ?? ''
  );
  const [showCashDetails, setShowCashDetails] = useState<boolean>(
    initialQuotation?.show_cash_details ?? organization?.default_show_cash_details ?? true
  );
  const [showCryptoDetails, setShowCryptoDetails] = useState<boolean>(
    initialQuotation?.show_crypto_details ?? organization?.default_show_crypto_details ?? false
  );
  const [cashInstructions, setCashInstructions] = useState<string>(
    initialQuotation?.cash_instructions ?? organization?.default_cash_instructions ?? ''
  );
  const [bankDetails, setBankDetails] = useState<BankAccountDetails>(
    initialQuotation?.bank_details || organization?.default_bank_details || {
      bank_name: '',
      account_name: organization?.name || '',
      account_number: '',
      ifsc_code: '',
      swift_code: '',
      iban: '',
      branch_name: '',
      upi_id: '',
    }
  );
  const [upiDetails, setUpiDetails] = useState<UpiPaymentDetails>(
    initialQuotation?.upi_details || organization?.default_upi_details || {
      upi_id: '',
      payee_name: organization?.name || '',
      qr_code_url: '',
    }
  );
  const [cryptoDetails, setCryptoDetails] = useState<CryptoPaymentDetails>(
    initialQuotation?.crypto_details || organization?.default_crypto_details || {
      currency: 'USDT',
      network: 'TRC20',
      wallet_address: '',
      qr_code_url: '',
    }
  );

  const handleSelectPaymentMode = (mode: PaymentDisplayMode) => {
    setPaymentDisplayMode(mode);
    if (mode === 'BOTH') {
      setShowBankDetails(true);
      setShowUpiDetails(isIndia);
      setShowPaymentLink(!isIndia);
      setShowCashDetails(false);
      setShowCryptoDetails(false);
    } else if (mode === 'BANK_ONLY') {
      setShowBankDetails(true);
      setShowUpiDetails(false);
      setShowPaymentLink(false);
      setShowCashDetails(false);
      setShowCryptoDetails(false);
    } else if (mode === 'UPI_ONLY') {
      setShowBankDetails(false);
      setShowUpiDetails(isIndia);
      setShowPaymentLink(false);
      setShowCashDetails(false);
      setShowCryptoDetails(false);
    } else if (mode === 'PAYMENT_LINK_ONLY') {
      setShowBankDetails(false);
      setShowUpiDetails(false);
      setShowPaymentLink(true);
      setShowCashDetails(false);
      setShowCryptoDetails(false);
    } else if (mode === 'CRYPTO_ONLY') {
      setShowBankDetails(false);
      setShowUpiDetails(false);
      setShowPaymentLink(false);
      setShowCashDetails(false);
      setShowCryptoDetails(true);
    } else if (mode === 'ALL') {
      setShowBankDetails(true);
      setShowUpiDetails(isIndia);
      setShowPaymentLink(!isIndia);
      setShowCashDetails(true);
      setShowCryptoDetails(true);
    }
  };

  // Quotation PIN Protection State (Default OFF)
  const [pinProtectionEnabled, setPinProtectionEnabled] = useState<boolean>(
    initialQuotation?.pin_protection_enabled ?? false
  );
  const [pin, setPin] = useState<string>(() => {
    if (initialQuotation?.pin) return initialQuotation.pin;
    return Math.floor(1000 + Math.random() * 9000).toString();
  });
  const [copiedPin, setCopiedPin] = useState(false);

  const handleRegeneratePin = () => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(newPin);
  };

  const handleCopyPin = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const [isUploadingUpiQr, setIsUploadingUpiQr] = useState(false);
  const [isUploadingCryptoQr, setIsUploadingCryptoQr] = useState(false);

  const handleUpiQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('QR code image must be under 5MB.');
      return;
    }
    try {
      setIsUploadingUpiQr(true);
      const formData = new FormData();
      formData.append('qr', file);

      const res = await fetch('/api/upload/qr', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload QR code');

      setUpiDetails((prev) => ({ ...prev, qr_code_url: data.qr_url }));
    } catch (err: any) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = event.target?.result as string;
        setUpiDetails((prev) => ({ ...prev, qr_code_url: res }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingUpiQr(false);
      e.target.value = '';
    }
  };

  const handleCryptoQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('QR code image must be under 5MB.');
      return;
    }
    try {
      setIsUploadingCryptoQr(true);
      const formData = new FormData();
      formData.append('qr', file);

      const res = await fetch('/api/upload/qr', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload QR code');

      setCryptoDetails((prev) => ({ ...prev, qr_code_url: data.qr_url }));
    } catch (err: any) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = event.target?.result as string;
        setCryptoDetails((prev) => ({ ...prev, qr_code_url: res }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingCryptoQr(false);
      e.target.value = '';
    }
  };

  const validityDays = (() => {
    if (!issueDate || !validUntil) return 14;
    const [sy, sm, sd] = String(issueDate).split('T')[0].split('-').map(Number);
    const [ey, em, ed] = String(validUntil).split('T')[0].split('-').map(Number);
    const startUtc = Date.UTC(sy, (sm || 1) - 1, sd || 1);
    const endUtc = Date.UTC(ey, (em || 1) - 1, ed || 1);
    const diff = Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  })();

  const syncTermsWithValidityDays = (nextIssueDate: string, nextValidUntil: string) => {
    if (!nextIssueDate || !nextValidUntil) return;
    const [sy, sm, sd] = String(nextIssueDate).split('T')[0].split('-').map(Number);
    const [ey, em, ed] = String(nextValidUntil).split('T')[0].split('-').map(Number);
    const startUtc = Date.UTC(sy, (sm || 1) - 1, sd || 1);
    const endUtc = Date.UTC(ey, (em || 1) - 1, ed || 1);
    const diff = Math.max(0, Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24)));
    setTerms((prev) =>
      prev.replace(
        /Quotation valid for \d+ days?/gi,
        `Quotation valid for ${diff} ${diff === 1 ? 'day' : 'days'}`
      )
    );
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCustomer = customerList.find((c) => c.id === customerId);
  const resolvedPlaceOfSupply =
    placeOfSupply ||
    selectedCustomer?.place_of_supply ||
    selectedCustomer?.billing_state ||
    selectedCustomer?.state ||
    organization?.business_state ||
    organization?.state ||
    '';

  // Live Calculations
  const calculated = calculateQuotationTotals({
    items,
    currency,
    country: organization?.country || organization?.business_country || (isUAE ? 'AE' : (isIndia ? 'IN' : 'US')),
    is_india_gst: isIndia,
    discount_type: discountType,
    discount_value: discountValue,
    tax_rate: overallTaxRate,
    tax_mode: taxMode,
    tax_name: effectiveTaxName,
    business_state: organization?.business_state || organization?.state || '',
    place_of_supply: resolvedPlaceOfSupply,
    gst_registered: isIndia ? (organization?.gst_registered ?? true) : false,
  });

  const calculatedMilestones = React.useMemo(() => {
    const total = calculated.grand_total || 0;
    if (paymentTermsType === 'MILESTONES') {
      return [
        {
          id: 'ms_1',
          name: 'Stage 1: Advance / Mobilization (40%)',
          percentage: 40,
          amount: roundCurrency((total * 40) / 100),
          due_stage: 'Upon Quote Approval & Mobilization',
        },
        {
          id: 'ms_2',
          name: 'Stage 2: Interim Milestone / Beta (40%)',
          percentage: 40,
          amount: roundCurrency((total * 40) / 100),
          due_stage: 'Mid-project Deliverable Handover',
        },
        {
          id: 'ms_3',
          name: 'Stage 3: Final Delivery & Signoff (20%)',
          percentage: 20,
          amount: roundCurrency((total * 20) / 100),
          due_stage: 'Final Deployment & Acceptance',
        },
      ];
    }
    if (paymentTermsType === 'ADVANCE_SPLIT' && advancePercentage > 0 && advancePercentage < 100) {
      return [
        {
          id: 'ms_adv',
          name: `Stage 1: ${advancePercentage}% Advance Payment`,
          percentage: advancePercentage,
          amount: roundCurrency((total * advancePercentage) / 100),
          due_stage: 'To commence work upon approval',
        },
        {
          id: 'ms_bal',
          name: `Stage 2: ${100 - advancePercentage}% Balance Payment`,
          percentage: 100 - advancePercentage,
          amount: roundCurrency((total * (100 - advancePercentage)) / 100),
          due_stage: 'Upon project completion and delivery',
        },
      ];
    }
    return [
      {
        id: 'ms_full',
        name: 'Stage 1: 100% Full Payment',
        percentage: 100,
        amount: total,
        due_stage: 'Upon project completion and delivery',
      },
    ];
  }, [paymentTermsType, advancePercentage, calculated.grand_total]);

  // Quick Customer Creation
  const handleQuickGstinChange = (val: string) => {
    if (countryProfile.isUaeVat) {
      setQuickGstin(sanitizeUaeTrn(val));
      return;
    }
    const upper = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setQuickGstin(upper);
    if (countryProfile.isIndiaGst && upper.length >= 2) {
      const code = upper.substring(0, 2);
      const match = INDIAN_STATES.find((s) => s.code === code);
      if (match && !quickState) {
        setQuickState(match.name);
      }
    }
  };

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      setQuickCustomerError('Contact Name is required');
      return;
    }

    const cleanPhone = quickPhone.trim() ? cleanPhoneNumber(quickPhone, quickPhoneCountryCode) : '';
    const cleanEmail = quickEmail.trim();

    if (!cleanPhone && !cleanEmail) {
      setQuickCustomerError('Please enter either a mobile number or an email address (cannot leave both blank).');
      return;
    }

    setIsSavingQuickCustomer(true);
    setQuickCustomerError(null);

    try {
      const trimmedGstin = quickGstin.trim().toUpperCase();

      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickName.trim(),
          company_name: quickCompany.trim() || undefined,
          phone_country_code: quickPhoneCountryCode,
          phone: cleanPhone || undefined,
          email: cleanEmail || undefined,
          tax_number: trimmedGstin || undefined,
          customer_gstin: trimmedGstin || undefined,
          state: quickState || undefined,
          billing_state: quickState || undefined,
          place_of_supply: quickState || undefined,
          billing_address: quickBillingAddress.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save customer');

      const newCust = data.customer;
      setCustomerList((prev) => [newCust, ...prev]);
      setCustomerId(newCust.id);
      if (quickState) {
        setPlaceOfSupply(quickState);
      }
      setIsQuickAddOpen(false);
      setQuickName('');
      setQuickCompany('');
      setQuickGstin('');
      setQuickState('');
      setQuickBillingAddress('');
      setQuickPhoneCountryCode(defaultCountryCode);
      setQuickEmail('');
      setQuickPhone('');
    } catch (err: any) {
      setQuickCustomerError(err.message || 'Error creating customer');
    } finally {
      setIsSavingQuickCustomer(false);
    }
  };

  // Bulk Rate Adjuster
  const handleBulkRateAdjust = (percentage: number) => {
    const factor = 1 + percentage / 100;
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        unit_price: Math.max(0, Math.round(item.unit_price * factor)),
      }))
    );
  };

  // Handlers for Items
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: '',
        quantity: 1,
        unit: 'unit',
        unit_price: 0,
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        tax_rate: organization.default_tax_rate || countryProfile.defaultTaxRate || 0,
        item_type: 'GOODS',
        classification_type: goodsLabel,
        classification_code: '',
      },
    ]);
  };

  const handleDuplicateItem = (index: number) => {
    const itemToClone = items[index];
    setItems((prev) => [
      ...prev.slice(0, index + 1),
      { ...itemToClone, id: undefined },
      ...prev.slice(index + 1),
    ]);
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) {
      alert('Quotation must contain at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemState, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const unitLower = (prod.unit || '').toLowerCase();
    const nameLower = prod.name.toLowerCase();
    const isService =
      prod.classification_type === 'SAC' ||
      (prod.hsn_code && prod.hsn_code.startsWith('99')) ||
      unitLower === 'service' ||
      unitLower === 'hrs' ||
      unitLower === 'hour' ||
      nameLower.includes('service') ||
      nameLower.includes('consult') ||
      nameLower.includes('maintenance') ||
      nameLower.includes('support');

    const itemType: 'GOODS' | 'SERVICE' = isService ? 'SERVICE' : 'GOODS';

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        product_id: prod.id,
        description: prod.name + (prod.description ? ` - ${prod.description}` : ''),
        unit: prod.unit || (isService ? 'service' : 'unit'),
        unit_price: prod.unit_price,
        tax_rate: prod.tax_rate,
        item_type: itemType,
        classification_type: countryProfile.isIndiaGst ? (isService ? 'SAC' : 'HSN') : (isService ? 'SERVICE' : 'GOODS'),
        classification_code: prod.hsn_code || (countryProfile.isIndiaGst ? (isService ? '998311' : '') : ''),
      };
      return copy;
    });
  };

  // Submit Handler
  const handleSave = async (statusToSet: 'DRAFT' | 'SENT') => {
    setError(null);
    if (!customerId) {
      setError('Please choose a customer for this quotation.');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a project or quotation title.');
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      setError('Every line item must have a description.');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        customer_id: customerId,
        title,
        issue_date: issueDate,
        valid_until: validUntil,
        currency,
        discount_type: discountType,
        discount_value: discountValue,
        tax_rate: overallTaxRate,
        tax_mode: taxMode,
        tax_name: effectiveTaxName,
        place_of_supply: resolvedPlaceOfSupply || null,
        customer_gstin: selectedCustomer?.customer_gstin || selectedCustomer?.tax_number || null,
        notes,
        terms_conditions: harmonizeTermsAndConditions(enableAdvance ? advancePercentage : 0, terms),
        items,
        attachments,
        status: statusToSet,
        enable_advance: enableAdvance,
        advance_percentage: enableAdvance ? (advancePercentage > 0 ? advancePercentage : 50) : null,
        milestones: enableAdvance ? calculatedMilestones : [],
        payment_terms_type: enableAdvance ? paymentTermsType : 'FULL',
        accepted_payment_methods: (() => {
          const derived: string[] = [];
          if (showBankDetails) derived.push('Bank Transfer');
          if (isIndia && showUpiDetails) derived.push('UPI / QR Code');
          if (!isIndia && showPaymentLink) derived.push('Online / Card');
          if (showCashDetails) derived.push('Cash');
          if (showCryptoDetails) derived.push('Crypto');
          return derived.length > 0 ? derived : ['Bank Transfer'];
        })(),
        payment_terms_instructions: enableAdvance
          ? harmonizePaymentTerms(advancePercentage, paymentTermsInstructions)
          : 'Payment terms: Full payment due upon completion and invoice issuance.',
        payment_display_mode: paymentDisplayMode,
        show_bank_details: showBankDetails,
        show_upi_details: isIndia ? showUpiDetails : false,
        show_payment_link: !isIndia ? showPaymentLink : false,
        payment_link: !isIndia ? paymentLink : null,
        payment_link_label: !isIndia ? paymentLinkLabel : null,
        show_cash_details: showCashDetails,
        show_crypto_details: showCryptoDetails,
        cash_instructions: cashInstructions,
        bank_details: bankDetails,
        upi_details: upiDetails,
        crypto_details: cryptoDetails,
        pin_protection_enabled: pinProtectionEnabled,
        pin: pinProtectionEnabled ? pin : null,
      };

      const endpoint = initialQuotation?.id
        ? `/api/quotations/${initialQuotation.id}`
        : '/api/quotations';
      const method = initialQuotation?.id ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save quotation');

      router.push(`/quotations/${data.quotation.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setIsLoading(false);
    }
  };

  const nextRevPreview = React.useMemo(() => {
    if (!initialQuotation?.quotation_number) return '';
    const baseNumber = initialQuotation.quotation_number.replace(/[-_](REV|V|rev|v)[-_]?\d+$/i, '');
    const revMatch = initialQuotation.quotation_number.match(/[-_](REV|V|rev|v)[-_]?(\d+)$/i);
    let currentRevCount = 0;
    if (revMatch) {
      currentRevCount = parseInt(revMatch[2], 10);
    } else if (initialQuotation.revision_number && initialQuotation.revision_number > 1) {
      currentRevCount = initialQuotation.revision_number - 1;
    }
    const nextRevCount = currentRevCount + 1;
    return `${baseNumber}-REV${String(nextRevCount).padStart(2, '0')}`;
  }, [initialQuotation]);

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {initialQuotation ? `Edit Quotation ${initialQuotation.quotation_number}` : 'New Quotation'}
          </h1>
          <p className="text-xs text-slate-500">
            {initialQuotation
              ? `Saving changes will automatically update this quotation to revision ${nextRevPreview} and require the customer to approve again.`
              : 'Configure line items, discounts, taxes, and preview customer view in real-time.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave('DRAFT')}
            isLoading={isLoading}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" />
            {initialQuotation ? 'Save Draft Revision' : 'Save Draft'}
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSave(initialQuotation ? (initialQuotation.status === 'DRAFT' ? 'DRAFT' : 'SENT') : 'SENT')}
            isLoading={isLoading}
            className="gap-1.5 shadow-md hover:shadow-lg"
          >
            <Send className="h-4 w-4" />
            {initialQuotation ? 'Save Changes & Require Re-Approval' : 'Save & Issue to Customer'}
          </Button>
        </div>
      </div>

      {initialQuotation && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 shadow-2xs">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">
              Editing {['APPROVED', 'IN_PROGRESS'].includes(initialQuotation.status) ? (initialQuotation.status === 'APPROVED' ? 'Approved' : 'In-Progress') : 'Unapproved'} Quotation
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Saving changes will increment the quotation number to <strong>{nextRevPreview}</strong> and require the customer to review and re-approve the revised proposal before work or invoicing can proceed.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Split View: Left Form (7 cols), Right Live Preview (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Customer Selection */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Client & Organization
                  </h3>
                  <p className="text-[11px] text-slate-400">Select target client or quickly create a new contact</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
                className="gap-1 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Plus className="h-3.5 w-3.5" />
                {isQuickAddOpen ? 'Cancel' : '+ Add New Customer'}
              </Button>
            </div>

            {/* Inline Quick Add Form */}
            {isQuickAddOpen && (
              <div className="rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 p-4 space-y-3.5 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">Quick Add Customer</span>
                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full">B2B & B2C Ready</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Auto-saves to customer directory</span>
                </div>

                {quickCustomerError && (
                  <p className="text-xs text-rose-600 font-medium bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-200 dark:border-rose-900/40">
                    {quickCustomerError}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Subesh Sharma"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Company Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Tech Pvt Ltd"
                      value={quickCompany}
                      onChange={(e) => setQuickCompany(e.target.value)}
                      className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* GSTIN / TRN / Tax ID field */}
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-200 mb-1 flex items-center justify-between">
                      <span>
                        {countryProfile.isIndiaGst
                          ? 'GSTIN (GST Number - for B2B)'
                          : countryProfile.isUaeVat
                          ? 'TRN (Tax Registration Number - 15 digits)'
                          : `${countryProfile.taxLabel.split(' ')[0]} / Tax ID`}
                      </span>
                      <span className="text-[9px] font-normal text-slate-400">Leave blank for B2C</span>
                    </label>
                    <input
                      type="text"
                      placeholder={
                        countryProfile.isIndiaGst
                          ? 'e.g. 33AAAAA0000A1Z5'
                          : countryProfile.isUaeVat
                          ? 'e.g. 100123456700003 (15 digits)'
                          : 'e.g. Tax Registration ID'
                      }
                      value={quickGstin}
                      onChange={(e) => handleQuickGstinChange(e.target.value)}
                      maxLength={15}
                      className="h-8.5 w-full rounded-lg border border-indigo-200 dark:border-indigo-800 px-2.5 text-xs font-mono font-bold uppercase bg-white dark:bg-slate-800 text-indigo-950 dark:text-indigo-200 placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Billing State / Emirate / Place of Supply */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {countryProfile.isUaeVat ? 'Emirate (Place of Supply)' : 'State / Place of Supply'}
                    </label>
                    {countryProfile.isIndiaGst ? (
                      <select
                        value={quickState}
                        onChange={(e) => setQuickState(e.target.value)}
                        className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Select State --</option>
                        {INDIAN_STATES.map((st) => (
                          <option key={st.code} value={st.name}>
                            {st.name} ({st.code})
                          </option>
                        ))}
                      </select>
                    ) : countryProfile.isUaeVat ? (
                      <select
                        value={quickState}
                        onChange={(e) => setQuickState(e.target.value)}
                        className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Select Emirate --</option>
                        {UAE_EMIRATES.map((em) => (
                          <option key={em.code} value={em.name}>
                            {em.name} (Box {em.boxIndex})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. State / Province"
                        value={quickState}
                        onChange={(e) => setQuickState(e.target.value)}
                        className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Number
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={quickPhoneCountryCode}
                        onChange={(e) => setQuickPhoneCountryCode(e.target.value)}
                        title="Country code"
                        className="h-8.5 w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                            {c.flag} {c.dialCode}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        placeholder="e.g. 7848861162"
                        value={quickPhone}
                        onChange={(e) => setQuickPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                        className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="client@example.com"
                      value={quickEmail}
                      onChange={(e) => setQuickEmail(e.target.value)}
                      className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Billing Address (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Door no, Street, Locality, City..."
                      value={quickBillingAddress}
                      onChange={(e) => setQuickBillingAddress(e.target.value)}
                      className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <p className="text-[10.5px] text-slate-400 dark:text-slate-500 col-span-1 sm:col-span-2">
                    Enter at least a mobile number or email. Adding a GSTIN automatically enables B2B Tax Credit.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQuickAddOpen(false)}
                    className="text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleQuickAddCustomer}
                    isLoading={isSavingQuickCustomer}
                    className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Save & Select Customer
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Client / Company *</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {customerList.length === 0 ? (
                  <option value="">-- No Customers. Click "+ Add New Customer" above --</option>
                ) : (
                  customerList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name ? `${c.name} (${c.company_name})` : c.name}
                      {c.email ? ` - ${c.email}` : ''}
                      {c.phone ? ` [${c.phone}]` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Step 2: Metadata */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Quotation Scope & Validity
                </h3>
                <p className="text-[11px] text-slate-400">Project title, currency, and proposal validity period</p>
              </div>
            </div>
            <Input
              label="Quotation / Project Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Enterprise Cloud Deployment & Migration"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <Input
                label="Issue Date *"
                type="date"
                value={issueDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setIssueDate(next);
                  syncTermsWithValidityDays(next, validUntil);
                }}
                required
              />
              <div>
                <Input
                  label={`Valid Until * (${validityDays} ${validityDays === 1 ? 'day' : 'days'})`}
                  type="date"
                  value={validUntil}
                  onChange={(e) => {
                    const next = e.target.value;
                    setValidUntil(next);
                    syncTermsWithValidityDays(issueDate, next);
                  }}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="SAR">SAR (ر.س)</option>
                  <option value="KWD">KWD (د.ك)</option>
                  <option value="CAD">CAD (CA$)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="SGD">SGD (S$)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Step 3: Unlimited Line Items */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Deliverables & Rates
                  </h3>
                  <p className="text-[11px] text-slate-400">Manage line items, optional client add-ons, and pricing</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddItem}
                  className="gap-1.5 text-xs shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </Button>
              </div>
            </div>

            {/* Bulk Rate Adjuster Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 px-3.5 py-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                Quick Rate Adjust:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[-10, -5, 5, 10, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleBulkRateAdjust(pct)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-all shadow-2xs cursor-pointer"
                    title={`${pct > 0 ? 'Increase' : 'Reduce'} all unit prices by ${Math.abs(pct)}%`}
                  >
                    {pct > 0 ? `+${pct}%` : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {items.map((item, idx) => {
                const itemCalculated = calculated.items[idx];

                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 p-4 bg-slate-50/40 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700">
                          {idx + 1}
                        </span>
                        {/* Quick pick product dropdown */}
                        <select
                          onChange={(e) => {
                            if (e.target.value) handleSelectProduct(idx, e.target.value);
                          }}
                          defaultValue=""
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 focus:outline-none"
                        >
                          <option value="">-- Load from Product Catalog --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatCurrency(p.unit_price, currency)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={Boolean(item.is_optional)}
                            onChange={(e) => {
                              handleItemChange(idx, 'is_optional', e.target.checked);
                              if (e.target.checked && item.is_selected === undefined) {
                                handleItemChange(idx, 'is_selected', true);
                              }
                            }}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                              item.is_optional
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-white text-slate-500 border-slate-200'
                            }`}
                          >
                            Optional Add-on
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleDuplicateItem(idx)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                          title="Duplicate item"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <Input
                      placeholder="Item description / deliverables..."
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    />

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                          Unit
                        </label>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-indigo-700 mb-1">
                          Rate ({currency}) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unit_price}
                          onChange={(e) =>
                            handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)
                          }
                          className="h-9 w-full rounded-lg border border-indigo-300 bg-indigo-50/20 px-2 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                          Tax %
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.tax_rate}
                          onChange={(e) =>
                            handleItemChange(idx, 'tax_rate', parseFloat(e.target.value) || 0)
                          }
                          className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 text-right sm:text-right flex flex-col justify-end">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">Total</span>
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(itemCalculated?.line_total || 0, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Item Classification: Goods vs Service and Adaptive Code */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                          Classification Type
                        </label>
                        <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white p-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              handleItemChange(idx, 'item_type', 'GOODS');
                              handleItemChange(idx, 'classification_type', goodsLabel);
                            }}
                            className={`flex-1 py-1 text-[11px] font-semibold rounded transition-colors ${
                              item.item_type === 'GOODS' || !item.item_type
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Goods
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleItemChange(idx, 'item_type', 'SERVICE');
                              handleItemChange(idx, 'classification_type', serviceLabel);
                            }}
                            className={`flex-1 py-1 text-[11px] font-semibold rounded transition-colors ${
                              item.item_type === 'SERVICE'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Service
                          </button>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                          {item.item_type === 'SERVICE' ? serviceLabel : goodsLabel}
                        </label>
                        <input
                          type="text"
                          value={item.classification_code || ''}
                          onChange={(e) => handleItemChange(idx, 'classification_code', e.target.value)}
                          placeholder={
                            item.item_type === 'SERVICE'
                              ? countryProfile.servicePlaceholder
                              : countryProfile.goodsPlaceholder
                          }
                          className="h-8 w-full rounded-lg border border-slate-300 px-2.5 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 4: Overall Discount, Tax, Notes, Terms */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Percent className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Discount, Tax & Commercial Terms
                </h3>
                <p className="text-[11px] text-slate-400">Overall discount, tax rates, payment schedules, and terms</p>
              </div>
            </div>

            {isIndia && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Place of Supply (State)
                </label>
                <select
                  value={resolvedPlaceOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                >
                  <option value="">Same as Business State ({organization?.business_state || organization?.state || 'Default'})</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st.code} value={st.name}>
                      {st.name} ({st.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overall Discount
                </label>
                <div className="flex gap-2">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="h-10 rounded-lg border border-slate-300 px-2 text-xs"
                  >
                    <option value="PERCENTAGE">%</option>
                    <option value="FIXED">Fixed</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overall Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={overallTaxRate}
                  onChange={(e) => setOverallTaxRate(parseFloat(e.target.value) || 0)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  placeholder="0 (Or calculated per line)"
                />
              </div>
            </div>

            <Textarea
              label="Notes for Client"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />

            <Textarea
              label="Terms & Conditions"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={3}
            />
          </div>

          {/* Step 5: Payment Details & Instructions */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Payment Methods & Settlement
                  </h3>
                  <p className="text-[11px] text-slate-400">Wire transfer, UPI QR code, crypto, or custom payment modes</p>
                </div>
              </div>
              {enableAdvance ? (
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60 px-2.5 py-0.5 rounded-full">
                  Advance: {advancePercentage}%
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                  No Advance Required
                </span>
              )}
            </div>

            {/* Advance Payment Option Toggle */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>Require Advance Payment</span>
                    {enableAdvance ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                        Active ({advancePercentage}%)
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-full">
                        Disabled (Full Payment)
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Enable to require an upfront advance percentage or milestone payments before commencing work.
                  </p>
                </div>
              </div>

              <IOSSwitch
                checked={enableAdvance}
                onChange={(checked) => {
                  setEnableAdvance(checked);
                  if (checked) {
                    const pct = advancePercentage > 0 ? advancePercentage : 50;
                    handleUpdateAdvance(pct);
                  } else {
                    handleDisableAdvance();
                  }
                }}
                ariaLabel="Toggle Advance Payment Requirement"
              />
            </div>

            {/* Advance % and Milestone Schedule (Only shown when enableAdvance is true) */}
            {enableAdvance && (
              <div className="space-y-3 pb-4 border-b border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Payment Structure & Milestone Terms
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentTermsType('ADVANCE_SPLIT');
                        if (advancePercentage === 0 || advancePercentage === 100) handleUpdateAdvance(50);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        paymentTermsType === 'ADVANCE_SPLIT'
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="block text-xs font-bold text-slate-900">Advance Split</span>
                      <span className="text-[10px] text-slate-500">e.g. 50% advance, balance on delivery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentTermsType('MILESTONES');
                        setPaymentTermsInstructions('Payment terms: 3-Stage Milestones (40% Kickoff, 40% Beta, 20% Signoff). Remit via Bank Transfer.');
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        paymentTermsType === 'MILESTONES'
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="block text-xs font-bold text-slate-900">3-Stage Milestones</span>
                      <span className="text-[10px] text-slate-500">40% Kickoff, 40% Beta, 20% Signoff</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentTermsType('FULL');
                        handleUpdateAdvance(0);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        paymentTermsType === 'FULL'
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="block text-xs font-bold text-slate-900">100% Full Payment</span>
                      <span className="text-[10px] text-slate-500">Pay full upon completion / delivery</span>
                    </button>
                  </div>

                  {paymentTermsType === 'ADVANCE_SPLIT' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Advance Payment Percentage
                      </label>
                      <div className="flex flex-wrap gap-2 items-center">
                        {[10, 20, 25, 30, 40, 50, 60, 75, 100].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleUpdateAdvance(pct)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                              advancePercentage === pct
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                        <div className="flex items-center gap-1 ml-auto">
                          <span className="text-xs text-slate-500">Custom:</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={advancePercentage}
                            onChange={(e) =>
                              handleUpdateAdvance(
                                Math.min(100, Math.max(1, parseInt(e.target.value) || 0))
                              )
                            }
                            className="w-16 h-8 text-center text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-500">%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live Milestone Schedule Breakdown Preview */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">Payment Schedule Breakdown</span>
                      <span className="font-semibold text-indigo-700">Total: {formatCurrency(calculated.grand_total, currency)}</span>
                    </div>
                    <div className="space-y-1.5">
                      {calculatedMilestones.map((ms, mIdx) => (
                        <div key={ms.id || mIdx} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                          <div>
                            <p className="font-semibold text-slate-900">{ms.name}</p>
                            <p className="text-[10px] text-slate-500">{ms.due_stage}</p>
                          </div>
                          <span className="font-bold font-mono text-slate-900">
                            {formatCurrency(ms.amount, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Payment Options with iPhone-Style Toggles */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Customer Payment Display Options</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isIndia
                      ? 'Toggle bank transfer, UPI QR code, cash, and crypto payment options.'
                      : 'Toggle bank remittance, online payment link, crypto, and cash payment options.'}
                  </p>
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBankDetails(true);
                      setShowUpiDetails(isIndia);
                      setShowPaymentLink(!isIndia);
                      setShowCashDetails(true);
                      setShowCryptoDetails(true);
                      setPaymentDisplayMode('ALL');
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBankDetails(true);
                      setShowUpiDetails(isIndia);
                      setShowPaymentLink(!isIndia);
                      setShowCashDetails(false);
                      setShowCryptoDetails(false);
                      setPaymentDisplayMode('BOTH');
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-2xs"
                  >
                    {isIndia ? 'Bank + UPI' : 'Bank + Payment Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBankDetails(false);
                      setShowUpiDetails(false);
                      setShowPaymentLink(false);
                      setShowCashDetails(false);
                      setShowCryptoDetails(false);
                      setPaymentDisplayMode('CUSTOM');
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 shadow-2xs"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Option 1: Bank Transfer / Wire Remittance */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all">
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>Bank Transfer / Wire Remittance</span>
                        {showBankDetails && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                            Active
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400">Domestic &amp; international direct bank wire coordinates</p>
                    </div>
                  </div>

                  <IOSSwitch
                    checked={showBankDetails}
                    onChange={(checked) => {
                      setShowBankDetails(checked);
                      setPaymentDisplayMode('CUSTOM');
                    }}
                    ariaLabel="Toggle Bank Transfer"
                  />
                </div>

                {/* Collapsible Bank Fields */}
                {showBankDetails && (
                  <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-3 animate-fade-in-up">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={bankDetails.bank_name || ''}
                          onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
                          placeholder="e.g. HDFC Bank, Chase, Emirates NBD"
                          className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Account Holder / Beneficiary Name
                        </label>
                        <input
                          type="text"
                          value={bankDetails.account_name || ''}
                          onChange={(e) => setBankDetails({ ...bankDetails, account_name: e.target.value })}
                          placeholder="e.g. SUBESH M LLC"
                          className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Account Number / IBAN
                        </label>
                        <input
                          type="text"
                          value={bankDetails.account_number || ''}
                          onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
                          placeholder="e.g. 50200012345678 or AE07033123456789"
                          className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          IFSC Code <span className="text-slate-400 font-normal">(India)</span>
                        </label>
                        <input
                          type="text"
                          value={bankDetails.ifsc_code || ''}
                          onChange={(e) => setBankDetails({ ...bankDetails, ifsc_code: e.target.value.toUpperCase() })}
                          placeholder="e.g. HDFC0001234"
                          className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-mono uppercase focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          SWIFT / BIC Code <span className="text-slate-400 font-normal">(International)</span>
                        </label>
                        <input
                          type="text"
                          value={bankDetails.swift_code || ''}
                          onChange={(e) => setBankDetails({ ...bankDetails, swift_code: e.target.value.toUpperCase() })}
                          placeholder="e.g. HDFCINBBXXX"
                          className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-mono uppercase focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Branch Name & City
                        </label>
                        <input
                          type="text"
                          value={bankDetails.branch_name || ''}
                          onChange={(e) => setBankDetails({ ...bankDetails, branch_name: e.target.value })}
                          placeholder="e.g. Nariman Point, Mumbai"
                          className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Option 2: UPI ID & QR Code (India Only) OR Online Payment Link (International Only) */}
              {isIndia ? (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all">
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                        <QrCode className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>UPI ID &amp; QR Code (India)</span>
                          {showUpiDetails && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                              Active
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400">Instant scan &amp; pay via Google Pay, PhonePe, Paytm, BHIM</p>
                      </div>
                    </div>

                    <IOSSwitch
                      checked={showUpiDetails}
                      onChange={(checked) => {
                        setShowUpiDetails(checked);
                        setPaymentDisplayMode('CUSTOM');
                      }}
                      ariaLabel="Toggle UPI Payment"
                    />
                  </div>

                  {/* Collapsible UPI Fields */}
                  {showUpiDetails && (
                    <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-3 animate-fade-in-up">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
                        <div className="sm:col-span-7 space-y-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              UPI ID / VPA
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={upiDetails.upi_id || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setUpiDetails({ ...upiDetails, upi_id: val });
                                  setBankDetails({ ...bankDetails, upi_id: val });
                                }}
                                placeholder="e.g. subeshtab@okhdfcbank or business@upi"
                                className="h-9 w-full rounded-lg border border-slate-300 px-3 pr-8 text-xs font-mono focus:ring-1 focus:ring-emerald-500"
                              />
                              <Smartphone className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Payee / Merchant Name
                            </label>
                            <input
                              type="text"
                              value={upiDetails.payee_name || ''}
                              onChange={(e) => setUpiDetails({ ...upiDetails, payee_name: e.target.value })}
                              placeholder="e.g. SUBESH M LLC"
                              className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        {/* QR Code Upload / Preview */}
                        <div className="sm:col-span-5">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Attachment UPI QR Code
                          </label>
                          {upiDetails.qr_code_url ? (
                            <div className="relative p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/30 flex items-center gap-3">
                              <img
                                src={upiDetails.qr_code_url}
                                alt="UPI QR Code"
                                className="h-16 w-16 object-contain rounded-lg border border-slate-200 bg-white p-1"
                              />
                              <div className="space-y-1">
                                <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Attached
                                </span>
                                <div className="flex gap-2 items-center">
                                  <label className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer underline flex items-center gap-1">
                                    {isUploadingUpiQr ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Uploading...</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>Change</span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={handleUpiQrUpload}
                                          className="hidden"
                                          disabled={isUploadingUpiQr}
                                        />
                                      </>
                                    )}
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setUpiDetails({ ...upiDetails, qr_code_url: '' })}
                                    className="text-[10px] font-semibold text-rose-600 hover:text-rose-800"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <label className={`border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/30 ${isUploadingUpiQr ? 'opacity-60 pointer-events-none' : ''}`}>
                              {isUploadingUpiQr ? (
                                <>
                                  <Loader2 className="h-6 w-6 text-emerald-600 animate-spin mb-1" />
                                  <span className="text-[11px] font-semibold text-slate-700">Uploading QR Code...</span>
                                </>
                              ) : (
                                <>
                                  <QrCode className="h-6 w-6 text-slate-400 mb-1" />
                                  <span className="text-[11px] font-semibold text-slate-700">Attach UPI QR Code</span>
                                  <span className="text-[10px] text-slate-400">PNG, JPG, WebP up to 5MB</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleUpiQrUpload}
                                    className="hidden"
                                  />
                                </>
                              )}
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Option 2 (International): Online Payment Link (Card / Stripe / PayPal / Wise) */
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all">
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                        <LinkIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>Online Payment Link (Card / Stripe / PayPal)</span>
                          {showPaymentLink && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                              Active
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400">Direct checkout URL for credit cards, Stripe, PayPal, or Wise</p>
                      </div>
                    </div>

                    <IOSSwitch
                      checked={showPaymentLink}
                      onChange={(checked) => {
                        setShowPaymentLink(checked);
                        setPaymentDisplayMode('CUSTOM');
                      }}
                      ariaLabel="Toggle Payment Link"
                    />
                  </div>

                  {/* Collapsible Payment Link Fields */}
                  {showPaymentLink && (
                    <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-3 animate-fade-in-up">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
                        <div className="sm:col-span-8 space-y-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Payment Link URL *
                            </label>
                            <input
                              type="text"
                              value={paymentLink}
                              onChange={(e) => setPaymentLink(e.target.value)}
                              placeholder="e.g. https://buy.stripe.com/abc... or https://paypal.me/yourbusiness"
                              className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Button / Link Display Label
                            </label>
                            <input
                              type="text"
                              value={paymentLinkLabel}
                              onChange={(e) => setPaymentLinkLabel(e.target.value)}
                              placeholder="e.g. Pay Online (Card / Stripe / PayPal)"
                              className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs focus:ring-1 focus:ring-blue-500 font-medium"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-4 flex flex-col justify-center p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-slate-600 space-y-1">
                          <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> Client Portal Pay Button
                          </span>
                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            When active, international clients will see a prominent <strong>Pay</strong> button on their portal that opens this checkout link directly.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Option 3: Cash Payment / Counter Handover */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all">
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                      <Banknote className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>Cash Payment / Counter Handover</span>
                        {showCashDetails && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                            Active
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400">Accept physical cash payments with custom instructions</p>
                    </div>
                  </div>

                  <IOSSwitch
                    checked={showCashDetails}
                    onChange={(checked) => {
                      setShowCashDetails(checked);
                      setPaymentDisplayMode('CUSTOM');
                    }}
                    ariaLabel="Toggle Cash Payment"
                  />
                </div>

                {/* Collapsible Cash Fields */}
                {showCashDetails && (
                  <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-2 animate-fade-in-up">
                    <label className="block text-xs font-semibold text-slate-700">
                      Cash Payment Instructions &amp; Receipt Policy
                    </label>
                    <input
                      type="text"
                      value={cashInstructions}
                      onChange={(e) => setCashInstructions(e.target.value)}
                      placeholder="e.g. Cash accepted at store billing desk. Official signed receipt will be issued immediately."
                      className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Option 4: Cryptocurrency / Web3 (Global) */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all">
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-orange-50 text-orange-600 shrink-0">
                      <Bitcoin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>Cryptocurrency / Web3 (Global)</span>
                        {showCryptoDetails && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                            Active
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400">USDT, USDC, BTC wallets for international clients</p>
                    </div>
                  </div>

                  <IOSSwitch
                    checked={showCryptoDetails}
                    onChange={(checked) => {
                      setShowCryptoDetails(checked);
                      setPaymentDisplayMode('CUSTOM');
                    }}
                    ariaLabel="Toggle Crypto Payment"
                  />
                </div>

                {/* Collapsible Crypto Fields */}
                {showCryptoDetails && (
                  <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-3 animate-fade-in-up">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
                      <div className="sm:col-span-7 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Coin / Token
                            </label>
                            <input
                              type="text"
                              value={cryptoDetails.currency || 'USDT'}
                              onChange={(e) => setCryptoDetails({ ...cryptoDetails, currency: e.target.value.toUpperCase() })}
                              placeholder="e.g. USDT, BTC, ETH, USDC"
                              className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs uppercase font-semibold focus:ring-1 focus:ring-amber-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Network / Chain
                            </label>
                            <input
                              type="text"
                              value={cryptoDetails.network || 'TRC20'}
                              onChange={(e) => setCryptoDetails({ ...cryptoDetails, network: e.target.value.toUpperCase() })}
                              placeholder="e.g. TRC20, ERC20, Polygon"
                              className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs uppercase font-semibold focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Wallet Address
                          </label>
                          <input
                            type="text"
                            value={cryptoDetails.wallet_address || ''}
                            onChange={(e) => setCryptoDetails({ ...cryptoDetails, wallet_address: e.target.value })}
                            placeholder="e.g. TXYZ1234567890abcdef..."
                            className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-mono focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      {/* Crypto QR Upload */}
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Attachment Crypto QR Code
                        </label>
                        {cryptoDetails.qr_code_url ? (
                          <div className="relative p-2.5 rounded-xl border border-amber-200 bg-amber-50/30 flex items-center gap-3">
                            <img
                              src={cryptoDetails.qr_code_url}
                              alt="Crypto QR Code"
                              className="h-16 w-16 object-contain rounded-lg border border-slate-200 bg-white p-1"
                            />
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-amber-600" /> Attached
                              </span>
                              <div className="flex gap-2 items-center">
                                <label className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer underline flex items-center gap-1">
                                  {isUploadingCryptoQr ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      <span>Uploading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Change</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleCryptoQrUpload}
                                        className="hidden"
                                        disabled={isUploadingCryptoQr}
                                      />
                                    </>
                                  )}
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setCryptoDetails({ ...cryptoDetails, qr_code_url: '' })}
                                  className="text-[10px] font-semibold text-rose-600 hover:text-rose-800"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <label className={`border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-amber-50/30 ${isUploadingCryptoQr ? 'opacity-60 pointer-events-none' : ''}`}>
                            {isUploadingCryptoQr ? (
                              <>
                                <Loader2 className="h-6 w-6 text-amber-600 animate-spin mb-1" />
                                <span className="text-[11px] font-semibold text-slate-700">Uploading QR Code...</span>
                              </>
                            ) : (
                              <>
                                <Bitcoin className="h-6 w-6 text-slate-400 mb-1" />
                                <span className="text-[11px] font-semibold text-slate-700">Attach Crypto QR Code</span>
                                <span className="text-[10px] text-slate-400">PNG, JPG, WebP up to 5MB</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleCryptoQrUpload}
                                  className="hidden"
                                />
                              </>
                            )}
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Instructions Textarea */}
            <div>
              <Textarea
                label="Payment Instructions & Remittance Advice"
                value={paymentTermsInstructions}
                onChange={(e) => setPaymentTermsInstructions(e.target.value)}
                rows={2}
                placeholder="Bank account details, wire instructions or payment notes for client..."
              />
            </div>
          </div>

          {/* Step 6: Document Attachments */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Paperclip className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Attachments & Reference Files
                </h3>
                <p className="text-[11px] text-slate-400">Attach scope specifications, drawings, or contract PDFs</p>
              </div>
            </div>
            <FileAttachmentsUploader attachments={attachments} onChange={setAttachments} />
          </div>

          {/* Step 7: Quotation Access Security & PIN Protection */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Client Access Security (Optional PIN)
                  </h3>
                  <p className="text-[11px] text-slate-400">Require an access PIN before customers can view or approve</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinProtectionEnabled}
                  onChange={(e) => setPinProtectionEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {pinProtectionEnabled ? (
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-3 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      4-Digit Access PIN
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Share this PIN with your customer along with the quotation link.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                      className="h-10 w-28 text-center font-mono font-black text-lg tracking-widest rounded-xl border border-indigo-300 bg-white text-indigo-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRegeneratePin}
                      className="h-10 text-xs font-semibold"
                      title="Generate a new random PIN"
                    >
                      Regenerate
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPin}
                      className="h-10 text-xs font-semibold gap-1"
                      title="Copy PIN to clipboard"
                    >
                      {copiedPin ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedPin ? 'Copied' : 'Copy'}</span>
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-indigo-800/80 bg-indigo-100/60 p-2.5 rounded-lg">
                  🔒 When PIN protection is enabled, anyone opening the link must enter this PIN to view the quotation. No registration, client login, or mobile OTP needed.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                PIN protection is OFF. Anyone with the secure link can directly open and view this quotation without entering a PIN.
              </p>
            )}
          </div>
        </div>

        {/* Right Live Quotation Preview Sheet */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/60 dark:shadow-2xl dark:shadow-black/50 overflow-hidden">
            {/* Live Indicator Top Bar */}
            <div className="flex items-center justify-between px-5 py-2.5 bg-slate-900 text-white dark:bg-slate-800/90 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                  Live Client Proposal Preview
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Auto-syncs in real time</span>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400 px-2 py-0.5 rounded">
                    Official Estimate
                  </span>
                  <div className="flex items-center gap-2.5 my-1">
                    {(() => {
                      const logoConfig = parseLogoUrl(organization?.logo_url);
                      if (logoConfig.cleanUrl) {
                        return (
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center bg-white border border-slate-200 shadow-xs ring-1 ring-indigo-500/10 overflow-hidden ${getLogoShapeClass(
                              logoConfig.shape
                            )}`}
                          >
                            <img
                              src={logoConfig.cleanUrl}
                              alt={organization?.name || 'Company'}
                              className={`h-full w-full ${getLogoShapeClass(
                                logoConfig.shape
                              )} ${getLogoFitClass(logoConfig.fit)}`}
                            />
                          </div>
                        );
                      }
                      return (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black text-xs tracking-wider select-none shadow-xs">
                          {getCompanyInitials(organization?.name)}
                        </div>
                      );
                    })()}
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{organization?.name || 'My Company'}</h4>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">PREVIEW</span>
                  <p className="text-[10px] text-slate-400">{formatDate(issueDate)}</p>
                </div>
              </div>

            {/* Recipient */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Prepared For</span>
              <p className="font-bold text-slate-800 mt-0.5">
                {selectedCustomer?.company_name || selectedCustomer?.name || 'Select Customer'}
              </p>
              <p className="text-slate-500 text-[11px]">{selectedCustomer?.email}</p>
            </div>

            {/* Items Summary Table */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-400">Quotation Items</span>
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {calculated.items.map((item, i) => (
                  <div key={i} className="py-2 flex justify-between text-xs">
                    <div className="max-w-[65%]">
                      <p className="font-medium text-slate-800 truncate">
                        {item.description || `Item #${i + 1}`}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {item.quantity} {item.unit} × {formatCurrency(item.unit_price, currency)}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(item.line_total, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Breakdown */}
            <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{taxMode === 'inclusive' ? 'Subtotal (Taxable Amount)' : 'Subtotal'}</span>
                <span>{formatCurrency(calculated.subtotal, currency)}</span>
              </div>
              {calculated.discount_amount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(calculated.discount_amount, currency)}</span>
                </div>
              )}
              {calculated.tax_breakdown && calculated.tax_breakdown.length > 0 ? (
                calculated.tax_breakdown.map((tb, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600">
                    <span>{tb.name}</span>
                    <span>{formatCurrency(tb.amount, currency)}</span>
                  </div>
                ))
              ) : calculated.tax_amount > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>
                    {effectiveTaxName} {calculated.tax_rate}%
                    {taxMode === 'inclusive' ? ' (Included)' : ''}
                  </span>
                  <span>{formatCurrency(calculated.tax_amount, currency)}</span>
                </div>
              ) : null}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900">Estimated Total</span>
                <span className="text-xl font-extrabold text-indigo-700">
                  {formatCurrency(calculated.grand_total, currency)}
                </span>
              </div>
            </div>

            {/* Payment Terms Preview */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Payment Terms & Remittance</span>
                </span>
                <span className="text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  {advancePercentage}% Advance
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                <span className="font-medium text-slate-600">Accepted:</span> {acceptedPaymentMethods.join(', ')}
              </p>

              {/* Enabled Payment Methods Preview for Client */}
              <div className="space-y-2 pt-1 border-t border-slate-200/60">
                {showBankDetails && (bankDetails.bank_name || bankDetails.account_number) && (
                  <div className="p-2 rounded-lg bg-white border border-slate-200 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Landmark className="h-3 w-3 text-indigo-600" />
                      <span>{bankDetails.bank_name || 'Bank Transfer'}</span>
                    </div>
                    {bankDetails.account_number && (
                      <p className="text-slate-600 font-mono text-[10px]">
                        A/C: {bankDetails.account_number}
                      </p>
                    )}
                    {bankDetails.ifsc_code && (
                      <p className="text-slate-500 text-[10px]">IFSC: <span className="font-mono">{bankDetails.ifsc_code}</span></p>
                    )}
                    {bankDetails.swift_code && (
                      <p className="text-slate-500 text-[10px]">SWIFT: <span className="font-mono">{bankDetails.swift_code}</span></p>
                    )}
                  </div>
                )}

                {showUpiDetails && (upiDetails.upi_id || upiDetails.qr_code_url) && (
                  <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-200 flex items-center justify-between text-[11px]">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                        <QrCode className="h-3 w-3 text-emerald-600" />
                        <span>UPI Payment</span>
                      </div>
                      {upiDetails.upi_id && (
                        <p className="text-emerald-800 font-mono text-[10px]">{upiDetails.upi_id}</p>
                      )}
                      {upiDetails.payee_name && (
                        <p className="text-[10px] text-emerald-700">{upiDetails.payee_name}</p>
                      )}
                    </div>
                    {(() => {
                      const upiQrSrc = upiDetails.qr_code_url || (
                        upiDetails.upi_id
                          ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${upiDetails.upi_id}&pn=${encodeURIComponent(upiDetails.payee_name || 'SUBESH M LLC')}&cu=INR`)}`
                          : ''
                      );
                      return upiQrSrc ? (
                        <img
                          src={upiQrSrc}
                          alt="UPI QR"
                          className="h-10 w-10 object-contain rounded border border-emerald-300 bg-white p-0.5"
                          onError={(e) => {
                            if (upiDetails.upi_id && !e.currentTarget.src.includes('api.qrserver.com')) {
                              e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${upiDetails.upi_id}&pn=${encodeURIComponent(upiDetails.payee_name || 'SUBESH M LLC')}&cu=INR`)}`;
                            }
                          }}
                        />
                      ) : null;
                    })()}
                  </div>
                )}

                {showCryptoDetails && (cryptoDetails.wallet_address || cryptoDetails.qr_code_url) && (
                  <div className="p-2 rounded-lg bg-amber-50/50 border border-amber-200 flex items-center justify-between text-[11px]">
                    <div className="space-y-0.5 max-w-[70%]">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <Bitcoin className="h-3 w-3 text-amber-600" />
                        <span>{cryptoDetails.currency || 'USDT'} ({cryptoDetails.network || 'TRC20'})</span>
                      </div>
                      {cryptoDetails.wallet_address && (
                        <p className="text-amber-800 font-mono text-[9px] truncate">{cryptoDetails.wallet_address}</p>
                      )}
                    </div>
                    {(() => {
                      const cryptoQrSrc = cryptoDetails.qr_code_url || (
                        cryptoDetails.wallet_address
                          ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(cryptoDetails.wallet_address)}`
                          : ''
                      );
                      return cryptoQrSrc ? (
                        <img
                          src={cryptoQrSrc}
                          alt="Crypto QR"
                          className="h-10 w-10 object-contain rounded border border-amber-300 bg-white p-0.5"
                          onError={(e) => {
                            if (cryptoDetails.wallet_address && !e.currentTarget.src.includes('api.qrserver.com')) {
                              e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(cryptoDetails.wallet_address)}`;
                            }
                          }}
                        />
                      ) : null;
                    })()}
                  </div>
                )}

                {showCashDetails && (
                  <div className="p-2 rounded-lg bg-amber-50/40 border border-amber-200/80 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <Banknote className="h-3 w-3 text-amber-600" />
                      <span>Cash Payment / Counter Handover</span>
                    </div>
                    {cashInstructions ? (
                      <p className="text-amber-800 text-[10px]">{cashInstructions}</p>
                    ) : (
                      <p className="text-slate-500 italic text-[10px]">Cash accepted with receipt</p>
                    )}
                  </div>
                )}
              </div>

              {paymentTermsInstructions && (
                <p className="text-[11px] text-slate-600 italic pt-0.5 leading-relaxed">
                  {paymentTermsInstructions}
                </p>
              )}
            </div>

            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  <span>Attached Documents ({attachments.length})</span>
                </span>
                <div className="space-y-1">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <span className="font-medium text-slate-700 truncate max-w-[180px]">
                        {att.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {((att as any).type || (att as any).file_type || 'file').toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={() => handleSave(initialQuotation ? (initialQuotation.status === 'DRAFT' ? 'DRAFT' : 'SENT') : 'SENT')}
                isLoading={isLoading}
                className="w-full shadow-md"
              >
                <Send className="h-4 w-4 mr-1.5" />
                {initialQuotation ? 'Save Changes & Require Re-Approval' : 'Issue Quotation & Generate Public URL'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSave('DRAFT')}
                isLoading={isLoading}
                className="w-full text-xs"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                {initialQuotation ? 'Save Draft Revision' : 'Save Draft'}
              </Button>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
