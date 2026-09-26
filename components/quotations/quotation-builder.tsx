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
  QrCode,
  Landmark,
  Bitcoin,
  Image as ImageIcon,
  X,
  Smartphone,
  Globe,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import {
  parseLogoUrl,
  getLogoShapeClass,
  getLogoFitClass,
  getCompanyInitials,
} from '@/lib/utils/logo';
import { getCountryProfile } from '@/lib/tax/country-config';
import { FileAttachmentsUploader } from '@/components/common/file-attachments-uploader';

interface QuotationBuilderProps {
  customers: Customer[];
  products: Product[];
  organization: Organization;
  initialQuotation?: any;
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
}

export function QuotationBuilder({
  customers,
  products,
  organization,
  initialQuotation,
}: QuotationBuilderProps) {
  const router = useRouter();

  // Customer state & Quick Add
  const [customerList, setCustomerList] = useState<Customer[]>(customers);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickCompany, setQuickCompany] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickCustomerError, setQuickCustomerError] = useState<string | null>(null);
  const [isSavingQuickCustomer, setIsSavingQuickCustomer] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState<string>(
    initialQuotation?.customer_id || customers[0]?.id || ''
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
        tax_rate: organization.default_tax_rate || 18,
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
    initialQuotation?.tax_rate || 0
  );

  // Notes & Terms
  const [notes, setNotes] = useState<string>(
    initialQuotation?.notes || 'Payment within 30 days of completion.'
  );
  const [terms, setTerms] = useState<string>(
    initialQuotation?.terms_conditions || organization.default_terms || ''
  );

  // Payment Details & Instructions
  const [advancePercentage, setAdvancePercentage] = useState<number>(
    initialQuotation?.advance_percentage !== undefined && initialQuotation.advance_percentage !== null
      ? initialQuotation.advance_percentage
      : 50
  );
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<string[]>(
    initialQuotation?.accepted_payment_methods || ['Bank Transfer', 'Online / Card', 'Cheque']
  );
  const [paymentTermsInstructions, setPaymentTermsInstructions] = useState<string>(
    initialQuotation?.payment_terms_instructions ||
      'Payment terms: 50% advance to commence work, balance upon completion. Remit via Bank Transfer.'
  );

  // Bank, UPI, and Crypto Payment Options
  const [paymentDisplayMode, setPaymentDisplayMode] = useState<PaymentDisplayMode>(
    initialQuotation?.payment_display_mode || organization?.default_payment_display_mode || 'BOTH'
  );
  const [showBankDetails, setShowBankDetails] = useState<boolean>(
    initialQuotation?.show_bank_details ?? organization?.default_show_bank_details ?? true
  );
  const [showUpiDetails, setShowUpiDetails] = useState<boolean>(
    initialQuotation?.show_upi_details ?? organization?.default_show_upi_details ?? true
  );
  const [showCryptoDetails, setShowCryptoDetails] = useState<boolean>(
    initialQuotation?.show_crypto_details ?? organization?.default_show_crypto_details ?? false
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
      setShowUpiDetails(true);
      setShowCryptoDetails(false);
    } else if (mode === 'BANK_ONLY') {
      setShowBankDetails(true);
      setShowUpiDetails(false);
      setShowCryptoDetails(false);
    } else if (mode === 'UPI_ONLY') {
      setShowBankDetails(false);
      setShowUpiDetails(true);
      setShowCryptoDetails(false);
    } else if (mode === 'CRYPTO_ONLY') {
      setShowBankDetails(false);
      setShowUpiDetails(false);
      setShowCryptoDetails(true);
    } else if (mode === 'ALL') {
      setShowBankDetails(true);
      setShowUpiDetails(true);
      setShowCryptoDetails(true);
    }
  };

  const handleUpiQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('QR code image must be under 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      setUpiDetails((prev) => ({ ...prev, qr_code_url: res }));
    };
    reader.readAsDataURL(file);
  };

  const handleCryptoQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('QR code image must be under 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      setCryptoDetails((prev) => ({ ...prev, qr_code_url: res }));
    };
    reader.readAsDataURL(file);
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

  // Live Calculations
  const calculated = calculateQuotationTotals({
    items,
    discount_type: discountType,
    discount_value: discountValue,
    tax_rate: overallTaxRate,
  });

  const selectedCustomer = customerList.find((c) => c.id === customerId);

  // Quick Add Customer Handler
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      setQuickCustomerError('Contact Name is required');
      return;
    }

    setIsSavingQuickCustomer(true);
    setQuickCustomerError(null);

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickName.trim(),
          company_name: quickCompany.trim() || undefined,
          email: quickEmail.trim() || undefined,
          phone: quickPhone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save customer');

      setCustomerList((prev) => [data.customer, ...prev]);
      setCustomerId(data.customer.id);
      setIsQuickAddOpen(false);
      setQuickName('');
      setQuickCompany('');
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
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        product_id: prod.id,
        description: prod.name + (prod.description ? ` - ${prod.description}` : ''),
        unit: prod.unit || 'unit',
        unit_price: prod.unit_price,
        tax_rate: prod.tax_rate,
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
        notes,
        terms_conditions: terms,
        items,
        attachments,
        status: statusToSet,
        advance_percentage: advancePercentage,
        accepted_payment_methods: acceptedPaymentMethods,
        payment_terms_instructions: paymentTermsInstructions,
        payment_display_mode: paymentDisplayMode,
        show_bank_details: showBankDetails,
        show_upi_details: showUpiDetails,
        show_crypto_details: showCryptoDetails,
        bank_details: bankDetails,
        upi_details: upiDetails,
        crypto_details: cryptoDetails,
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

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {initialQuotation ? `Edit Quotation ${initialQuotation.quotation_number}` : 'New Quotation'}
          </h1>
          <p className="text-xs text-slate-500">
            Configure line items, discounts, taxes, and preview customer view in real-time.
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
            Save Draft
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSave('SENT')}
            isLoading={isLoading}
            className="gap-1.5 shadow-md hover:shadow-lg"
          >
            <Send className="h-4 w-4" />
            Save & Issue to Customer
          </Button>
        </div>
      </div>

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
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Customer Selection
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
                className="gap-1 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {isQuickAddOpen ? 'Cancel' : '+ Add New Customer'}
              </Button>
            </div>

            {/* Inline Quick Add Form */}
            {isQuickAddOpen && (
              <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-indigo-100">
                  <span className="text-xs font-bold text-indigo-950">Quick Add Customer</span>
                  <span className="text-[11px] text-slate-500">Auto-saves to customer directory</span>
                </div>

                {quickCustomerError && (
                  <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                    {quickCustomerError}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Subesh Sharma"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      className="h-8 w-full rounded-lg border border-slate-300 px-2.5 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Company Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Tech Pvt Ltd"
                      value={quickCompany}
                      onChange={(e) => setQuickCompany(e.target.value)}
                      className="h-8 w-full rounded-lg border border-slate-300 px-2.5 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={quickPhone}
                      onChange={(e) => setQuickPhone(e.target.value)}
                      className="h-8 w-full rounded-lg border border-slate-300 px-2.5 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="client@example.com"
                      value={quickEmail}
                      onChange={(e) => setQuickEmail(e.target.value)}
                      className="h-8 w-full rounded-lg border border-slate-300 px-2.5 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQuickAddOpen(false)}
                    className="text-xs h-7"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleQuickAddCustomer}
                    isLoading={isSavingQuickCustomer}
                    className="text-xs h-7 gap-1"
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
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Quotation Details
            </h3>
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
                  <option value="AED">AED (AED)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Step 3: Unlimited Line Items */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  3. Line Items & Rates
                </h3>
                <p className="text-[11px] text-slate-400">
                  Set deliverables, quantities, and adjust rates per item or in bulk.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddItem}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </Button>
              </div>
            </div>

            {/* Bulk Rate Adjuster Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                Bulk Rate Change:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleBulkRateAdjust(-10)}
                  className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-[11px] transition-colors"
                  title="Reduce all unit prices by 10%"
                >
                  -10%
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkRateAdjust(-5)}
                  className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-[11px] transition-colors"
                  title="Reduce all unit prices by 5%"
                >
                  -5%
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkRateAdjust(5)}
                  className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-[11px] transition-colors"
                  title="Increase all unit prices by 5%"
                >
                  +5%
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkRateAdjust(10)}
                  className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-[11px] transition-colors"
                  title="Increase all unit prices by 10%"
                >
                  +10%
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkRateAdjust(20)}
                  className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-[11px] transition-colors"
                  title="Increase all unit prices by 20%"
                >
                  +20%
                </button>
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

                      <div className="flex items-center gap-1">
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
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              4. Discount & Terms
            </h3>

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
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-600" />
                <span>5. Payment Details, Bank Transfer & UPI / QR Code</span>
              </h3>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                Advance: {advancePercentage}%
              </span>
            </div>

            {/* Advance % and Accepted Methods */}
            <div className="space-y-3 pb-4 border-b border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Advance Payment Required
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {[0, 10, 20, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setAdvancePercentage(pct)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        advancePercentage === pct
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {pct === 0 ? 'No Advance' : `${pct}%`}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-xs text-slate-500">Custom:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={advancePercentage}
                      onChange={(e) =>
                        setAdvancePercentage(
                          Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                        )
                      }
                      className="w-16 h-8 text-center text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Accepted Payment Methods (Badges)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Bank Transfer', 'UPI / QR Code', 'Online / Card', 'Crypto', 'Cheque', 'Cash'].map((m) => {
                    const isSelected = acceptedPaymentMethods.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (acceptedPaymentMethods.length > 1) {
                              setAcceptedPaymentMethods(
                                acceptedPaymentMethods.filter((x) => x !== m)
                              );
                            }
                          } else {
                            setAcceptedPaymentMethods([...acceptedPaymentMethods, m]);
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Client Payment Visibility / Display Mode Selector */}
            <div className="rounded-xl bg-slate-50/80 border border-slate-200 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Customer Payment Display Options</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Choose what payment method(s) the customer sees in their quotation and online client portal.
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded self-start sm:self-auto">
                  Mode: {paymentDisplayMode}
                </span>
              </div>

              {/* Preset mode selection buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectPaymentMode('BOTH')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    paymentDisplayMode === 'BOTH'
                      ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20 text-indigo-700 shadow-xs'
                      : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <Landmark className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="text-xs font-black">+</span>
                    <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <span className="text-xs font-bold">Both</span>
                  <span className="text-[10px] text-slate-400">Bank & UPI</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPaymentMode('BANK_ONLY')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    paymentDisplayMode === 'BANK_ONLY'
                      ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20 text-indigo-700 shadow-xs'
                      : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Landmark className="h-4 w-4 text-indigo-600 mb-1" />
                  <span className="text-xs font-bold">Bank Only</span>
                  <span className="text-[10px] text-slate-400">Account Wire</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPaymentMode('UPI_ONLY')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    paymentDisplayMode === 'UPI_ONLY'
                      ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 text-emerald-700 shadow-xs'
                      : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <QrCode className="h-4 w-4 text-emerald-600 mb-1" />
                  <span className="text-xs font-bold">UPI / QR Only</span>
                  <span className="text-[10px] text-slate-400">India VPA & QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPaymentMode('CRYPTO_ONLY')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    paymentDisplayMode === 'CRYPTO_ONLY'
                      ? 'border-amber-600 bg-white ring-2 ring-amber-500/20 text-amber-700 shadow-xs'
                      : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Bitcoin className="h-4 w-4 text-amber-600 mb-1" />
                  <span className="text-xs font-bold">Crypto Only</span>
                  <span className="text-[10px] text-slate-400">USDT / Web3</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPaymentMode('ALL')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    paymentDisplayMode === 'ALL'
                      ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20 text-indigo-700 shadow-xs'
                      : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Globe className="h-4 w-4 text-indigo-600 mb-1" />
                  <span className="text-xs font-bold">All Options</span>
                  <span className="text-[10px] text-slate-400">Bank, UPI & Crypto</span>
                </button>
              </div>

              {/* Granular Checkboxes */}
              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200/60 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={showBankDetails}
                    onChange={(e) => {
                      setShowBankDetails(e.target.checked);
                      setPaymentDisplayMode('CUSTOM');
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Show Bank Details</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={showUpiDetails}
                    onChange={(e) => {
                      setShowUpiDetails(e.target.checked);
                      setPaymentDisplayMode('CUSTOM');
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Show UPI ID & QR Code</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={showCryptoDetails}
                    onChange={(e) => {
                      setShowCryptoDetails(e.target.checked);
                      setPaymentDisplayMode('CUSTOM');
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Show Crypto Payment Details</span>
                </label>
              </div>
            </div>

            {/* Bank Details Form Card */}
            <div className={`rounded-xl border p-4 transition-all ${
              showBankDetails
                ? 'border-indigo-200 bg-white shadow-xs'
                : 'border-slate-200 bg-slate-50/60 opacity-60'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Bank Transfer / Remittance Details</h4>
                    <p className="text-[11px] text-slate-400">Domestic & International bank remittance information</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  showBankDetails ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {showBankDetails ? '✓ Client Visible' : 'Hidden'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
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

            {/* UPI ID & UPI QR Code Attachment Card */}
            <div className={`rounded-xl border p-4 transition-all ${
              showUpiDetails
                ? 'border-emerald-200 bg-white shadow-xs'
                : 'border-slate-200 bg-slate-50/60 opacity-60'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">UPI ID & Attachment UPI QR Code (India)</h4>
                    <p className="text-[11px] text-slate-400">Accept direct payments via GPay, PhonePe, Paytm, BHIM</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  showUpiDetails ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {showUpiDetails ? '✓ Client Visible' : 'Hidden'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-3 text-xs">
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
                        <div className="flex gap-2">
                          <label className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer underline">
                            Change
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleUpiQrUpload}
                              className="hidden"
                            />
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
                    <label className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/30">
                      <QrCode className="h-6 w-6 text-slate-400 mb-1" />
                      <span className="text-[11px] font-semibold text-slate-700">Attach UPI QR Code</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 3MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUpiQrUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Crypto Payment Options Card (International) */}
            <div className={`rounded-xl border p-4 transition-all ${
              showCryptoDetails
                ? 'border-amber-200 bg-white shadow-xs'
                : 'border-slate-200 bg-slate-50/60 opacity-60'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                    <Bitcoin className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Crypto Payment Options (International / Cross-Border)</h4>
                    <p className="text-[11px] text-slate-400">USDT, USDC, BTC or other crypto addresses for global settlement</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  showCryptoDetails ? 'bg-amber-50 text-amber-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {showCryptoDetails ? '✓ Client Visible' : 'Hidden'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-3 text-xs">
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
                        <div className="flex gap-2">
                          <label className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer underline">
                            Change
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleCryptoQrUpload}
                              className="hidden"
                            />
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
                    <label className="border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-amber-50/30">
                      <Bitcoin className="h-6 w-6 text-slate-400 mb-1" />
                      <span className="text-[11px] font-semibold text-slate-700">Attach Crypto QR Code</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 3MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCryptoQrUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
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
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5 text-indigo-500" />
              <span>6. Quotation Attachments & Documents</span>
            </h3>
            <p className="text-xs text-slate-400">
              Upload project specifications, reference images, drawings, or contract PDFs for your customer to review.
            </p>
            <FileAttachmentsUploader attachments={attachments} onChange={setAttachments} />
          </div>
        </div>

        {/* Right Live Quotation Preview Sheet */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Live Preview
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
                  <h4 className="text-sm font-bold text-slate-900">{organization?.name || 'My Company'}</h4>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-700">PREVIEW</span>
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
                <span>Subtotal</span>
                <span>{formatCurrency(calculated.subtotal, currency)}</span>
              </div>
              {calculated.discount_amount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(calculated.discount_amount, currency)}</span>
                </div>
              )}
              {calculated.tax_amount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({calculated.tax_rate}%)</span>
                  <span>{formatCurrency(calculated.tax_amount, currency)}</span>
                </div>
              )}
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
                    {upiDetails.qr_code_url && (
                      <img
                        src={upiDetails.qr_code_url}
                        alt="UPI QR"
                        className="h-10 w-10 object-contain rounded border border-emerald-300 bg-white p-0.5"
                      />
                    )}
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
                    {cryptoDetails.qr_code_url && (
                      <img
                        src={cryptoDetails.qr_code_url}
                        alt="Crypto QR"
                        className="h-10 w-10 object-contain rounded border border-amber-300 bg-white p-0.5"
                      />
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
                onClick={() => handleSave('SENT')}
                isLoading={isLoading}
                className="w-full shadow-md"
              >
                <Send className="h-4 w-4 mr-1.5" />
                Issue Quotation & Generate Public URL
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSave('DRAFT')}
                isLoading={isLoading}
                className="w-full text-xs"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                Save Draft
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
