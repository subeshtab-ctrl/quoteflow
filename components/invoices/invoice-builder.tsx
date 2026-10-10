'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Customer, Product, Organization, CurrencyCode, DiscountType, InvoiceStatus, AttachmentItem } from '@/types/database';
import { calculateQuotationTotals, formatCurrency } from '@/lib/quotations/calculations';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Plus,
  Trash2,
  Save,
  Send,
  Building2,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  Paperclip,
  Globe,
  Receipt,
  CreditCard,
  Package,
  Briefcase,
  Copy,
  Smartphone,
  Mail,
} from 'lucide-react';
import { getCountryProfile, COUNTRIES } from '@/lib/tax/country-config';
import { INDIAN_STATES } from '@/lib/tax/india-gst';
import { FileAttachmentsUploader } from '@/components/common/file-attachments-uploader';
import { COUNTRY_CODES, getDefaultCountryCode, cleanPhoneNumber } from '@/lib/country-codes';

interface InvoiceBuilderProps {
  customers: Customer[];
  products: Product[];
  organization: Organization;
  initialInvoice?: any;
  fromQuotation?: any;
  suggestedInvoiceNumber?: string;
}

interface InvoiceItemState {
  id?: string;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_type: DiscountType;
  discount_value: number;
  tax_rate: number;
  item_type: 'GOODS' | 'SERVICE';
  classification_type?: string;
  classification_code?: string;
}

