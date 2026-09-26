'use client';

import React, { useState, useEffect } from 'react';
import { Quotation, Organization, Customer } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Printer,
  Download,
  Receipt,
  CheckCircle2,
  Pencil,
  Eye,
  Plus,
  Trash2,
  RotateCcw,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  AlertCircle,
  ExternalLink,
  Check,
  Package,
  Briefcase,
} from 'lucide-react';
import {
  parseLogoUrl,
  getLogoShapeClass,
  getLogoFitClass,
  getCompanyInitials,
} from '@/lib/utils/logo';
import { PaymentModal } from '@/components/quotations/payment-modal';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  item_type?: 'GOODS' | 'SERVICE';
  classification_type?: string;
  classification_code?: string;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation;
  organization?: Organization | null;
  customer?: Customer | null;
}

export function InvoiceModal({
  isOpen,
  onClose,
  quotation,
  organization,
  customer,
}: InvoiceModalProps) {
  const currency = quotation.currency || 'INR';

  // Active view tab: 'preview' | 'edit'
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

  // Editable Invoice Fields
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${quotation.quotation_number.replace(/^Q-/, '')}`);
  const [invoiceDate, setInvoiceDate] = useState(
    (quotation.updated_at || quotation.issue_date || new Date().toISOString()).split('T')[0]
  );
  const [dueDate, setDueDate] = useState(
    (quotation.valid_until || new Date(Date.now() + 30 * 86400000).toISOString()).split('T')[0]
  );
  const [poNumber, setPoNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [paymentMode, setPaymentMode] = useState('Electronic Funds Transfer / UPI');

  // Payment Tracking State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaidState, setIsPaidState] = useState(Boolean(quotation.is_paid));
  const [paidAtState, setPaidAtState] = useState(quotation.paid_at || null);
  const [paymentMethodState, setPaymentMethodState] = useState(quotation.payment_method || null);
  const [paymentNotesState, setPaymentNotesState] = useState(quotation.payment_notes || null);

  // Persistence State
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setIsPaidState(Boolean(quotation.is_paid));
    setPaidAtState(quotation.paid_at || null);
    setPaymentMethodState(quotation.payment_method || null);
    setPaymentNotesState(quotation.payment_notes || null);
  }, [quotation]);

  // Fetch existing persisted invoice if available
  useEffect(() => {
    if (isOpen) {
      fetch(`/api/invoices?search=${encodeURIComponent(quotation.quotation_number)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.invoices && Array.isArray(data.invoices)) {
            const match = data.invoices.find((inv: any) => inv.quotation_id === quotation.id);
            if (match) {
              setInvoiceId(match.id);
              if (match.invoice_number) setInvoiceNumber(match.invoice_number);
              if (match.issue_date) setInvoiceDate(match.issue_date.split('T')[0]);
              if (match.due_date) setDueDate(match.due_date.split('T')[0]);
              if (match.po_number) setPoNumber(match.po_number);
              if (match.payment_terms) setPaymentTerms(match.payment_terms);
              if (match.notes) setInvoiceNotes(match.notes);
              if (match.terms_conditions) setInvoiceTerms(match.terms_conditions);
              if (match.items && match.items.length > 0) {
                setItems(
                  match.items.map((it: any, idx: number) => ({
                    id: it.id || `item_${idx}_${Date.now()}`,
                    description: it.description,
                    quantity: Number(it.quantity) || 1,
                    unit: it.unit || 'unit',
                    unit_price: Number(it.unit_price) || 0,
                    tax_rate: Number(it.tax_rate) || 0,
                    item_type: it.item_type || (it.unit === 'service' || it.unit === 'hrs' ? 'SERVICE' : 'GOODS'),
                    classification_type: it.classification_type,
                    classification_code: it.classification_code,
                  }))
                );
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, quotation.id, quotation.quotation_number]);

  // Customer override details
  const [clientName, setClientName] = useState(
    customer?.company_name || customer?.name || 'Valued Client'
  );
  const [clientAttn, setClientAttn] = useState(
    customer?.company_name && customer?.name ? customer.name : ''
  );
  const [clientTaxId, setClientTaxId] = useState(customer?.tax_number || '');
  const [clientAddress, setClientAddress] = useState(
    [customer?.billing_address, customer?.city, customer?.state, customer?.postal_code]
      .filter(Boolean)
      .join(', ')
  );

  // Invoice Notes & Terms (Replacing Bank Remittance and Quotation Terms)
  const defaultInvoiceNotes =
    'Thank you for your business. Please remit payment according to the agreed terms.';
  const defaultInvoiceTerms = [
    '1. Payment is due within agreed terms from the date of invoice.',
    '2. Please quote the invoice number when making remittance.',
    '3. Overdue payments may be subject to interest as permitted by applicable law.',
    '4. Goods/services provided in accordance with approved scope are non-refundable.',
  ].join('\n');

  const [invoiceNotes, setInvoiceNotes] = useState(defaultInvoiceNotes);
  const [invoiceTerms, setInvoiceTerms] = useState(defaultInvoiceTerms);

  // Line Items
  const [items, setItems] = useState<InvoiceItem[]>(() =>
    (quotation.items || []).map((item, idx) => ({
      id: item.id || `item_${idx}_${Date.now()}`,
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'unit',
      unit_price: Number(item.unit_price) || 0,
      tax_rate: Number(item.tax_rate) || 0,
      item_type: (item as any).item_type || (item.unit === 'service' || item.unit === 'hrs' ? 'SERVICE' : 'GOODS'),
      classification_type: (item as any).classification_type,
      classification_code: (item as any).classification_code,
    }))
  );

  // Discount
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>(
    quotation.discount_type || 'PERCENTAGE'
  );
  const [discountValue, setDiscountValue] = useState<number>(
    quotation.discount_value || 0
  );

  // Re-sync when quotation prop changes
  useEffect(() => {
    if (isOpen) {
      setInvoiceNumber(`INV-${quotation.quotation_number.replace(/^Q-/, '')}`);
      setInvoiceDate(
        (quotation.updated_at || quotation.issue_date || new Date().toISOString()).split('T')[0]
      );
      setDueDate(
        (quotation.valid_until || new Date(Date.now() + 30 * 86400000).toISOString()).split('T')[0]
      );
      setClientName(customer?.company_name || customer?.name || 'Valued Client');
      setClientAttn(customer?.company_name && customer?.name ? customer.name : '');
      setClientTaxId(customer?.tax_number || '');
      setClientAddress(
        [customer?.billing_address, customer?.city, customer?.state, customer?.postal_code]
          .filter(Boolean)
          .join(', ')
      );
      setInvoiceNotes(organization?.invoice_footer || defaultInvoiceNotes);
      setItems(
        (quotation.items || []).map((item, idx) => ({
          id: item.id || `item_${idx}_${Date.now()}`,
          description: item.description,
          quantity: Number(item.quantity) || 1,
          unit: item.unit || 'unit',
          unit_price: Number(item.unit_price) || 0,
          tax_rate: Number(item.tax_rate) || 0,
          item_type: (item as any).item_type || (item.unit === 'service' || item.unit === 'hrs' ? 'SERVICE' : 'GOODS'),
          classification_type: (item as any).classification_type,
          classification_code: (item as any).classification_code,
        }))
      );
      setDiscountType(quotation.discount_type || 'PERCENTAGE');
      setDiscountValue(quotation.discount_value || 0);
    }
  }, [isOpen, quotation, customer, organization]);

  // Calculations
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0
  );
  const discountAmount =
    discountType === 'PERCENTAGE'
      ? (subtotal * (Number(discountValue) || 0)) / 100
      : Number(discountValue) || 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = items.reduce((sum, it) => {
    const itemTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
    const itemTax = (itemTotal * (Number(it.tax_rate) || 0)) / 100;
    return sum + itemTax;
  }, 0);
  const grandTotal = taxableAmount + taxAmount;

  // Item handlers
  const handleItemChange = (index: number, field: keyof InvoiceItem, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleAddProduct = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `prod_${Date.now()}`,
        description: '',
        quantity: 1,
        unit: 'pcs',
        unit_price: 1000,
        tax_rate: 18,
        item_type: 'GOODS',
        classification_type: 'HSN',
        classification_code: '',
      },
    ]);
  };

  const handleAddService = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `serv_${Date.now()}`,
        description: '',
        quantity: 1,
        unit: 'service',
        unit_price: 1000,
        tax_rate: 18,
        item_type: 'SERVICE',
        classification_type: 'SAC',
        classification_code: '998311',
      },
    ]);
  };

  const handleAddItem = () => {
    handleAddProduct();
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('Invoice must have at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset all invoice fields back to quotation defaults?')) return;
    setInvoiceNumber(`INV-${quotation.quotation_number.replace(/^Q-/, '')}`);
    setInvoiceDate(
      (quotation.updated_at || quotation.issue_date || new Date().toISOString()).split('T')[0]
    );
    setDueDate(
      (quotation.valid_until || new Date(Date.now() + 30 * 86400000).toISOString()).split('T')[0]
    );
    setPoNumber('');
    setPaymentTerms('Net 30 Days');
    setPaymentMode('Electronic Funds Transfer / UPI');
    setClientName(customer?.company_name || customer?.name || 'Valued Client');
    setClientAttn(customer?.company_name && customer?.name ? customer.name : '');
    setClientTaxId(customer?.tax_number || '');
    setClientAddress(
      [customer?.billing_address, customer?.city, customer?.state, customer?.postal_code]
        .filter(Boolean)
        .join(', ')
    );
    setInvoiceNotes(defaultInvoiceNotes);
    setInvoiceTerms(defaultInvoiceTerms);
    setItems(
      (quotation.items || []).map((item, idx) => ({
        id: item.id || `item_${idx}_${Date.now()}`,
        description: item.description,
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'unit',
        unit_price: Number(item.unit_price) || 0,
        tax_rate: Number(item.tax_rate) || 0,
      }))
    );
    setDiscountType(quotation.discount_type || 'PERCENTAGE');
    setDiscountValue(quotation.discount_value || 0);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const targetId = invoiceId || quotation.id;
    window.open(`/api/invoices/${targetId}/pdf`, '_blank');
  };

  const handleSaveInvoiceChanges = async () => {
    try {
      setIsSaving(true);
      const payload = {
        organization_id: quotation.organization_id,
        customer_id: quotation.customer_id,
        quotation_id: quotation.id,
        invoice_number: invoiceNumber,
        po_number: poNumber || null,
        status: isPaidState ? 'PAID' : 'ISSUED',
        issue_date: invoiceDate,
        due_date: dueDate,
        currency: currency,
        payment_terms: paymentTerms,
        notes: invoiceNotes,
        terms_conditions: invoiceTerms,
        discount_type: discountType,
        discount_value: discountValue,
        items: items.map((it, idx) => ({
          id: it.id,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unit_price,
          tax_rate: it.tax_rate,
          tax_amount: (it.quantity * it.unit_price * it.tax_rate) / 100,
          line_total: (it.quantity * it.unit_price) * (1 + it.tax_rate / 100),
          sort_order: idx + 1,
          item_type: it.item_type || (it.unit === 'service' || it.unit === 'hrs' ? 'SERVICE' : 'GOODS'),
          classification_type: it.classification_type || (it.item_type === 'GOODS' ? 'HSN' : 'SAC'),
          classification_code: it.classification_code || '',
        })),
      };

      let res;
      if (invoiceId) {
        res = await fetch(`/api/invoices/${invoiceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save invoice changes');

      if (data.invoice?.id) {
        setInvoiceId(data.invoice.id);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
      setActiveTab('preview');
    } catch (err: any) {
      alert(err.message || 'Error saving invoice changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Business rule: Tax invoice is ONLY available when the quotation is APPROVED or COMPLETED and marked as PAID
  if (!isOpen || (!['APPROVED', 'PAYMENT_COMPLETED', 'COMPLETED'].includes(quotation.status)) || !quotation.is_paid) {
    return null;
  }

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Commercial Tax Invoice - ${invoiceNumber}`}
      description="Official tax invoice generated from approved quotation. You can edit invoice details, rates, and terms."
      maxWidth="4xl"
    >
      <div className="space-y-6 print:p-0">
        {/* Top Control Bar with Tabs & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'preview'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Invoice Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'edit'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Invoice</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg animate-in fade-in">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Changes Saved to Invoices</span>
              </span>
            )}

            {activeTab === 'preview' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className={`gap-1.5 text-xs font-bold shadow-sm ${
                    isPaidState
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900'
                      : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:text-amber-900'
                  }`}
                  title={isPaidState ? 'Payment received - click to edit' : 'Payment pending - click to mark as paid'}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{isPaidState ? 'Paid' : 'Mark as Paid'}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('edit')}
                  className="gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit Details</span>
                </Button>

                {invoiceId ? (
                  <Link href={`/invoices/${invoiceId}`} target="_blank">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-50 shadow-xs">
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                      <span>Full Invoice</span>
                    </Button>
                  </Link>
                ) : (
                  <Link href="/invoices" target="_blank">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-50 shadow-xs">
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                      <span>Invoices Tab</span>
                    </Button>
                  </Link>
                )}

                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs shadow-sm">
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Invoice</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadPdf}
                  className="gap-1.5 text-xs shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>PDF</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetDefaults}
                  className="gap-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Defaults</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('preview')}
                  className="gap-1.5 text-xs shadow-sm"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Preview</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveInvoiceChanges}
                  isLoading={isSaving}
                  className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ================= EDIT MODE ================= */}
        {activeTab === 'edit' && (
          <div className="space-y-6 print:hidden">
            {/* Section 1: Invoice Identifiers & Dates */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span>Invoice Particulars & Payment Terms</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Invoice Number *"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-000001"
                  required
                />
                <Input
                  label="Invoice Date *"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  required
                />
                <Input
                  label="Due Date *"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="PO / Work Order Ref"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="e.g. PO-2026-9021"
                />
                <Input
                  label="Payment Terms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. Net 30 Days"
                />
                <Input
                  label="Payment Mode"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  placeholder="e.g. Electronic Funds Transfer / UPI"
                />
              </div>
            </div>

            {/* Section 2: Customer Billed-To Details */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <span>Billed To (Customer Details)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Customer / Company Name *"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client Business Name"
                  required
                />
                <Input
                  label="Attention / Contact Person"
                  value={clientAttn}
                  onChange={(e) => setClientAttn(e.target.value)}
                  placeholder="Contact Person Name"
                />
                <Input
                  label="Customer GSTIN / Tax ID"
                  value={clientTaxId}
                  onChange={(e) => setClientTaxId(e.target.value)}
                  placeholder="e.g. 29ABCDE1234F1Z5"
                />
              </div>
              <Input
                label="Billing Address"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Street address, city, state, postal code"
              />
            </div>

            {/* Section 3: Line Items Editor */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Receipt className="h-4 w-4 text-indigo-600" />
                  <span>Invoice Products & Services</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddProduct}
                    className="gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold"
                  >
                    <Package className="h-3.5 w-3.5 text-emerald-600" />
                    <span>+ Add Product</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddService}
                    className="gap-1.5 text-xs text-indigo-700 border-indigo-300 hover:bg-indigo-50 font-bold"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                    <span>+ Add Service</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => {
                  const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                  const isGoods = item.item_type !== 'SERVICE';
                  return (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                    >
                      {/* Item Type & Classification Top Row */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500">#{idx + 1}</span>
                          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => {
                                handleItemChange(idx, 'item_type', 'GOODS');
                                if (item.unit === 'service' || item.unit === 'hrs') handleItemChange(idx, 'unit', 'pcs');
                                handleItemChange(idx, 'classification_type', 'HSN');
                              }}
                              className={cn(
                                'flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-colors',
                                isGoods
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              )}
                            >
                              <Package className="h-3 w-3" />
                              <span>Product (Goods)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleItemChange(idx, 'item_type', 'SERVICE');
                                if (item.unit === 'pcs') handleItemChange(idx, 'unit', 'service');
                                handleItemChange(idx, 'classification_type', 'SAC');
                                if (!item.classification_code) handleItemChange(idx, 'classification_code', '998311');
                              }}
                              className={cn(
                                'flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-colors',
                                !isGoods
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              )}
                            >
                              <Briefcase className="h-3 w-3" />
                              <span>Service</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <input
                              type="text"
                              value={item.classification_code || ''}
                              onChange={(e) => handleItemChange(idx, 'classification_code', e.target.value)}
                              placeholder={isGoods ? 'HSN Code' : 'SAC Code (e.g. 998311)'}
                              className="h-7 w-40 px-2 pr-12 text-[11px] bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 pointer-events-none uppercase">
                              {item.classification_type || (isGoods ? 'HSN' : 'SAC')}
                            </span>
                          </div>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Item Details Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-5">
                          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                            Description
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            placeholder={isGoods ? 'Product name or goods description *' : 'Service title or consultancy scope *'}
                            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                            Qty & Unit
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)
                              }
                              className="w-16 h-9 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-center font-semibold"
                            />
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                              placeholder={isGoods ? 'pcs' : 'service'}
                              className="w-full h-9 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                            Rate ({currency})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unit_price}
                            onChange={(e) =>
                              handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)
                            }
                            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                          />
                        </div>

                        <div className="sm:col-span-1">
                          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
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
                            className="w-full h-9 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-center"
                          />
                        </div>

                        <div className="sm:col-span-2 flex items-center justify-end">
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-semibold uppercase">Total</p>
                            <p className="text-xs font-bold text-slate-900">
                              {formatCurrency(lineTotal, currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Discount & Totals in Edit Mode */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">Invoice Discount:</span>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                    className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ({currency})</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-24 h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                  />
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 mr-2">Calculated Total Due:</span>
                  <span className="text-base font-black text-indigo-700">
                    {formatCurrency(grandTotal, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4: Invoice Notes & Terms and Conditions */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span>Invoice Notes & Terms and Conditions</span>
              </div>
              <Textarea
                label="Invoice Notes & Payment Instructions"
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                rows={2}
                placeholder="Payment instructions, remittance advice or thank you note..."
              />
              <Textarea
                label="Invoice Terms & Conditions"
                value={invoiceTerms}
                onChange={(e) => setInvoiceTerms(e.target.value)}
                rows={4}
                placeholder="Invoice terms and conditions..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setActiveTab('preview')}>
                Done Editing & View Preview
              </Button>
              <Button type="button" variant="primary" onClick={() => setActiveTab('preview')}>
                Apply Changes to Invoice
              </Button>
            </div>
          </div>
        )}

        {/* ================= PREVIEW / PRINT MODE ================= */}
        {activeTab === 'preview' && (
          <div
            id="invoice-sheet"
            className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 text-slate-800 shadow-sm"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  Commercial Tax Invoice
                </span>
                <div className="flex items-center gap-3 mt-2 mb-1">
                  {(() => {
                    const logoConfig = parseLogoUrl(organization?.logo_url);
                    if (logoConfig.cleanUrl) {
                      return (
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center bg-white border border-slate-200 shadow-xs ring-2 ring-indigo-500/10 overflow-hidden ${getLogoShapeClass(
                            logoConfig.shape
                          )}`}
                        >
                          <img
                            src={logoConfig.cleanUrl}
                            alt={organization?.name || 'Company Logo'}
                            className={`h-full w-full ${getLogoShapeClass(
                              logoConfig.shape
                            )} ${getLogoFitClass(logoConfig.fit)}`}
                          />
                        </div>
                      );
                    }
                    return (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black text-base tracking-wider select-none shadow-xs">
                        {getCompanyInitials(organization?.name)}
                      </div>
                    );
                  })()}
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {organization?.name || 'QuoteFlow Organization'}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {organization?.address_line1 && `${organization.address_line1}, `}
                  {organization?.city && `${organization.city}, `}
                  {organization?.state} {organization?.postal_code}
                  <br />
                  Email: {organization?.email} | Tel: {organization?.phone || 'N/A'}
                  {organization?.gst_vat_number && (
                    <>
                      <br />
                      <span className="font-semibold text-slate-700">GSTIN / Tax ID:</span>{' '}
                      {organization.gst_vat_number}
                    </>
                  )}
                </p>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <h3 className="text-xl font-mono font-black text-indigo-700">{invoiceNumber}</h3>
                <p className="text-xs text-slate-500">
                  Ref Quotation: <span className="font-bold text-slate-700">{quotation.quotation_number}</span>
                </p>
                {poNumber && (
                  <p className="text-xs text-slate-500">
                    PO Ref: <span className="font-semibold text-slate-800">{poNumber}</span>
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Invoice Date:{' '}
                  <span className="font-semibold text-slate-800">{formatDate(invoiceDate)}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Due Date: <span className="font-semibold text-slate-800">{formatDate(dueDate)}</span>
                </p>
                <div className="pt-1 flex flex-col items-start sm:items-end gap-1">
                  {isPaidState ? (
                    <div className="flex flex-col items-start sm:items-end gap-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3 py-1 text-xs font-black tracking-wider shadow-sm uppercase">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>PAID IN FULL</span>
                      </span>
                      {paidAtState && (
                        <span className="text-[11px] text-emerald-700 font-bold">
                          Paid on {formatDate(paidAtState)}
                          {paymentMethodState ? ` via ${paymentMethodState}` : ''}
                        </span>
                      )}
                      {paymentNotesState && (
                        <span className="text-[10px] text-slate-500 italic max-w-xs truncate">
                          Ref: {paymentNotesState}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-start sm:items-end gap-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 border border-amber-300">
                        <AlertCircle className="h-3 w-3 text-amber-600" />
                        <span>UNPAID • Payment Pending</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline print:hidden"
                      >
                        Click to record payment
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Billed To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50/80 p-4 border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Billed To (Customer)
                </span>
                <p className="font-bold text-sm text-slate-900 mt-1">{clientName}</p>
                {clientAttn && <p className="text-slate-600">Attn: {clientAttn}</p>}
                {clientAddress && <p className="text-slate-500 mt-0.5">{clientAddress}</p>}
                {clientTaxId && (
                  <p className="font-semibold text-slate-700 mt-1">
                    Customer Tax ID / GSTIN: {clientTaxId}
                  </p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Project Title & Terms
                </span>
                <p className="font-bold text-sm text-slate-900 mt-1">{quotation.title}</p>
                <div className="mt-2 text-slate-500 space-y-0.5">
                  <p>
                    Payment Terms: <span className="font-medium text-slate-700">{paymentTerms}</span>
                  </p>
                  <p>
                    Mode: <span className="font-medium text-slate-700">{paymentMode}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate</th>
                    <th className="py-2.5 px-3 text-center">Tax %</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {items.map((item, idx) => {
                    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                    return (
                      <tr key={item.id || idx}>
                        <td className="py-3 px-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3 font-medium text-slate-800">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.item_type === 'SERVICE' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                                Service{item.classification_code ? ` • SAC ${item.classification_code}` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                                Product{item.classification_code ? ` • HSN ${item.classification_code}` : ''}
                              </span>
                            )}
                            <span>{item.description}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {formatCurrency(item.unit_price, currency)}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500">
                          {item.tax_rate > 0 ? `${item.tax_rate}%` : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-900">
                          {formatCurrency(lineTotal, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown & Terms/Payment Details */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
              <div className="w-full sm:w-1/2 space-y-3 text-xs">
                {invoiceNotes && (
                  <div>
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Notes:
                    </span>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">{invoiceNotes}</p>
                  </div>
                )}
                {invoiceTerms && (
                  <div>
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Terms & Conditions:
                    </span>
                    <p className="text-slate-500 mt-0.5 whitespace-pre-line leading-relaxed text-[11px]">
                      {invoiceTerms}
                    </p>
                  </div>
                )}
                {(quotation.payment_method || quotation.payment_notes) && (
                  <p className="text-[11px] text-slate-500 italic font-serif pt-1">
                    Mode of Payment: {quotation.payment_method?.replace(/_/g, ' ') || 'Bank Transfer'}{quotation.payment_notes ? ` • Ref/Txn No: ${quotation.payment_notes}` : ''}
                  </p>
                )}
              </div>

              <div className="w-full sm:w-5/12 space-y-2 text-xs rounded-xl bg-slate-50 p-4 border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(subtotal, currency)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount</span>
                    <span className="font-semibold">-{formatCurrency(discountAmount, currency)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax Amount</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(taxAmount, currency)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-900">Total Amount</span>
                  <span className="text-xl font-black text-indigo-700">
                    {formatCurrency(grandTotal, currency)}
                  </span>
                </div>
                {Boolean(quotation.paid_amount && quotation.paid_amount > 0) && (
                  <div className="flex justify-between text-emerald-600 font-semibold text-xs pt-1">
                    <span>
                      Amount Paid
                      {quotation.advance_percentage ? ` (${quotation.advance_percentage}% Advance)` : ''}
                    </span>
                    <span>-{formatCurrency(quotation.paid_amount || 0, currency)}</span>
                  </div>
                )}
                {Boolean(quotation.paid_amount && quotation.balance_amount !== undefined) && (
                  <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 text-xs">
                    <span className="font-bold text-slate-900">Remaining Balance Due</span>
                    <span
                      className={`font-black ${
                        quotation.balance_amount === 0 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {formatCurrency(quotation.balance_amount || 0, currency)}
                    </span>
                  </div>
                )}
                {(quotation.payment_method || quotation.payment_notes) && (
                  <p className="text-[11px] text-slate-500 italic text-right mt-1 font-serif">
                    Mode of Payment: {quotation.payment_method?.replace(/_/g, ' ') || 'Bank Transfer'}{quotation.payment_notes ? ` • Ref/Txn No: ${quotation.payment_notes}` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>

    <PaymentModal
      isOpen={isPaymentModalOpen}
      onClose={() => setIsPaymentModalOpen(false)}
      quotation={{
        ...quotation,
        is_paid: isPaidState,
        paid_at: paidAtState,
        payment_method: paymentMethodState,
        payment_notes: paymentNotesState,
      }}
      onPaymentUpdated={(updated) => {
        setIsPaidState(Boolean(updated.is_paid));
        setPaidAtState(updated.paid_at || null);
        setPaymentMethodState(updated.payment_method || null);
        setPaymentNotesState(updated.payment_notes || null);
      }}
    />
    </>
  );
}
