import {
  DateRangePreset,
  ReportFilterState,
  ReportResponseData,
  ReportRow,
  ReportMetricSummary,
  AgingSummary,
  TaxBreakdownSummary,
  ChartDataPoint,
  PaymentMethodDataPoint,
} from './report-types';
import { Invoice, Quotation, Customer, Product, Organization, CurrencyCode } from '@/types/database';
import { getCountryProfile } from '@/lib/tax/country-config';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, parseISO, differenceInDays } from 'date-fns';

export function computeDatePresetRange(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string; label: string } {
  const now = new Date();

  switch (preset) {
    case 'today': {
      const d = format(now, 'yyyy-MM-dd');
      return { startDate: `${d}T00:00:00.000Z`, endDate: `${d}T23:59:59.999Z`, label: 'Today' };
    }
    case 'yesterday': {
      const y = subDays(now, 1);
      const d = format(y, 'yyyy-MM-dd');
      return { startDate: `${d}T00:00:00.000Z`, endDate: `${d}T23:59:59.999Z`, label: 'Yesterday' };
    }
    case 'this_week': {
      const s = startOfWeek(now, { weekStartsOn: 1 });
      const e = endOfWeek(now, { weekStartsOn: 1 });
      return {
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        label: `This Week (${format(s, 'dd MMM')} - ${format(e, 'dd MMM')})`,
      };
    }
    case 'last_week': {
      const s = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
      const e = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
      return {
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        label: `Last Week (${format(s, 'dd MMM')} - ${format(e, 'dd MMM')})`,
      };
    }
    case 'this_month': {
      const s = startOfMonth(now);
      const e = endOfMonth(now);
      return {
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        label: `This Month (${format(now, 'MMMM yyyy')})`,
      };
    }
    case 'last_month': {
      const lastMonthDate = subDays(startOfMonth(now), 1);
      const s = startOfMonth(lastMonthDate);
      const e = endOfMonth(lastMonthDate);
      return {
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        label: `Last Month (${format(s, 'MMMM yyyy')})`,
      };
    }
    case 'this_quarter': {
      const s = startOfQuarter(now);
      const e = endOfQuarter(now);
      const qNum = Math.floor(now.getMonth() / 3) + 1;
      return {
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        label: `This Quarter (Q${qNum} ${now.getFullYear()})`,
      };
    }
    case 'last_quarter': {
      const prevQDate = subDays(startOfQuarter(now), 1);
      const s = startOfQuarter(prevQDate);
      const e = endOfQuarter(prevQDate);
      const qNum = Math.floor(prevQDate.getMonth() / 3) + 1;
      return {
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        label: `Last Quarter (Q${qNum} ${prevQDate.getFullYear()})`,
      };
    }
    case 'this_year': {
      const s = startOfYear(now);
      const e = endOfYear(now);
      return {
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        label: `This Year (${now.getFullYear()})`,
      };
    }
    case 'last_year': {
      const prevYDate = subDays(startOfYear(now), 1);
      const s = startOfYear(prevYDate);
      const e = endOfYear(prevYDate);
      return {
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        label: `Last Year (${prevYDate.getFullYear()})`,
      };
    }
    case 'custom': {
      if (customStart && customEnd) {
        const s = new Date(`${customStart}T00:00:00.000Z`);
        const e = new Date(`${customEnd}T23:59:59.999Z`);
        return {
          startDate: s.toISOString(),
          endDate: e.toISOString(),
          label: `${format(s, 'dd MMM yyyy')} - ${format(e, 'dd MMM yyyy')}`,
        };
      }
      // default to last 30 days if not given
      const s = subDays(now, 30);
      return {
        startDate: s.toISOString(),
        endDate: now.toISOString(),
        label: 'Last 30 Days',
      };
    }
  }
}

