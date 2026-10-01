import { ReportResponseData } from './report-types';

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

  // Metadata Header Section
  lines.push(`Blend & Bold QuoteFlow - Financial & Operational Report`);
  lines.push(`Report Name,${escapeCsv(`${data.category.toUpperCase()} - ${data.reportType.toUpperCase()}`)}`);
  lines.push(`Business Name,${escapeCsv(data.organization.name)}`);
  if (data.organization.taxNumber) {
    lines.push(`${escapeCsv(data.organization.taxLabel || 'Tax ID')},${escapeCsv(data.organization.taxNumber)}`);
  }
  lines.push(`Reporting Period,${escapeCsv(data.dateRangeLabel)}`);
  lines.push(`Generated Date,${escapeCsv(new Date().toISOString())}`);
  lines.push(`Currency,${escapeCsv(data.metrics.currency)}`);
  lines.push(``); // Blank line

  // KPI Summary
  lines.push(`SUMMARY METRICS`);
  lines.push(`Total Sales,${data.metrics.totalSales}`);
  lines.push(`Total Invoiced,${data.metrics.totalInvoiced}`);
  lines.push(`Total Paid / Collected,${data.metrics.totalPaid}`);
  lines.push(`Total Outstanding,${data.metrics.totalOutstanding}`);
  lines.push(`Total Overdue,${data.metrics.totalOverdue}`);
  lines.push(`Total Tax,${data.metrics.totalTax}`);
  lines.push(`Total Discount,${data.metrics.totalDiscount}`);
  lines.push(`Quote Conversion Rate (%),${data.metrics.conversionRate}%`);
  lines.push(``); // Blank line

  // Country Tax Summary if available
  if (data.taxSummary.isIndiaGst && data.taxSummary.totalTaxCollected > 0) {
    lines.push(`INDIA GST SUMMARY`);
    lines.push(`Taxable Sales,${data.taxSummary.taxableSales}`);
    lines.push(`CGST Total,${data.taxSummary.cgstTotal || 0}`);
    lines.push(`SGST Total,${data.taxSummary.sgstTotal || 0}`);
    lines.push(`IGST Total,${data.taxSummary.igstTotal || 0}`);
    lines.push(`Total GST Collected,${data.taxSummary.totalTaxCollected}`);
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
    const row = [
      r.date,
      r.documentType,
      r.documentNumber,
      r.customerName,
      r.customerCompany || '',
      r.status,
      r.paymentStatus,
      r.paymentMethod || '',
      r.dueDate || '',
      r.agingDays || 0,
      r.subtotal,
      r.discountAmount,
      r.taxAmount,
      r.grandTotal,
      r.paidAmount,
      r.balanceAmount,
      r.itemsSummary,
    ];
    lines.push(row.map(escapeCsv).join(','));
  });

  // Totals Row
  lines.push(``);
  const totalSubtotal = data.rows.reduce((s, r) => s + r.subtotal, 0);
  const totalTax = data.rows.reduce((s, r) => s + r.taxAmount, 0);
  const totalGrand = data.rows.reduce((s, r) => s + r.grandTotal, 0);
  const totalPaid = data.rows.reduce((s, r) => s + r.paidAmount, 0);
  const totalBalance = data.rows.reduce((s, r) => s + r.balanceAmount, 0);

  lines.push([
    'TOTALS',
    '',
    `${data.rows.length} records`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalSubtotal,
    '',
    totalTax,
    totalGrand,
    totalPaid,
    totalBalance,
    '',
  ].map(escapeCsv).join(','));

  return '\uFEFF' + lines.join('\r\n');
}
