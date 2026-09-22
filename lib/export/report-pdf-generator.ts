import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation, Organization } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { format } from 'date-fns';

export interface ReportPdfOptions {
  quotations: Quotation[];
  organization?: Organization | null;
  dateRangeLabel: string;
  statusLabel?: string;
  paymentLabel?: string;
  documentTypeLabel?: string;
}

/**
 * Generate an executive financial statement PDF
 */
export async function generateFinancialReportPdf({
  quotations,
  organization,
  dateRangeLabel,
  statusLabel = 'All',
  paymentLabel = 'All',
  documentTypeLabel = 'Quotations & Invoices',
}: ReportPdfOptions): Promise<Uint8Array> {
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
    address_line1: 'Tech Park, Main Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code: '560038',
    country: 'India',
    gst_vat_number: '',
    default_currency: 'INR',
  };

  const primaryCurrency = org.default_currency || (quotations[0]?.currency || 'INR');

  // Calculate Summary KPIs
  const totalCount = quotations.length;
  const approvedQuotes = quotations.filter((q) => q.status === 'APPROVED');
  const approvedCount = approvedQuotes.length;
  const paidQuotes = quotations.filter((q) => q.status === 'APPROVED' && q.is_paid);
  const unpaidQuotes = quotations.filter((q) => q.status === 'APPROVED' && !q.is_paid);

  const totalValue = quotations.reduce((sum, q) => sum + (q.grand_total || 0), 0);
  const approvedValue = approvedQuotes.reduce((sum, q) => sum + (q.grand_total || 0), 0);
  const paidValue = paidQuotes.reduce((sum, q) => sum + (q.grand_total || 0), 0);
  const outstandingValue = unpaidQuotes.reduce((sum, q) => sum + (q.grand_total || 0), 0);

  // 1. Top Decorative Brand Bar
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Organization Info & Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(org.name || 'QuoteFlow Statement', margin, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  const compLines: string[] = [
    org.address_line1 || '',
    `${org.city || ''} ${org.state || ''} ${org.postal_code || ''} ${org.country || ''}`.trim(),
    `Email: ${org.email} | Tel: ${org.phone || 'N/A'}`,
    org.gst_vat_number ? `Tax / GST: ${org.gst_vat_number}` : '',
  ].filter(Boolean) as string[];

  let compY = 22;
  compLines.forEach((line) => {
    doc.text(line, margin, compY);
    compY += 4;
  });

  // Right Side Header: Statement Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229);
  doc.text('FINANCIAL STATEMENT', pageWidth - margin, 17, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pageWidth - margin, 23, {
    align: 'right',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Period: ${dateRangeLabel}`, pageWidth - margin, 28, { align: 'right' });
  doc.text(`Filter: ${statusLabel} | Payment: ${paymentLabel}`, pageWidth - margin, 33, {
    align: 'right',
  });

  // 3. Filter & KPI Summary Cards
  const kpiY = 40;
  const colWidth = (pageWidth - margin * 2 - 9) / 4; // 4 cards

  // Card 1: Total Quotations
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, kpiY, colWidth, 20, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL VOLUME', margin + 3, kpiY + 6);
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalCount} docs`, margin + 3, kpiY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(formatCurrency(totalValue, primaryCurrency), margin + 3, kpiY + 17);

  // Card 2: Approved Revenue
  const c2X = margin + colWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c2X, kpiY, colWidth, 20, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(79, 70, 229);
  doc.text('APPROVED REVENUE', c2X + 3, kpiY + 6);
  doc.setFontSize(11);
  doc.setTextColor(79, 70, 229);
  doc.text(formatCurrency(approvedValue, primaryCurrency), c2X + 3, kpiY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`${approvedCount} approved deals`, c2X + 3, kpiY + 17);

  // Card 3: Paid / Collected
  const c3X = margin + (colWidth + 3) * 2;
  doc.setFillColor(240, 253, 244); // emerald 50
  doc.setDrawColor(187, 247, 208); // emerald 200
  doc.roundedRect(c3X, kpiY, colWidth, 20, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52); // emerald 800
  doc.text('COLLECTED (PAID)', c3X + 3, kpiY + 6);
  doc.setFontSize(11);
  doc.setTextColor(22, 101, 52);
  doc.text(formatCurrency(paidValue, primaryCurrency), c3X + 3, kpiY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(22, 101, 52);
  doc.text(`${paidQuotes.length} paid invoices`, c3X + 3, kpiY + 17);

  // Card 4: Outstanding / Pending
  const c4X = margin + (colWidth + 3) * 3;
  doc.setFillColor(254, 243, 199); // amber 50
  doc.setDrawColor(253, 230, 138); // amber 200
  doc.roundedRect(c4X, kpiY, colWidth, 20, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9); // amber 700
  doc.text('OUTSTANDING BALANCE', c4X + 3, kpiY + 6);
  doc.setFontSize(11);
  doc.setTextColor(180, 83, 9);
  doc.text(formatCurrency(outstandingValue, primaryCurrency), c4X + 3, kpiY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180, 83, 9);
  doc.text(`${unpaidQuotes.length} pending payment`, c4X + 3, kpiY + 17);

  // 4. Quotations Table
  const tableData = quotations.map((quote, idx) => {
    const cust = quote.customer;
    const clientStr = cust?.company_name
      ? `${cust.name}\n(${cust.company_name})`
      : (cust?.name || 'Valued Client');

    const isApproved = quote.status === 'APPROVED';
    const isPaid = Boolean(quote.is_paid);

    let paymentStr = '—';
    if (isApproved) {
      if (isPaid) {
        paymentStr = `PAID\n${quote.payment_method || ''}`;
      } else {
        paymentStr = 'UNPAID';
      }
    }

    return [
      (idx + 1).toString(),
      quote.quotation_number,
      clientStr,
      quote.issue_date || '—',
      quote.valid_until || '—',
      quote.status,
      paymentStr,
      formatCurrency(quote.grand_total, quote.currency),
    ];
  });

  autoTable(doc, {
    startY: kpiY + 26,
    head: [['#', 'Doc #', 'Customer / Company', 'Issue Date', 'Valid / Due', 'Status', 'Payment', 'Amount']],
    body: tableData,
    margin: { left: margin, right: margin },
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 3,
      lineColor: [241, 245, 249],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 24, fontStyle: 'bold' },
      6: { cellWidth: 22, fontStyle: 'bold' },
      7: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252],
    },
    didParseCell: (data) => {
      // Color-code Status column
      if (data.section === 'body' && data.column.index === 5) {
        const val = String(data.cell.raw);
        if (val === 'APPROVED') {
          data.cell.styles.textColor = [22, 163, 74]; // Emerald
        } else if (val === 'REJECTED') {
          data.cell.styles.textColor = [220, 38, 38]; // Rose
        } else if (val === 'SENT' || val === 'VIEWED') {
          data.cell.styles.textColor = [79, 70, 229]; // Indigo
        }
      }
      // Color-code Payment column
      if (data.section === 'body' && data.column.index === 6) {
        const val = String(data.cell.raw);
        if (val.includes('PAID')) {
          data.cell.styles.textColor = [22, 163, 74]; // Emerald
        } else if (val.includes('UNPAID')) {
          data.cell.styles.textColor = [217, 119, 6]; // Amber
        }
      }
    },
  });

  // Footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text(
      `QuoteFlow SaaS Platform © 2026 • Confidential Business Statement`,
      margin,
      pageHeight - 7
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, {
      align: 'right',
    });
  }

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