export function calculateReportData({
  filters,
  quotations,
  invoices,
  customers,
  products,
  organization,
  userRole = 'OWNER',
}: {
  filters: ReportFilterState;
  quotations: Quotation[];
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  organization: Organization;
  userRole?: string;
}): ReportResponseData {
  const currency: CurrencyCode = organization.default_currency || 'INR';
  const countryProfile = getCountryProfile(organization.country || 'IN');
  const isIndiaGst = countryProfile.isIndiaGst;
  const isUaeVat = countryProfile.isUaeVat;

  const { startDate, endDate, label: dateRangeLabel } = computeDatePresetRange(
    filters.preset,
    filters.startDate,
    filters.endDate
  );

  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  const now = new Date();

  // Helper maps
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  // Determine what documents are in scope
  const targetCategory = filters.category || 'sales';
  const reportType = filters.reportType || 'sales-summary';

  // 1. Process Invoices
  const processedInvoices = invoices.filter((inv) => {
    // Environment match
    if (filters.environment && inv.environment !== filters.environment) return false;

    // Date range filter
    const invDateStr = inv.issue_date || inv.created_at;
    const invTime = new Date(invDateStr).getTime();
    if (invTime < startMs || invTime > endMs) return false;

    // Customer filter
    if (filters.customerId && inv.customer_id !== filters.customerId) return false;

    // Staff filter
    if (filters.staffId && inv.created_by !== filters.staffId) return false;

    // Payment method filter
    if (filters.paymentMethod && filters.paymentMethod !== 'ALL') {
      const pm = (inv.payment_method || '').toUpperCase();
      if (!pm.includes(filters.paymentMethod.toUpperCase())) return false;
    }

    // Payment status filter
    if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
      const ps = (inv.payment_status || (inv.is_paid ? 'PAID' : (inv.paid_amount && inv.paid_amount > 0 ? 'PARTIALLY_PAID' : 'UNPAID'))).toUpperCase();
      if (ps !== filters.paymentStatus) return false;
    }

    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      if (filters.status === 'OVERDUE') {
        const isOverdue = !inv.is_paid && inv.due_date && new Date(inv.due_date).getTime() < now.getTime();
        if (!isOverdue) return false;
      } else if (inv.status !== filters.status) {
        return false;
      }
    }

    // Product filter
    if (filters.productId && filters.productId !== 'ALL') {
      const hasProduct = (inv.items || []).some((item) => item.product_id === filters.productId);
      if (!hasProduct) return false;
    }

    // Search filter
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const cust = inv.customer || customerMap.get(inv.customer_id);
      const match =
        inv.invoice_number.toLowerCase().includes(s) ||
        (cust?.name || '').toLowerCase().includes(s) ||
        (cust?.company_name || '').toLowerCase().includes(s) ||
        (inv.notes || '').toLowerCase().includes(s);
      if (!match) return false;
    }

    return true;
  });

  // 2. Process Quotations
  const processedQuotations = quotations.filter((q) => {
    // Environment match
    if (filters.environment && q.environment !== filters.environment) return false;

    // Date range filter
    const qDateStr = q.issue_date || q.created_at;
    const qTime = new Date(qDateStr).getTime();
    if (qTime < startMs || qTime > endMs) return false;

    // Customer filter
    if (filters.customerId && q.customer_id !== filters.customerId) return false;

    // Staff filter
    if (filters.staffId && q.created_by !== filters.staffId) return false;

    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      if (q.status !== filters.status) return false;
    }

    // Product filter
    if (filters.productId && filters.productId !== 'ALL') {
      const hasProduct = (q.items || []).some((item) => item.product_id === filters.productId);
      if (!hasProduct) return false;
    }

    // Search filter
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const cust = q.customer || customerMap.get(q.customer_id);
      const match =
        q.quotation_number.toLowerCase().includes(s) ||
        q.title.toLowerCase().includes(s) ||
        (cust?.name || '').toLowerCase().includes(s) ||
        (cust?.company_name || '').toLowerCase().includes(s);
      if (!match) return false;
    }

    return true;
  });

  // 3. Compute Metrics
  let totalSales = 0;
  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalOverdue = 0;
  let totalTax = 0;
  let totalDiscount = 0;

  // Invoice Aging Accumulators
  let agingCurrent = 0;
  let aging1_30 = 0;
  let aging31_60 = 0;
  let aging61_90 = 0;
  let aging90Plus = 0;

  // Tax Tracking
  let taxableSales = 0;
  let totalTaxCollected = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let vatStandardTotal = 0;
  let vatZeroTotal = 0;
  let vatExemptTotal = 0;
  const hsnMap = new Map<string, {
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
  }>();

  // Payment method tallies
  const paymentMethodTallies = new Map<string, { amount: number; count: number }>();

  // Process invoices for metrics & aging
  processedInvoices.forEach((inv) => {
    const isCancelled = inv.status === 'CANCELLED' || inv.status === 'VOIDED';
    if (isCancelled) return;

    const grandTotal = Number(inv.grand_total) || 0;
    const subtotal = Number(inv.subtotal) || 0;
    const taxAmount = Number(inv.tax_amount) || 0;
    const discountAmount = Number(inv.discount_amount) || 0;
    const paidAmount = Number(inv.paid_amount) || (inv.is_paid ? grandTotal : 0);
    const balanceAmount = Math.max(0, Number(inv.balance_amount !== undefined ? inv.balance_amount : (grandTotal - paidAmount)));

    totalInvoiced += grandTotal;
    totalSales += grandTotal;
    totalPaid += paidAmount;
    totalOutstanding += balanceAmount;
    totalTax += taxAmount;
    totalDiscount += discountAmount;

    // Aging analysis for unpaid/partially paid
    if (balanceAmount > 0) {
      const dueDate = inv.due_date ? parseISO(inv.due_date) : now;
      const overdueDays = differenceInDays(now, dueDate);

      if (overdueDays <= 0) {
        agingCurrent += balanceAmount;
      } else {
        totalOverdue += balanceAmount;
        if (overdueDays <= 30) aging1_30 += balanceAmount;
        else if (overdueDays <= 60) aging31_60 += balanceAmount;
        else if (overdueDays <= 90) aging61_90 += balanceAmount;
        else aging90Plus += balanceAmount;
      }
    }

    // Tax aggregation
    taxableSales += subtotal;
    totalTaxCollected += taxAmount;

    (inv.items || []).forEach((item) => {
      const itemTax = Number(item.tax_amount) || 0;
      const itemSubtotal = (Number(item.quantity) || 1) * (Number(item.unit_price) || 0) - (Number(item.discount_amount) || 0);

      // India GST components
      if (isIndiaGst) {
        cgstTotal += Number(item.cgst_amount) || 0;
        sgstTotal += Number(item.sgst_amount) || 0;
        igstTotal += Number(item.igst_amount) || 0;

        const hsnCode = item.classification_code || 'General';
        const existingHsn = hsnMap.get(hsnCode) || {
          code: hsnCode,
          description: item.description || 'General Item',
          itemType: item.item_type || 'GOODS',
          taxableAmount: 0,
          taxRate: item.tax_rate || 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalTax: 0,
          totalAmount: 0,
        };
        existingHsn.taxableAmount += itemSubtotal;
        existingHsn.cgstAmount += Number(item.cgst_amount) || 0;
        existingHsn.sgstAmount += Number(item.sgst_amount) || 0;
        existingHsn.igstAmount += Number(item.igst_amount) || 0;
        existingHsn.totalTax += itemTax;
        existingHsn.totalAmount += itemSubtotal + itemTax;
        hsnMap.set(hsnCode, existingHsn);
      } else if (isUaeVat) {
        if ((item.tax_rate || 0) === 5) vatStandardTotal += itemTax;
        else if ((item.tax_rate || 0) === 0) vatZeroTotal += itemSubtotal;
        else vatExemptTotal += itemSubtotal;
      }
    });

    // Payment methods
    if (inv.payment_method && paidAmount > 0) {
      const pmKey = inv.payment_method.toUpperCase();
      const current = paymentMethodTallies.get(pmKey) || { amount: 0, count: 0 };
      current.amount += paidAmount;
      current.count += 1;
      paymentMethodTallies.set(pmKey, current);
    }
  });

  // Calculate Conversion Rate
  const quoteCount = processedQuotations.length;
  const approvedQuotes = processedQuotations.filter((q) =>
    ['APPROVED', 'PAYMENT_COMPLETED', 'COMPLETED'].includes(q.status) || Boolean(q.approved_at)
  );
  const conversionRate = quoteCount > 0 ? Math.round((approvedQuotes.length / quoteCount) * 100) : 0;

  // 4. Build Report Rows based on requested category & type
  let rows: ReportRow[] = [];

  const mapInvoiceToRow = (inv: Invoice): ReportRow => {
    const cust = inv.customer || customerMap.get(inv.customer_id);
    const grandTotal = Number(inv.grand_total) || 0;
    const paidAmount = Number(inv.paid_amount) || (inv.is_paid ? grandTotal : 0);
    const balanceAmount = Math.max(0, Number(inv.balance_amount !== undefined ? inv.balance_amount : (grandTotal - paidAmount)));
    const dueDate = inv.due_date ? parseISO(inv.due_date) : now;
    const overdueDays = differenceInDays(now, dueDate);

    let statusVariant: ReportRow['statusVariant'] = 'neutral';
    if (inv.status === 'PAID') statusVariant = 'success';
    else if (inv.status === 'OVERDUE' || (balanceAmount > 0 && overdueDays > 0)) statusVariant = 'error';
    else if (inv.status === 'ISSUED' || (inv.status as string) === 'SENT') statusVariant = 'info';
    else if (inv.status === 'CANCELLED' || inv.status === 'VOIDED') statusVariant = 'neutral';

    let agingBracket: ReportRow['agingBracket'] = 'CURRENT';
    if (balanceAmount > 0 && overdueDays > 0) {
      if (overdueDays <= 30) agingBracket = '1-30';
      else if (overdueDays <= 60) agingBracket = '31-60';
      else if (overdueDays <= 90) agingBracket = '61-90';
      else agingBracket = '90+';
    }

    const itemsSummary = (inv.items || [])
      .map((i) => `${i.description} (${i.quantity} ${i.unit || 'unit'})`)
      .slice(0, 3)
      .join(', ');

    return {
      id: inv.id,
      date: inv.issue_date || inv.created_at.split('T')[0],
      documentNumber: inv.invoice_number,
      documentType: 'INVOICE',
      linkHref: `/invoices/${inv.id}`,
      customerId: inv.customer_id,
      customerName: cust?.name || 'Customer',
      customerCompany: cust?.company_name || undefined,
      customerTaxNumber: cust?.tax_number || undefined,
      status: balanceAmount > 0 && overdueDays > 0 && inv.status !== 'CANCELLED' ? 'OVERDUE' : inv.status,
      statusVariant,
      paymentStatus: inv.is_paid ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID'),
      paymentMethod: inv.payment_method || undefined,
      currency: inv.currency || currency,
      subtotal: Number(inv.subtotal) || 0,
      discountAmount: Number(inv.discount_amount) || 0,
      taxRate: Number(inv.tax_rate) || 0,
      taxAmount: Number(inv.tax_amount) || 0,
      grandTotal,
      paidAmount,
      balanceAmount,
      dueDate: inv.due_date || undefined,
      agingDays: overdueDays > 0 ? overdueDays : 0,
      agingBracket,
      itemsSummary: itemsSummary || 'No line items recorded',
      staffName: inv.created_by || 'Admin',
      cgstAmount: isIndiaGst ? (inv.items || []).reduce((sum, i) => sum + (Number(i.cgst_amount) || 0), 0) : undefined,
      sgstAmount: isIndiaGst ? (inv.items || []).reduce((sum, i) => sum + (Number(i.sgst_amount) || 0), 0) : undefined,
      igstAmount: isIndiaGst ? (inv.items || []).reduce((sum, i) => sum + (Number(i.igst_amount) || 0), 0) : undefined,
      hsnCodes: (inv.items || []).map((i) => i.classification_code).filter(Boolean) as string[],
    };
  };

  const mapQuotationToRow = (q: Quotation): ReportRow => {
    const cust = q.customer || customerMap.get(q.customer_id);
    const grandTotal = Number(q.grand_total) || 0;
    const paidAmount = Number(q.paid_amount) || (q.is_paid ? grandTotal : 0);
    const balanceAmount = Math.max(0, Number(q.balance_amount !== undefined ? q.balance_amount : (grandTotal - paidAmount)));

    let statusVariant: ReportRow['statusVariant'] = 'neutral';
    if (['APPROVED', 'PAYMENT_COMPLETED', 'COMPLETED'].includes(q.status)) statusVariant = 'success';
    else if (q.status === 'SENT' || q.status === 'VIEWED') statusVariant = 'info';
    else if (q.status === 'REJECTED') statusVariant = 'error';
    else if (q.status === 'EXPIRED') statusVariant = 'warning';

    const itemsSummary = (q.items || [])
      .map((i) => `${i.description} (${i.quantity} ${i.unit || 'unit'})`)
      .slice(0, 3)
      .join(', ');

    return {
      id: q.id,
      date: q.issue_date || q.created_at.split('T')[0],
      documentNumber: q.quotation_number,
      documentType: 'QUOTE',
      linkHref: `/quotations/${q.id}`,
      customerId: q.customer_id,
      customerName: cust?.name || 'Customer',
      customerCompany: cust?.company_name || undefined,
      customerTaxNumber: cust?.tax_number || undefined,
      status: q.status,
      statusVariant,
      paymentStatus: q.is_paid ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID'),
      paymentMethod: q.payment_method || undefined,
      currency: q.currency || currency,
      subtotal: Number(q.subtotal) || 0,
      discountAmount: Number(q.discount_amount) || 0,
      taxRate: Number(q.tax_rate) || 0,
      taxAmount: Number(q.tax_amount) || 0,
      grandTotal,
      paidAmount,
      balanceAmount,
      dueDate: q.valid_until || undefined,
      itemsSummary: itemsSummary || 'No line items recorded',
      staffName: q.created_by || 'Admin',
      cgstAmount: isIndiaGst ? (q.items || []).reduce((sum, i) => sum + (Number(i.cgst_amount) || 0), 0) : undefined,
      sgstAmount: isIndiaGst ? (q.items || []).reduce((sum, i) => sum + (Number(i.sgst_amount) || 0), 0) : undefined,
      igstAmount: isIndiaGst ? (q.items || []).reduce((sum, i) => sum + (Number(i.igst_amount) || 0), 0) : undefined,
      hsnCodes: (q.items || []).map((i) => i.classification_code).filter(Boolean) as string[],
    };
  };

  // Switch by category to select matching rows
  if (targetCategory === 'quotes') {
    rows = processedQuotations.map(mapQuotationToRow);
    if (reportType === 'draft-quotes') rows = rows.filter((r) => r.status === 'DRAFT');
    else if (reportType === 'sent-quotes') rows = rows.filter((r) => r.status === 'SENT');
    else if (reportType === 'viewed-quotes') rows = rows.filter((r) => r.status === 'VIEWED');
    else if (reportType === 'approved-quotes') rows = rows.filter((r) => ['APPROVED', 'COMPLETED', 'PAYMENT_COMPLETED'].includes(r.status));
    else if (reportType === 'rejected-quotes') rows = rows.filter((r) => r.status === 'REJECTED');
    else if (reportType === 'expired-quotes') rows = rows.filter((r) => r.status === 'EXPIRED');
  } else if (targetCategory === 'invoices') {
    rows = processedInvoices.map(mapInvoiceToRow);
    if (reportType === 'paid-invoices') rows = rows.filter((r) => r.paymentStatus === 'PAID');
    else if (reportType === 'unpaid-invoices') rows = rows.filter((r) => r.paymentStatus === 'UNPAID');
    else if (reportType === 'partially-paid') rows = rows.filter((r) => r.paymentStatus === 'PARTIAL');
    else if (reportType === 'overdue-invoices') rows = rows.filter((r) => r.status === 'OVERDUE');
    else if (reportType === 'invoice-aging') rows = rows.filter((r) => r.balanceAmount > 0);
  } else if (targetCategory === 'payments') {
    rows = processedInvoices
      .filter((inv) => (Number(inv.paid_amount) || 0) > 0 || inv.is_paid)
      .map(mapInvoiceToRow);
    if (reportType === 'outstanding-payments') {
      rows = processedInvoices
        .filter((inv) => (Number(inv.balance_amount) || 0) > 0 && inv.status !== 'CANCELLED')
        .map(mapInvoiceToRow);
    }
  } else if (targetCategory === 'tax') {
    rows = processedInvoices
      .filter((inv) => inv.status !== 'CANCELLED' && inv.status !== 'VOIDED')
      .map(mapInvoiceToRow);
  } else {
    // Sales / Default: combine both invoices and quotes
    const invoiceRows = processedInvoices.map(mapInvoiceToRow);
    const quoteRows = processedQuotations.map(mapQuotationToRow);
    rows = [...invoiceRows, ...quoteRows];
    if (reportType === 'quote-sales') rows = quoteRows;
    else if (reportType === 'invoice-sales') rows = invoiceRows;
  }

  // Sort rows descending by date
  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 5. Build Trend Chart (Monthly or Daily)
  const chartPointsMap = new Map<string, ChartDataPoint>();
  const isBroadRange = differenceInDays(new Date(endDate), new Date(startDate)) > 45;

  processedInvoices.forEach((inv) => {
    if (inv.status === 'CANCELLED' || inv.status === 'VOIDED') return;
    const d = new Date(inv.issue_date || inv.created_at);
    const key = isBroadRange ? format(d, 'MMM yyyy') : format(d, 'dd MMM');

    const pt = chartPointsMap.get(key) || { label: key, sales: 0, invoiced: 0, paid: 0, count: 0 };
    pt.invoiced += Number(inv.grand_total) || 0;
    pt.sales += Number(inv.grand_total) || 0;
    pt.paid += Number(inv.paid_amount) || (inv.is_paid ? Number(inv.grand_total) || 0 : 0);
    pt.count += 1;
    chartPointsMap.set(key, pt);
  });

  const trendChart: ChartDataPoint[] = Array.from(chartPointsMap.values());

  // 6. Payment Methods Chart
  const totalPaidSum = totalPaid > 0 ? totalPaid : 1;
  const paymentMethodChart: PaymentMethodDataPoint[] = Array.from(paymentMethodTallies.entries()).map(([method, data]) => ({
    method,
    label: method.replace(/_/g, ' '),
    amount: data.amount,
    count: data.count,
    percentage: Math.round((data.amount / totalPaidSum) * 100),
  }));

  // Role Security Redactions
  const isStaff = userRole === 'STAFF';
  const metrics: ReportMetricSummary = {
    totalSales: isStaff ? 0 : totalSales,
    totalInvoiced: isStaff ? 0 : totalInvoiced,
    totalPaid: isStaff ? 0 : totalPaid,
    totalOutstanding: isStaff ? 0 : totalOutstanding,
    totalOverdue: isStaff ? 0 : totalOverdue,
    totalTax: isStaff ? 0 : totalTax,
    totalDiscount: isStaff ? 0 : totalDiscount,
    quoteCount: processedQuotations.length,
    invoiceCount: processedInvoices.length,
    conversionRate,
    currency,
  };

  const aging: AgingSummary = {
    current: isStaff ? 0 : agingCurrent,
    days1_30: isStaff ? 0 : aging1_30,
    days31_60: isStaff ? 0 : aging31_60,
    days61_90: isStaff ? 0 : aging61_90,
    days90Plus: isStaff ? 0 : aging90Plus,
    totalOverdue: isStaff ? 0 : totalOverdue,
  };

  const taxSummary: TaxBreakdownSummary = {
    taxSystem: countryProfile.taxSystem,
    taxLabel: countryProfile.taxLabel,
    isIndiaGst,
    isUaeVat,
    taxableSales: isStaff ? 0 : taxableSales,
    totalTaxCollected: isStaff ? 0 : totalTaxCollected,
    cgstTotal: isIndiaGst ? (isStaff ? 0 : cgstTotal) : undefined,
    sgstTotal: isIndiaGst ? (isStaff ? 0 : sgstTotal) : undefined,
    igstTotal: isIndiaGst ? (isStaff ? 0 : igstTotal) : undefined,
    hsnSummary: isIndiaGst ? (isStaff ? [] : Array.from(hsnMap.values())) : undefined,
    vatStandardTotal: isUaeVat ? (isStaff ? 0 : vatStandardTotal) : undefined,
    vatZeroTotal: isUaeVat ? (isStaff ? 0 : vatZeroTotal) : undefined,
    vatExemptTotal: isUaeVat ? (isStaff ? 0 : vatExemptTotal) : undefined,
  };

  // Filter options for dropdowns
  const filterOptions = {
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company_name || undefined,
    })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
    })),
    paymentMethods: [
      { id: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS/IMPS)' },
      { id: 'UPI', label: 'UPI / QR Code' },
      { id: 'CASH', label: 'Cash' },
      { id: 'CHEQUE', label: 'Cheque' },
      { id: 'CARD', label: 'Credit / Debit Card' },
      { id: 'CRYPTO', label: 'Cryptocurrency' },
    ],
    statuses: [
      { id: 'DRAFT', label: 'Draft' },
      { id: 'SENT', label: 'Sent' },
      { id: 'ISSUED', label: 'Issued' },
      { id: 'APPROVED', label: 'Approved' },
      { id: 'PAID', label: 'Paid' },
      { id: 'OVERDUE', label: 'Overdue' },
      { id: 'COMPLETED', label: 'Completed' },
      { id: 'REJECTED', label: 'Rejected' },
      { id: 'EXPIRED', label: 'Expired' },
      { id: 'CANCELLED', label: 'Cancelled / Voided' },
    ],
  };

  return {
    category: targetCategory,
    reportType,
    dateRangeLabel,
    startDate,
    endDate,
    metrics,
    aging,
    taxSummary,
    trendChart,
    paymentMethodChart,
    rows,
    totalRows: rows.length,
    organization: {
      id: organization.id,
      name: organization.name,
      email: organization.email,
      phone: organization.phone || undefined,
      address: [organization.address_line1, organization.city, organization.state, organization.country].filter(Boolean).join(', '),
      taxNumber: organization.gst_vat_number || undefined,
      currency,
      country: organization.country || undefined,
      taxSystem: organization.tax_system || undefined,
      taxLabel: organization.tax_id_label || countryProfile.taxLabel,
      logoUrl: organization.logo_url,
    },
    filterOptions,
    userRole,
    environment: filters.environment || 'live',
  };
}
