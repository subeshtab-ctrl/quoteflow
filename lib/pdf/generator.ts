import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '@/types/database';
import {
  formatCurrency,
  calculateQuotationTotals,
  isValidDocumentText,
} from '@/lib/quotations/calculations';
import { format } from 'date-fns';

import { registerPdfFonts, loadPdfLogoImage } from '@/lib/pdf/font-loader';

function getCompanyInitials(name?: string): string {
  if (!name) return 'QF';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function safeFormatDate(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return String(dateStr);
  }
}

/**
 * Generate a PDF document buffer for a quotation matching the on-screen Preview
 */
export async function generateQuotationPdf(quotation: Quotation): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const fontsLoaded = registerPdfFonts(doc);
  const fontName = fontsLoaded ? 'Roboto' : 'helvetica';

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let org: any = quotation.organization;
  if (!org || !org.name || org.name === 'QuoteFlow Technologies') {
    try {
      const { getDataStore } = await import('@/lib/supabase/data-store');
      const store = getDataStore();
      const dbOrg = await store.getOrganization(quotation.organization_id);
      if (dbOrg) {
        org = dbOrg;
      }
    } catch {
      // fallback
    }
  }

  if (!org) {
    org = {
      name: 'QuoteFlow Technologies',
      email: 'billing@quoteflow.app',
      phone: '+91 98765 43210',
      address_line1: 'Tech Park, Main Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560038',
      country: 'India',
      gst_vat_number: '29ABCDE1234F1Z5',
      brand_color: '#4f46e5',
      invoice_footer: 'Thank you for choosing us!',
      logo_url: null,
    };
  }

  let customer: any = quotation.customer;
  if (!customer || !customer.name || customer.name === 'Valued Client') {
    try {
      const { getDataStore } = await import('@/lib/supabase/data-store');
      const store = getDataStore();
      const dbCustomer = await store.getCustomer(quotation.customer_id);
      if (dbCustomer) {
        customer = dbCustomer;
      }
    } catch {
      // fallback
    }
  }

  if (!customer) {
    customer = {
      name: 'Valued Client',
      company_name: '',
      email: 'client@example.com',
      phone: '',
      billing_address: '',
      city: '',
      state: '',
      country: '',
      tax_number: '',
    };
  }

  const currency = quotation.currency || 'INR';
  const taxMode = quotation.tax_mode || org?.default_tax_mode || 'exclusive';
  const placeOfSupply =
    quotation.place_of_supply ||
    customer?.place_of_supply ||
    customer?.billing_state ||
    customer?.state ||
    null;
  const isIndiaGst = Boolean(
    org?.country === 'India' ||
      currency === 'INR' ||
      org?.gst_registered ||
      org?.gstin ||
      org?.gst_vat_number
  );

  // Centralized calculation engine (single source of truth matching Preview)
  const calculated = calculateQuotationTotals(
    (quotation.items || []).map((it) => ({
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unit_price) || 0,
      tax_rate: Number(it.tax_rate) || 0,
    })),
    quotation.discount_type || null,
    Number(quotation.discount_value) || 0,
    {
      taxMode,
      taxName: quotation.tax_name || org?.tax_label || 'GST',
      isIndiaGst,
      businessState: org?.business_state || org?.state || null,
      placeOfSupply,
    }
  );

  const displaySubtotal = calculated.subtotal;
  const displayDiscount = calculated.discount_amount;
  const displayTax = calculated.tax_amount;
  const displayTotal = calculated.grand_total;
  const displayTaxBreakdown =
    quotation.tax_breakdown && quotation.tax_breakdown.length > 0
      ? quotation.tax_breakdown
      : calculated.tax_breakdown;

  // Validity days calculation matching Preview
  const validityDays = (() => {
    if (!quotation.issue_date || !quotation.valid_until) return 14;
    const startStr = String(quotation.issue_date).split('T')[0];
    const endStr = String(quotation.valid_until).split('T')[0];
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const startUtc = Date.UTC(sy, (sm || 1) - 1, sd || 1);
    const endUtc = Date.UTC(ey, (em || 1) - 1, ed || 1);
    const diffDays = Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  })();

  // 1. Top Decorative Brand Bar
  doc.setFillColor(79, 70, 229); // Brand Indigo
  doc.rect(0, 0, pageWidth, 4, 'F');

  // 2. Company Logo, Name & Details (Left)
  const headerStartY = 13;
  let compY = headerStartY;
  const logoData = await loadPdfLogoImage(org.logo_url);
  if (logoData) {
    try {
      doc.addImage(logoData.base64, 'PNG', margin, headerStartY, 13, 13);
      doc.setFont(fontName, 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text(org.name || 'QuoteFlow', margin + 16, headerStartY + 5.5);
      compY = headerStartY + 16;
    } catch {
      doc.setFont(fontName, 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text(org.name || 'QuoteFlow', margin, headerStartY + 5);
      compY = headerStartY + 10;
    }
  } else {
    const initials = getCompanyInitials(org.name);
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(margin, headerStartY, 12, 12, 2.5, 2.5, 'F');
    doc.setFont(fontName, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(initials, margin + 6, headerStartY + 8, { align: 'center' });

    doc.setFont(fontName, 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(org.name || 'QuoteFlow', margin + 15, headerStartY + 5.5);
    compY = headerStartY + 15;
  }

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const compGst = org.gstin || org.gst_vat_number;
  const compLines: string[] = [
    [
      org.address_line1,
      [org.city, org.business_state || org.state, org.postal_code].filter(Boolean).join(' '),
      org.country,
    ]
      .filter(Boolean)
      .join(', '),
    [org.email ? `Email: ${org.email}` : null, org.phone ? `Tel: ${org.phone}` : null]
      .filter(Boolean)
      .join(' | '),
    compGst ? `GSTIN / Tax ID: ${compGst}` : '',
  ].filter(Boolean) as string[];

  compLines.forEach((line: string) => {
    doc.text(line, margin, compY);
    compY += 3.8;
  });

  // 3. Document Title & Details (Right aligned)
  let rightY = headerStartY;
  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(79, 70, 229);
  doc.text('OFFICIAL ESTIMATE / QUOTATION', pageWidth - margin, rightY + 3, { align: 'right' });

  doc.setFont(fontName, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(quotation.quotation_number, pageWidth - margin, rightY + 10.5, { align: 'right' });

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Issue Date: ${safeFormatDate(quotation.issue_date)}`, pageWidth - margin, rightY + 15.5, {
    align: 'right',
  });
  doc.text(`Valid Until: ${safeFormatDate(quotation.valid_until)}`, pageWidth - margin, rightY + 19.5, {
    align: 'right',
  });

  let nextRightY = rightY + 23.5;
  if (displayTax > 0) {
    doc.setFont(fontName, 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(
      `Tax Mode: ${taxMode === 'inclusive' ? 'Tax Included' : 'Tax Excluded'}`,
      pageWidth - margin,
      nextRightY,
      { align: 'right' }
    );
    nextRightY += 4.5;
  }

  // Status Badge
  const status = quotation.status;
  let statusColor: [number, number, number] = [100, 116, 139];
  if (status === 'APPROVED' || status === 'COMPLETED' || status === 'PAYMENT_COMPLETED')
    statusColor = [22, 163, 74];
  if (status === 'SENT' || status === 'VIEWED' || status === 'IN_PROGRESS')
    statusColor = [79, 70, 229];
  if (status === 'REJECTED') statusColor = [220, 38, 38];

  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth - margin - 32, nextRightY - 1, 32, 5.5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(fontName, 'bold');
  doc.setFontSize(7);
  doc.text(status, pageWidth - margin - 16, nextRightY + 2.8, { align: 'center' });

  if (quotation.is_paid) {
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(pageWidth - margin - 60, nextRightY - 1, 25, 5.5, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(fontName, 'bold');
    doc.setFontSize(7);
    doc.text('PAID', pageWidth - margin - 47.5, nextRightY + 2.8, { align: 'center' });
  }
  nextRightY += 6;

  // 4. Client Info & Project Scope Box (Matching Preview 2-column card)
  const clientBoxY = Math.max(compY, nextRightY) + 3;
  const custGst = quotation.customer_gstin || customer.customer_gstin || customer.tax_number;
  const custAddress = [
    customer.billing_address,
    customer.city,
    customer.billing_state || customer.state,
    customer.postal_code,
    customer.country,
  ]
    .filter(Boolean)
    .join(', ');

  let boxLines = 3;
  if (custAddress) boxLines += 1;
  if (custGst) boxLines += 1;
  if (placeOfSupply) boxLines += 1;
  const clientBoxHeight = Math.max(26, boxLines * 4.2 + 6);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, clientBoxY, contentWidth, clientBoxHeight, 2.5, 2.5, 'FD');

  // Left column: Quotation For
  let leftY = clientBoxY + 5.5;
  doc.setFont(fontName, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('QUOTATION FOR', margin + 4, leftY);
  leftY += 4.5;

  doc.setFont(fontName, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(customer.company_name || customer.name || 'Valued Client', margin + 4, leftY);
  leftY += 4;

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  if (customer.company_name && customer.name) {
    doc.text(`Attn: ${customer.name}`, margin + 4, leftY);
    leftY += 3.8;
  }
  if (custAddress) {
    const addrLines = doc.splitTextToSize(custAddress, 88);
    doc.text(addrLines[0], margin + 4, leftY);
    leftY += 3.8;
  }
  const contactStr = [
    customer.email ? `Email: ${customer.email}` : null,
    customer.phone ? `Tel: ${customer.phone}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
  if (contactStr) {
    doc.text(contactStr, margin + 4, leftY);
    leftY += 3.8;
  }
  if (custGst) {
    doc.setFont(fontName, 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`GSTIN / Tax ID: ${custGst}`, margin + 4, leftY);
    leftY += 3.8;
  }
  if (placeOfSupply) {
    doc.setFont(fontName, 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(`Place of Supply: ${placeOfSupply}`, margin + 4, leftY);
  }

  // Right column: Project / Scope Title
  let scopeY = clientBoxY + 5.5;
  const scopeX = margin + contentWidth / 2 + 4;
  doc.setFont(fontName, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('PROJECT / SCOPE TITLE', scopeX, scopeY);
  scopeY += 4.5;

  doc.setFont(fontName, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(quotation.title || 'Commercial Estimate', 82);
  doc.text(titleLines, scopeX, scopeY);
  scopeY += titleLines.length * 4.2 + 1;

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Validity: ${validityDays} ${validityDays === 1 ? 'day' : 'days'} from issuance`,
    scopeX,
    scopeY
  );

  // 5. Line Items Table (matching Preview columns & values)
  const tableData = (quotation.items || []).map((item, index) => {
    const calcItem = calculated.items[index];
    const lineTotal = calcItem ? calcItem.line_total : item.line_total;
    const codeLabel = item.classification_code
      ? `\n${item.classification_type || (item.item_type === 'SERVICE' ? 'SAC' : 'HSN')}: ${item.classification_code}`
      : '';
    return [
      (index + 1).toString(),
      `${item.description || ''}${codeLabel}`,
      `${item.quantity} ${item.unit || 'unit'}`,
      formatCurrency(item.unit_price, currency),
      item.tax_rate > 0
        ? `${item.tax_rate}%${taxMode === 'inclusive' ? ' (Incl.)' : ''}`
        : '-',
      formatCurrency(lineTotal, currency),
    ];
  });

  autoTable(doc, {
    startY: clientBoxY + clientBoxHeight + 5,
    margin: { left: margin, right: margin, bottom: 20 },
    showHead: 'everyPage',
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Tax', 'Total']],
    body: tableData,
    theme: 'plain',
    styles: {
      font: fontName,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [71, 85, 105],
      font: fontName,
      fontSize: 8,
      fontStyle: 'bold',
      lineWidth: { top: 0.2, bottom: 0.25 },
      lineColor: [226, 232, 240],
      cellPadding: 3,
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      font: fontName,
      fontSize: 8.5,
      lineWidth: { bottom: 0.15 },
      lineColor: [241, 245, 249],
      cellPadding: 3.2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', textColor: [148, 163, 184] },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
  });

  // 6. Summary Totals Box & Left Notes/Terms (Prevent page-break splitting)
  let sectionStartY = (doc as any).lastAutoTable.finalY + 6;
  const neededSummaryHeight =
    24 +
    (displayDiscount > 0 ? 5 : 0) +
    displayTaxBreakdown.length * 5 +
    (quotation.paid_amount && quotation.paid_amount > 0 ? 12 : 0);

  if (sectionStartY + neededSummaryHeight > pageHeight - 20) {
    doc.addPage();
    sectionStartY = margin + 4;
  }

  const summaryWidth = 78;
  const summaryX = pageWidth - margin - summaryWidth;
  let curY = sectionStartY + 4;

  // Draw subtle background card for totals matching Preview
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(summaryX - 3, sectionStartY - 1, summaryWidth + 3, neededSummaryHeight + 2, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    taxMode === 'inclusive' ? 'Subtotal (Taxable Amount)' : 'Subtotal',
    summaryX,
    curY
  );
  doc.setFont(fontName, 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(formatCurrency(displaySubtotal, currency), pageWidth - margin - 3, curY, {
    align: 'right',
  });
  curY += 5;

  if (displayDiscount > 0) {
    doc.setFont(fontName, 'normal');
    doc.setTextColor(225, 29, 72);
    doc.text(
      `Discount (${quotation.discount_type === 'PERCENTAGE' ? `${quotation.discount_value}%` : 'Fixed'})`,
      summaryX,
      curY
    );
    doc.setFont(fontName, 'bold');
    doc.text(`-${formatCurrency(displayDiscount, currency)}`, pageWidth - margin - 3, curY, {
      align: 'right',
    });
    curY += 5;
  }

  if (displayTaxBreakdown.length > 0) {
    for (const tb of displayTaxBreakdown) {
      doc.setFont(fontName, 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(tb.label, summaryX, curY);
      doc.setFont(fontName, 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(formatCurrency(tb.amount, currency), pageWidth - margin - 3, curY, {
        align: 'right',
      });
      curY += 5;
    }
  } else if (displayTax > 0) {
    doc.setFont(fontName, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${quotation.tax_name || org?.tax_label || 'Tax'} (${quotation.tax_rate}%${taxMode === 'inclusive' ? ' Included' : ''})`,
      summaryX,
      curY
    );
    doc.setFont(fontName, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(formatCurrency(displayTax, currency), pageWidth - margin - 3, curY, {
      align: 'right',
    });
    curY += 5;
  }

  // Divider before Grand Total
  doc.setDrawColor(226, 232, 240);
  doc.line(summaryX, curY - 2, pageWidth - margin - 3, curY - 2);
  curY += 2.5;

  doc.setFont(fontName, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Quotation Value', summaryX, curY);
  doc.setFontSize(11);
  doc.setTextColor(67, 56, 202);
  doc.text(formatCurrency(displayTotal, currency), pageWidth - margin - 3, curY, {
    align: 'right',
  });
  curY += 5.5;

  const hasPaymentRecorded = Boolean(
    quotation.is_paid || ((quotation.paid_amount ?? 0) > 0)
  );
  if (hasPaymentRecorded) {
    const paidAmt =
      quotation.paid_amount !== undefined
        ? Number(quotation.paid_amount)
        : quotation.is_paid
          ? displayTotal
          : 0;
    const balAmt =
      quotation.balance_amount !== undefined
        ? Number(quotation.balance_amount)
        : quotation.is_paid
          ? 0
          : Math.max(0, displayTotal - paidAmt);

    doc.setFont(fontName, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105);
    doc.text(
      `Amount Paid${quotation.advance_percentage ? ` (${quotation.advance_percentage}% Adv)` : ''}`,
      summaryX,
      curY
    );
    doc.text(`-${formatCurrency(paidAmt, currency)}`, pageWidth - margin - 3, curY, {
      align: 'right',
    });
    curY += 4.5;

    doc.setFont(fontName, 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Remaining Balance Due', summaryX, curY);
    doc.setTextColor(balAmt === 0 ? 5 : 180, balAmt === 0 ? 150 : 83, balAmt === 0 ? 105 : 9);
    doc.text(formatCurrency(balAmt, currency), pageWidth - margin - 3, curY, {
      align: 'right',
    });
    curY += 4.5;
  }

  // 7. Left Side: Notes & Terms & Conditions (Strictly hidden if empty/whitespace/N/A/Nil)
  let notesY = sectionStartY + 2;
  const leftMaxWidth = summaryX - margin - 8;

  const hasQuotationNotes = isValidDocumentText(quotation.notes);
  const hasQuotationTerms = isValidDocumentText(quotation.terms_conditions);

  if (hasQuotationNotes) {
    const notesText = quotation.notes!.trim();
    const splitNotes = doc.splitTextToSize(notesText, leftMaxWidth);
    const blockH = splitNotes.length * 3.6 + 8;
    if (notesY + blockH > pageHeight - 18) {
      doc.addPage();
      notesY = margin + 4;
    }

    doc.setFont(fontName, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('NOTES & SPECIFICATIONS', margin, notesY);
    notesY += 4;

    doc.setFont(fontName, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(splitNotes, margin, notesY);
    notesY += splitNotes.length * 3.6 + 5;
  }

  if (hasQuotationTerms) {
    const termsText = quotation.terms_conditions!
      .trim()
      .replace(
        /Quotation valid for \d+ days?/gi,
        `Quotation valid for ${validityDays} ${validityDays === 1 ? 'day' : 'days'}`
      );
    const splitTerms = doc.splitTextToSize(termsText, leftMaxWidth);
    const blockH = splitTerms.length * 3.6 + 8;
    if (notesY + blockH > pageHeight - 18) {
      doc.addPage();
      notesY = margin + 4;
    }

    doc.setFont(fontName, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('TERMS & CONDITIONS', margin, notesY);
    notesY += 4;

    doc.setFont(fontName, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(splitTerms, margin, notesY);
    notesY += splitTerms.length * 3.6 + 5;
  }

  // 8. Payment Instructions & Remittance Details
  let afterSummaryY = Math.max(notesY, curY + 6);
  const bankInfo = quotation.bank_details || org?.default_bank_details;
  const upiInfo = quotation.upi_details || org?.default_upi_details;
  const cryptoInfo = quotation.crypto_details || org?.default_crypto_details;

  const mode = quotation.payment_display_mode || org?.default_payment_display_mode || 'BOTH';
  let showBank = quotation.show_bank_details ?? org?.default_show_bank_details ?? true;
  let showUpi = quotation.show_upi_details ?? org?.default_show_upi_details ?? true;
  let showCrypto = quotation.show_crypto_details ?? org?.default_show_crypto_details ?? false;

  if (mode === 'CRYPTO_ONLY') {
    showBank = false;
    showUpi = false;
    showCrypto = true;
  } else if (mode === 'BANK_ONLY') {
    showBank = true;
    showUpi = false;
    showCrypto = false;
  } else if (mode === 'UPI_ONLY') {
    showBank = false;
    showUpi = true;
    showCrypto = false;
  } else if (mode === 'ALL') {
    showBank = true;
    showUpi = true;
    showCrypto = true;
  }

  const hasPaymentDetails =
    isValidDocumentText(quotation.payment_terms_instructions) ||
    (quotation.advance_percentage !== undefined &&
      quotation.advance_percentage !== null &&
      quotation.advance_percentage > 0) ||
    Boolean(quotation.accepted_payment_methods && quotation.accepted_payment_methods.length > 0) ||
    Boolean(showBank && (bankInfo?.bank_name || bankInfo?.account_number)) ||
    Boolean(showUpi && (upiInfo?.upi_id || upiInfo?.qr_code_url)) ||
    Boolean(showCrypto && (cryptoInfo?.wallet_address || cryptoInfo?.qr_code_url));

  if (hasPaymentDetails) {
    if (afterSummaryY + 32 > pageHeight - 18) {
      doc.addPage();
      afterSummaryY = margin + 4;
    }

    doc.setFont(fontName, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('PAYMENT & REMITTANCE INSTRUCTIONS', margin, afterSummaryY);
    afterSummaryY += 4.5;

    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    if (
      quotation.advance_percentage !== undefined &&
      quotation.advance_percentage !== null &&
      quotation.advance_percentage > 0
    ) {
      doc.setFont(fontName, 'bold');
      doc.text(
        `• Advance Required: ${quotation.advance_percentage}% to commence work`,
        margin,
        afterSummaryY
      );
      doc.setFont(fontName, 'normal');
      afterSummaryY += 4;
    }

    if (quotation.accepted_payment_methods && quotation.accepted_payment_methods.length > 0) {
      doc.text(
        `• Accepted Payment Modes: ${quotation.accepted_payment_methods.join(', ')}`,
        margin,
        afterSummaryY
      );
      afterSummaryY += 4;
    }

    if (showBank && (bankInfo?.bank_name || bankInfo?.account_number)) {
      doc.setFont(fontName, 'bold');
      doc.text(
        `• Bank Remittance: ${bankInfo.bank_name || 'Bank Transfer'}`,
        margin,
        afterSummaryY
      );
      doc.setFont(fontName, 'normal');
      afterSummaryY += 3.8;

      let bankLine = '';
      if (bankInfo.account_number) bankLine += `A/C: ${bankInfo.account_number}  `;
      if (bankInfo.account_name) bankLine += `Name: ${bankInfo.account_name}  `;
      if (bankLine) {
        doc.text(`   ${bankLine.trim()}`, margin, afterSummaryY);
        afterSummaryY += 3.8;
      }

      let codeLine = '';
      if (bankInfo.ifsc_code) codeLine += `IFSC: ${bankInfo.ifsc_code}  `;
      if (bankInfo.swift_code) codeLine += `SWIFT: ${bankInfo.swift_code}  `;
      if (bankInfo.branch_name) codeLine += `Branch: ${bankInfo.branch_name}`;
      if (codeLine) {
        doc.text(`   ${codeLine.trim()}`, margin, afterSummaryY);
        afterSummaryY += 3.8;
      }
    }

    if (showUpi && (upiInfo?.upi_id || upiInfo?.qr_code_url)) {
      doc.setFont(fontName, 'bold');
      doc.text(
        `• UPI Payment (India): ${upiInfo.upi_id || ''}${upiInfo.payee_name ? ` (${upiInfo.payee_name})` : ''}`,
        margin,
        afterSummaryY
      );
      doc.setFont(fontName, 'normal');
      afterSummaryY += 3.8;
    }

    if (showCrypto && (cryptoInfo?.wallet_address || cryptoInfo?.qr_code_url)) {
      doc.setFont(fontName, 'bold');
      doc.text(
        `• Crypto Payment: ${cryptoInfo.currency || 'USDT'} (${cryptoInfo.network || 'TRC20'})`,
        margin,
        afterSummaryY
      );
      doc.setFont(fontName, 'normal');
      afterSummaryY += 3.8;

      if (cryptoInfo.wallet_address) {
        doc.text(`   Wallet: ${cryptoInfo.wallet_address}`, margin, afterSummaryY);
        afterSummaryY += 3.8;
      }
    }

    if (isValidDocumentText(quotation.payment_terms_instructions)) {
      const splitPayNotes = doc.splitTextToSize(
        quotation.payment_terms_instructions!.trim(),
        contentWidth
      );
      doc.text(splitPayNotes, margin, afterSummaryY);
      afterSummaryY += splitPayNotes.length * 3.5 + 2;
    }
  }

  // 9. Digital Signature Seal (if Approved)
  if (quotation.status === 'APPROVED' && quotation.signature) {
    const sig = quotation.signature;
    let sigBoxY = afterSummaryY + 6;
    if (sigBoxY + 36 > pageHeight - 16) {
      doc.addPage();
      sigBoxY = margin + 6;
    }

    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(pageWidth - margin - 85, sigBoxY, 85, 32, 2, 2, 'FD');

    doc.setFont(fontName, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    doc.text('DIGITALLY APPROVED & SIGNED', pageWidth - margin - 80, sigBoxY + 6);

    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Signer: ${sig.signer_name}`, pageWidth - margin - 80, sigBoxY + 12);
    doc.text(`Email: ${sig.signer_email}`, pageWidth - margin - 80, sigBoxY + 17);
    doc.text(
      `Date: ${format(new Date(sig.signed_at), 'dd MMM yyyy, hh:mm a')}`,
      pageWidth - margin - 80,
      sigBoxY + 22
    );
    if (sig.document_hash) {
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Hash: ${sig.document_hash.substring(0, 24)}...`,
        pageWidth - margin - 80,
        sigBoxY + 27.5
      );
    }
  }

  // 10. Document Footer & Watermarks on every page
  const compName = org.name || 'our company';
  const footerText = (org.invoice_footer || `Thank you for partnering with ${compName}.`).replace(
    /The Mining Future/gi,
    compName
  );

  const totalPages = (doc.internal as any).getNumberOfPages
    ? (doc.internal as any).getNumberOfPages()
    : 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Footer line & text
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(footerText, pageWidth / 2, pageHeight - 8.5, { align: 'center' });
    if (totalPages > 1) {
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 8.5, {
        align: 'right',
      });
    }

    if (quotation.environment === 'test') {
      doc.setFillColor(245, 158, 11);
      doc.rect(0, 0, pageWidth, 5.5, 'F');
      doc.setFont(fontName, 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('TEST DOCUMENT — NOT A REAL QUOTATION', pageWidth / 2, 3.8, { align: 'center' });

      doc.setFont(fontName, 'bold');
      doc.setFontSize(36);
      doc.setTextColor(220, 220, 225);
      doc.text('TEST DOCUMENT', pageWidth / 2, pageHeight / 2 - 8, {
        align: 'center',
        angle: 45,
      });
      doc.setFontSize(18);
      doc.text('NOT A REAL ESTIMATE', pageWidth / 2, pageHeight / 2 + 10, {
        align: 'center',
        angle: 45,
      });
    }
  }

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}

