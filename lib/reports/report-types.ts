import { CurrencyCode, TaxSystem, InvoiceStatus, QuotationStatus, PaymentMethod } from '@/types/database';

export type ReportCategory =
  | 'sales'
  | 'quotes'
  | 'invoices'
  | 'payments'
  | 'customers'
  | 'products'
  | 'tax';

export type ReportType =
  // Sales
  | 'sales-summary'
  | 'sales-by-customer'
  | 'sales-by-product'
  | 'sales-by-staff'
  | 'sales-by-date'
  | 'quote-sales'
  | 'invoice-sales'
  // Quotes
  | 'quote-summary'
  | 'quotes-by-status'
  | 'draft-quotes'
  | 'sent-quotes'
  | 'viewed-quotes'
  | 'approved-quotes'
  | 'rejected-quotes'
  | 'expired-quotes'
  | 'quote-conversion'
  // Invoices
  | 'invoice-summary'
  | 'paid-invoices'
  | 'unpaid-invoices'
  | 'partially-paid'
  | 'overdue-invoices'
  | 'invoice-aging'
  | 'revenue-by-customer'
  | 'revenue-by-product'
  // Payments
  | 'payment-summary'
  | 'payments-by-method'
  | 'payments-by-customer'
  | 'payments-by-date'
  | 'outstanding-payments'
  | 'collection-summary'
  // Customers
  | 'customer-summary'
  | 'new-customers'
  | 'active-customers'
  | 'customer-revenue'
  | 'customer-outstanding'
  | 'customer-quote-activity'
  | 'customer-invoice-activity'
  // Products
  | 'product-sales'
  | 'quantity-sold'
  | 'revenue-by-item'
  | 'tax-by-item'
  | 'discount-analysis'
  // Tax
  | 'tax-summary'
  | 'india-gst-summary'
  | 'india-cgst'
  | 'india-sgst'
  | 'india-igst'
  | 'india-hsn-sac'
  | 'gcc-vat-summary'
  | 'taxable-sales';

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'custom';

export interface ReportFilterState {
  category: ReportCategory;
  reportType: ReportType;
  preset: DateRangePreset;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  productId?: string;
  staffId?: string;
  status?: string;
  paymentStatus?: 'ALL' | 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  paymentMethod?: string;
  search?: string;
  environment?: 'live' | 'test';
}

export interface ReportMetricSummary {
  totalSales: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  totalTax: number;
  totalDiscount: number;
  quoteCount: number;
  invoiceCount: number;
  conversionRate: number;
  currency: CurrencyCode;
}

export interface AgingSummary {
  current: number;       // not yet due
  days1_30: number;      // 1-30 days overdue
  days31_60: number;     // 31-60 days overdue
  days61_90: number;     // 61-90 days overdue
  days90Plus: number;    // 90+ days overdue
  totalOverdue: number;
}

export interface TaxBreakdownSummary {
  taxSystem: TaxSystem | string;
  taxLabel: string;
  isIndiaGst: boolean;
  isUaeVat: boolean;
  taxableSales: number;
  totalTaxCollected: number;
  // India GST
  cgstTotal?: number;
  sgstTotal?: number;
  igstTotal?: number;
  // HSN/SAC summary rows
  hsnSummary?: Array<{
    code: string;
    description: string;
    itemType: 'GOODS' | 'SERVICE';
    taxableAmount: number;
    taxRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalTax: number;
    totalAmount: number;
  }>;
  // GCC VAT
  vatStandardTotal?: number; // 5%
  vatZeroTotal?: number;     // 0%
  vatExemptTotal?: number;
}

export interface ChartDataPoint {
  label: string;
  sales: number;
  invoiced: number;
  paid: number;
  count: number;
}

export interface PaymentMethodDataPoint {
  method: string;
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface ReportRow {
  id: string;
  date: string;
  documentNumber: string;
  documentType: 'QUOTE' | 'INVOICE';
  linkHref: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  customerTaxNumber?: string;
  status: string;
  statusVariant: 'success' | 'warning' | 'error' | 'neutral' | 'info';
  paymentStatus: string;
  paymentMethod?: string;
  currency: CurrencyCode;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate?: string;
  agingDays?: number;
  agingBracket?: 'CURRENT' | '1-30' | '31-60' | '61-90' | '90+';
  itemsSummary: string;
  staffName?: string;
  // Tax breakdown
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  vatAmount?: number;
  hsnCodes?: string[];
}

export interface ReportResponseData {
  category: ReportCategory;
  reportType: ReportType;
  dateRangeLabel: string;
  startDate: string;
  endDate: string;
  metrics: ReportMetricSummary;
  aging: AgingSummary;
  taxSummary: TaxBreakdownSummary;
  trendChart: ChartDataPoint[];
  paymentMethodChart: PaymentMethodDataPoint[];
  rows: ReportRow[];
  totalRows: number;
  organization: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxNumber?: string;
    currency: CurrencyCode;
    country?: string;
    taxSystem?: TaxSystem | string;
    taxLabel?: string;
    logoUrl?: string | null;
  };
  filterOptions: {
    customers: Array<{ id: string; name: string; company?: string }>;
    products: Array<{ id: string; name: string }>;
    paymentMethods: Array<{ id: string; label: string }>;
    statuses: Array<{ id: string; label: string }>;
  };
  userRole: string;
  environment: 'live' | 'test';
}
