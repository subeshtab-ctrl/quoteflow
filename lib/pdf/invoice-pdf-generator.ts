import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { format } from 'date-fns';

import { registerPdfFonts } from '@/lib/pdf/font-loader';
import { parseLogoUrl } from '@/lib/utils/logo';

/**
 * Helper to fetch and convert any image (WebP, PNG, JPEG, SVG) to a PNG base64 data URI using sharp,
 * supporting Instagram-style circular masking.
 */
async function loadLogoImage(logoUrl: string | null | undefined): Promise<{ base64: string } | null> {
  if (!logoUrl) return null;
  try {
    const logoConfig = parseLogoUrl(logoUrl);
    const rawPath = logoConfig.cleanUrl || logoUrl.split(/[?#]/)[0];
    let buffer: Buffer | null = null;

    if (rawPath.startsWith('data:image/')) {
      const base64Data = rawPath.split(',')[1];
      if (base64Data) {
        buffer = Buffer.from(base64Data, 'base64');
      }
    } else if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
      const res = await fetch(rawPath);
      if (res.ok) {
        buffer = Buffer.from(await res.arrayBuffer());
      }
    } else {
      const fs = await import('fs');
      const path = await import('path');
      const cleanUrl = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath;
      const localPath = path.join(process.cwd(), 'public', cleanUrl);
      if (fs.existsSync(localPath)) {
        buffer = fs.readFileSync(localPath);
      }
    }

    if (buffer) {
      try {
        const sharp = (await import('sharp')).default;
        const meta = await sharp(buffer).metadata();
        const dim = Math.min(meta.width || 256, meta.height || 256, 400);

        // Circular masking (Instagram profile style)
        if (logoConfig.shape === 'circle') {
          const circleMaskSvg = Buffer.from(
            `<svg width="${dim}" height="${dim}"><circle cx="${dim / 2}" cy="${dim / 2}" r="${dim / 2}" fill="#fff" /></svg>`
          );
          const pngBuf = await sharp(buffer)
            .resize(dim, dim, { fit: 'cover' })
            .composite([{ input: circleMaskSvg, blend: 'dest-in' }])
            .png()
            .toBuffer();
          return {
            base64: `data:image/png;base64,${pngBuf.toString('base64')}`,
          };
        } else {
          const pngBuf = await sharp(buffer).png().toBuffer();
          return {
            base64: `data:image/png;base64,${pngBuf.toString('base64')}`,
          };
        }
      } catch (convErr) {
        const ext = rawPath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
        return {
          base64: `data:image/${ext};base64,${buffer.toString('base64')}`,
        };
      }
    }
  } catch (err) {
    console.warn('Could not load logo image for PDF:', err);
  }
  return null;
}

function getCompanyInitials(name?: string): string {
  if (!name) return 'QF';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
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

  const fontsLoaded = registerPdfFonts(doc);
  const fontName = fontsLoaded ? 'Roboto' : 'helvetica';

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Resolve Organization
  let org: any = invoice.organization;
  if (!org || !org.name || org.name === 'QuoteFlow Technologies') {
    try {
      const { getDataStore } = await import('@/lib/supabase/data-store');
      const store = getDataStore();
      const dbOrg = await store.getOrganization(invoice.organization_id);
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
  if (!customer || !customer.name || customer.name === 'Valued Client') {
    try {
      const { getDataStore } = await import('@/lib/supabase/data-store');
      const store = getDataStore();
      const dbCustomer = await store.getCustomer(invoice.customer_id);
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
      postal_code: '',
      tax_number: '',
    };
  }

  const currency = invoice.currency || 'INR';
  const grandTotal = Number(invoice.grand_total) || 0;
  const isPaid = Boolean(invoice.is_paid || invoice.status === 'PAID');
  const paidAmount = invoice.paid_amount !== undefined
    ? Number(invoice.paid_amount)
    : (isPaid ? grandTotal : 0);
  const balanceAmount = invoice.balance_amount !== undefined
    ? Number(invoice.balance_amount)
    : (isPaid ? 0 : grandTotal);

  // 1. Company Header (Top Left) & Invoice Details (Top Right)
  const headerStartY = 14;
  const logoData = await loadLogoImage(org.logo_url);

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
    doc.setFillColor(79, 70, 229);
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
    [org.city, org.state, org.postal_code].filter(Boolean).join(' '),
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

  if (org.gst_vat_number) {
    doc.setFont(fontName, 'bold');
    doc.setTextColor(51, 65, 85);
    const taxLabel = currency === 'INR' ? 'GSTIN' : (currency === 'AED' ? 'TRN' : 'Tax ID');
    doc.text(`${taxLabel}: ${org.gst_vat_number}`, margin, compY);
    compY += 3.8;
  }

  // Right Header: TAX INVOICE + Invoice # + Dates
  let rightY = headerStartY;
  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(79, 70, 229); // brand indigo
  doc.text('TAX INVOICE', pageWidth - margin, rightY + 3, { align: 'right' });

  doc.setFont(fontName, 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.invoice_number, pageWidth - margin, rightY + 11.5, { align: 'right' });

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Invoice Date: ${formatDate(invoice.issue_date)}`, pageWidth - margin, rightY + 17, { align: 'right' });
  let nextDateY = rightY + 21.5;
  if (invoice.payment_terms !== 'Due on Receipt') {
    doc.text(`Due Date: ${formatDate(invoice.due_date)}`, pageWidth - margin, nextDateY, { align: 'right' });
    nextDateY += 4.5;
  }

  if (invoice.po_number) {
    doc.setFont(fontName, 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`PO #: ${invoice.po_number}`, pageWidth - margin, nextDateY, { align: 'right' });
    nextDateY += 4.5;
  }

  const headerEndY = Math.max(compY, nextDateY) + 3;

  // Header Divider
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.3);
  doc.line(margin, headerEndY, pageWidth - margin, headerEndY);

  // 2. Billed To Customer & Settlement Status Card
  const cardY = headerEndY + 5;

  // Calculate card height dynamically
  const customerName = customer.company_name || customer.name || 'Valued Client';
  const hasAttn = Boolean(customer.company_name && customer.name);
  const custAddress = [customer.billing_address, customer.city, customer.state, customer.postal_code]
    .filter(Boolean)
    .join(', ');
  const hasTaxNumber = Boolean(customer.tax_number);

  let leftLinesCount = 2; // BILLED TO + Name
  if (hasAttn) leftLinesCount += 1;
  if (custAddress) leftLinesCount += 1;
  if (hasTaxNumber) leftLinesCount += 1;

  const cardHeight = Math.max(26, leftLinesCount * 4.2 + 8);

  // Background box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(241, 245, 249); // slate-100
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, cardY, contentWidth, cardHeight, 3, 3, 'FD');

  // Left: Billed To
  let cardLeftY = cardY + 5;
  doc.setFont(fontName, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('BILLED TO', margin + 5, cardLeftY);
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
    doc.text(`Attn: ${customer.name}`, margin + 5, cardLeftY);
    cardLeftY += 3.8;
  }

  if (custAddress) {
    const splitAddr = doc.splitTextToSize(custAddress, 95);
    doc.text(splitAddr[0], margin + 5, cardLeftY);
    cardLeftY += 3.8;
  }

  if (hasTaxNumber) {
    doc.setFont(fontName, 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`Tax ID / GST: ${customer.tax_number}`, margin + 5, cardLeftY);
  }

  // Right: Settlement Status
  let cardRightY = cardY + 5;
  doc.setFont(fontName, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('SETTLEMENT STATUS', pageWidth - margin - 5, cardRightY, { align: 'right' });
  cardRightY += 3.5;

  // Status Badge Pill (Clear text without Unicode bullets to prevent font encoding artifacts)
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

  // 3. Line Items Table (7 Columns Matching Print Sheet)
  const items = invoice.items || [];
  const tableData = items.map((it, idx) => {
    let typeCode = it.item_type || 'Item';
    if (it.classification_code) {
      const prefix = it.classification_type || (it.item_type === 'GOODS' ? 'HSN' : 'SAC');
      typeCode = `${prefix}: ${it.classification_code}`;
    }

    return {
      num: String(idx + 1),
      desc: it.description || '',
      type_code: typeCode,
      qty: `${it.quantity} ${it.unit || 'unit'}`,
      rate: formatCurrency(it.unit_price, currency),
      tax: it.tax_rate > 0 ? `${it.tax_rate}%` : '-',
      total: formatCurrency(it.line_total, currency),
    };
  });

  const tableStartY = cardY + cardHeight + 6;

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
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

  // Check if financial summary fits on the current page
  if (finalTableY + 55 > pageHeight - 15) {
    doc.addPage();
    finalTableY = margin + 5;
  }

  // Divider above financial summary
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.3);
  doc.line(margin, finalTableY, pageWidth - margin, finalTableY);

  // 4. Notes & Payment Terms (Left) vs Financial Summary (Right)
  const hasNotes = Boolean(invoice.notes && invoice.notes.trim());
  const hasTerms = Boolean(invoice.terms_conditions && invoice.terms_conditions.trim());

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
    const notesLines = doc.splitTextToSize(invoice.notes!.trim(), 90);
    doc.text(notesLines, margin, leftCurY);
    leftCurY += notesLines.length * 3.8 + 4;
  }

  if (hasTerms) {
    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('PAYMENT TERMS', margin, leftCurY);
    leftCurY += 4;

    doc.setFont(fontName, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const termsLines = doc.splitTextToSize(invoice.terms_conditions!.trim(), 90);
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
  doc.text('Subtotal', totalsX, rightCurY);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(invoice.subtotal, currency), rightX, rightCurY, { align: 'right' });
  rightCurY += 5;

  // Discount
  if ((invoice.discount_amount || 0) > 0) {
    doc.setFont(fontName, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('Discount', totalsX, rightCurY);
    doc.text(`-${formatCurrency(invoice.discount_amount || 0, currency)}`, rightX, rightCurY, { align: 'right' });
    rightCurY += 5;
  }

  // Tax Breakdown
  if (invoice.tax_breakdown && invoice.tax_breakdown.length > 0) {
    for (const tb of invoice.tax_breakdown) {
      doc.setFont(fontName, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(tb.label, totalsX, rightCurY);
      doc.setFont(fontName, 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(tb.amount, currency), rightX, rightCurY, { align: 'right' });
      rightCurY += 5;
    }
  } else {
    doc.setFont(fontName, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Tax Total', totalsX, rightCurY);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(invoice.tax_amount, currency), rightX, rightCurY, { align: 'right' });
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
  doc.setTextColor(79, 70, 229); // brand indigo
  doc.text(formatCurrency(invoice.grand_total, currency), rightX, rightCurY, { align: 'right' });
  rightCurY += 6;

  // Amount Paid (only show if advance / partial payment and not paid in full)
  if (!isPaid && invoice.paid_amount !== undefined && Number(invoice.paid_amount) > 0) {
    doc.setFont(fontName, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105);
    const paidLabel = `Amount Paid${invoice.advance_percentage ? ` (${invoice.advance_percentage}% Advance)` : ''}`;
    doc.text(paidLabel, totalsX, rightCurY);
    doc.text(`-${formatCurrency(invoice.paid_amount, currency)}`, rightX, rightCurY, { align: 'right' });
    rightCurY += 5;
  }

  // Remaining Balance Due (only show if not paid in full and balance > 0)
  if (!isPaid && invoice.balance_amount !== undefined && Number(invoice.balance_amount) > 0) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(totalsX, rightCurY - 1, rightX, rightCurY - 1);
    rightCurY += 3.5;

    doc.setFont(fontName, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Remaining Balance Due', totalsX, rightCurY);

    const bal = Number(invoice.balance_amount);
    doc.setFont(fontName, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(formatCurrency(bal, currency), rightX, rightCurY, { align: 'right' });
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

  // 5. Footer
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

  // 6. Watermarks & Environment/Status Overlays on every page
  const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

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
