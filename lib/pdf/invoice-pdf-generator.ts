import { jsPDF } from 'jspdf';
import { Invoice } from '@/types/database';
import {
  formatCurrency,
  calculateQuotationTotals,
  isValidDocumentText,
  sanitizeTaxBreakdown,
  getDocumentTitle,
} from '@/lib/quotations/calculations';
import { getCountryProfile } from '@/lib/tax/country-config';
import { format } from 'date-fns';

import { registerPdfFonts, ensurePdfFontsLoaded, runAutoTable, loadPdfLogoImage } from '@/lib/pdf/font-loader';
import { parseLogoUrl } from '@/lib/utils/logo';

function getCompanyInitials(name?: string): string {
  if (!name) return 'QF';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function parseHexColor(hex?: string | null, defaultRgb: [number, number, number] = [79, 70, 229]): [number, number, number] {
  if (!hex || typeof hex !== 'string') return defaultRgb;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
  } else if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
  }
  return defaultRgb;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

/**
 * Generates an official, beautifully designed Commercial Tax Invoice PDF
 * matching the exact visual design of the printable invoice sheet.
 */
export async function generateInvoicePdf(invoice: Invoice): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  await ensurePdfFontsLoaded();
  const fontsLoaded = registerPdfFonts(doc);
  const fontName = fontsLoaded ? 'Roboto' : 'helvetica';

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Resolve Organization
  let org: any = invoice.organization;

  if (!org) {
    org = {
      name: 'QuoteFlow Technologies',
      email: 'billing@quoteflow.app',
      phone: '+91 98765 43210',
      address_line1: 'Corporate Business Center',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560038',
      country: 'India',
      gst_vat_number: '29ABCDE1234F1Z5',
      brand_color: '#4f46e5',
      invoice_footer: 'Thank you for your business!',
      logo_url: null,
    };
  }

  // Resolve Customer
  let customer: any = invoice.customer;

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
      postal_code: '',
      tax_number: '',
    };
  }

  const currency = invoice.currency || org.default_currency || 'INR';
  const countryNameOrCode = org.country || org.business_country || '';

  const isIndia = Boolean(
    (org.business_country || '').toUpperCase() === 'IN' ||
    (org.country || '').toLowerCase() === 'india' ||
    (org.country || '').toUpperCase() === 'IN' ||
    org.billing_region === 'INDIA' ||
    currency === 'INR' ||
    org.default_currency === 'INR'
  );

  const isUAE = Boolean(
    (org.business_country || '').toUpperCase() === 'AE' ||
    (org.country || '').toLowerCase().includes('emirates') ||
    (org.country || '').toLowerCase() === 'uae' ||
    currency === 'AED' ||
    org.default_currency === 'AED'
  );

  const countryProfile = getCountryProfile(countryNameOrCode || (isUAE ? 'AE' : (isIndia ? 'IN' : 'US')));

  const effectiveTaxName = !isIndia
    ? (invoice.tax_name && !invoice.tax_name.toUpperCase().includes('GST')
        ? invoice.tax_name
        : (isUAE ? 'VAT' : (org.tax_label && !org.tax_label.toUpperCase().includes('GST') ? org.tax_label : 'Tax')))
    : (invoice.tax_name || org.tax_label || 'GST');

  const taxMode = invoice.tax_mode || org.default_tax_mode || 'exclusive';
  const placeOfSupply = invoice.place_of_supply || customer.place_of_supply || customer.billing_state || customer.state || org.business_state || org.state || '';
  const items = invoice.items || [];

  const calcTotals = calculateQuotationTotals(
    items.map(it => ({
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unit_price) || 0,
      discount_percent: Number(it.discount_percent) || 0,
      tax_rate: (it.tax_rate !== undefined && it.tax_rate !== null && it.tax_rate !== '')
        ? Number(it.tax_rate)
        : Number(invoice.tax_rate || 0),
    })),
    currency,
    {
      taxMode,
      currency,
      country: countryNameOrCode || (isUAE ? 'AE' : (isIndia ? 'IN' : 'US')),
      taxName: effectiveTaxName,
      isIndiaGst: isIndia,
      taxRate: Number(invoice.tax_rate || 0),
      businessState: org.business_state || org.state,
      placeOfSupply,
      gstEnabled: isIndia && org.gst_registered !== false,
    }
  );

  const displaySubtotal = (Number(invoice.subtotal) > 0) ? Number(invoice.subtotal) : calcTotals.subtotal;
  const displayDiscount = (Number(invoice.discount_amount) > 0) ? Number(invoice.discount_amount) : calcTotals.discount_amount;
  const displayTax = (Number(invoice.tax_amount) > 0) ? Number(invoice.tax_amount) : calcTotals.tax_amount;
  const grandTotal = (Number(invoice.grand_total) > 0) ? Number(invoice.grand_total) : calcTotals.grand_total;
  const displayTaxBreakdown = sanitizeTaxBreakdown(
    calcTotals.tax_breakdown.length > 0
      ? calcTotals.tax_breakdown
      : (invoice.tax_breakdown || []),
    isIndia,
    effectiveTaxName,
    displayTax,
    invoice.tax_rate || calcTotals.tax_rate || (isUAE ? 5 : 0)
  );

  const isPaid = Boolean(invoice.is_paid || invoice.status === 'PAID');
  const paidAmount = invoice.paid_amount !== undefined
    ? Number(invoice.paid_amount)
    : (isPaid ? grandTotal : 0);
  const balanceAmount = invoice.balance_amount !== undefined
    ? Number(invoice.balance_amount)
    : (isPaid ? 0 : Math.max(0, grandTotal - paidAmount));

  // 1. Company Header (Top Left) & Invoice Details (Top Right)
  const headerStartY = 14;
  const brandColor = parseHexColor(org.brand_color, [79, 70, 229]);
  const logoData = await loadPdfLogoImage(org.logo_url);

  let compY = headerStartY;
  if (logoData) {
    doc.addImage(logoData.base64, 'PNG', margin, headerStartY, 13, 13);
    doc.setFont(fontName, 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(org.name || 'QuoteFlow Workspace', margin + 16, headerStartY + 5.5);
    compY = headerStartY + 16;
  } else {
    // Initials badge
    const initials = getCompanyInitials(org.name);
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.roundedRect(margin, headerStartY, 12, 12, 2.5, 2.5, 'F');
    doc.setFont(fontName, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(initials, margin + 6, headerStartY + 8, { align: 'center' });

    doc.setFont(fontName, 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(org.name || 'QuoteFlow Workspace', margin + 15, headerStartY + 5.5);
    compY = headerStartY + 15;
  }

  // Address lines below company name
  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500

  const compAddress = [
    org.address_line1,
    [org.city, org.business_state || org.state, org.postal_code].filter(Boolean).join(' '),
    org.country,
  ].filter(Boolean).join(', ');

  if (compAddress) {
    doc.text(compAddress, margin, compY);
    compY += 3.8;
  }

  const contactLine = [
    org.email ? `Email: ${org.email}` : null,
    `Tel: ${org.phone || 'N/A'}`,
  ].filter(Boolean).join(' | ');
  doc.text(contactLine, margin, compY);
  compY += 3.8;

  const orgGstin = org.gstin || org.gst_vat_number;
  if (orgGstin) {
    doc.setFont(fontName, 'bold');
    doc.setTextColor(51, 65, 85);
    const taxLabel = currency === 'INR' ? 'GSTIN' : (currency === 'AED' ? 'TRN' : 'Tax ID');
    doc.text(`${taxLabel}: ${orgGstin}`, margin, compY);
    compY += 3.8;
  }

  // Right Header: TAX INVOICE / PROFORMA / DELIVERY NOTE + Number + Dates
  let rightY = headerStartY;
  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);

  const isDeliveryNote =
    invoice.document_type === 'delivery_note' || invoice.document_type === 'delivery_challan';

  const docTitle = getDocumentTitle(
    invoice.document_type,
    invoice.status,
    isIndia && org.gst_registered !== false
  );
  doc.text(docTitle, pageWidth - margin, rightY + 3, { align: 'right' });

  doc.setFont(fontName, 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.invoice_number, pageWidth - margin, rightY + 11.5, { align: 'right' });

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const datePrefix = isDeliveryNote
    ? 'Delivery Date'
    : invoice.document_type === 'proforma_invoice'
    ? 'Proforma Date'
    : 'Invoice Date';
  doc.text(`${datePrefix}: ${formatDate(invoice.issue_date)}`, pageWidth - margin, rightY + 17, { align: 'right' });
  let nextDateY = rightY + 21.5;
  if (!isDeliveryNote && invoice.payment_terms !== 'Due on Receipt') {
    doc.text(`Due Date: ${formatDate(invoice.due_date)}`, pageWidth - margin, nextDateY, { align: 'right' });
    nextDateY += 4.5;
  }

  if (invoice.po_number) {
    doc.setFont(fontName, 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`PO #: ${invoice.po_number}`, pageWidth - margin, nextDateY, { align: 'right' });
    nextDateY += 4.5;
  }

  if (!isDeliveryNote && displayTax > 0) {
    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Tax Mode: ${taxMode === 'inclusive' ? 'Tax Included' : 'Tax Excluded'}`, pageWidth - margin, nextDateY, { align: 'right' });
    nextDateY += 4;
  }

  const headerEndY = Math.max(compY, nextDateY) + 3;

  // Header Divider
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.3);
  doc.line(margin, headerEndY, pageWidth - margin, headerEndY);

  // 2. Billed To / Consignee & Settlement / Dispatch Card
  const cardY = headerEndY + 5;

  // Calculate card height dynamically
  const customerName = customer.company_name || customer.name || 'Valued Client';
  const hasAttn = Boolean(customer.company_name && customer.name);
  const custAddress = [customer.billing_address, customer.city, customer.billing_state || customer.state, customer.postal_code]
    .filter(Boolean)
    .join(', ');
  const deliveryAddr = invoice.delivery_address || custAddress;
  const customerTaxNumber = invoice.customer_gstin || customer.customer_gstin || customer.tax_number;
  const hasTaxNumber = Boolean(customerTaxNumber);
  const hasPlaceOfSupply = Boolean(currency === 'INR' && placeOfSupply);

  let leftLinesCount = 2; // Label + Name
  if (hasAttn) leftLinesCount += 1;
  if (isDeliveryNote ? deliveryAddr : custAddress) leftLinesCount += 1;
  if (hasTaxNumber && !isDeliveryNote) leftLinesCount += 1;
  if (hasPlaceOfSupply && !isDeliveryNote) leftLinesCount += 1;

  const cardHeight = Math.max(26, leftLinesCount * 4.2 + 8);

  // Background box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(241, 245, 249); // slate-100
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, cardY, contentWidth, cardHeight, 3, 3, 'FD');

  // Left column
  let cardLeftY = cardY + 5;
  doc.setFont(fontName, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(isDeliveryNote ? 'DELIVER TO / CONSIGNEE' : 'BILLED TO', margin + 5, cardLeftY);
  cardLeftY += 4.5;

  doc.setFont(fontName, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(customerName, margin + 5, cardLeftY);
  cardLeftY += 4;

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  if (hasAttn) {
    const contactPerson = invoice.delivery_contact_person || customer.name;
    doc.text(`Attn: ${contactPerson}`, margin + 5, cardLeftY);
    cardLeftY += 3.8;
  }

  const effectiveAddress = isDeliveryNote ? deliveryAddr : custAddress;
  if (effectiveAddress) {
    const splitAddr = doc.splitTextToSize(effectiveAddress, 95);
    doc.text(splitAddr[0], margin + 5, cardLeftY);
    cardLeftY += 3.8;
  }

  if (!isDeliveryNote && hasTaxNumber) {
    doc.setFont(fontName, 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`${currency === 'INR' ? 'GSTIN' : 'Tax ID / GST'}: ${customerTaxNumber}`, margin + 5, cardLeftY);
    cardLeftY += 3.8;
  }

  if (!isDeliveryNote && hasPlaceOfSupply) {
    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text(`Place of Supply: ${placeOfSupply}`, margin + 5, cardLeftY);
  }

  // Right column: Settlement Status (Invoice) or Dispatch Details (Delivery Note)
  let cardRightY = cardY + 5;
  doc.setFont(fontName, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(isDeliveryNote ? 'DISPATCH & REFERENCE' : 'SETTLEMENT STATUS', pageWidth - margin - 5, cardRightY, { align: 'right' });
  cardRightY += 3.5;

  if (isDeliveryNote) {
    let badgeLabel = invoice.delivery_status === 'DELIVERED' ? 'DELIVERED' : 'PENDING DELIVERY';
    let badgeFill = invoice.delivery_status === 'DELIVERED' ? [209, 250, 229] : [254, 243, 199];
    let badgeText = invoice.delivery_status === 'DELIVERED' ? [6, 95, 70] : [146, 64, 14];

    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.5);
    const badgeWidth = Math.max(26, doc.getTextWidth(badgeLabel) + 6);
    const badgeHeight = 5;
    const badgeX = pageWidth - margin - 5 - badgeWidth;

    doc.setFillColor(badgeFill[0], badgeFill[1], badgeFill[2]);
    doc.roundedRect(badgeX, cardRightY, badgeWidth, badgeHeight, 1.5, 1.5, 'F');
    doc.setTextColor(badgeText[0], badgeText[1], badgeText[2]);
    doc.text(badgeLabel, badgeX + badgeWidth / 2, cardRightY + 3.6, { align: 'center' });
    cardRightY += badgeHeight + 3;

    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    if (invoice.delivery_vehicle_no) {
      doc.text(`Vehicle / Ref: ${invoice.delivery_vehicle_no}`, pageWidth - margin - 5, cardRightY, { align: 'right' });
      cardRightY += 3.5;
    }
    doc.text(`Dispatch Date: ${formatDate(invoice.issue_date)}`, pageWidth - margin - 5, cardRightY, { align: 'right' });
  } else {
    // Status Badge Pill for Invoice
    let badgeLabel = 'PENDING';
    let badgeFill = [254, 243, 199]; // amber-100
    let badgeText = [146, 64, 14];   // amber-800

    if (isPaid) {
      badgeLabel = 'PAID';
      badgeFill = [209, 250, 229];   // emerald-100
      badgeText = [6, 95, 70];       // emerald-800
    } else if (invoice.status === 'ISSUED') {
      badgeLabel = 'ISSUED';
      badgeFill = [239, 246, 255];   // blue-50
      badgeText = [29, 78, 216];     // blue-700
    } else if (invoice.status === 'OVERDUE') {
      badgeLabel = 'OVERDUE';
      badgeFill = [254, 226, 226];   // rose-100
      badgeText = [185, 28, 28];     // rose-700
    } else if (invoice.status === 'CANCELLED') {
      badgeLabel = 'CANCELLED';
      badgeFill = [241, 245, 249];   // slate-100
      badgeText = [71, 85, 105];     // slate-600
    } else if (invoice.status === 'DRAFT') {
      badgeLabel = 'DRAFT';
      badgeFill = [241, 245, 249];   // slate-100
      badgeText = [71, 85, 105];     // slate-600
    }

    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.5);
    const badgeWidth = Math.max(22, doc.getTextWidth(badgeLabel) + 6);
    const badgeHeight = 5;
    const badgeX = pageWidth - margin - 5 - badgeWidth;

    doc.setFillColor(badgeFill[0], badgeFill[1], badgeFill[2]);
    doc.roundedRect(badgeX, cardRightY, badgeWidth, badgeHeight, 1.5, 1.5, 'F');
    doc.setTextColor(badgeText[0], badgeText[1], badgeText[2]);
    doc.text(badgeLabel, badgeX + badgeWidth / 2, cardRightY + 3.6, { align: 'center' });
    cardRightY += badgeHeight + 3;

    if (isPaid && invoice.paid_at) {
      doc.setFont(fontName, 'bold');
      doc.setFontSize(8);
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text(`Settled in full on ${formatDate(invoice.paid_at)}`, pageWidth - margin - 5, cardRightY, { align: 'right' });
      cardRightY += 3.8;
    }

    if (invoice.payment_method) {
      doc.setFont(fontName, 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const methodStr = invoice.payment_method.replace(/_/g, ' ');
      const payText = `Mode of Payment: ${methodStr}`;
      const payLines = doc.splitTextToSize(payText, 80);
      doc.text(payLines[0], pageWidth - margin - 5, cardRightY, { align: 'right' });
    }
  }

  // 3. Line Items Table
  const tableStartY = cardY + cardHeight + 6;

  if (isDeliveryNote) {
    // Delivery Note Table (NO Financial Information: #, Description, SKU/Code, Qty, Unit)
    const dnTableData = items.map((it, idx) => ({
      num: String(idx + 1),
      desc: it.description || '',
      sku: it.classification_code || '-',
      qty: `${it.quantity}`,
      unit: it.unit || 'unit',
    }));

    runAutoTable(doc, {
      startY: tableStartY,
      margin: { left: margin, right: margin, bottom: 20 },
      showHead: 'everyPage',
      theme: 'plain',
      styles: {
        font: fontName,
      },
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [100, 116, 139],
        font: fontName,
        fontStyle: 'bold',
        fontSize: 7.5,
        lineWidth: { bottom: 0.25 },
        lineColor: [226, 232, 240],
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      },
      bodyStyles: {
        textColor: [51, 65, 85],
        font: fontName,
        fontSize: 8,
        lineWidth: { bottom: 0.15 },
        lineColor: [241, 245, 249],
        cellPadding: { top: 3.2, bottom: 3.2, left: 2, right: 2 },
      },
      columns: [
        { header: '#', dataKey: 'num' },
        { header: 'ITEM DESCRIPTION', dataKey: 'desc' },
        { header: 'SKU / CODE', dataKey: 'sku' },
        { header: 'QUANTITY', dataKey: 'qty' },
        { header: 'UNIT', dataKey: 'unit' },
      ],
      body: dnTableData,
      columnStyles: {
        num: { cellWidth: 12, halign: 'center', textColor: [148, 163, 184] },
        desc: { cellWidth: 86, halign: 'left', fontStyle: 'bold', textColor: [15, 23, 42] },
        sku: { cellWidth: 34, halign: 'left', textColor: [100, 116, 139] },
        qty: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
        unit: { cellWidth: 24, halign: 'center', textColor: [100, 116, 139] },
      },
    });

    // Delivery Note Bottom Section: Special Instructions + Digital Signature + Physical Signatures
    let dnCurY = (doc as any).lastAutoTable.finalY + 6;
    const hasDnNotes = isValidDocumentText(invoice.delivery_notes || invoice.notes);

    if (hasDnNotes) {
      const dnNotesText = (invoice.delivery_notes || invoice.notes)!.trim();
      const splitNotes = doc.splitTextToSize(dnNotesText, contentWidth - 8);
      if (dnCurY + splitNotes.length * 3.8 + 12 > pageHeight - 35) {
        doc.addPage();
        dnCurY = margin + 5;
      }
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, dnCurY, contentWidth, splitNotes.length * 3.8 + 8, 2, 2, 'FD');
      doc.setFont(fontName, 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('SPECIAL DELIVERY INSTRUCTIONS / NOTES', margin + 4, dnCurY + 4.5);
      doc.setFont(fontName, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(splitNotes, margin + 4, dnCurY + 9);
      dnCurY += splitNotes.length * 3.8 + 12;
    }

    // Digital Signature Seal (if confirmed)
    if (invoice.delivery_status === 'DELIVERED' && invoice.delivery_signature_data_url) {
      if (dnCurY + 28 > pageHeight - 35) {
        doc.addPage();
        dnCurY = margin + 5;
      }
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(margin, dnCurY, contentWidth, 24, 2, 2, 'FD');

      doc.setFont(fontName, 'bold');
      doc.setFontSize(8);
      doc.setTextColor(22, 101, 52);
      doc.text('VERIFIED DIGITAL DELIVERY RECEIPT', margin + 4, dnCurY + 5.5);

      doc.setFont(fontName, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Received & Confirmed By: ${invoice.delivery_recipient_name || customer.name || 'Customer'}`, margin + 4, dnCurY + 11);
      doc.text(`Confirmed on: ${formatDate(invoice.delivery_confirmed_at)} | Status: Verified Delivery`, margin + 4, dnCurY + 16.5);

      try {
        doc.addImage(invoice.delivery_signature_data_url, 'PNG', pageWidth - margin - 50, dnCurY + 3, 45, 18);
      } catch {}
      dnCurY += 28;
    }

    // Physical Signatures Grid (Delivered By, Received By, Company Stamp)
    if (dnCurY + 32 > pageHeight - 20) {
      doc.addPage();
      dnCurY = margin + 5;
    }
    const colW = (contentWidth - 8) / 3;

    // Delivered By
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, dnCurY, colW, 26, 2, 2, 'FD');
    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('DELIVERED BY / CARRIER', margin + 3, dnCurY + 5);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(7);
    doc.text('Name: ___________________', margin + 3, dnCurY + 12);
    doc.text('Signature: ______________', margin + 3, dnCurY + 18);
    doc.text('Date/Time: ______________', margin + 3, dnCurY + 23);

    // Received By
    const col2X = margin + colW + 4;
    doc.roundedRect(col2X, dnCurY, colW, 26, 2, 2, 'FD');
    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('RECEIVED BY / CUSTOMER', col2X + 3, dnCurY + 5);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(7);
    const recName = invoice.delivery_recipient_name || '___________________';
    doc.text(`Name: ${recName}`, col2X + 3, dnCurY + 12);
    doc.text('Signature: ______________', col2X + 3, dnCurY + 18);
    doc.text('Date/Time: ______________', col2X + 3, dnCurY + 23);

    // Stamp Box
    const col3X = col2X + colW + 4;
    doc.roundedRect(col3X, dnCurY, colW, 26, 2, 2, 'FD');
    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('AUTHORIZED COMPANY STAMP', col3X + colW / 2, dnCurY + 5, { align: 'center' });
    doc.setFont(fontName, 'normal');
    doc.setFontSize(7);
    doc.text('[ Stamp Here ]', col3X + colW / 2, dnCurY + 15, { align: 'center' });
  } else {
    // Standard Commercial Invoice / Proforma Invoice Table
    const tableData = items.map((it, idx) => {
      let typeCode = it.item_type || 'Item';
      if (it.classification_code) {
        const fallbackPrefix = isIndia
          ? (it.item_type === 'GOODS' ? 'HSN' : 'SAC')
          : (it.item_type === 'GOODS' ? countryProfile.goodsClassificationLabel : countryProfile.serviceClassificationLabel);
        const prefix = it.classification_type || fallbackPrefix;
        typeCode = `${prefix}: ${it.classification_code}`;
      }

      const calcItem = calcTotals.items[idx];
      const lineTotal = calcItem ? calcItem.line_total : it.line_total;

      return {
        num: String(idx + 1),
        desc: it.description || '',
        type_code: typeCode,
        qty: `${it.quantity} ${it.unit || 'unit'}`,
        rate: formatCurrency(it.unit_price, currency),
        tax: it.tax_rate > 0 ? `${it.tax_rate}%` : '-',
        total: formatCurrency(lineTotal, currency),
      };
    });

    runAutoTable(doc, {
      startY: tableStartY,
      margin: { left: margin, right: margin, bottom: 20 },
      showHead: 'everyPage',
      theme: 'plain',
      styles: {
        font: fontName,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [148, 163, 184], // slate-400
        font: fontName,
        fontStyle: 'bold',
        fontSize: 7.5,
        lineWidth: { bottom: 0.25 },
        lineColor: [226, 232, 240], // slate-200
        cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 },
      },
      bodyStyles: {
        textColor: [51, 65, 85], // slate-700
        font: fontName,
        fontSize: 8,
        lineWidth: { bottom: 0.15 },
        lineColor: [241, 245, 249], // slate-100
        cellPadding: { top: 3.5, bottom: 3.5, left: 1.5, right: 1.5 },
      },
      columns: [
        { header: '#', dataKey: 'num' },
        { header: 'DESCRIPTION', dataKey: 'desc' },
        { header: 'TYPE / CODE', dataKey: 'type_code' },
        { header: 'QTY', dataKey: 'qty' },
        { header: 'RATE', dataKey: 'rate' },
        { header: 'TAX', dataKey: 'tax' },
        { header: 'TOTAL', dataKey: 'total' },
      ],
      body: tableData,
    columnStyles: {
      num: { cellWidth: 10, halign: 'left', textColor: [148, 163, 184] },
      desc: { cellWidth: 68, halign: 'left', fontStyle: 'bold', textColor: [15, 23, 42] },
      type_code: { cellWidth: 26, halign: 'left', textColor: [100, 116, 139] },
      qty: { cellWidth: 20, halign: 'right', textColor: [51, 65, 85] },
      rate: { cellWidth: 24, halign: 'right', textColor: [51, 65, 85] },
      tax: { cellWidth: 14, halign: 'right', textColor: [100, 116, 139] },
      total: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
    },
  });

    let finalTableY = (doc as any).lastAutoTable.finalY + 5;

    // 4. Notes & Terms & Conditions (Left) vs Financial Summary (Right)
    const hasNotes = isValidDocumentText(invoice.notes);
    const hasTerms = isValidDocumentText(invoice.terms_conditions);

    const notesLines = hasNotes ? doc.splitTextToSize(invoice.notes!.trim(), 90) : [];
    const termsLines = hasTerms ? doc.splitTextToSize(invoice.terms_conditions!.trim(), 90) : [];
    const estimatedLeftHeight = (hasNotes ? notesLines.length * 3.8 + 10 : 0) + (hasTerms ? termsLines.length * 3.8 + 10 : 0);
    const estimatedRightHeight = 35 + displayTaxBreakdown.length * 5;
    const requiredBlockHeight = Math.max(estimatedLeftHeight, estimatedRightHeight, 45);

    // Check if financial summary and notes/terms fit on the current page without overlapping footer
    if (finalTableY + requiredBlockHeight > pageHeight - 18) {
      doc.addPage();
      finalTableY = margin + 5;
    }

    // Divider above financial summary
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(margin, finalTableY, pageWidth - margin, finalTableY);

    let leftCurY = finalTableY + 5;
    if (hasNotes) {
      doc.setFont(fontName, 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('NOTES', margin, leftCurY);
      leftCurY += 4;

      doc.setFont(fontName, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(notesLines, margin, leftCurY);
      leftCurY += notesLines.length * 3.8 + 4;
    }

    if (hasTerms) {
      if (leftCurY + termsLines.length * 3.8 + 8 > pageHeight - 18) {
        doc.addPage();
        leftCurY = margin + 5;
      }
      doc.setFont(fontName, 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('TERMS & CONDITIONS', margin, leftCurY);
      leftCurY += 4;

      doc.setFont(fontName, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(termsLines, margin, leftCurY);
      leftCurY += termsLines.length * 3.8 + 4;
    }

    // Right Side: Financial Summary
    const totalsWidth = 72;
    const totalsX = pageWidth - margin - totalsWidth;
    const rightX = pageWidth - margin;
    let rightCurY = finalTableY + 5;

    // Subtotal
    doc.setFont(fontName, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(taxMode === 'inclusive' ? 'Subtotal (Taxable Amount)' : 'Subtotal', totalsX, rightCurY);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(displaySubtotal, currency), rightX, rightCurY, { align: 'right' });
    rightCurY += 5;

    // Discount
    if (displayDiscount > 0) {
      doc.setFont(fontName, 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text('Discount', totalsX, rightCurY);
      doc.text(`-${formatCurrency(displayDiscount, currency)}`, rightX, rightCurY, { align: 'right' });
      rightCurY += 5;
    }

    // Tax Breakdown (only shown when tax > 0)
    if (displayTaxBreakdown.length > 0) {
      for (const tb of displayTaxBreakdown) {
        doc.setFont(fontName, 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(tb.label || tb.name || 'Tax', totalsX, rightCurY);
        doc.setFont(fontName, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(formatCurrency(tb.amount, currency), rightX, rightCurY, { align: 'right' });
        rightCurY += 5;
      }
    } else if (displayTax > 0) {
      doc.setFont(fontName, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Tax Total ${taxMode === 'inclusive' ? '(Included)' : ''}`.trim(), totalsX, rightCurY);
      doc.setFont(fontName, 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(displayTax, currency), rightX, rightCurY, { align: 'right' });
      rightCurY += 5;
    }

    // Divider above Total Amount
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(totalsX, rightCurY - 1, rightX, rightCurY - 1);
    rightCurY += 3.5;

    // Total Amount
    doc.setFont(fontName, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Total Amount', totalsX, rightCurY);
    doc.setFont(fontName, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text(formatCurrency(grandTotal, currency), rightX, rightCurY, { align: 'right' });
    rightCurY += 6;

    // Amount Paid (only show if advance / partial payment and not paid in full)
    if (!isPaid && paidAmount > 0) {
      doc.setFont(fontName, 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(5, 150, 105);
      const paidLabel = `Amount Paid${invoice.advance_percentage ? ` (${invoice.advance_percentage}% Advance)` : ''}`;
      doc.text(paidLabel, totalsX, rightCurY);
      doc.text(`-${formatCurrency(paidAmount, currency)}`, rightX, rightCurY, { align: 'right' });
      rightCurY += 5;
    }

    // Remaining Balance Due (only show if not paid in full and balance > 0)
    if (!isPaid && balanceAmount > 0 && paidAmount > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(totalsX, rightCurY - 1, rightX, rightCurY - 1);
      rightCurY += 3.5;

      doc.setFont(fontName, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Remaining Balance Due', totalsX, rightCurY);

      doc.setFont(fontName, 'bold');
      doc.setFontSize(10);
      doc.setTextColor(217, 119, 6); // amber-600
      doc.text(formatCurrency(balanceAmount, currency), rightX, rightCurY, { align: 'right' });
      rightCurY += 5;
    }

    // Mode of payment
    if (invoice.payment_method) {
      rightCurY += 1;
      doc.setFont(fontName, 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const methodStr = invoice.payment_method.replace(/_/g, ' ');
      const payModeText = `Mode of Payment: ${methodStr}`;
      const payLines = doc.splitTextToSize(payModeText, totalsWidth);
      doc.text(payLines, rightX, rightCurY, { align: 'right' });
      rightCurY += payLines.length * 3.5;
    }
  }

  // 5. Footer & Watermarks on every page
  const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    if (org.invoice_footer) {
      const footerY = pageHeight - 10;
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

      doc.setFont(fontName, 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(org.invoice_footer, pageWidth / 2, footerY, { align: 'center' });
    }

    if (invoice.environment === 'test') {
      // Top test banner
      doc.setFillColor(245, 158, 11); // Amber 500
      doc.rect(0, 0, pageWidth, 5.5, 'F');
      doc.setFont(fontName, 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('TEST DOCUMENT — NOT A REAL INVOICE', pageWidth / 2, 3.8, { align: 'center' });

      // Watermark in center
      doc.setFont(fontName, 'bold');
      doc.setFontSize(36);
      doc.setTextColor(220, 220, 225);
      doc.text('TEST DOCUMENT', pageWidth / 2, pageHeight / 2 - 8, {
        align: 'center',
        angle: 45,
      });
      doc.setFontSize(18);
      doc.text('NOT A REAL INVOICE', pageWidth / 2, pageHeight / 2 + 10, {
        align: 'center',
        angle: 45,
      });
    }

    if (invoice.status === 'DRAFT') {
      // Top draft banner
      doc.setFillColor(100, 116, 139); // Slate 500
      doc.rect(0, 0, pageWidth, 5.5, 'F');
      doc.setFont(fontName, 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('DRAFT INVOICE — NOT YET ISSUED AS AN OFFICIAL TAX INVOICE', pageWidth / 2, 3.8, { align: 'center' });

      // Diagonal DRAFT watermark
      doc.setFont(fontName, 'bold');
      doc.setFontSize(64);
      doc.setTextColor(215, 220, 230); // Subtle slate watermark
      doc.text('DRAFT', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 45,
      });
    }

    if (invoice.status === 'CANCELLED' || invoice.status === 'VOIDED') {
      const isVoid = invoice.status === 'VOIDED';
      // Top cancelled banner
      doc.setFillColor(225, 29, 72); // Rose 600
      doc.rect(0, 0, pageWidth, 5.5, 'F');
      doc.setFont(fontName, 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      const cancelText = `${isVoid ? 'VOIDED' : 'CANCELLED'} INVOICE${invoice.cancellation_reason ? ` — Reason: ${invoice.cancellation_reason.substring(0, 80)}` : ''}`;
      doc.text(cancelText, pageWidth / 2, 3.8, { align: 'center' });

      // Diagonal watermark
      doc.setFont(fontName, 'bold');
      doc.setFontSize(52);
      doc.setTextColor(248, 113, 113); // Light red
      doc.text(isVoid ? 'VOID' : 'CANCELLED', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 45,
      });
    }
  }

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
