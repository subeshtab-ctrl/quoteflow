import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportResponseData } from './report-types';
import { formatCurrency } from '@/lib/quotations/calculations';
import { format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';

let cachedRegularFontBase64: string | null = null;
let cachedBoldFontBase64: string | null = null;

function registerNotoFonts(doc: jsPDF): string {
  try {
    if (!cachedRegularFontBase64 || !cachedBoldFontBase64) {
      const regPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Regular.ttf');
      const boldPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Bold.ttf');
      if (fs.existsSync(regPath) && fs.existsSync(boldPath)) {
        cachedRegularFontBase64 = fs.readFileSync(regPath).toString('base64');
        cachedBoldFontBase64 = fs.readFileSync(boldPath).toString('base64');
      }
    }

    if (cachedRegularFontBase64 && cachedBoldFontBase64) {
      doc.addFileToVFS('NotoSans-Regular.ttf', cachedRegularFontBase64);
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'italic');

      doc.addFileToVFS('NotoSans-Bold.ttf', cachedBoldFontBase64);
      doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
      return 'NotoSans';
    }
  } catch (err) {
    console.warn('Could not load NotoSans font for report PDF, falling back to helvetica:', err);
  }
  return 'helvetica';
}

export async function generateQuoteFlowPdfReport(data: ReportResponseData): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const fontName = registerNotoFonts(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const currency = data.metrics.currency || 'INR';

  // 1. Header Banner & Branding
  // QuoteFlow Navy / Indigo Theme
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Top bar accents
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 23, pageWidth, 1.2, 'F');

  // QuoteFlow Brand title
  doc.setFont(fontName, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('QUOTEFLOW', margin, 13);

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(199, 210, 254); // indigo-200
  doc.text('COMMERCIAL ACCOUNTING & EXECUTIVE REPORT', margin + 30, 13);

  // Generated date & status badge on right
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // slate-300
  const genDateStr = `Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`;
  doc.text(genDateStr, pageWidth - margin, 13, { align: 'right' });

  let currentY = 32;

  // 2. Company Info & Report Subject
  doc.setFont(fontName, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(data.organization.name || 'Company Name', margin, currentY);

  currentY += 5;
  doc.setFont(fontName, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500

  const compDetails: string[] = [];
  if (data.organization.address) compDetails.push(data.organization.address);
  if (data.organization.phone) compDetails.push(`Tel: ${data.organization.phone}`);
  if (data.organization.email) compDetails.push(data.organization.email);
  if (data.organization.taxNumber) {
    const taxLabel = data.organization.taxLabel || 'Tax ID';
    compDetails.push(`${taxLabel}: ${data.organization.taxNumber}`);
  }

  if (compDetails.length > 0) {
    doc.text(compDetails.join('  •  '), margin, currentY);
    currentY += 6;
  }

  // Divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // 3. Report Name & Filter Scope Header
  doc.setFont(fontName, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59); // slate-800
  const categoryTitle = data.category.toUpperCase();
  const reportTitle = `${categoryTitle} STATEMENT — ${data.reportType.replace(/-/g, ' ').toUpperCase()}`;
  doc.text(reportTitle, margin, currentY);

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const periodText = `Reporting Period: ${data.dateRangeLabel}`;
  doc.text(periodText, pageWidth - margin, currentY, { align: 'right' });
  currentY += 8;

  // 4. Executive KPI Summary Cards (5 columns)
  const cardWidth = (contentWidth - 8) / 5;
  const cardHeight = 16;
  const cards = [
    { label: 'TOTAL SALES', value: formatCurrency(data.metrics.totalSales, currency), color: [15, 23, 42] },
    { label: 'TOTAL INVOICED', value: formatCurrency(data.metrics.totalInvoiced, currency), color: [79, 70, 229] },
    { label: 'COLLECTED (PAID)', value: formatCurrency(data.metrics.totalPaid, currency), color: [16, 185, 129] },
    { label: 'OUTSTANDING', value: formatCurrency(data.metrics.totalOutstanding, currency), color: [245, 158, 11] },
    { label: 'OVERDUE', value: formatCurrency(data.metrics.totalOverdue, currency), color: [239, 68, 68] },
  ];

  cards.forEach((c, idx) => {
    const x = margin + idx * (cardWidth + 2);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    // Label
    doc.setFont(fontName, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, x + 2.5, currentY + 4.5);

    // Value
    doc.setFont(fontName, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, x + 2.5, currentY + 11.5);
  });

  currentY += cardHeight + 6;

  // Multi-Currency Breakdown Box if multiple currencies exist
  if (data.currencyBreakdown && data.currencyBreakdown.length > 1) {
    const boxHeight = 6 + data.currencyBreakdown.length * 4.5;
    doc.setFillColor(238, 242, 255); // indigo-50
    doc.setDrawColor(199, 210, 254); // indigo-200
    doc.roundedRect(margin, currentY, contentWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(55, 48, 163); // indigo-800
    doc.text('MULTI-CURRENCY BREAKDOWN (GROUPED BY CURRENCY):', margin + 4, currentY + 4.5);

    let cbY = currentY + 8.5;
    data.currencyBreakdown.forEach((cb) => {
      doc.setFont(fontName, 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${cb.currency}:`, margin + 4, cbY);

      doc.setFont(fontName, 'normal');
      doc.setTextColor(51, 65, 85);
      const summaryLine = `Invoiced: ${formatCurrency(cb.totalInvoiced, cb.currency)}   |   Received: ${formatCurrency(cb.totalPaid, cb.currency)}   |   Pending: ${formatCurrency(cb.totalOutstanding, cb.currency)}`;
      doc.text(summaryLine, margin + 16, cbY);
      cbY += 4.5;
    });

    currentY += boxHeight + 6;
  } else {
    currentY += 2;
  }

  // 5. Country Tax Summary Box if relevant
  if (data.taxSummary.isIndiaGst && data.taxSummary.totalTaxCollected > 0) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, contentWidth, 12, 1.5, 1.5, 'F');

    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('INDIA GST BREAKDOWN:', margin + 4, currentY + 4.5);

    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const cgstText = `CGST: ${formatCurrency(data.taxSummary.cgstTotal || 0, currency)}`;
    const sgstText = `SGST: ${formatCurrency(data.taxSummary.sgstTotal || 0, currency)}`;
    const igstText = `IGST: ${formatCurrency(data.taxSummary.igstTotal || 0, currency)}`;
    const totalGstText = `Total GST: ${formatCurrency(data.taxSummary.totalTaxCollected, currency)}`;
    const taxableText = `Taxable Sales: ${formatCurrency(data.taxSummary.taxableSales, currency)}`;

    doc.text(`${taxableText}   |   ${cgstText}   |   ${sgstText}   |   ${igstText}   |   ${totalGstText}`, margin + 4, currentY + 8.5);

    currentY += 16;
  } else if (data.taxSummary.isUaeVat && data.taxSummary.totalTaxCollected > 0) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, contentWidth, 12, 1.5, 1.5, 'F');

    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('GCC VAT BREAKDOWN:', margin + 4, currentY + 4.5);

    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const vatText = `Standard 5% VAT: ${formatCurrency(data.taxSummary.totalTaxCollected, currency)}`;
    const taxableText = `Taxable Supplies: ${formatCurrency(data.taxSummary.taxableSales, currency)}`;

    doc.text(`${taxableText}   |   ${vatText}`, margin + 4, currentY + 8.5);

    currentY += 16;
  }

  // 6. Data Table
  const tableHeaders = [
    'Date',
    'Doc #',
    'Customer',
    'Status',
    'Amount',
    'Tax',
    'Paid',
    'Balance',
  ];

  const tableRows = data.rows.map((r) => {
    const rowCurr = r.currency || currency;
    return [
      r.date,
      r.documentNumber,
      r.customerCompany ? `${r.customerName} (${r.customerCompany})` : r.customerName,
      r.status,
      formatCurrency(r.grandTotal, rowCurr),
      formatCurrency(r.taxAmount, rowCurr),
      formatCurrency(r.paidAmount, rowCurr),
      formatCurrency(r.balanceAmount, rowCurr),
    ];
  });

  // Compute column totals grouped by currency
  const currenciesInRows = Array.from(new Set(data.rows.map((r) => r.currency || currency)));
  const footRows = currenciesInRows.length <= 1
    ? (() => {
        const rowCurr = currenciesInRows[0] || currency;
        const totalAmountSum = data.rows.reduce((s, r) => s + r.grandTotal, 0);
        const totalTaxSum = data.rows.reduce((s, r) => s + r.taxAmount, 0);
        const totalPaidSum = data.rows.reduce((s, r) => s + r.paidAmount, 0);
        const totalBalanceSum = data.rows.reduce((s, r) => s + r.balanceAmount, 0);
        return [[
          'Totals',
          `${data.rows.length} docs`,
          '',
          '',
          formatCurrency(totalAmountSum, rowCurr),
          formatCurrency(totalTaxSum, rowCurr),
          formatCurrency(totalPaidSum, rowCurr),
          formatCurrency(totalBalanceSum, rowCurr),
        ]];
      })()
    : currenciesInRows.map((currCode) => {
        const matchingRows = data.rows.filter((r) => (r.currency || currency) === currCode);
        const totalAmountSum = matchingRows.reduce((s, r) => s + r.grandTotal, 0);
        const totalTaxSum = matchingRows.reduce((s, r) => s + r.taxAmount, 0);
        const totalPaidSum = matchingRows.reduce((s, r) => s + r.paidAmount, 0);
        const totalBalanceSum = matchingRows.reduce((s, r) => s + r.balanceAmount, 0);
        return [
          `Totals (${currCode})`,
          `${matchingRows.length} docs`,
          '',
          '',
          formatCurrency(totalAmountSum, currCode),
          formatCurrency(totalTaxSum, currCode),
          formatCurrency(totalPaidSum, currCode),
          formatCurrency(totalBalanceSum, currCode),
        ];
      });

  autoTable(doc, {
    head: [tableHeaders],
    body: tableRows,
    foot: footRows,
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 20 },
    theme: 'grid',
    styles: {
      font: fontName,
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      font: fontName,
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5,
    },
    bodyStyles: {
      font: fontName,
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    footStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42],
      font: fontName,
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
    showHead: 'everyPage',
    didDrawPage: (hookData) => {
      // Clean Footer on every page
      const pageStr = `Page ${hookData.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.setFont(fontName, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      doc.text('QuoteFlow by Blend & Bold • Confidential Accounting & Operational Record', margin, pageHeight - 7);
      doc.text(pageStr, pageWidth - margin, pageHeight - 7, { align: 'right' });
    },
  });

  return new Uint8Array(doc.output('arraybuffer'));
}
