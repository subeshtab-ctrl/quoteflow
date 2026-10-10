import { ReportResponseData } from './report-types';
import { formatCurrency } from '@/lib/quotations/calculations';

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateQuoteFlowCsvReport(data: ReportResponseData): string {
  const lines: string[] = [];
  const defaultCurrency = data.metrics.currency || 'INR';

  // Metadata Header Section
  lines.push(`Blend & Bold QuoteFlow - Financial & Operational Report`);
  lines.push(`Report Name,${escapeCsv(`${data.category.toUpperCase()} - ${data.reportType.toUpperCase()}`)}`);
  lines.push(`Business Name,${escapeCsv(data.organization.name)}`);
  if (data.organization.taxNumber) {
    lines.push(`${escapeCsv(data.organization.taxLabel || 'Tax ID')},${escapeCsv(data.organization.taxNumber)}`);
  }
  lines.push(`Reporting Period,${escapeCsv(data.dateRangeLabel)}`);
  lines.push(`Generated Date,${escapeCsv(new Date().toISOString())}`);
  lines.push(`Primary Currency,${escapeCsv(defaultCurrency)}`);
  lines.push(``); // Blank line

  // KPI Summary (Grouped by Currency if multiple currencies exist)
  if (data.currencyBreakdown && data.currencyBreakdown.length > 1) {
    lines.push(`MULTI-CURRENCY SUMMARY METRICS (GROUPED BY CURRENCY)`);
    data.currencyBreakdown.forEach((cb) => {
      lines.push(`Currency,${cb.currency}`);
      lines.push(`Invoiced (${cb.currency}),${escapeCsv(formatCurrency(cb.totalInvoiced, cb.currency))}`);
      lines.push(`Received (${cb.currency}),${escapeCsv(formatCurrency(cb.totalPaid, cb.currency))}`);
      lines.push(`Pending (${cb.currency}),${escapeCsv(formatCurrency(cb.totalOutstanding, cb.currency))}`);
      lines.push(`Tax (${cb.currency}),${escapeCsv(formatCurrency(cb.totalTax, cb.currency))}`);
      lines.push(``);
    });
  } else {
    lines.push(`SUMMARY METRICS`);
    lines.push(`Total Sales,${escapeCsv(formatCurrency(data.metrics.totalSales, defaultCurrency))}`);
    lines.push(`Total Invoiced,${escapeCsv(formatCurrency(data.metrics.totalInvoiced, defaultCurrency))}`);
    lines.push(`Total Paid / Collected,${escapeCsv(formatCurrency(data.metrics.totalPaid, defaultCurrency))}`);
    lines.push(`Total Outstanding,${escapeCsv(formatCurrency(data.metrics.totalOutstanding, defaultCurrency))}`);
    lines.push(`Total Overdue,${escapeCsv(formatCurrency(data.metrics.totalOverdue, defaultCurrency))}`);
    lines.push(`Total Tax,${escapeCsv(formatCurrency(data.metrics.totalTax, defaultCurrency))}`);
    lines.push(`Total Discount,${escapeCsv(formatCurrency(data.metrics.totalDiscount, defaultCurrency))}`);
    lines.push(`Quote Conversion Rate (%),${data.metrics.conversionRate}%`);
    lines.push(``); // Blank line
  }

  // Country Tax Summary if available
  if (data.taxSummary.isIndiaGst && data.taxSummary.totalTaxCollected > 0) {
    lines.push(`INDIA GST SUMMARY`);
    lines.push(`Taxable Sales,${escapeCsv(formatCurrency(data.taxSummary.taxableSales, defaultCurrency))}`);
    lines.push(`CGST Total,${escapeCsv(formatCurrency(data.taxSummary.cgstTotal || 0, defaultCurrency))}`);
    lines.push(`SGST Total,${escapeCsv(formatCurrency(data.taxSummary.sgstTotal || 0, defaultCurrency))}`);
    lines.push(`IGST Total,${escapeCsv(formatCurrency(data.taxSummary.igstTotal || 0, defaultCurrency))}`);
    lines.push(`Total GST Collected,${escapeCsv(formatCurrency(data.taxSummary.totalTaxCollected, defaultCurrency))}`);
    lines.push(``);
  }

  // Column Headers
  const headers = [
    'Date',
    'Document Type',
    'Document Number',
    'Customer Name',
    'Customer Company',
    'Status',
    'Payment Status',
    'Payment Method',
    'Currency',
    'Due Date',
    'Aging (Days)',
    'Subtotal',
    'Discount Amount',
    'Tax Amount',
    'Grand Total',
    'Paid Amount',
    'Balance Amount',
    'Line Items Summary',
  ];
  lines.push(headers.map(escapeCsv).join(','));

  // Data Rows
  data.rows.forEach((r) => {
    const rowCurr = r.currency || defaultCurrency;
    const row = [
      r.date,
      r.documentType,
      r.documentNumber,
      r.customerName,
      r.customerCompany || '',
      r.status,
      r.paymentStatus,
      r.paymentMethod || '',
      rowCurr,
      r.dueDate || '',
      r.agingDays || 0,
      formatCurrency(r.subtotal, rowCurr),
      formatCurrency(r.discountAmount, rowCurr),
      formatCurrency(r.taxAmount, rowCurr),
      formatCurrency(r.grandTotal, rowCurr),
      formatCurrency(r.paidAmount, rowCurr),
      formatCurrency(r.balanceAmount, rowCurr),
      r.itemsSummary,
    ];
    lines.push(row.map(escapeCsv).join(','));
  });

  // Totals Row(s) grouped by currency
  lines.push(``);
  const currenciesInRows = Array.from(new Set(data.rows.map((r) => r.currency || defaultCurrency)));
  const targetCurrencies = currenciesInRows.length > 0 ? currenciesInRows : [defaultCurrency];

  targetCurrencies.forEach((currCode) => {
    const matchingRows = data.rows.filter((r) => (r.currency || defaultCurrency) === currCode);
    const totalSubtotal = matchingRows.reduce((s, r) => s + r.subtotal, 0);
    const totalTax = matchingRows.reduce((s, r) => s + r.taxAmount, 0);
    const totalGrand = matchingRows.reduce((s, r) => s + r.grandTotal, 0);
    const totalPaid = matchingRows.reduce((s, r) => s + r.paidAmount, 0);
    const totalBalance = matchingRows.reduce((s, r) => s + r.balanceAmount, 0);

    lines.push([
      targetCurrencies.length > 1 ? `TOTALS (${currCode})` : 'TOTALS',
      '',
      `${matchingRows.length} records`,
      '',
      '',
      '',
      '',
      '',
      currCode,
      '',
      '',
      formatCurrency(totalSubtotal, currCode),
      '',
      formatCurrency(totalTax, currCode),
      formatCurrency(totalGrand, currCode),
      formatCurrency(totalPaid, currCode),
      formatCurrency(totalBalance, currCode),
      '',
    ].map(escapeCsv).join(','));
  });

  return '\uFEFF' + lines.join('\r\n');
}
