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

  const currency = data.metrics.currency || 'INR';

  // Sub-reports list for the active category
  const activeSubReports = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.id === category);
    return cat ? cat.subReports : [];
  }, [category]);

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

      {/* 4. KPI Summary Cards (Clickable Drill-downs) */}
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

      {/* 5. Original Visual Charts Grid (Print: hidden) */}
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
                      {/* Tooltip on hover */}
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

      {/* 6. Country-Aware Tax & Compliance Section */}
      {data.taxSummary.isIndiaGst ? (
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>India Goods & Services Tax (GST) Statement</span>
              </h3>
              <p className="text-xs text-slate-400">
                Summary of Intra-State (CGST + SGST) and Inter-State (IGST) taxable commercial sales
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
              GSTIN: {data.organization.taxNumber || 'Not Configured'}
            </span>
          </div>

          {/* India GST KPI boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Taxable Turnover</span>
              <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(data.taxSummary.taxableSales, currency)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-indigo-500 uppercase">CGST Total</span>
              <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {formatCurrency(data.taxSummary.cgstTotal || 0, currency)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-blue-500 uppercase">SGST Total</span>
              <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {formatCurrency(data.taxSummary.sgstTotal || 0, currency)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-purple-500 uppercase">IGST Total</span>
              <p className="text-base font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {formatCurrency(data.taxSummary.igstTotal || 0, currency)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-emerald-500 uppercase">Total GST Output</span>
              <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(data.taxSummary.totalTaxCollected, currency)}
              </p>
            </div>
          </div>

          {/* HSN / SAC Summary Table if rows exist */}
          {data.taxSummary.hsnSummary && data.taxSummary.hsnSummary.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">HSN / SAC Code Breakdown</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="p-2">HSN/SAC Code</th>
                      <th className="p-2">Type</th>
                      <th className="p-2 text-right">Taxable Value</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">CGST</th>
                      <th className="p-2 text-right">SGST</th>
                      <th className="p-2 text-right">IGST</th>
                      <th className="p-2 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.taxSummary.hsnSummary.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="p-2 font-mono font-bold">{h.code}</td>
                        <td className="p-2">{h.itemType}</td>
                        <td className="p-2 text-right">{formatCurrency(h.taxableAmount, currency)}</td>
                        <td className="p-2 text-right">{h.taxRate}%</td>
                        <td className="p-2 text-right">{formatCurrency(h.cgstAmount, currency)}</td>
                        <td className="p-2 text-right">{formatCurrency(h.sgstAmount, currency)}</td>
                        <td className="p-2 text-right">{formatCurrency(h.igstAmount, currency)}</td>
                        <td className="p-2 text-right font-bold text-emerald-600">{formatCurrency(h.totalTax, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : data.taxSummary.isUaeVat ? (
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">GCC VAT Statement</h3>
              <p className="text-xs text-slate-400">Standard 5% VAT supplies and reverse charges</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
              TRN: {data.organization.taxNumber || 'Not Configured'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Taxable Supplies (AED)</span>
              <p className="text-base font-black text-slate-900 dark:text-white">
                {formatCurrency(data.taxSummary.taxableSales, currency)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850">
              <span className="text-[10px] font-bold text-emerald-500 uppercase">Output VAT 5%</span>
              <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(data.taxSummary.totalTaxCollected, currency)}
              </p>
            </div>
          </div>
        </div>
      ) : null}

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
                      {formatCurrency(row.grandTotal, currency)}
                    </td>
                    {visibleColumns.tax && (
                      <td className="p-3 text-right text-slate-500 whitespace-nowrap">
                        {formatCurrency(row.taxAmount, currency)}
                      </td>
                    )}
                    <td className="p-3 text-right font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatCurrency(row.paidAmount, currency)}
                    </td>
                    <td
                      className={`p-3 text-right font-bold whitespace-nowrap ${
                        row.balanceAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {formatCurrency(row.balanceAmount, currency)}
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
            {/* Table Totals Row */}
            <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
              <tr>
                <td className="p-3" colSpan={4}>
                  TOTALS ({data.rows.length} records)
                </td>
                <td className="p-3 text-right font-black">
                  {formatCurrency(data.rows.reduce((s, r) => s + r.grandTotal, 0), currency)}
                </td>
                {visibleColumns.tax && (
                  <td className="p-3 text-right font-bold text-slate-600 dark:text-slate-400">
                    {formatCurrency(data.rows.reduce((s, r) => s + r.taxAmount, 0), currency)}
                  </td>
                )}
                <td className="p-3 text-right font-black text-emerald-600">
                  {formatCurrency(data.rows.reduce((s, r) => s + r.paidAmount, 0), currency)}
                </td>
                <td className="p-3 text-right font-black text-amber-600">
                  {formatCurrency(data.rows.reduce((s, r) => s + r.balanceAmount, 0), currency)}
                </td>
                <td className="p-3 print:hidden"></td>
              </tr>
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
