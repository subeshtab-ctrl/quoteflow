'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Customer, Product, Organization, CurrencyCode, DiscountType, AttachmentItem } from '@/types/database';
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

          {/* Step 5: Document Attachments */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5 text-indigo-500" />
              <span>5. Quotation Attachments & Documents</span>
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
