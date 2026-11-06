import { jsPDF } from 'jspdf';
import { runAutoTable, loadPdfLogoImage } from '@/lib/pdf/font-loader';
import { ReportResponseData } from './report-types';
import { getCompanyInitials } from '@/lib/utils/logo';
import { format } from 'date-fns';

/**
 * Universal PDF Currency Formatter
 * Uses clean standard ASCII representations to guarantee 100% reliable rendering
 * across all PDF viewers and prevent character mangling (such as '¹' for ₹ or 'Ã' for AED).
 */
export function formatPdfCurrency(
  amount: number | null | undefined,
  currency: string = 'INR'
): string {
  const num = Number(amount) || 0;
  const curr = (currency || 'INR').toUpperCase().trim();
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  const standardFormatted = absNum.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  switch (curr) {
    case 'INR': {
      const inrFormatted = absNum.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${sign}Rs. ${inrFormatted}`;
    }
    case 'USD':
      return `${sign}$ ${standardFormatted}`;
    case 'EUR':
      return `${sign}EUR ${standardFormatted}`;
    case 'GBP':
      return `${sign}GBP ${standardFormatted}`;
    case 'AED':
      return `${sign}AED ${standardFormatted}`;
    case 'SAR':
      return `${sign}SAR ${standardFormatted}`;
    case 'KWD':
      return `${sign}KWD ${standardFormatted}`;
    case 'QAR':
      return `${sign}QAR ${standardFormatted}`;
    case 'OMR':
      return `${sign}OMR ${standardFormatted}`;
    case 'BHD':
      return `${sign}BHD ${standardFormatted}`;
    case 'CAD':
      return `${sign}CAD ${standardFormatted}`;
    case 'AUD':
      return `${sign}AUD ${standardFormatted}`;
    case 'SGD':
      return `${sign}SGD ${standardFormatted}`;
    default:
      return `${sign}${curr} ${standardFormatted}`;
  }
}

/**
 * Formats raw uppercase database status enums into clean human-friendly labels.
 */
function formatStatusLabel(status: string): string {
  const s = (status || '').toUpperCase().trim();
  switch (s) {
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'PAYMENT_COMPLETED':
    case 'PAID':
      return 'Paid';
    case 'COMPLETED':
      return 'Completed';
    case 'APPROVED':
      return 'Approved';
    case 'EXPIRED':
      return 'Expired';
    case 'REJECTED':
      return 'Rejected';
    case 'DRAFT':
      return 'Draft';
    case 'SENT':
      return 'Sent';
    case 'VIEWED':
      return 'Viewed';
    case 'PARTIALLY_PAID':
      return 'Partial';
    case 'OVERDUE':
      return 'Overdue';
    case 'UNPAID':
      return 'Unpaid';
    default:
      return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/**
 * Draws a stylized modern company monogram badge when an image logo is absent.
 */
function drawMonogramAvatar(
  doc: jsPDF,
  fontName: string,
  x: number,
  y: number,
  size: number,
  companyName?: string
) {
  const initials = getCompanyInitials(companyName);
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.roundedRect(x, y, size, size, 2.5, 2.5, 'F');
  doc.setFont(fontName, 'bold');
  doc.setFontSize(size * 0.52);
  doc.setTextColor(255, 255, 255);
  doc.text(initials, x + size / 2, y + size * 0.68, { align: 'center' });
}

export async function generateQuoteFlowPdfReport(data: ReportResponseData): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const fontName = 'helvetica';
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12; // 12mm margins give 186mm content width
  const contentWidth = pageWidth - margin * 2;
  const currency = data.metrics.currency || data.organization.currency || 'INR';

  // ==========================================
  // 1. Top Executive Banner & System Branding
  // ==========================================
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 21, 'F');

  // Top accent line
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 20.2, pageWidth, 0.8, 'F');

  // Brand Name
  doc.setFont(fontName, 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('QUOTEFLOW', margin, 12);

  // Subtitle
  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(199, 210, 254); // indigo-200
  doc.text('COMMERCIAL ACCOUNTING & EXECUTIVE REPORT', margin + 27, 12);

  // Generation timestamp
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // slate-300
  const genDateStr = `Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`;
  doc.text(genDateStr, pageWidth - margin, 12, { align: 'right' });

  // ==========================================
  // 2. Company Information & Brand Logo
  // ==========================================
  let currentY = 27;
  const logoSize = 14; // 14mm square badge
  const logoData = await loadPdfLogoImage(data.organization.logoUrl);

  let hasDrawnImage = false;
  if (logoData && logoData.base64) {
    try {
      doc.addImage(logoData.base64, 'PNG', margin, currentY, logoSize, logoSize);
      hasDrawnImage = true;
    } catch {
      hasDrawnImage = false;
    }
  }

  if (!hasDrawnImage) {
    drawMonogramAvatar(doc, fontName, margin, currentY, logoSize, data.organization.name);
  }

  // Company Name & Contact Meta beside the logo badge
  const textStartX = margin + logoSize + 4.5;
  doc.setFont(fontName, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(data.organization.name || 'Company Name', textStartX, currentY + 4.5);

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500

  const compDetails: string[] = [];
  if (data.organization.address) compDetails.push(data.organization.address);
  if (data.organization.phone) compDetails.push(`Tel: ${data.organization.phone}`);
  if (data.organization.email) compDetails.push(data.organization.email);
  if (data.organization.taxNumber) {
    const taxLabel = data.organization.taxLabel || 'Tax ID / GSTIN';
    compDetails.push(`${taxLabel}: ${data.organization.taxNumber}`);
  }

  if (compDetails.length > 0) {
    doc.text(compDetails.join('   •   '), textStartX, currentY + 10.5);
  }

  currentY += Math.max(logoSize, 14) + 4;

  // Horizontal separator
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // ==========================================
  // 3. Report Name & Date Scope Header
  // ==========================================
  doc.setFont(fontName, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59); // slate-800
  const categoryTitle = data.category.toUpperCase();
  const reportTitle = `${categoryTitle} STATEMENT — ${data.reportType.replace(/-/g, ' ').toUpperCase()}`;
  doc.text(reportTitle, margin, currentY + 2.5);

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const periodText = `Reporting Period: ${data.dateRangeLabel}`;
  doc.text(periodText, pageWidth - margin, currentY + 2.5, { align: 'right' });
  currentY += 7.5;

  // ==========================================
  // 4. Executive KPI Summary Cards (5 columns)
  // ==========================================
  const gap = 2;
  const cardWidth = (contentWidth - gap * 4) / 5;
  const cardHeight = 15;
  const cards = [
    { label: 'TOTAL SALES', value: formatPdfCurrency(data.metrics.totalSales, currency), color: [15, 23, 42] },
    { label: 'TOTAL INVOICED', value: formatPdfCurrency(data.metrics.totalInvoiced, currency), color: [79, 70, 229] },
    { label: 'COLLECTED (PAID)', value: formatPdfCurrency(data.metrics.totalPaid, currency), color: [16, 185, 129] },
    { label: 'OUTSTANDING', value: formatPdfCurrency(data.metrics.totalOutstanding, currency), color: [217, 119, 6] },
    { label: 'OVERDUE', value: formatPdfCurrency(data.metrics.totalOverdue, currency), color: [225, 29, 72] },
  ];

  cards.forEach((c, idx) => {
    const x = margin + idx * (cardWidth + gap);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    // Label
    doc.setFont(fontName, 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, x + 2.5, currentY + 4.5);

    // Value
    doc.setFont(fontName, 'bold');
    const valFontSize = c.value.length > 13 ? 7 : 8;
    doc.setFontSize(valFontSize);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, x + 2.5, currentY + 11);
  });

  currentY += cardHeight + 4.5;

  // ==========================================================
  // 5. Multi-Currency Breakdown (Grouped by Currency)
  // ==========================================================
  if (data.currencyBreakdown && data.currencyBreakdown.length > 1) {
    const boxHeight = 7 + data.currencyBreakdown.length * 4.8;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, currentY, contentWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(67, 56, 202); // indigo-700
    doc.text('MULTI-CURRENCY BREAKDOWN (GROUPED BY CURRENCY):', margin + 3.5, currentY + 4.5);

    let cbY = currentY + 8.8;
    data.currencyBreakdown.forEach((cb) => {
      doc.setFont(fontName, 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(15, 23, 42);
      doc.text(`${cb.currency}:`, margin + 3.5, cbY);

      doc.setFont(fontName, 'normal');
      doc.setTextColor(51, 65, 85);
      const summaryLine = `Invoiced: ${formatPdfCurrency(cb.totalInvoiced, cb.currency)}    •    Received: ${formatPdfCurrency(cb.totalPaid, cb.currency)}    •    Pending: ${formatPdfCurrency(cb.totalOutstanding, cb.currency)}`;
      doc.text(summaryLine, margin + 14, cbY);
      cbY += 4.8;
    });

    currentY += boxHeight + 4.5;
  }

  // ==========================================================
  // 6. Tax Breakdown (India GST / GCC VAT) — Structured Card Grid
  // Prevents text truncation or run-off
  // ==========================================================
  if (data.taxSummary.isIndiaGst && (data.taxSummary.totalTaxCollected > 0 || data.taxSummary.taxableSales > 0)) {
    const boxHeight = 15;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, boxHeight, 1.5, 1.5, 'FD');

    // Section title
    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 41, 59);
    doc.text('INDIA GST BREAKDOWN', margin + 3.5, currentY + 4.5);

    // 4-column balanced layout
    const colW = contentWidth / 4;

    // Col 1: Taxable Sales
    doc.setFont(fontName, 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text('TAXABLE SALES', margin + 3.5, currentY + 9);
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(formatPdfCurrency(data.taxSummary.taxableSales, currency), margin + 3.5, currentY + 13);

    // Col 2: CGST
    doc.setFont(fontName, 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text('CGST', margin + colW, currentY + 9);
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(formatPdfCurrency(data.taxSummary.cgstTotal || 0, currency), margin + colW, currentY + 13);

    // Col 3: SGST
    doc.setFont(fontName, 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text('SGST', margin + colW * 2, currentY + 9);
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(formatPdfCurrency(data.taxSummary.sgstTotal || 0, currency), margin + colW * 2, currentY + 13);

    // Col 4: Total GST Collected (highlighted)
    doc.setFont(fontName, 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(79, 70, 229);
    const igstSuffix = data.taxSummary.igstTotal ? ` (IGST: ${formatPdfCurrency(data.taxSummary.igstTotal, currency)})` : '';
    doc.text('TOTAL GST COLLECTED', margin + colW * 3, currentY + 9);
    doc.setFontSize(7.5);
    doc.setTextColor(79, 70, 229);
    doc.text(`${formatPdfCurrency(data.taxSummary.totalTaxCollected, currency)}${igstSuffix}`, margin + colW * 3, currentY + 13);

    currentY += boxHeight + 4.5;
  } else if (data.taxSummary.isUaeVat && (data.taxSummary.totalTaxCollected > 0 || data.taxSummary.taxableSales > 0)) {
    const boxHeight = 15;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 41, 59);
    doc.text('GCC VAT BREAKDOWN', margin + 3.5, currentY + 4.5);

    const colW = contentWidth / 3;

    doc.setFont(fontName, 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text('TAXABLE SUPPLIES', margin + 3.5, currentY + 9);
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(formatPdfCurrency(data.taxSummary.taxableSales, currency), margin + 3.5, currentY + 13);

    doc.setFont(fontName, 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text('STANDARD 5% VAT', margin + colW, currentY + 9);
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(formatPdfCurrency(data.taxSummary.vatStandardTotal || data.taxSummary.totalTaxCollected, currency), margin + colW, currentY + 13);

    doc.setFont(fontName, 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(79, 70, 229);
    doc.text('TOTAL VAT COLLECTED', margin + colW * 2, currentY + 9);
    doc.setFontSize(7.5);
    doc.setTextColor(79, 70, 229);
    doc.text(formatPdfCurrency(data.taxSummary.totalTaxCollected, currency), margin + colW * 2, currentY + 13);

    currentY += boxHeight + 4.5;
  }

  // ==========================================
  // 7. Statement Data Table
  // ==========================================
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
    const custName = (r.customerName || 'Unknown').trim();
    const compName = (r.customerCompany || '').trim();
    const isSameName = compName.toLowerCase() === custName.toLowerCase();
    const customerDisplay = compName && !isSameName ? `${custName} (${compName})` : custName;

    return [
      r.date || '',
      r.documentNumber || '',
      customerDisplay,
      formatStatusLabel(r.status),
      formatPdfCurrency(r.grandTotal, rowCurr),
      formatPdfCurrency(r.taxAmount, rowCurr),
      formatPdfCurrency(r.paidAmount, rowCurr),
      formatPdfCurrency(r.balanceAmount, rowCurr),
    ];
  });

  // Calculate grouped totals for the footer rows
  const currenciesInRows = Array.from(new Set(data.rows.map((r) => r.currency || currency)));
  const footRows =
    currenciesInRows.length <= 1
      ? (() => {
          const rowCurr = currenciesInRows[0] || currency;
          const totalAmountSum = data.rows.reduce((s, r) => s + r.grandTotal, 0);
          const totalTaxSum = data.rows.reduce((s, r) => s + r.taxAmount, 0);
          const totalPaidSum = data.rows.reduce((s, r) => s + r.paidAmount, 0);
          const totalBalanceSum = data.rows.reduce((s, r) => s + r.balanceAmount, 0);
          return [
            [
              'Totals',
              `${data.rows.length} docs`,
              '',
              '',
              formatPdfCurrency(totalAmountSum, rowCurr),
              formatPdfCurrency(totalTaxSum, rowCurr),
              formatPdfCurrency(totalPaidSum, rowCurr),
              formatPdfCurrency(totalBalanceSum, rowCurr),
            ],
          ];
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
            formatPdfCurrency(totalAmountSum, currCode),
            formatPdfCurrency(totalTaxSum, currCode),
            formatPdfCurrency(totalPaidSum, currCode),
            formatPdfCurrency(totalBalanceSum, currCode),
          ];
        });

  runAutoTable(doc, {
    head: [tableHeaders],
    body: tableRows,
    foot: footRows,
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 18 },
    theme: 'grid',
    styles: {
      font: fontName,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      font: fontName,
      fontSize: 7.2,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.2,
    },
    bodyStyles: {
      font: fontName,
      fontSize: 6.8,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    footStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42],
      font: fontName,
      fontSize: 7,
      fontStyle: 'bold',
      cellPadding: 2.2,
    },
    alternateRowStyles: {
      fillColor: [252, 252, 254],
    },
    columnStyles: {
      0: { cellWidth: 19, halign: 'left' },             // Date: 19mm
      1: { cellWidth: 22, fontStyle: 'bold' },          // Doc #: 22mm
      2: { cellWidth: 47, halign: 'left' },             // Customer: 47mm
      3: { cellWidth: 18, halign: 'center' },           // Status: 18mm
      4: { cellWidth: 20, halign: 'right' },            // Amount: 20mm
      5: { cellWidth: 20, halign: 'right' },            // Tax: 20mm
      6: { cellWidth: 20, halign: 'right' },            // Paid: 20mm
      7: { cellWidth: 20, halign: 'right', fontStyle: 'bold' }, // Balance: 20mm
    },
    didParseCell: (hookData: any) => {
      // Color status badges in body
      if (hookData.section === 'body' && hookData.column.index === 3) {
        const val = String(hookData.cell.raw || '');
        if (val === 'Paid' || val === 'Completed' || val === 'Approved') {
          hookData.cell.styles.textColor = [16, 185, 129]; // emerald-600
          hookData.cell.styles.fontStyle = 'bold';
        } else if (val === 'In Progress' || val === 'Sent') {
          hookData.cell.styles.textColor = [79, 70, 229]; // indigo-600
          hookData.cell.styles.fontStyle = 'bold';
        } else if (val === 'Expired' || val === 'Rejected' || val === 'Overdue') {
          hookData.cell.styles.textColor = [225, 29, 72]; // rose-600
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
    },
    showHead: 'everyPage',
    didDrawPage: (hookData: any) => {
      // Page footer
      const pageStr = `Page ${hookData.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.setFont(fontName, 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

      doc.text(
        'QuoteFlow by Blend & Bold • Confidential Accounting & Operational Record',
        margin,
        pageHeight - 6
      );
      doc.text(pageStr, pageWidth - margin, pageHeight - 6, { align: 'right' });
    },
  });

  return new Uint8Array(doc.output('arraybuffer'));
}
