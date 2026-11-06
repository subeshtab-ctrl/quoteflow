'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  FileText,
  CreditCard,
  Users,
  Package,
  Building,
  Calendar,
  Filter,
  Download,
  Printer,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Eye,
  Percent,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/quotations/calculations';
import {
  ReportCategory,
  ReportType,
  DateRangePreset,
  ReportFilterState,
  ReportResponseData,
  ReportRow,
} from '@/lib/reports/report-types';
import { exportGstr1Excel, exportGstr1Json } from '@/lib/reports/gstr1-export-builder';

interface ReportCenterViewProps {
  initialData: ReportResponseData;
}

const CATEGORIES: Array<{
  id: ReportCategory;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subReports: Array<{ id: ReportType; label: string }>;
}> = [
  {
    id: 'sales',
    name: 'Sales',
    icon: TrendingUp,
    color: 'text-indigo-600',
    subReports: [
      { id: 'sales-summary', label: 'Sales Summary' },
      { id: 'sales-by-customer', label: 'Sales by Customer' },
      { id: 'sales-by-product', label: 'Sales by Product' },
      { id: 'quote-sales', label: 'Quote Sales' },
      { id: 'invoice-sales', label: 'Invoice Sales' },
    ],
  },
  {
    id: 'quotes',
    name: 'Quotes',
    icon: FileText,
    color: 'text-blue-600',
    subReports: [
      { id: 'quote-summary', label: 'Quote Summary' },
      { id: 'approved-quotes', label: 'Approved Quotes' },
      { id: 'sent-quotes', label: 'Sent / In Progress' },
      { id: 'draft-quotes', label: 'Draft Quotes' },
      { id: 'rejected-quotes', label: 'Rejected Quotes' },
      { id: 'expired-quotes', label: 'Expired Quotes' },
    ],
  },
  {
    id: 'invoices',
    name: 'Invoices',
    icon: Receipt,
    color: 'text-emerald-600',
    subReports: [
      { id: 'invoice-summary', label: 'Invoice Summary' },
      { id: 'paid-invoices', label: 'Paid Invoices' },
      { id: 'unpaid-invoices', label: 'Unpaid Invoices' },
      { id: 'partially-paid', label: 'Partially Paid' },
      { id: 'overdue-invoices', label: 'Overdue Invoices' },
      { id: 'invoice-aging', label: 'Invoice Aging' },
    ],
  },
  {
    id: 'payments',
    name: 'Payments',
    icon: CreditCard,
    color: 'text-purple-600',
    subReports: [
      { id: 'payment-summary', label: 'Payment Summary' },
      { id: 'payments-by-method', label: 'By Payment Method' },
      { id: 'outstanding-payments', label: 'Outstanding Payments' },
    ],
  },
  {
    id: 'customers',
    name: 'Customers',
    icon: Users,
    color: 'text-amber-600',
    subReports: [
      { id: 'customer-summary', label: 'Customer Summary' },
      { id: 'customer-revenue', label: 'Revenue by Customer' },
      { id: 'customer-outstanding', label: 'Outstanding Balance' },
    ],
  },
  {
    id: 'products',
    name: 'Products & Services',
    icon: Package,
    color: 'text-teal-600',
    subReports: [
      { id: 'product-sales', label: 'Product Sales' },
      { id: 'quantity-sold', label: 'Quantity Sold' },
      { id: 'revenue-by-item', label: 'Revenue by Item' },
    ],
  },
  {
    id: 'tax',
    name: 'Tax & Compliance',
    icon: Building,
    color: 'text-rose-600',
    subReports: [
      { id: 'tax-summary', label: 'Tax Summary' },
      { id: 'india-gst-summary', label: 'India GST Summary' },
      { id: 'india-hsn-sac', label: 'HSN / SAC Summary' },
      { id: 'gcc-vat-summary', label: 'GCC VAT Statement' },
    ],
  },
];

const PRESETS: Array<{ id: DateRangePreset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'last_week', label: 'Last Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_quarter', label: 'This Quarter' },
  { id: 'last_quarter', label: 'Last Quarter' },
  { id: 'this_year', label: 'This Year' },
  { id: 'last_year', label: 'Last Year' },
  { id: 'custom', label: 'Custom Date Range' },
];

