import { Quotation, Organization } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate } from '@/lib/utils';

export interface CsvExportOptions {
  quotations: Quotation[];
  documentType?: 'ALL' | 'QUOTATIONS' | 'INVOICES';
  organization?: Organization | null;
}

/**
 * Escapes a cell value per RFC 4180 CSV standard
 */
function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an RFC 4180 compliant CSV string with UTF-8 BOM
 */
export function generateFinancialCsv({
  quotations,
  documentType = 'ALL',
  organization,
}: CsvExportOptions): string {
  const headers = [
    'Document Type',
    'Document Number',
    'Reference Quote #',
    'Issue Date',
    'Valid / Due Date',
    'Customer Name',
    'Company Name',
    'Customer Email',
    'Customer Phone',
    'Approval Status',
    'Approved At',
    'Payment Status',
    'Paid At',
    'Payment Method',
    'Payment Notes',
    'Currency',
    'Subtotal',
    'Discount Amount',
    'Tax Rate (%)',
    'Tax Amount',
    'Grand Total',
    'Line Items Summary',
    'Created At',
  ];

  const rows: string[][] = [];

  for (const quote of quotations) {
    const cust = quote.customer;
    const isApproved = quote.status === 'APPROVED' || quote.status === 'PAYMENT_COMPLETED' || quote.status === 'COMPLETED' || Boolean(quote.approved_at);
    const isPaid = Boolean(quote.is_paid) || quote.status === 'PAYMENT_COMPLETED';

    const itemsSummary = (quote.items || [])
      .map((item) => `${item.quantity}x ${item.description} (${quote.currency} ${item.line_total})`)
      .join('; ');

    // 1. Quotation Row (if documentType is ALL or QUOTATIONS)
    if (documentType === 'ALL' || documentType === 'QUOTATIONS') {
      rows.push([
        'Quotation',
        quote.quotation_number,
        '-',
        quote.issue_date || '',
        quote.valid_until || '',
        cust?.name || 'Valued Client',
        cust?.company_name || '',
        cust?.email || '',
        cust?.phone || '',
        quote.status,
        quote.approved_at ? formatDate(quote.approved_at) : '',
        isApproved ? (isPaid ? 'PAID' : 'UNPAID') : 'N/A (Pending Approval)',
        quote.paid_at ? formatDate(quote.paid_at) : '',
        quote.payment_method || '',
        quote.payment_notes || '',
        quote.currency,
        quote.subtotal?.toFixed(2) || '0.00',
        quote.discount_amount?.toFixed(2) || '0.00',
        `${quote.tax_rate || 0}%`,
        quote.tax_amount?.toFixed(2) || '0.00',
        quote.grand_total?.toFixed(2) || '0.00',
        itemsSummary,
        formatDate(quote.created_at),
      ]);
    }

    // 2. Invoice Row (only for approved AND paid quotes, if documentType is ALL or INVOICES)
    if ((documentType === 'ALL' || documentType === 'INVOICES') && isApproved && isPaid) {
      const invoiceNumber = `INV-${quote.quotation_number.replace(/^Q-/, '')}`;
      rows.push([
        'Commercial Tax Invoice',
        invoiceNumber,
        quote.quotation_number,
        quote.issue_date || '',
        quote.valid_until || '',
        cust?.name || 'Valued Client',
        cust?.company_name || '',
        cust?.email || '',
        cust?.phone || '',
        'APPROVED',
        quote.approved_at ? formatDate(quote.approved_at) : '',
        isPaid ? 'PAID' : 'UNPAID',
        quote.paid_at ? formatDate(quote.paid_at) : '',
        quote.payment_method || '',
        quote.payment_notes || '',
        quote.currency,
        quote.subtotal?.toFixed(2) || '0.00',
        quote.discount_amount?.toFixed(2) || '0.00',
        `${quote.tax_rate || 0}%`,
        quote.tax_amount?.toFixed(2) || '0.00',
        quote.grand_total?.toFixed(2) || '0.00',
        itemsSummary,
        formatDate(quote.created_at),
      ]);
    }
  }

  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];

  // UTF-8 BOM (\uFEFF) ensures proper rendering in Excel
  return '\uFEFF' + csvLines.join('\r\n');
}
