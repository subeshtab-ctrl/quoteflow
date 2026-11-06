import { jsPDF } from 'jspdf';
import { runAutoTable } from '@/lib/pdf/font-loader';
import { PartyLedgerStatement } from '@/lib/reports/party-ledger-calculator';
import { Organization } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { format } from 'date-fns';

export interface PartyLedgerPdfOptions {
  statement: PartyLedgerStatement;
  organization?: Organization | null;
  dateRangeLabel?: string;
}

/**
 * Generates an executive A4 Party Statement of Account / Customer Ledger PDF
 */
export async function generatePartyLedgerPdf({
  statement,
  organization,
  dateRangeLabel = 'All Time',
}: PartyLedgerPdfOptions): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const org = organization || {
    name: 'QuoteFlow Technologies',
    email: 'billing@quoteflow.app',
    phone: '+91 98765 43210',
    address_line1: 'Corporate Business Center',
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code: '560038',
    country: 'India',
    gst_vat_number: '',
    default_currency: statement.currency || 'INR',
  };

  const currency = statement.currency || (org.default_currency || 'INR');
  const isIndia = (org.country || '').toLowerCase() === 'india' || currency === 'INR';

  // 1. Top Decorative Brand Bar
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Company Info (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(30, 41, 59);
  doc.text(org.name || 'QuoteFlow Statement', margin, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const compLines: string[] = [
    org.address_line1 || '',
    `${org.city || ''} ${org.state || ''} ${org.postal_code || ''} ${org.country || ''}`.trim(),
    `Email: ${org.email || ''} | Phone: ${org.phone || 'N/A'}`,
    org.gst_vat_number ? (isIndia ? `GSTIN: ${org.gst_vat_number}` : `Tax ID: ${org.gst_vat_number}`) : '',
  ].filter(Boolean) as string[];

  let compY = 22;
  compLines.forEach((line) => {
    doc.text(line, margin, compY);
    compY += 3.8;
  });

  // 3. Header (Right): Statement Title & Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(79, 70, 229);
  doc.text('STATEMENT OF ACCOUNT', pageWidth - margin, 17, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Period: ${dateRangeLabel}`, pageWidth - margin, 23, { align: 'right' });
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pageWidth - margin, 27.5, { align: 'right' });

  // 4. Customer Info Box & KPI Cards
  const clientBoxY = Math.max(compY + 3, 33);

  // Left: Customer Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, clientBoxY, 85, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('STATEMENT FOR (PARTY / CLIENT):', margin + 3.5, clientBoxY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(statement.customerName || 'Valued Customer', margin + 3.5, clientBoxY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  let custLineY = clientBoxY + 15;
  if (statement.companyName) {
    doc.text(`Company: ${statement.companyName}`, margin + 3.5, custLineY);
    custLineY += 3.8;
  }
  if (statement.phone) {
    doc.text(`Phone: ${statement.phone}`, margin + 3.5, custLineY);
    custLineY += 3.8;
  }
  if (statement.taxNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${isIndia ? 'GSTIN' : 'Tax ID'}: ${statement.taxNumber}`, margin + 3.5, custLineY);
    doc.setFont('helvetica', 'normal');
  }

  // Right: 3 Financial Summary Cards
  const kpiStartX = margin + 90;
  const kpiWidth = (pageWidth - margin - kpiStartX) / 3;

  // Card 1: Total Invoiced
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(kpiStartX, clientBoxY, kpiWidth - 2, 30, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL BILLED', kpiStartX + 3, clientBoxY + 7);
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(formatCurrency(statement.totalInvoiced, currency), kpiStartX + 3, clientBoxY + 17);

  // Card 2: Total Paid
  const card2X = kpiStartX + kpiWidth;
  doc.setFillColor(236, 253, 245); // Emerald 50
  doc.roundedRect(card2X, clientBoxY, kpiWidth - 2, 30, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.text('TOTAL PAID', card2X + 3, clientBoxY + 7);
  doc.setFontSize(11);
  doc.setTextColor(6, 95, 70); // Emerald 800
  doc.text(formatCurrency(statement.totalPaid, currency), card2X + 3, clientBoxY + 17);

  // Card 3: Net Outstanding
  const card3X = kpiStartX + kpiWidth * 2;
  const isOverdue = statement.netBalanceDue > 0;
  if (isOverdue) {
    doc.setFillColor(254, 242, 242); // Red 50
  } else {
    doc.setFillColor(240, 253, 244); // Green 50
  }
  doc.roundedRect(card3X, clientBoxY, kpiWidth - 2, 30, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  if (isOverdue) {
    doc.setTextColor(220, 38, 38);
  } else {
    doc.setTextColor(22, 163, 74);
  }
  doc.text('NET DUE BALANCE', card3X + 3, clientBoxY + 7);
  doc.setFontSize(12);
  if (isOverdue) {
    doc.setTextColor(153, 27, 27);
  } else {
    doc.setTextColor(20, 83, 45);
  }
  doc.text(formatCurrency(statement.netBalanceDue, currency), card3X + 3, clientBoxY + 17);

  // 5. Overdue Aging Analysis Bar
  const agingY = clientBoxY + 34;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, agingY, pageWidth - margin * 2, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('AGING BREAKDOWN:', margin + 3.5, agingY + 7.5);

  const agingCols = [
    { label: 'Current (Not Due)', val: statement.aging.current, color: [71, 85, 105] },
    { label: '1-30 Days', val: statement.aging.days1to30, color: [217, 119, 6] },
    { label: '31-60 Days', val: statement.aging.days31to60, color: [234, 88, 12] },
    { label: '61-90 Days', val: statement.aging.days61to90, color: [220, 38, 38] },
    { label: '90+ Days', val: statement.aging.days90plus, color: [153, 27, 27] },
  ];

  let agingX = margin + 40;
  agingCols.forEach((col) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(col.label, agingX, agingY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(col.color[0], col.color[1], col.color[2]);
    doc.text(formatCurrency(col.val, currency), agingX, agingY + 9.5);
    agingX += 28;
  });

  // 6. Detailed Transaction Ledger Table
  const tableHead = [['Date', 'Ref / Doc #', 'Type', 'Description', 'Debit (+)', 'Credit (-)', 'Balance']];

  const tableBody = statement.entries.map((entry) => [
    format(new Date(entry.date), 'dd MMM yyyy'),
    entry.refNo,
    entry.type,
    entry.description.length > 40 ? `${entry.description.slice(0, 38)}...` : entry.description,
    entry.debit > 0 ? formatCurrency(entry.debit, currency) : '-',
    entry.credit > 0 ? formatCurrency(entry.credit, currency) : '-',
    formatCurrency(entry.runningBalance, currency),
  ]);

  if (tableBody.length === 0) {
    tableBody.push(['-', 'No Records', 'INFO', 'No invoices or payments recorded for this period', '-', '-', formatCurrency(0, currency)]);
  }

  runAutoTable(doc, {
    startY: agingY + 16,
    margin: { left: margin, right: margin, bottom: 20 },
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 20 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // 7. Footer
  const finalY = (doc as any).lastAutoTable?.finalY || 240;
  if (finalY < pageHeight - 25) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'This is a computer-generated account statement from QuoteFlow. For payment queries, please reach out via phone or email.',
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  return new Uint8Array(doc.output('arraybuffer'));
}