export function ReportCenterView({ initialData }: ReportCenterViewProps) {
  const [data, setData] = useState<ReportResponseData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters state
  const [category, setCategory] = useState<ReportCategory>(initialData.category || 'sales');
  const [reportType, setReportType] = useState<ReportType>(initialData.reportType || 'sales-summary');
  const [preset, setPreset] = useState<DateRangePreset>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('ALL');
  const [paymentMethod, setPaymentMethod] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Table State
  const [sortField, setSortField] = useState<keyof ReportRow>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState({
    tax: true,
    discount: false,
    dueDate: true,
    paymentMethod: true,
  });

  // Drill-down filter badge (e.g. clicked "Outstanding" or "Overdue")
  const [activeDrillDown, setActiveDrillDown] = useState<string | null>(null);

  // Active statutory table inside India GSTR-1 view: 'b2b' (Table 4) | 'b2cs' (Table 7) | 'hsn' (Table 12) | 'docs' (Table 13)
  const [activeGstrTable, setActiveGstrTable] = useState<'b2b' | 'b2cs' | 'hsn' | 'docs'>('b2b');

  const currency = data.metrics.currency || 'INR';

  // Computed GSTR-1 Statutory Data Breakdown
  const gstrData = useMemo(() => {
    const invoiceRows = data.rows.filter(
      (r) => r.documentType === 'INVOICE' && r.status !== 'CANCELLED' && r.status !== 'VOIDED'
    );

    const b2b = invoiceRows.filter(
      (r) => Boolean(r.customerTaxNumber && r.customerTaxNumber.trim().length >= 10)
    );

    const b2cs = invoiceRows.filter(
      (r) => !r.customerTaxNumber || r.customerTaxNumber.trim().length < 10
    );

    const docNumbers = invoiceRows.map((r) => r.documentNumber).filter(Boolean);
    const minDoc = docNumbers.length > 0 ? docNumbers[docNumbers.length - 1] : 'INV-0001';
    const maxDoc = docNumbers.length > 0 ? docNumbers[0] : 'INV-0001';
    const cancelledCount = data.rows.filter(
      (r) => r.documentType === 'INVOICE' && (r.status === 'CANCELLED' || r.status === 'VOIDED')
    ).length;

    const b2bTaxable = b2b.reduce((s, r) => s + (r.subtotal || 0), 0);
    const b2bTax = b2b.reduce((s, r) => s + (r.taxAmount || 0), 0);
    const b2bTotal = b2b.reduce((s, r) => s + (r.grandTotal || 0), 0);

    const b2csTaxable = b2cs.reduce((s, r) => s + (r.subtotal || 0), 0);
    const b2csTax = b2cs.reduce((s, r) => s + (r.taxAmount || 0), 0);
    const b2csTotal = b2cs.reduce((s, r) => s + (r.grandTotal || 0), 0);

    return {
      invoiceRows,
      b2b,
      b2cs,
      minDoc,
      maxDoc,
      totalIssued: invoiceRows.length + cancelledCount,
      cancelledCount,
      netIssued: invoiceRows.length,
      b2bTaxable,
      b2bTax,
      b2bTotal,
      b2csTaxable,
      b2csTax,
      b2csTotal,
    };
  }, [data.rows]);

  // Computed UAE VAT Form 201 Emirate Breakdown (Box 1a - 1g)
  const uaeEmirateBreakdown = useMemo(() => {
    if (!data.taxSummary.isUaeVat) return [];
    const emirateMap: Record<string, { taxable: number; vat: number; count: number; box: string }> = {
      'Abu Dhabi': { taxable: 0, vat: 0, count: 0, box: '1a' },
      'Dubai': { taxable: 0, vat: 0, count: 0, box: '1b' },
      'Sharjah': { taxable: 0, vat: 0, count: 0, box: '1c' },
      'Ajman': { taxable: 0, vat: 0, count: 0, box: '1d' },
      'Umm Al Quwain': { taxable: 0, vat: 0, count: 0, box: '1e' },
      'Ras Al Khaimah': { taxable: 0, vat: 0, count: 0, box: '1f' },
      'Fujairah': { taxable: 0, vat: 0, count: 0, box: '1g' },
    };

    const invoiceRows = data.rows.filter(
      (r) => r.documentType === 'INVOICE' && r.status !== 'CANCELLED' && r.status !== 'VOIDED'
    );

    invoiceRows.forEach((r) => {
      const match = Object.keys(emirateMap).find((em) =>
        (r as any).placeOfSupply?.toLowerCase()?.includes(em.toLowerCase())
      ) || 'Dubai';

      emirateMap[match].taxable += r.subtotal || 0;
      emirateMap[match].vat += r.taxAmount || 0;
      emirateMap[match].count += 1;
    });

    return Object.entries(emirateMap).map(([emirate, vals]) => ({
      emirate,
      ...vals,
    }));
  }, [data.rows, data.taxSummary.isUaeVat]);

  // Sub-reports list for the active category (strictly isolated per country profile)
  const activeSubReports = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.id === category);
    if (!cat) return [];
    if (category === 'tax') {
      if (data.taxSummary.isIndiaGst) {
        return [
          { id: 'tax-summary' as ReportType, label: 'Tax Summary' },
          { id: 'india-gst-summary' as ReportType, label: 'India GST Summary' },
          { id: 'india-hsn-sac' as ReportType, label: 'HSN / SAC Summary' },
        ];
      } else if (data.taxSummary.isUaeVat) {
        return [
          { id: 'tax-summary' as ReportType, label: 'Tax Summary' },
          { id: 'gcc-vat-summary' as ReportType, label: 'GCC VAT Statement' },
        ];
      } else {
        return [
          { id: 'tax-summary' as ReportType, label: 'Tax Summary' },
          { id: 'taxable-sales' as ReportType, label: 'Taxable Sales' },
        ];
      }
    }
    return cat.subReports;
  }, [category, data.taxSummary.isIndiaGst, data.taxSummary.isUaeVat]);

  // Fetch report data on filter change
  const fetchReport = async (overrideParams?: Partial<ReportFilterState>) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const q = new URLSearchParams();
      q.set('category', overrideParams?.category || category);
      q.set('reportType', overrideParams?.reportType || reportType);
      q.set('preset', overrideParams?.preset || preset);

      if (overrideParams?.startDate || startDate) q.set('startDate', overrideParams?.startDate || startDate);
      if (overrideParams?.endDate || endDate) q.set('endDate', overrideParams?.endDate || endDate);
      if (overrideParams?.customerId || customerId) q.set('customerId', overrideParams?.customerId || customerId);
      if (overrideParams?.productId || productId) q.set('productId', overrideParams?.productId || productId);
      if (overrideParams?.status || status) q.set('status', overrideParams?.status || status);
      if (overrideParams?.paymentStatus || paymentStatus) q.set('paymentStatus', overrideParams?.paymentStatus || paymentStatus);
      if (overrideParams?.paymentMethod || paymentMethod) q.set('paymentMethod', overrideParams?.paymentMethod || paymentMethod);
      if (overrideParams?.search || search) q.set('search', overrideParams?.search || search);

      const res = await fetch(`/api/reports?${q.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch report');
      }
      setData(json.data);
      setPage(1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (newCat: ReportCategory) => {
    setCategory(newCat);
    const catObj = CATEGORIES.find((c) => c.id === newCat);
    const defaultSub = catObj?.subReports[0]?.id || 'sales-summary';
    setReportType(defaultSub);
    setActiveDrillDown(null);
    setStatus('');
    setPaymentStatus('ALL');
    fetchReport({ category: newCat, reportType: defaultSub, status: undefined, paymentStatus: 'ALL' });
  };

  const handleSubReportChange = (sub: ReportType) => {
    setReportType(sub);
    setActiveDrillDown(null);
    if (sub === 'india-hsn-sac') {
      setActiveGstrTable('hsn');
    } else if (sub === 'india-gst-summary') {
      setActiveGstrTable('b2b');
    }
    fetchReport({ reportType: sub });
  };

  const handlePresetChange = (newPreset: DateRangePreset) => {
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      fetchReport({ preset: newPreset, startDate: undefined, endDate: undefined });
    }
  };

  // Drill-down handlers
  const handleDrillDownOutstanding = () => {
    setActiveDrillDown('Outstanding Invoices');
    setCategory('invoices');
    setReportType('unpaid-invoices');
    setPaymentStatus('UNPAID');
    fetchReport({ category: 'invoices', reportType: 'unpaid-invoices', paymentStatus: 'UNPAID' });
  };

  const handleDrillDownOverdue = () => {
    setActiveDrillDown('Overdue Invoices');
    setCategory('invoices');
    setReportType('overdue-invoices');
    setStatus('OVERDUE');
    fetchReport({ category: 'invoices', reportType: 'overdue-invoices', status: 'OVERDUE' });
  };

  const handleClearDrillDown = () => {
    setActiveDrillDown(null);
    setStatus('');
    setPaymentStatus('ALL');
    fetchReport({ status: undefined, paymentStatus: 'ALL' });
  };

  const handleResetFilters = () => {
    setPreset('this_month');
    setStartDate('');
    setEndDate('');
    setCustomerId('');
    setProductId('');
    setStatus('');
    setPaymentStatus('ALL');
    setPaymentMethod('ALL');
    setSearch('');
    setActiveDrillDown(null);
    fetchReport({
      preset: 'this_month',
      startDate: undefined,
      endDate: undefined,
      customerId: undefined,
      productId: undefined,
      status: undefined,
      paymentStatus: 'ALL',
      paymentMethod: 'ALL',
      search: undefined,
    });
  };

  // Export handlers
  const handleExportPdf = () => {
    const q = new URLSearchParams();
    q.set('category', category);
    q.set('reportType', reportType);
    q.set('preset', preset);
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    if (customerId) q.set('customerId', customerId);
    if (status) q.set('status', status);
    if (paymentStatus) q.set('paymentStatus', paymentStatus);
    if (paymentMethod) q.set('paymentMethod', paymentMethod);
    if (search) q.set('search', search);
    q.set('format', 'pdf');

    window.open(`/api/reports?${q.toString()}`, '_blank');
  };

  const handleExportCsv = () => {
    const q = new URLSearchParams();
    q.set('category', category);
    q.set('reportType', reportType);
    q.set('preset', preset);
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    if (customerId) q.set('customerId', customerId);
    if (status) q.set('status', status);
    if (paymentStatus) q.set('paymentStatus', paymentStatus);
    if (paymentMethod) q.set('paymentMethod', paymentMethod);
    if (search) q.set('search', search);
    q.set('format', 'csv');

    window.open(`/api/reports?${q.toString()}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  // Table Sorting & Pagination
  const sortedRows = useMemo(() => {
    const list = [...data.rows];
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        const res = (aVal as string).localeCompare(bVal as string);
        return sortOrder === 'asc' ? res : -res;
      }
      if (typeof aVal === 'number') {
        const res = (aVal as number) - (bVal as number);
        return sortOrder === 'asc' ? res : -res;
      }
      return 0;
    });
    return list;
  }, [data.rows, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const handleSort = (field: keyof ReportRow) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Toolbar (Hidden in Print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Reports & Financial Statements
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Live Accounting
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time commercial analytics, invoice aging, country-aware tax returns, and customer velocity statements.
          </p>
        </div>

        {/* Global Export & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchReport()}
            disabled={isLoading}
            className="gap-1.5 text-xs text-slate-700 dark:text-slate-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span>Print</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleExportPdf}
            className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export PDF</span>
          </Button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block pb-4 mb-4 border-b border-slate-300 text-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight">{data.organization.name}</h1>
            <p className="text-xs text-slate-600">{data.organization.address}</p>
            {data.organization.taxNumber && (
              <p className="text-xs text-slate-600">
                {data.organization.taxLabel || 'Tax ID'}: {data.organization.taxNumber}
              </p>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-base font-bold uppercase text-indigo-700">
              {data.category.toUpperCase()} REPORT
            </h2>
            <p className="text-xs text-slate-500">Period: {data.dateRangeLabel}</p>
            <p className="text-[10px] text-slate-400">Generated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Error Message Alert */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-800 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Category Navigation Tabs (Print: hidden) */}
      <div className="space-y-3 print:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-slate-800 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400 dark:text-indigo-600' : cat.color}`} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-Reports Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {activeSubReports.map((sub) => {
            const isSubActive = reportType === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => handleSubReportChange(sub.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  isSubActive
                    ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                    : 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {sub.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Interactive Filter Bar (Print: hidden) */}
      <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Preset Selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value as DateRangePreset)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Range if preset is custom */}
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fetchReport({ preset: 'custom', startDate, endDate })}
                className="text-xs h-7 px-2"
              >
                Apply
              </Button>
            </div>
          )}

          {/* Customer Filter */}
          <select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              fetchReport({ customerId: e.target.value || undefined });
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden"
          >
            <option value="">All Customers</option>
            {data.filterOptions.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company ? `(${c.company})` : ''}
              </option>
            ))}
          </select>

          {/* Payment Status Filter */}
          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              fetchReport({ paymentStatus: e.target.value as any });
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden"
          >
            <option value="ALL">Payment: All</option>
            <option value="PAID">Paid Only</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="UNPAID">Unpaid Only</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              fetchReport({ paymentMethod: e.target.value });
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden"
          >
            <option value="ALL">Method: All</option>
            {data.filterOptions.paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.label}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search document #, customer, notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                fetchReport({ search: e.target.value || undefined });
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Reset Filters */}
          {(customerId || paymentStatus !== 'ALL' || paymentMethod !== 'ALL' || search || preset !== 'this_month') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Drill-down Active Banner */}
        {activeDrillDown && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
            <span className="font-semibold">
              🔍 Filtered by: <span className="underline">{activeDrillDown}</span>
            </span>
            <button
              type="button"
              onClick={handleClearDrillDown}
              className="font-bold underline hover:text-amber-950 dark:hover:text-white"
            >
              Show All Records
            </button>
          </div>
        )}
      </div>

      {/* 4 & 5: Commercial Analytics & Cash Flow (Hidden when in Tax & Compliance mode) */}
      {category !== 'tax' && (
        <>
          {/* KPI Summary Cards (Clickable Drill-downs) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Total Sales */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Sales</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate">
                {formatCurrency(data.metrics.totalSales, currency)}
              </p>
              <p className="text-[11px] text-slate-400 truncate">Quotes + Invoiced volume</p>
            </div>

            {/* Total Invoiced */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-1">
              <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">Total Invoiced</p>
              <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 truncate">
                {formatCurrency(data.metrics.totalInvoiced, currency)}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{data.metrics.invoiceCount} official invoices</p>
            </div>

            {/* Collected / Paid */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-1">
              <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Collected (Paid)</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                {formatCurrency(data.metrics.totalPaid, currency)}
              </p>
              <p className="text-[11px] text-slate-400 truncate">Realized revenue</p>
            </div>

            {/* Outstanding Balance (Click to drill down) */}
            <button
              type="button"
              onClick={handleDrillDownOutstanding}
              className="text-left rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-4 shadow-xs hover:border-amber-400 transition-colors group space-y-1"
            >
              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between">
                <span>Outstanding</span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
              </p>
              <p className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-300 truncate">
                {formatCurrency(data.metrics.totalOutstanding, currency)}
              </p>
              <p className="text-[11px] text-amber-600/80 truncate">Pending remittance (Click)</p>
            </button>

            {/* Overdue (Click to drill down) */}
            <button
              type="button"
              onClick={handleDrillDownOverdue}
              className="text-left rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 p-4 shadow-xs hover:border-rose-400 transition-colors group space-y-1"
            >
              <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center justify-between">
                <span>Overdue</span>
                <ChevronRight className="w-3.5 h-3.5 text-rose-500 group-hover:translate-x-0.5 transition-transform" />
              </p>
              <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 truncate">
                {formatCurrency(data.metrics.totalOverdue, currency)}
              </p>
              <p className="text-[11px] text-rose-500/80 truncate">Past payment due date (Click)</p>
            </button>
          </div>

          {/* Multi-Currency Breakdown (when transactions span multiple currencies) */}
          {data.currencyBreakdown && data.currencyBreakdown.length > 1 && (
            <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Multi-Currency Financial Breakdown (Grouped by Currency)
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Currencies are grouped separately without cross-currency summation
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.currencyBreakdown.map((cb) => (
                  <div
                    key={cb.currency}
                    className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      <span className="text-xs font-black text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {cb.currency}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {cb.invoiceCount} inv • {cb.quoteCount} quotes
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Invoiced:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(cb.totalInvoiced, cb.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Received:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(cb.totalPaid, cb.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Pending:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(cb.totalOutstanding, cb.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visual Charts Grid (Print: hidden) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:hidden">
            {/* Sales / Invoicing Timeline Trend */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    <span>Invoicing & Revenue Velocity</span>
                  </h3>
                  <p className="text-xs text-slate-400">Total invoiced vs collected revenue over period</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Invoiced
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Collected
                  </span>
                </div>
              </div>

              {/* CSS/SVG Bar Chart */}
              {data.trendChart.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                  No trend data available for selected period.
                </div>
              ) : (
                <div className="h-44 flex items-end gap-3 pt-6 px-2">
                  {data.trendChart.map((pt, idx) => {
                    const maxVal = Math.max(
                      ...data.trendChart.map((p) => Math.max(p.invoiced, p.paid)),
                      1
                    );
                    const invoicedHeight = Math.max(8, Math.round((pt.invoiced / maxVal) * 100));
                    const paidHeight = Math.max(6, Math.round((pt.paid / maxVal) * 100));

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <div className="w-full flex items-end justify-center gap-1 h-32 relative">
                          <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] rounded px-2 py-1 pointer-events-none whitespace-nowrap z-20 shadow-md">
                            Invoiced: {formatCurrency(pt.invoiced, currency)} | Paid: {formatCurrency(pt.paid, currency)}
                          </div>

                          <div
                            style={{ height: `${invoicedHeight}%` }}
                            className="w-1/2 max-w-[16px] rounded-t-sm bg-indigo-500 hover:bg-indigo-600 transition-all"
                          />
                          <div
                            style={{ height: `${paidHeight}%` }}
                            className="w-1/2 max-w-[16px] rounded-t-sm bg-emerald-500 hover:bg-emerald-600 transition-all"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 truncate max-w-full font-medium">
                          {pt.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Invoice Aging & Collection Efficiency */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span>Invoice Aging Analysis</span>
                </h3>
                <p className="text-xs text-slate-400">Aging brackets for outstanding invoices</p>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-300">Current (Not Due)</span>
                    <span className="text-slate-900 dark:text-slate-100">{formatCurrency(data.aging.current, currency)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${data.metrics.totalOutstanding > 0 ? (data.aging.current / data.metrics.totalOutstanding) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-amber-600 dark:text-amber-400">1 - 30 Days Overdue</span>
                    <span className="text-slate-900 dark:text-slate-100">{formatCurrency(data.aging.days1_30, currency)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${data.metrics.totalOutstanding > 0 ? (data.aging.days1_30 / data.metrics.totalOutstanding) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-orange-600 dark:text-orange-400">31 - 60 Days Overdue</span>
                    <span className="text-slate-900 dark:text-slate-100">{formatCurrency(data.aging.days31_60, currency)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: `${data.metrics.totalOutstanding > 0 ? (data.aging.days31_60 / data.metrics.totalOutstanding) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-rose-600 dark:text-rose-400">60+ Days Overdue</span>
                    <span className="text-slate-900 dark:text-slate-100">{formatCurrency(data.aging.days61_90 + data.aging.days90Plus, currency)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${data.metrics.totalOutstanding > 0 ? ((data.aging.days61_90 + data.aging.days90Plus) / data.metrics.totalOutstanding) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Quote-to-Invoice Conversion:</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400">{data.metrics.conversionRate}%</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 6. Country-Aware Tax & Compliance Section (Promoted when in Tax mode) */}
      {category === 'tax' && (
        <>
          {data.taxSummary.isIndiaGst ? (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-5">
              {/* Statutory Return Header Banner */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-2xs">
                      India GST Return
                    </span>
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      <span>GSTR-1 Outward Supplies Statement</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                    Official return breakdown for <strong>{data.dateRangeLabel}</strong>. Categorized according to India GST Council rules for Table 4 (B2B), Table 7 (B2CS), Table 12 (HSN/SAC), and Table 13 (Document Series).
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="text-slate-400 font-medium">Your GSTIN: </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {data.organization.taxNumber || 'Not Configured'}
                    </span>
                  </div>

                  {/* 1-Click Exports */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await exportGstr1Excel(data);
                      } catch (e: any) {
                        alert(e.message || 'Error exporting GSTR-1 Excel');
                      }
                    }}
                    className="gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-700 shadow-2xs h-8.5"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                    <span>Export GSTR-1 Excel (.xlsx)</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      try {
                        exportGstr1Json(data);
                      } catch (e: any) {
                        alert(e.message || 'Error exporting GSTR-1 JSON');
                      }
                    }}
                    className="gap-1.5 text-xs font-bold text-indigo-800 bg-indigo-100/90 hover:bg-indigo-200 border-indigo-300 dark:bg-indigo-900/60 dark:text-indigo-200 dark:border-indigo-700 shadow-2xs h-8.5"
                  >
                    <Download className="h-4 w-4 text-indigo-700 dark:text-indigo-300" />
                    <span>Portal JSON (.json)</span>
                  </Button>
                </div>
              </div>

              {/* 5 Statutory GST Return Figures */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taxable Turnover</span>
                  <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 truncate">
                    {formatCurrency(data.taxSummary.taxableSales, currency)}
                  </p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">Assessable value</p>
                </div>
                <div className="p-3.5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">CGST Total</span>
                  <p className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1 truncate">
                    {formatCurrency(data.taxSummary.cgstTotal || 0, currency)}
                  </p>
                  <p className="text-[10.5px] text-indigo-500/80 mt-0.5">Central GST</p>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">SGST Total</span>
                  <p className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 mt-1 truncate">
                    {formatCurrency(data.taxSummary.sgstTotal || 0, currency)}
                  </p>
                  <p className="text-[10.5px] text-blue-500/80 mt-0.5">State / UT GST</p>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">IGST Total</span>
                  <p className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 mt-1 truncate">
                    {formatCurrency(data.taxSummary.igstTotal || 0, currency)}
                  </p>
                  <p className="text-[10.5px] text-purple-500/80 mt-0.5">Integrated (Inter-state)</p>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Total Output GST</span>
                  <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 mt-1 truncate">
                    {formatCurrency(data.taxSummary.totalTaxCollected, currency)}
                  </p>
                  <p className="text-[10.5px] text-emerald-600/80 mt-0.5">Net tax liability</p>
                </div>
              </div>

              {/* Statutory Tables Navigation Tabs */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setActiveGstrTable('b2b')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        activeGstrTable === 'b2b'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>Table 4: B2B Invoices</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        activeGstrTable === 'b2b' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}>
                        {gstrData.b2b.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveGstrTable('b2cs')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        activeGstrTable === 'b2cs'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>Table 7: B2CS (Consumer)</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        activeGstrTable === 'b2cs' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}>
                        {gstrData.b2cs.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveGstrTable('hsn')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        activeGstrTable === 'hsn'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>Table 12: HSN / SAC Summary</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        activeGstrTable === 'hsn' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}>
                        {data.taxSummary.hsnSummary?.length || 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveGstrTable('docs')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        activeGstrTable === 'docs'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>Table 13: Document Series</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        activeGstrTable === 'docs' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}>
                        {gstrData.totalIssued}
                      </span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    {activeGstrTable === 'b2b' && 'Taxable supplies to registered GSTIN businesses (ITC eligible)'}
                    {activeGstrTable === 'b2cs' && 'Supplies to unregistered / retail consumers'}
                    {activeGstrTable === 'hsn' && 'Goods and services classification code summary'}
                    {activeGstrTable === 'docs' && 'Serial number ranges of tax invoices issued'}
                  </span>
                </div>

                {/* Table Content Switcher */}
                {/* 1. Table 4: B2B Invoices */}
                {activeGstrTable === 'b2b' && (
                  <div className="space-y-2">
                    {gstrData.b2b.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                        <ShieldCheck className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No B2B Invoices Found</p>
                        <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                          Invoices issued to clients with a GSTIN will automatically be categorized under Table 4 for input tax credit (ITC).
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="p-2.5">Recipient GSTIN</th>
                              <th className="p-2.5">Receiver Name</th>
                              <th className="p-2.5">Invoice #</th>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5 text-right">Taxable Value</th>
                              <th className="p-2.5 text-right">Rate</th>
                              <th className="p-2.5 text-right">CGST</th>
                              <th className="p-2.5 text-right">SGST</th>
                              <th className="p-2.5 text-right">IGST</th>
                              <th className="p-2.5 text-right">Invoice Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {gstrData.b2b.map((r) => (
                              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/60">
                                <td className="p-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {r.customerTaxNumber}
                                </td>
                                <td className="p-2.5 font-medium">{r.customerCompany || r.customerName}</td>
                                <td className="p-2.5">
                                  <Link href={r.linkHref} className="font-mono font-bold hover:underline text-slate-900 dark:text-slate-100">
                                    {r.documentNumber}
                                  </Link>
                                </td>
                                <td className="p-2.5 text-slate-500">{r.date}</td>
                                <td className="p-2.5 text-right font-medium">{formatCurrency(r.subtotal, currency)}</td>
                                <td className="p-2.5 text-right">{r.taxRate}%</td>
                                <td className="p-2.5 text-right">{formatCurrency(r.cgstAmount || 0, currency)}</td>
                                <td className="p-2.5 text-right">{formatCurrency(r.sgstAmount || 0, currency)}</td>
                                <td className="p-2.5 text-right">{formatCurrency(r.igstAmount || 0, currency)}</td>
                                <td className="p-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                                  {formatCurrency(r.grandTotal, currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-100/80 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                            <tr>
                              <td colSpan={4} className="p-2.5 text-right uppercase text-[11px] text-slate-500">
                                Table 4 Total ({gstrData.b2b.length} Invoices):
                              </td>
                              <td className="p-2.5 text-right">{formatCurrency(gstrData.b2bTaxable, currency)}</td>
                              <td></td>
                              <td className="p-2.5 text-right">{formatCurrency(gstrData.b2b.reduce((s, r) => s + (r.cgstAmount || 0), 0), currency)}</td>
                              <td className="p-2.5 text-right">{formatCurrency(gstrData.b2b.reduce((s, r) => s + (r.sgstAmount || 0), 0), currency)}</td>
                              <td className="p-2.5 text-right">{formatCurrency(gstrData.b2b.reduce((s, r) => s + (r.igstAmount || 0), 0), currency)}</td>
                              <td className="p-2.5 text-right text-emerald-600">{formatCurrency(gstrData.b2bTotal, currency)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Table 7: B2CS Invoices */}
                {activeGstrTable === 'b2cs' && (
                  <div className="space-y-2">
                    {gstrData.b2cs.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                        <Users className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No B2C Invoices Found</p>
                        <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                          Invoices issued to consumers without a GSTIN appear here as Table 7 B2CS.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="p-2.5">Supply Type</th>
                              <th className="p-2.5">Customer Name</th>
                              <th className="p-2.5">Invoice #</th>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5 text-right">Taxable Value</th>
                              <th className="p-2.5 text-right">Rate</th>
                              <th className="p-2.5 text-right">CGST</th>
                              <th className="p-2.5 text-right">SGST</th>
                              <th className="p-2.5 text-right">IGST</th>
                              <th className="p-2.5 text-right">Invoice Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {gstrData.b2cs.map((r) => (
                              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/60">
                                <td className="p-2.5 font-mono text-[11px] text-slate-500">OE (Other)</td>
                                <td className="p-2.5 font-medium">{r.customerName}</td>
                                <td className="p-2.5">
                                  <Link href={r.linkHref} className="font-mono font-bold hover:underline text-slate-900 dark:text-slate-100">
                                    {r.documentNumber}
                                  </Link>
                                </td>
                                <td className="p-2.5 text-slate-500">{r.date}</td>
                                <td className="p-2.5 text-right font-medium">{formatCurrency(r.subtotal, currency)}</td>
                                <td className="p-2.5 text-right">{r.taxRate}%</td>
                                <td className="p-2.5 text-right">{formatCurrency(r.cgstAmount || 0, currency)}</td>
                                <td className="p-2.5 text-right">{formatCurrency(r.sgstAmount || 0, currency)}</td>
                                <td className="p-2.5 text-right">{formatCurrency(r.igstAmount || 0, currency)}</td>
                                <td className="p-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                                  {formatCurrency(r.grandTotal, currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-100/80 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                            <tr>
                              <td colSpan={4} className="p-2.5 text-right uppercase text-[11px] text-slate-500">
                                Table 7 Total ({gstrData.b2cs.length} Invoices):
                              </td>
                              <td className="p-2.5 text-right">{formatCurrency(gstrData.b2csTaxable, currency)}</td>
                              <td></td>
                              <td className="p-2.5 text-right">{formatCurrency(gstrData.b2cs.reduce((s, r) => s + (r.cgstAmount || 0), 0), currency)}</td>
                              <td className="p-2.5 text-right">{formatCurrency(gstrData.b2cs.reduce((s, r) => s + (r.sgstAmount || 0), 0), currency)}</td>
                              <td className="p-2.5 text-right">{formatCurrency(gstrData.b2cs.reduce((s, r) => s + (r.igstAmount || 0), 0), currency)}</td>
                              <td className="p-2.5 text-right text-emerald-600">{formatCurrency(gstrData.b2csTotal, currency)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Table 12: HSN / SAC Summary */}
                {activeGstrTable === 'hsn' && (
                  <div className="space-y-2">
                    {(!data.taxSummary.hsnSummary || data.taxSummary.hsnSummary.length === 0) ? (
                      <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                        <Package className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No HSN / SAC Code Data</p>
                        <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                          Invoices with HSN or SAC codes will automatically be aggregated into Table 12.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="p-2.5">HSN/SAC Code</th>
                              <th className="p-2.5">Type</th>
                              <th className="p-2.5">Description</th>
                              <th className="p-2.5 text-right">Taxable Value</th>
                              <th className="p-2.5 text-right">Rate</th>
                              <th className="p-2.5 text-right">CGST</th>
                              <th className="p-2.5 text-right">SGST</th>
                              <th className="p-2.5 text-right">IGST</th>
                              <th className="p-2.5 text-right">Total Tax</th>
                              <th className="p-2.5 text-right">Total Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.taxSummary.hsnSummary.map((h, i) => (
                              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-850/60">
                                <td className="p-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{h.code}</td>
                                <td className="p-2.5">{h.itemType}</td>
                                <td className="p-2.5 text-slate-600 dark:text-slate-300">{h.description}</td>
                                <td className="p-2.5 text-right font-medium">{formatCurrency(h.taxableAmount, currency)}</td>
                                <td className="p-2.5 text-right">{h.taxRate}%</td>
                                <td className="p-2.5 text-right">{formatCurrency(h.cgstAmount, currency)}</td>
                                <td className="p-2.5 text-right">{formatCurrency(h.sgstAmount, currency)}</td>
                                <td className="p-2.5 text-right">{formatCurrency(h.igstAmount, currency)}</td>
                                <td className="p-2.5 text-right font-bold text-emerald-600">{formatCurrency(h.totalTax, currency)}</td>
                                <td className="p-2.5 text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrency(h.totalAmount, currency)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-100/80 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                            <tr>
                              <td colSpan={3} className="p-2.5 text-right uppercase text-[11px] text-slate-500">
                                Table 12 Total ({data.taxSummary.hsnSummary.length} Codes):
                              </td>
                              <td className="p-2.5 text-right">{formatCurrency(data.taxSummary.hsnSummary.reduce((s, h) => s + h.taxableAmount, 0), currency)}</td>
                              <td></td>
                              <td className="p-2.5 text-right">{formatCurrency(data.taxSummary.hsnSummary.reduce((s, h) => s + h.cgstAmount, 0), currency)}</td>
                              <td className="p-2.5 text-right">{formatCurrency(data.taxSummary.hsnSummary.reduce((s, h) => s + h.sgstAmount, 0), currency)}</td>
                              <td className="p-2.5 text-right">{formatCurrency(data.taxSummary.hsnSummary.reduce((s, h) => s + h.igstAmount, 0), currency)}</td>
                              <td className="p-2.5 text-right text-emerald-600">{formatCurrency(data.taxSummary.hsnSummary.reduce((s, h) => s + h.totalTax, 0), currency)}</td>
                              <td className="p-2.5 text-right text-slate-900 dark:text-slate-100">{formatCurrency(data.taxSummary.hsnSummary.reduce((s, h) => s + h.totalAmount, 0), currency)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Table 13: Documents Issued */}
                {activeGstrTable === 'docs' && (
                  <div className="space-y-3">
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="p-2.5">Nature of Document</th>
                            <th className="p-2.5">Sr. No. From</th>
                            <th className="p-2.5">Sr. No. To</th>
                            <th className="p-2.5 text-right">Total Number</th>
                            <th className="p-2.5 text-right">Cancelled</th>
                            <th className="p-2.5 text-right">Net Issued</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-850/60 font-medium">
                            <td className="p-2.5">Invoices for outward supply (Tax Invoices)</td>
                            <td className="p-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{gstrData.minDoc}</td>
                            <td className="p-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{gstrData.maxDoc}</td>
                            <td className="p-2.5 text-right font-mono font-bold">{gstrData.totalIssued}</td>
                            <td className="p-2.5 text-right font-mono text-rose-600">{gstrData.cancelledCount}</td>
                            <td className="p-2.5 text-right font-mono font-black text-emerald-600">{gstrData.netIssued}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Mandatory Table 13 document serial series under Section 31 of CGST Act.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : data.taxSummary.isUaeVat ? (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-5">
              {/* UAE FTA Return Header Banner */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-2xs">
                      UAE FTA Return
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      PINT-AE Peppol Ready
                    </span>
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      <span>UAE VAT Return Form 201 & E-Invoicing Statement</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                    Official tax breakdown for <strong>{data.dateRangeLabel}</strong> under UAE Federal Decree-Law No. (8) on VAT and Ministerial Decision No. 244 of 2025 on Electronic Invoicing.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="text-slate-400 font-medium">Your TRN: </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {data.organization.taxNumber || 'Not Configured'}
                    </span>
                  </div>
                </div>
              </div>

              {/* UAE Form 201 KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Standard Rated (5%)</span>
                  <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 truncate">
                    {formatCurrency(data.taxSummary.taxableSales, currency)}
                  </p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">Box 1 Taxable Supplies</p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Output VAT 5%</span>
                  <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                    {formatCurrency(data.taxSummary.totalTaxCollected, currency)}
                  </p>
                  <p className="text-[10.5px] text-emerald-600/80 mt-0.5">Box 1 VAT Output</p>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Zero-Rated & Exempt</span>
                  <p className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1 truncate">
                    {formatCurrency(0, currency)}
                  </p>
                  <p className="text-[10.5px] text-indigo-500/80 mt-0.5">Box 2 & 3 Supplies</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">E-Invoice Schema</span>
                  <p className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
                    PINT-AE XML
                  </p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">Peppol BIS Billing 3.0</p>
                </div>
              </div>

              {/* UAE VAT Form 201: Box 1a - 1g Breakdown by Emirate */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Box 1: Standard Rated Supplies by Emirate (FTA Form 201)
                  </h4>
                  <span className="text-[11px] text-slate-400">Mandatory breakdown for official UAE VAT return</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5">Form 201 Box</th>
                        <th className="p-2.5">Emirate (Place of Supply)</th>
                        <th className="p-2.5 text-center">Invoices</th>
                        <th className="p-2.5 text-right">Taxable Amount</th>
                        <th className="p-2.5 text-right">Output VAT (5%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {uaeEmirateBreakdown.map((row) => (
                        <tr key={row.box} className="hover:bg-slate-50 dark:hover:bg-slate-850/60">
                          <td className="p-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            Box {row.box}
                          </td>
                          <td className="p-2.5 font-medium">{row.emirate}</td>
                          <td className="p-2.5 text-center font-mono text-slate-500">{row.count}</td>
                          <td className="p-2.5 text-right font-medium">{formatCurrency(row.taxable, currency)}</td>
                          <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(row.vat, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100/80 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right uppercase text-[11px] text-slate-500">
                          Total Standard Rated Supplies (Box 1):
                        </td>
                        <td className="p-2.5 text-right">{formatCurrency(data.taxSummary.taxableSales, currency)}</td>
                        <td className="p-2.5 text-right text-emerald-600">
                          {formatCurrency(data.taxSummary.totalTaxCollected, currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* UAE E-Invoicing Peppol Compliance Notice */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/70 to-emerald-50/70 dark:from-indigo-950/20 dark:to-emerald-950/20 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>E-Invoicing System (EIS) Peppol 5-Corner Architecture</span>
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Every UAE invoice in QuoteFlow can be downloaded in <strong>PINT-AE XML</strong> format from the invoice detail page for direct submission to your MoF-Accredited Service Provider (ASP).
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* 7. Detailed Report Table */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span>Detailed Record Entries</span>
              <span className="text-xs font-normal text-slate-400">({data.totalRows} matching records)</span>
            </h3>
          </div>

          {/* Column Toggle dropdown (Print: hidden) */}
          <div className="flex items-center gap-2 print:hidden">
            <span className="text-xs text-slate-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/70 dark:border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="p-3 cursor-pointer hover:text-slate-900" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-3">Doc #</th>
                <th className="p-3 cursor-pointer hover:text-slate-900" onClick={() => handleSort('customerName')}>
                  <div className="flex items-center gap-1">
                    <span>Customer</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort('grandTotal')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                {visibleColumns.tax && <th className="p-3 text-right">Tax</th>}
                <th className="p-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort('paidAmount')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Paid</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort('balanceAmount')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Balance</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-3 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-slate-400">
                    No records match the applied criteria.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                    <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{row.date}</td>
                    <td className="p-3 font-mono font-bold whitespace-nowrap">
                      <Link href={row.linkHref} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        {row.documentNumber}
                      </Link>
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{row.customerName}</p>
                      {row.customerCompany && (
                        <p className="text-[11px] text-slate-400">{row.customerCompany}</p>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.statusVariant === 'success'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : row.statusVariant === 'error'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                            : row.statusVariant === 'info'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatCurrency(row.grandTotal, row.currency || currency)}
                    </td>
                    {visibleColumns.tax && (
                      <td className="p-3 text-right text-slate-500 whitespace-nowrap">
                        {formatCurrency(row.taxAmount, row.currency || currency)}
                      </td>
                    )}
                    <td className="p-3 text-right font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatCurrency(row.paidAmount, row.currency || currency)}
                    </td>
                    <td
                      className={`p-3 text-right font-bold whitespace-nowrap ${
                        row.balanceAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {formatCurrency(row.balanceAmount, row.currency || currency)}
                    </td>
                    <td className="p-3 text-center print:hidden">
                      <Link href={row.linkHref}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Totals Row (Grouped by Currency if multiple currencies exist) */}
            <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
              {(() => {
                const currenciesInRows = Array.from(new Set(data.rows.map((r) => r.currency || currency)));
                if (currenciesInRows.length <= 1) {
                  const rowCurr = currenciesInRows[0] || currency;
                  return (
                    <tr>
                      <td className="p-3" colSpan={4}>
                        TOTALS ({data.rows.length} records)
                      </td>
                      <td className="p-3 text-right font-black">
                        {formatCurrency(data.rows.reduce((s, r) => s + r.grandTotal, 0), rowCurr)}
                      </td>
                      {visibleColumns.tax && (
                        <td className="p-3 text-right font-bold text-slate-600 dark:text-slate-400">
                          {formatCurrency(data.rows.reduce((s, r) => s + r.taxAmount, 0), rowCurr)}
                        </td>
                      )}
                      <td className="p-3 text-right font-black text-emerald-600">
                        {formatCurrency(data.rows.reduce((s, r) => s + r.paidAmount, 0), rowCurr)}
                      </td>
                      <td className="p-3 text-right font-black text-amber-600">
                        {formatCurrency(data.rows.reduce((s, r) => s + r.balanceAmount, 0), rowCurr)}
                      </td>
                      <td className="p-3 print:hidden"></td>
                    </tr>
                  );
                }

                return currenciesInRows.map((currCode) => {
                  const matchingRows = data.rows.filter((r) => (r.currency || currency) === currCode);
                  return (
                    <tr key={currCode} className="border-t border-slate-200/60 dark:border-slate-800">
                      <td className="p-3" colSpan={4}>
                        TOTALS — {currCode} ({matchingRows.length} records)
                      </td>
                      <td className="p-3 text-right font-black">
                        {formatCurrency(matchingRows.reduce((s, r) => s + r.grandTotal, 0), currCode)}
                      </td>
                      {visibleColumns.tax && (
                        <td className="p-3 text-right font-bold text-slate-600 dark:text-slate-400">
                          {formatCurrency(matchingRows.reduce((s, r) => s + r.taxAmount, 0), currCode)}
                        </td>
                      )}
                      <td className="p-3 text-right font-black text-emerald-600">
                        {formatCurrency(matchingRows.reduce((s, r) => s + r.paidAmount, 0), currCode)}
                      </td>
                      <td className="p-3 text-right font-black text-amber-600">
                        {formatCurrency(matchingRows.reduce((s, r) => s + r.balanceAmount, 0), currCode)}
                      </td>
                      <td className="p-3 print:hidden"></td>
                    </tr>
                  );
                });
              })()}
            </tfoot>
          </table>
        </div>

        {/* Pagination Bar (Print: hidden) */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 print:hidden">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-7 px-2 text-xs"
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-7 px-2 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