export function InvoiceBuilder({
  customers,
  products,
  organization,
  initialInvoice,
  fromQuotation,
  suggestedInvoiceNumber,
}: InvoiceBuilderProps) {
  const router = useRouter();

  // Country tax profile
  const countryProfile = getCountryProfile(organization.country || 'IN');

  // Customer state & Quick Add
  const [customerList, setCustomerList] = useState<Customer[]>(customers);
  const defaultCountryCode = getDefaultCountryCode(organization?.country);
  const [quickPhoneCountryCode, setQuickPhoneCountryCode] = useState(defaultCountryCode);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickCompany, setQuickCompany] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickCustomerError, setQuickCustomerError] = useState<string | null>(null);
  const [isSavingQuickCustomer, setIsSavingQuickCustomer] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState<string>(
    initialInvoice?.customer_id ||
      fromQuotation?.customer_id ||
      customers[0]?.id ||
      ''
  );

  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => {
    if (initialInvoice?.invoice_number) return initialInvoice.invoice_number;
    if (suggestedInvoiceNumber) return suggestedInvoiceNumber;
    return '';
  });

  useEffect(() => {
    if (suggestedInvoiceNumber && !initialInvoice?.invoice_number) {
      setInvoiceNumber(suggestedInvoiceNumber);
    }
  }, [suggestedInvoiceNumber, initialInvoice?.invoice_number]);

  useEffect(() => {
    if (!initialInvoice?.invoice_number && !suggestedInvoiceNumber && !invoiceNumber) {
      fetch('/api/invoices/next-number')
        .then((r) => r.json())
        .then((data) => {
          if (data.nextInvoiceNumber) {
            setInvoiceNumber(data.nextInvoiceNumber);
          }
        })
        .catch(() => {});
    }
  }, [initialInvoice?.invoice_number, suggestedInvoiceNumber, invoiceNumber]);

  const [poNumber, setPoNumber] = useState<string>(
    initialInvoice?.po_number || ''
  );

  const [issueDate, setIssueDate] = useState<string>(
    initialInvoice?.issue_date || new Date().toISOString().split('T')[0]
  );

  const [dueDate, setDueDate] = useState<string>(
    initialInvoice?.due_date ||
      new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );

  const [currency, setCurrency] = useState<CurrencyCode>(
    initialInvoice?.currency ||
      fromQuotation?.currency ||
      organization.default_currency ||
      countryProfile.defaultCurrency
  );

  const [paymentTerms, setPaymentTerms] = useState<string>(
    initialInvoice?.payment_terms || 'Net 30 Days'
  );

  const [paymentMethod, setPaymentMethod] = useState<string>(
    initialInvoice?.payment_method || 'Bank Transfer (NEFT / RTGS / IMPS)'
  );

  const PAYMENT_MODES = [
    'Bank Transfer (NEFT / RTGS / IMPS)',
    'UPI / QR Code',
    'Credit / Debit Card',
    'Cash',
    'Cheque / Demand Draft',
    'Net Banking',
    'Online Payment Gateway',
    'Other',
  ];

  const [isInterstate, setIsInterstate] = useState<boolean>(false);
  const [taxMode, setTaxMode] = useState<'exclusive' | 'inclusive'>(
    initialInvoice?.tax_mode ||
      fromQuotation?.tax_mode ||
      organization?.default_tax_mode ||
      'exclusive'
  );
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(
    initialInvoice?.place_of_supply || fromQuotation?.place_of_supply || ''
  );
  const [discountType, setDiscountType] = useState<DiscountType>(
    initialInvoice?.discount_type || fromQuotation?.discount_type || 'PERCENTAGE'
  );
  const [discountValue, setDiscountValue] = useState<number>(
    initialInvoice?.discount_value || fromQuotation?.discount_value || 0
  );
  const [overallTaxRate, setOverallTaxRate] = useState<number>(
    initialInvoice?.tax_rate ?? fromQuotation?.tax_rate ?? 0
  );

  // Initial Items
  const defaultItems: InvoiceItemState[] = fromQuotation?.items?.length
    ? fromQuotation.items.map((qi: any) => ({
        description: qi.description,
        quantity: qi.quantity,
        unit: qi.unit || 'service',
        unit_price: qi.unit_price,
        discount_type: qi.discount_type || 'PERCENTAGE',
        discount_value: qi.discount_value || 0,
        tax_rate: qi.tax_rate ?? (organization.default_tax_rate || countryProfile.defaultTaxRate),
        item_type: qi.item_type || (qi.unit === 'service' || qi.unit === 'hours' ? 'SERVICE' : 'GOODS'),
        classification_type: qi.classification_type || (countryProfile.isIndiaGst ? (qi.unit === 'service' ? 'SAC' : 'HSN') : (countryProfile.isUaeVat ? (qi.unit === 'service' ? 'SERVICE_CATEGORY' : 'HS_CODE') : 'CUSTOM')),
        classification_code: qi.classification_code || '',
      }))
    : initialInvoice?.items?.length
    ? initialInvoice.items.map((ii: any) => ({
        ...ii,
        item_type: ii.item_type || 'GOODS',
      }))
    : [
        {
          description: countryProfile.isIndiaGst
            ? 'Software Development & IT Consultancy Services'
            : 'Professional Consulting & Support Services',
          quantity: 1,
          unit: 'service',
          unit_price: countryProfile.isIndiaGst ? 50000 : 1500,
          discount_type: 'PERCENTAGE',
          discount_value: 0,
          tax_rate: organization.default_tax_rate ?? countryProfile.defaultTaxRate,
          item_type: 'SERVICE',
          classification_type: countryProfile.isIndiaGst ? 'SAC' : (countryProfile.isUaeVat ? 'SERVICE_CATEGORY' : 'CUSTOM'),
          classification_code: countryProfile.isIndiaGst ? '998311' : '',
        },
      ];

  const [items, setItems] = useState<InvoiceItemState[]>(defaultItems);
  const [attachments, setAttachments] = useState<AttachmentItem[]>(
    initialInvoice?.attachments || fromQuotation?.attachments || []
  );

  const defaultInvoiceNotes =
    'Thank you for your business. Please remit payment according to the agreed terms.';
  const defaultInvoiceTerms = [
    '1. Payment is due within agreed terms from the date of invoice.',
    '2. Please quote the invoice number when making remittance.',
    '3. Overdue payments may be subject to interest as permitted by applicable law.',
    '4. Goods/services provided in accordance with approved scope are non-refundable.',
  ].join('\n');

  const [notes, setNotes] = useState<string>(() => {
    if (initialInvoice) {
      if (typeof initialInvoice.notes === 'string') {
        if (!initialInvoice.notes.includes('Payment within 30 days of completion')) {
          return initialInvoice.notes;
        }
      }
      return '';
    }
    return defaultInvoiceNotes;
  });

  const [terms, setTerms] = useState<string>(() => {
    if (initialInvoice) {
      if (typeof initialInvoice.terms_conditions === 'string') {
        if (
          !initialInvoice.terms_conditions.includes('Quotation valid for 30 days') &&
          !initialInvoice.terms_conditions.includes('50% advance required')
        ) {
          return initialInvoice.terms_conditions;
        }
      }
      return '';
    }
    return defaultInvoiceTerms;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Customer Creation
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      setQuickCustomerError('Contact Name is required.');
      return;
    }

    const cleanPhone = quickPhone.trim() ? cleanPhoneNumber(quickPhone, quickPhoneCountryCode) : '';
    const cleanEmail = quickEmail.trim();

    if (!cleanPhone && !cleanEmail) {
      setQuickCustomerError('Please enter either a mobile number or an email address (cannot leave both blank).');
      return;
    }

    try {
      setIsSavingQuickCustomer(true);
      setQuickCustomerError(null);

      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickName.trim(),
          company_name: quickCompany.trim() || undefined,
          phone_country_code: quickPhoneCountryCode,
          phone: cleanPhone || undefined,
          email: cleanEmail || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add customer');

      const newCust = data.customer;
      setCustomerList((prev) => [newCust, ...prev]);
      setCustomerId(newCust.id);
      setIsQuickAddOpen(false);
      setQuickName('');
      setQuickCompany('');
      setQuickPhoneCountryCode(defaultCountryCode);
      setQuickEmail('');
      setQuickPhone('');
    } catch (err: any) {
      setQuickCustomerError(err.message || 'Error creating customer');
    } finally {
      setIsSavingQuickCustomer(false);
    }
  };

  // Item Management: Products & Services
  const addProductItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: '',
        quantity: 1,
        unit: 'pcs',
        unit_price: 0,
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        tax_rate: organization.default_tax_rate ?? countryProfile.defaultTaxRate,
        item_type: 'GOODS',
        classification_type: countryProfile.isIndiaGst ? 'HSN' : (countryProfile.isUaeVat ? 'HS_CODE' : 'CUSTOM'),
        classification_code: '',
      },
    ]);
  };

  const addServiceItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: '',
        quantity: 1,
        unit: 'service',
        unit_price: 0,
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        tax_rate: organization.default_tax_rate ?? countryProfile.defaultTaxRate,
        item_type: 'SERVICE',
        classification_type: countryProfile.isIndiaGst ? 'SAC' : (countryProfile.isUaeVat ? 'SERVICE_CATEGORY' : 'CUSTOM'),
        classification_code: countryProfile.isIndiaGst ? '998311' : '',
      },
    ]);
  };

  const addItem = () => {
    addProductItem();
  };

  const handleDuplicateItem = (index: number) => {
    const itemToClone = items[index];
    setItems((prev) => [
      ...prev.slice(0, index + 1),
      { ...itemToClone, id: undefined },
      ...prev.slice(index + 1),
    ]);
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const unitLower = (prod.unit || '').toLowerCase();
    const nameLower = prod.name.toLowerCase();
    const isService =
      unitLower === 'service' ||
      unitLower === 'hrs' ||
      unitLower === 'hour' ||
      nameLower.includes('service') ||
      nameLower.includes('consult') ||
      nameLower.includes('amc') ||
      nameLower.includes('maintenance') ||
      nameLower.includes('support');

    const itemType: 'GOODS' | 'SERVICE' = isService ? 'SERVICE' : 'GOODS';

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        product_id: prod.id,
        description: prod.name + (prod.description ? ` - ${prod.description}` : ''),
        unit: prod.unit || (isService ? 'service' : 'pcs'),
        unit_price: prod.unit_price,
        tax_rate: prod.tax_rate ?? (organization.default_tax_rate || countryProfile.defaultTaxRate),
        item_type: itemType,
        classification_type: countryProfile.isIndiaGst
          ? isService
            ? 'SAC'
            : 'HSN'
          : isService
          ? 'SERVICE_CATEGORY'
          : 'HS_CODE',
        classification_code: countryProfile.isIndiaGst ? (isService ? '998311' : '') : '',
      };
      return copy;
    });
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<InvoiceItemState>) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, ...updates };

        // When item_type toggles between Product and Service, adapt classification and unit
        if (updates.item_type && updates.item_type !== item.item_type) {
          if (countryProfile.isIndiaGst) {
            updated.classification_type = updates.item_type === 'GOODS' ? 'HSN' : 'SAC';
            if (updates.item_type === 'SERVICE' && !updated.classification_code) {
              updated.classification_code = '998311';
            }
          } else if (countryProfile.isUaeVat) {
            updated.classification_type = updates.item_type === 'GOODS' ? 'HS_CODE' : 'SERVICE_CATEGORY';
          }

          if (updates.item_type === 'SERVICE' && (updated.unit === 'unit' || updated.unit === 'pcs')) {
            updated.unit = 'service';
          } else if (updates.item_type === 'GOODS' && (updated.unit === 'service' || updated.unit === 'hrs')) {
            updated.unit = 'pcs';
          }
        }

        return updated;
      })
    );
  };

  const selectedCustomer = customerList.find((c) => c.id === customerId);
  const resolvedPlaceOfSupply =
    placeOfSupply ||
    selectedCustomer?.place_of_supply ||
    selectedCustomer?.billing_state ||
    selectedCustomer?.state ||
    (isInterstate ? 'Interstate' : (organization?.business_state || organization?.state || ''));

  // Centralized Live Calculations
  const calculated = calculateQuotationTotals({
    items,
    discount_type: discountType,
    discount_value: discountValue,
    tax_rate: overallTaxRate,
    tax_mode: taxMode,
    tax_name: organization?.tax_system === 'VAT' ? 'VAT' : 'GST',
    business_state: organization?.business_state || organization?.state || '',
    place_of_supply: resolvedPlaceOfSupply,
    gst_registered: organization?.gst_registered ?? true,
  });

  const calculatedItems = items.map((item, idx) => {
    const calcItem = calculated.items[idx];
    return {
      ...item,
      base: calcItem ? calcItem.line_total : 0,
      discountAmount: calcItem ? calcItem.discount_amount : 0,
      taxableAmount: calcItem ? calcItem.line_total : 0,
      taxAmount: calcItem ? calcItem.tax_amount : 0,
      lineTotal: calcItem ? calcItem.line_total : 0,
    };
  });

  const subtotal = calculated.subtotal;
  const totalDiscount = calculated.discount_amount;
  const taxableTotal = calculated.subtotal;
  const totalTax = calculated.tax_amount;
  const grandTotal = calculated.grand_total;

  const aggregateTaxBreakdown =
    calculated.tax_breakdown && calculated.tax_breakdown.length > 0
      ? calculated.tax_breakdown.map((tb) => ({
          label: tb.name,
          name: tb.name,
          rate: tb.rate,
          amount: tb.amount,
        }))
      : totalTax > 0
      ? [
          {
            label: `${organization?.tax_system === 'VAT' ? 'VAT' : 'GST'} (${calculated.tax_rate}%)${
              taxMode === 'inclusive' ? ' (Included)' : ''
            }`,
            name: `${organization?.tax_system === 'VAT' ? 'VAT' : 'GST'} (${calculated.tax_rate}%)${
              taxMode === 'inclusive' ? ' (Included)' : ''
            }`,
            rate: calculated.tax_rate,
            amount: totalTax,
          },
        ]
      : [];

  const handleSaveInvoice = async (targetStatus: InvoiceStatus) => {
    if (!customerId) {
      setError('Please select or create a customer.');
      return;
    }

    if (items.some((i) => !i.description.trim())) {
      setError('Please provide a description for all line items.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const payload = {
        organization_id: organization.id,
        customer_id: customerId,
        quotation_id: fromQuotation?.id || initialInvoice?.quotation_id || null,
        invoice_number: invoiceNumber.trim(),
        po_number: poNumber.trim() || null,
        status: targetStatus,
        issue_date: issueDate,
        due_date: dueDate,
        currency,
        discount_type: discountType,
        discount_value: discountValue,
        tax_rate: overallTaxRate,
        tax_mode: taxMode,
        tax_name: organization?.tax_system === 'VAT' ? 'VAT' : 'GST',
        place_of_supply: resolvedPlaceOfSupply || null,
        customer_gstin: selectedCustomer?.customer_gstin || selectedCustomer?.tax_number || null,
        payment_terms: paymentTerms,
        payment_method: paymentMethod,
        notes: (notes || '').trim(),
        terms_conditions: (terms || '').trim(),
        attachments,
        tax_breakdown: calculated.tax_breakdown,
        items: calculatedItems.map((item, idx) => ({
          product_id: item.product_id || null,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          discount_amount: item.discountAmount,
          tax_rate: item.tax_rate,
          tax_amount: item.taxAmount,
          line_total: item.lineTotal,
          sort_order: idx + 1,
          item_type: item.item_type,
          classification_type: item.classification_type,
          classification_code: item.classification_code,
        })),
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save invoice');

      router.push(`/invoices/${data.invoice.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error saving invoice');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Navigation & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="h-6 w-6 text-indigo-600" />
              <span>{fromQuotation ? `Create Invoice from ${fromQuotation.quotation_number}` : 'Create Commercial Invoice'}</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Direct billing with country-adaptive tax ({countryProfile.flag} {countryProfile.name}) & line classifications.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSaveInvoice('DRAFT')}
            disabled={isLoading}
            className="text-xs"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            <span>Save Draft</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleSaveInvoice('PAID')}
            disabled={isLoading}
            className="text-xs bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
          >
            <CreditCard className="h-3.5 w-3.5 mr-1 text-emerald-600" />
            <span>Mark as Paid</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => handleSaveInvoice('ISSUED')}
            disabled={isLoading}
            className="text-xs shadow-md"
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            <span>Issue Invoice</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {/* Invoice Meta Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Select Card */}
        <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Bill To Customer *
            </label>
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              + Quick Add New Customer
            </button>
          </div>

          {isQuickAddOpen && (
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 space-y-3">
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">New Customer Quick Entry</h4>

              {quickCustomerError && (
                <div className="p-2 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
                  {quickCustomerError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Contact Name *"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 px-2.5 text-xs bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  placeholder="Company Name (Optional)"
                  value={quickCompany}
                  onChange={(e) => setQuickCompany(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 px-2.5 text-xs bg-white dark:bg-slate-800"
                />

                <div className="flex gap-1.5">
                  <select
                    value={quickPhoneCountryCode}
                    onChange={(e) => setQuickPhoneCountryCode(e.target.value)}
                    title="Country code"
                    className="h-8 w-28 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 px-2 text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                        {c.flag} {c.dialCode} ({c.name})
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                    className="h-8 w-full rounded-lg border border-slate-200 px-2.5 text-xs bg-white dark:bg-slate-800"
                  />
                </div>

                <input
                  type="email"
                  placeholder="Email Address"
                  value={quickEmail}
                  onChange={(e) => setQuickEmail(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 px-2.5 text-xs bg-white dark:bg-slate-800"
                />

                <p className="text-[11px] text-slate-500 dark:text-slate-400 col-span-1 sm:col-span-2">
                  Enter at least a mobile number or an email address (or both) for customer portal authentication. Both cannot be left blank.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setIsQuickAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" variant="primary" onClick={handleQuickAddCustomer} isLoading={isSavingQuickCustomer}>
                  Save & Select
                </Button>
              </div>
            </div>
          )}

          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 px-3 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Select a customer...</option>
            {customerList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name ? `${c.company_name} (${c.name})` : c.name}
              </option>
            ))}
          </select>

          {selectedCustomer && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {selectedCustomer.company_name || selectedCustomer.name}
              </p>
              {selectedCustomer.company_name && selectedCustomer.name && (
                <p className="text-slate-500">Attn: {selectedCustomer.name}</p>
              )}
              {selectedCustomer.billing_address && (
                <p className="text-slate-500">
                  {selectedCustomer.billing_address}, {selectedCustomer.city} {selectedCustomer.state} {selectedCustomer.postal_code}
                </p>
              )}
              <div className="flex gap-4 text-slate-500 pt-1">
                {selectedCustomer.email && <span>Email: {selectedCustomer.email}</span>}
                {selectedCustomer.phone && <span>Tel: {selectedCustomer.phone}</span>}
                {selectedCustomer.tax_number && (
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {countryProfile.taxLabel.split(' ')[0]}: {selectedCustomer.tax_number}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Invoice Settings & Country Profile */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Tax Context
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <span>{countryProfile.flag}</span>
              <span>{countryProfile.name}</span>
            </span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Invoice Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={invoiceNumber}
                  readOnly
                  disabled
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-sm font-mono font-bold select-none cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded select-none">
                  Auto-Generated
                </span>
              </div>
            </div>

            <Input
              label="PO Number (Optional)"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="e.g. PO-2026-001"
            />

            {paymentTerms === 'Due on Receipt' ? (
              <Input
                label="Invoice Date"
                type="date"
                value={issueDate}
                onChange={(e) => {
                  setIssueDate(e.target.value);
                  setDueDate(e.target.value);
                }}
              />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Invoice Date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
                <Input
                  label="Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="SAR">SAR (ر.س)</option>
                  <option value="KWD">KWD (د.ك)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Payment Terms
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => {
                    const newTerms = e.target.value;
                    setPaymentTerms(newTerms);
                    if (newTerms === 'Due on Receipt') {
                      setDueDate(issueDate);
                    } else if (newTerms === 'Net 15 Days') {
                      const d = new Date(issueDate);
                      d.setDate(d.getDate() + 15);
                      setDueDate(d.toISOString().split('T')[0]);
                    } else if (newTerms === 'Net 30 Days') {
                      const d = new Date(issueDate);
                      d.setDate(d.getDate() + 30);
                      setDueDate(d.toISOString().split('T')[0]);
                    } else if (newTerms === 'Net 60 Days') {
                      const d = new Date(issueDate);
                      d.setDate(d.getDate() + 60);
                      setDueDate(d.toISOString().split('T')[0]);
                    }
                  }}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="Net 15 Days">Net 15 Days</option>
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Net 60 Days">Net 60 Days</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Payment Mode
                </label>
                <select
                  value={PAYMENT_MODES.includes(paymentMethod) ? paymentMethod : 'Other'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== 'Other') setPaymentMethod(val);
                    else setPaymentMethod('Other');
                  }}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200"
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
                {!PAYMENT_MODES.slice(0, -1).includes(paymentMethod) && (
                  <input
                    type="text"
                    value={paymentMethod === 'Other' ? '' : paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value || 'Other')}
                    placeholder="Specify custom mode..."
                    className="mt-1 w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Tax Calculation Mode
                </label>
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900 p-0.5 h-10">
                  <button
                    type="button"
                    onClick={() => setTaxMode('exclusive')}
                    className={`flex-1 text-[11px] font-bold rounded-md transition-all ${
                      taxMode === 'exclusive'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Exclusive
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxMode('inclusive')}
                    className={`flex-1 text-[11px] font-bold rounded-md transition-all ${
                      taxMode === 'inclusive'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Inclusive
                  </button>
                </div>
              </div>
            </div>

            {/* India GST Specific: Place of Supply & Interstate */}
            {countryProfile.isIndiaGst && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Place of Supply (State)
                  </label>
                  <select
                    value={resolvedPlaceOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="">Same as Business State ({organization?.business_state || organization?.state || 'Default'})</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st.code} value={st.name}>
                        {st.name} ({st.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Line Items Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-600" />
              <span>Invoice Products & Services</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add Products (Goods) or Services with automated {countryProfile.goodsClassificationLabel} / {countryProfile.serviceClassificationLabel} tax classification.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addProductItem}
              className="gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-bold shadow-xs"
            >
              <Package className="h-3.5 w-3.5 text-emerald-600" />
              <span>+ Add Product</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addServiceItem}
              className="gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-bold shadow-xs"
            >
              <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
              <span>+ Add Service</span>
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item, idx) => {
            const isGoods = item.item_type === 'GOODS';
            const classificationLabel = isGoods
              ? countryProfile.goodsClassificationLabel
              : countryProfile.serviceClassificationLabel;
            const classificationPlaceholder = isGoods
              ? `${countryProfile.goodsClassificationLabel} (e.g. 8421)`
              : `${countryProfile.serviceClassificationLabel} (e.g. 998311)`;

            return (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850/40 space-y-3 relative group"
              >
                {/* Header row: Item # + Product/Service Toggle + Catalog Select + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {idx + 1}
                    </span>

                    {/* Segmented Pill Toggle: Product vs Service */}
                    <div className="inline-flex rounded-lg p-0.5 bg-slate-200/70 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 text-[11px]">
                      <button
                        type="button"
                        onClick={() => updateItem(idx, { item_type: 'GOODS' })}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold transition-all ${
                          isGoods
                            ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/20'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Package className="h-3 w-3" />
                        <span>Product</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateItem(idx, { item_type: 'SERVICE' })}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold transition-all ${
                          !isGoods
                            ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs ring-1 ring-indigo-500/20'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Briefcase className="h-3 w-3" />
                        <span>Service</span>
                      </button>
                    </div>

                    {/* Catalog Picker */}
                    {products && products.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) handleSelectProduct(idx, e.target.value);
                        }}
                        defaultValue=""
                        className="h-7 max-w-[260px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate"
                      >
                        <option value="">-- Load from Product/Service Catalog --</option>
                        <optgroup label="Products (Goods)">
                          {products
                            .filter((p) => !(p.unit?.toLowerCase() === 'service' || p.unit?.toLowerCase() === 'hrs' || p.unit?.toLowerCase() === 'hour'))
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                📦 {p.name} ({formatCurrency(p.unit_price, currency)})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Services">
                          {products
                            .filter((p) => p.unit?.toLowerCase() === 'service' || p.unit?.toLowerCase() === 'hrs' || p.unit?.toLowerCase() === 'hour')
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                💼 {p.name} ({formatCurrency(p.unit_price, currency)})
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    )}
                  </div>

                  <div className="flex items-center gap-1 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleDuplicateItem(idx)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title="Duplicate row"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                        title="Delete row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Primary Row: Description & Classification */}
                <div className="grid grid-cols-12 gap-3 items-start">
                  {/* Description */}
                  <div className="col-span-12 sm:col-span-8">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                      placeholder={
                        isGoods
                          ? 'Product name, part number, or goods description *'
                          : 'Service title, consultancy, or scope of work *'
                      }
                      className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 font-medium"
                    />
                  </div>

                  {/* Classification Code */}
                  <div className="col-span-12 sm:col-span-4">
                    <div className="relative">
                      <input
                        type="text"
                        value={item.classification_code || ''}
                        onChange={(e) => updateItem(idx, { classification_code: e.target.value })}
                        placeholder={classificationPlaceholder}
                        title={classificationLabel}
                        className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-2.5 pr-14 text-xs text-slate-900 dark:text-slate-100 font-mono"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase pointer-events-none">
                        {item.classification_type || (isGoods ? 'HSN' : 'SAC')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quantitative Row: Qty, Unit, Unit Price */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                      className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-center text-slate-900 dark:text-slate-100 font-semibold"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateItem(idx, { unit: e.target.value })}
                      placeholder={isGoods ? 'pcs, kg, box' : 'service, hrs'}
                      className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-700 dark:text-slate-300"
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-6">
                    <label className="block text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-400 mb-1">
                      Unit Price ({currency}) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.unit_price}
                      onChange={(e) => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                      className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-right text-slate-900 dark:text-slate-100 font-bold"
                    />
                  </div>
                </div>

                {/* Second row: Discount & Tax Selection & Subtotal */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Discount */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Discount:</span>
                      <input
                        type="number"
                        min="0"
                        value={item.discount_value}
                        onChange={(e) => updateItem(idx, { discount_value: parseFloat(e.target.value) || 0 })}
                        className="h-7 w-16 rounded border border-slate-200 px-1.5 text-xs text-right bg-white dark:bg-slate-800"
                      />
                      <select
                        value={item.discount_type}
                        onChange={(e) => updateItem(idx, { discount_type: e.target.value as DiscountType })}
                        className="h-7 rounded border border-slate-200 px-1 text-xs bg-white dark:bg-slate-800"
                      >
                        <option value="PERCENTAGE">%</option>
                        <option value="FIXED">{currency}</option>
                      </select>
                    </div>

                    {/* Tax Rate */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Tax Rate:</span>
                      <select
                        value={item.tax_rate}
                        onChange={(e) => updateItem(idx, { tax_rate: parseFloat(e.target.value) || 0 })}
                        className="h-7 rounded border border-slate-200 px-2 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                      >
                        {countryProfile.taxRates.map((tr, tIdx) => (
                          <option key={`${tr.rate}-${tr.label}-${tIdx}`} value={tr.rate}>
                            {tr.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Calculated Line Total */}
                  <div className="text-right">
                    <span className="text-slate-400 mr-2 text-[11px]">
                      Tax: {formatCurrency(calculatedItems[idx]?.taxAmount || 0, currency)}
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
                      {formatCurrency(calculatedItems[idx]?.lineTotal || 0, currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attachments Section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <FileAttachmentsUploader attachments={attachments} onChange={setAttachments} />
      </div>

      {/* Notes, Terms & Grand Total Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-7 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
            <Textarea
              label="Invoice Notes (Displayed to customer)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
            <Textarea
              label="Payment Instructions & Terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Financial Summary Card */}
        <div className="md:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800">
            Payment Summary
          </h4>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>{taxMode === 'inclusive' ? 'Subtotal (Taxable Amount)' : 'Subtotal'}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(subtotal, currency)}
              </span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discounts</span>
                <span>-{formatCurrency(totalDiscount, currency)}</span>
              </div>
            )}

            {/* Country Adaptive Tax Breakdown */}
            {aggregateTaxBreakdown.map((tb, idx) => (
              <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{tb.label}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(tb.amount, currency)}
                </span>
              </div>
            ))}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
              <span className="text-sm font-black text-slate-900 dark:text-slate-100">Grand Total Due</span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                {formatCurrency(grandTotal, currency)}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => handleSaveInvoice('ISSUED')}
              disabled={isLoading}
              className="w-full gap-2 shadow-md"
            >
              <Send className="h-4 w-4" />
              <span>Issue Invoice Now</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleSaveInvoice('PAID')}
              disabled={isLoading}
              className="w-full text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Save & Mark Paid</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
