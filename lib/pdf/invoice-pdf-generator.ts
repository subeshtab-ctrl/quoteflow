import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { format } from 'date-fns';

/**
 * Generates an official, beautifully designed Commercial Tax Invoice PDF
 */
export async function generateInvoicePdf(invoice: Invoice): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

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

  // 1. Top Decorative Brand Bar
  doc.setFillColor(79, 70, 229); // Brand Indigo
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Company Logo or Fallback Name
  let compY = 18;
  if (org.logo_url) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const rawPath = org.logo_url.split(/[?#]/)[0];
      const cleanUrl = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath;
      const logoPath = path.join(process.cwd(), 'public', cleanUrl);
      if (fs.existsSync(logoPath)) {
        const imgBuffer = fs.readFileSync(logoPath);
        const ext = (logoPath.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG') as 'PNG' | 'JPEG';
        const base64Img = `data:image/${ext.toLowerCase()};base64,${imgBuffer.toString('base64')}`;
        doc.addImage(base64Img, ext, margin, compY - 4, 30, 14);
        compY += 16;
      }
    } catch {
      // Graceful fallback to text header
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(org.name || 'QuoteFlow Technologies', margin, compY);
  compY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const compLines: string[] = [
    org.address_line1 || '',
    [org.city, org.state, org.postal_code].filter(Boolean).join(' ') + (org.country ? `, ${org.country}` : ''),
    `Email: ${org.email} | Phone: ${org.phone || 'N/A'}`,
    org.gst_vat_number ? `Tax / VAT / GST: ${org.gst_vat_number}` : '',
  ].filter(Boolean) as string[];

  compLines.forEach((line) => {
    doc.text(line, margin, compY);
    compY += 4;
  });

  // 3. Document Title & Details (Right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229);
  doc.text('TAX INVOICE', pageWidth - margin, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  let rightY = 25;
  const issueDateFormatted = invoice.issue_date
    ? format(new Date(invoice.issue_date), 'dd MMM yyyy')
    : format(new Date(), 'dd MMM yyyy');
  const dueDateFormatted = invoice.due_date
    ? format(new Date(invoice.due_date), 'dd MMM yyyy')
    : format(new Date(), 'dd MMM yyyy');

  const metaLines = [
    ['Invoice #:', invoice.invoice_number],
    ['Date:', issueDateFormatted],
    ['Due Date:', dueDateFormatted],
    ...(invoice.po_number ? [['PO Ref:', invoice.po_number]] : []),
    ['Terms:', invoice.payment_terms || 'Net 30 Days'],
  ];

  metaLines.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(label, pageWidth - margin - 35, rightY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(val, pageWidth - margin, rightY, { align: 'right' });
    rightY += 4.5;
  });

  // Payment status badge on top-right
  if (isPaid) {
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(pageWidth - margin - 35, rightY, 35, 6, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(6, 95, 70);
    doc.text('PAID IN FULL', pageWidth - margin - 17.5, rightY + 4.2, { align: 'center' });
  } else if (paidAmount > 0) {
    doc.setFillColor(224, 231, 255);
    doc.roundedRect(pageWidth - margin - 40, rightY, 40, 6, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(55, 48, 163);
    doc.text('ADVANCE RECEIVED', pageWidth - margin - 20, rightY + 4.2, { align: 'center' });
  } else {
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(pageWidth - margin - 35, rightY, 35, 6, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14);
    doc.text('PAYMENT PENDING', pageWidth - margin - 17.5, rightY + 4.2, { align: 'center' });
  }

  // 4. Divider Line
  const headerBottomY = Math.max(compY, rightY + 9) + 3;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);

  // 5. Billed To (Customer Details)
  let custY = headerBottomY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('BILLED TO (CUSTOMER):', margin, custY);
  custY += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const clientNameDisplay = customer.company_name || customer.name || 'Valued Client';
  doc.text(clientNameDisplay, margin, custY);
  custY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  if (customer.company_name && customer.name) {
    doc.text(`Attn: ${customer.name}`, margin, custY);
    custY += 4;
  }
  const custAddress = [customer.billing_address, customer.city, customer.state, customer.postal_code]
    .filter(Boolean)
    .join(', ');
  if (custAddress) {
    doc.text(custAddress, margin, custY);
    custY += 4;
  }
  if (customer.email) {
    doc.text(`Email: ${customer.email} ${customer.phone ? `| Tel: ${customer.phone}` : ''}`, margin, custY);
    custY += 4;
  }
  if (customer.tax_number) {
    doc.text(`Customer GSTIN / Tax ID: ${customer.tax_number}`, margin, custY);
    custY += 4;
  }

  // 6. Line Items Table (with Product / Service classification)
  const items = invoice.items || [];
  const tableData = items.map((it, idx) => {
    const isService = it.item_type === 'SERVICE';
    const tag = isService
      ? `[Service${it.classification_code ? ` • SAC ${it.classification_code}` : ''}] `
      : `[Product${it.classification_code ? ` • HSN ${it.classification_code}` : ''}] `;
    const descText = `${tag}${it.description}`;
    const lineTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);

    return {
      num: String(idx + 1),
      desc: descText,
      qty: `${it.quantity} ${it.unit}`,
      rate: formatCurrency(it.unit_price, currency),
      tax: it.tax_rate > 0 ? `${it.tax_rate}%` : '-',
      total: formatCurrency(lineTotal, currency),
    };
  });

  const tableStartY = custY + 4;
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      fontSize: 8.5,
      lineWidth: 0.2,
      lineColor: [226, 232, 240],
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      fontSize: 8.5,
      lineWidth: 0.2,
      lineColor: [241, 245, 249],
    },
    columns: [
      { header: '#', dataKey: 'num' },
      { header: 'Item / Service Particulars', dataKey: 'desc' },
      { header: 'Qty & Unit', dataKey: 'qty' },
      { header: 'Unit Rate', dataKey: 'rate' },
      { header: 'Tax', dataKey: 'tax' },
      { header: 'Amount', dataKey: 'total' },
    ],
    body: tableData,
    columnStyles: {
      num: { cellWidth: 10, halign: 'center', textColor: [148, 163, 184] },
      desc: { cellWidth: 78 },
      qty: { cellWidth: 24, halign: 'center' },
      rate: { cellWidth: 26, halign: 'right' },
      tax: { cellWidth: 16, halign: 'center' },
      total: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalTableY = (doc as any).lastAutoTable.finalY + 6;

  // 7. Bank Details (Left) and Financial Totals Breakdown (Right)
  const totalsBoxWidth = 85;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;

  // Totals Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(totalsBoxX, finalTableY, totalsBoxWidth, 48, 3, 3, 'FD');

  let totY = finalTableY + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', totalsBoxX + 5, totY);
  doc.text(formatCurrency(invoice.subtotal, currency), totalsBoxX + totalsBoxWidth - 5, totY, { align: 'right' });

  totY += 5;
  if ((invoice.discount_amount || 0) > 0) {
    doc.setTextColor(225, 29, 72);
    doc.text('Discount:', totalsBoxX + 5, totY);
    doc.text(`-${formatCurrency(invoice.discount_amount || 0, currency)}`, totalsBoxX + totalsBoxWidth - 5, totY, { align: 'right' });
    totY += 5;
  }

  doc.setTextColor(100, 116, 139);
  doc.text(`Tax Total:`, totalsBoxX + 5, totY);
  doc.text(formatCurrency(invoice.tax_amount, currency), totalsBoxX + totalsBoxWidth - 5, totY, { align: 'right' });

  totY += 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(totalsBoxX + 5, totY - 1, totalsBoxX + totalsBoxWidth - 5, totY - 1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', totalsBoxX + 5, totY + 3.5);
  doc.setTextColor(79, 70, 229);
  doc.text(formatCurrency(grandTotal, currency), totalsBoxX + totalsBoxWidth - 5, totY + 3.5, { align: 'right' });

  totY += 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(totalsBoxX + 5, totY - 1, totalsBoxX + totalsBoxWidth - 5, totY - 1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(5, 150, 105);
  doc.text('Amount Received:', totalsBoxX + 5, totY + 3);
  doc.text(formatCurrency(paidAmount, currency), totalsBoxX + totalsBoxWidth - 5, totY + 3, { align: 'right' });

  totY += 6;
  if (balanceAmount <= 0) {
    doc.setTextColor(5, 150, 105);
    doc.text('Balance Due:', totalsBoxX + 5, totY + 3);
    doc.text('NIL (Paid in Full)', totalsBoxX + totalsBoxWidth - 5, totY + 3, { align: 'right' });
  } else {
    doc.setTextColor(225, 29, 72);
    doc.text('Balance Due:', totalsBoxX + 5, totY + 3);
    doc.text(formatCurrency(balanceAmount, currency), totalsBoxX + totalsBoxWidth - 5, totY + 3, { align: 'right' });
  }

  // Left Box: Payment Terms & Instructions (replacing hardcoded bank remittance box)
  const leftBoxWidth = 85;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, finalTableY, leftBoxWidth, 48, 3, 3, 'FD');

  let leftY = finalTableY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('PAYMENT TERMS & INSTRUCTIONS:', margin + 5, leftY);

  leftY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const payTerms = [
    ['Payment Due:', invoice.payment_terms || 'Net 30 Days'],
    ['Due Date:', dueDateFormatted],
  ];

  payTerms.forEach(([pLabel, pVal]) => {
    doc.text(pLabel, margin + 5, leftY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(pVal, margin + 28, leftY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    leftY += 4.5;
  });

  // Display mode of payment & transaction number in small italic format
  if (invoice.payment_method || invoice.payment_notes) {
    leftY += 1.5;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const methodStr = invoice.payment_method ? invoice.payment_method.replace(/_/g, ' ') : 'Bank Transfer';
    const txnStr = invoice.payment_notes ? ` • Ref/Txn No: ${invoice.payment_notes}` : '';
    const paymentModeText = `Mode of Payment: ${methodStr}${txnStr}`;
    const splitPayMode = doc.splitTextToSize(paymentModeText, leftBoxWidth - 10);
    doc.text(splitPayMode, margin + 5, leftY);
    leftY += splitPayMode.length * 3.5;
  }

  // Invoice notes (clean, not quotation notes)
  const resolvedNotes =
    invoice.notes && !invoice.notes.includes('Payment within 30 days of completion')
      ? invoice.notes
      : 'Thank you for your business. Please remit payment according to the agreed terms.';

  if (resolvedNotes) {
    leftY += 1;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const splitNotes = doc.splitTextToSize(resolvedNotes, leftBoxWidth - 10);
    doc.text(splitNotes.slice(0, 2), margin + 5, leftY);
  }

  // 8. Terms & Conditions
  let termsY = finalTableY + 54;
  let invTerms = invoice.terms_conditions;
  if (
    !invTerms ||
    invTerms.includes('Quotation valid for 30 days') ||
    invTerms.includes('50% advance required')
  ) {
    invTerms = [
      '1. Payment is due within agreed terms from the date of invoice.',
      '2. Please quote the invoice number when making remittance.',
      '3. Overdue payments may be subject to interest as permitted by applicable law.',
      '4. Goods/services provided in accordance with approved scope are non-refundable.',
    ].join('\n');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('TERMS & CONDITIONS:', margin, termsY);
  termsY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const splitTerms = doc.splitTextToSize(invTerms, pageWidth - margin * 2);
  doc.text(splitTerms, margin, termsY);

  // 9. Footer
  const footerY = pageHeight - 12;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const footerText = org.invoice_footer || `Thank you for choosing ${org.name}.`;
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
