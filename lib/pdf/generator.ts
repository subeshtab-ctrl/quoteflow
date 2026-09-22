import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { format } from 'date-fns';

/**
 * Generate a PDF document buffer for a quotation
 */
export async function generateQuotationPdf(quotation: Quotation): Promise<Uint8Array> {
  // Create jsPDF instance
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const org = quotation.organization || {
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
  };

  const customer = quotation.customer || {
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

  // 1. Top Decorative Brand Bar
  doc.setFillColor(79, 70, 229); // Brand Indigo
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Company Name & Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(org.name || 'QuoteFlow', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  const compLines: string[] = [
    org.address_line1 || '',
    `${org.city || ''} ${org.state || ''} ${org.postal_code || ''} ${org.country || ''}`.trim(),
    `Email: ${org.email} | Phone: ${org.phone || 'N/A'}`,
    org.gst_vat_number ? `Tax / GST: ${org.gst_vat_number}` : '',
  ].filter(Boolean) as string[];

  let compY = 23;
  compLines.forEach((line: string) => {
    doc.text(line, margin, compY);
    compY += 4;
  });

  // 3. Document Title & Details (Right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229);
  doc.text('QUOTATION', pageWidth - margin, 18, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Quotation #: ${quotation.quotation_number}`, pageWidth - margin, 26, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Issue Date: ${format(new Date(quotation.issue_date || Date.now()), 'dd MMM yyyy')}`, pageWidth - margin, 31, { align: 'right' });
  doc.text(`Valid Until: ${format(new Date(quotation.valid_until || Date.now()), 'dd MMM yyyy')}`, pageWidth - margin, 36, { align: 'right' });

  // Status Badge
  const status = quotation.status;
  let statusColor: [number, number, number] = [100, 116, 139]; // default gray
  if (status === 'APPROVED') statusColor = [22, 163, 74];
  if (status === 'SENT' || status === 'VIEWED') statusColor = [79, 70, 229];
  if (status === 'REJECTED') statusColor = [220, 38, 38];

  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth - margin - 32, 40, 32, 6, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(status, pageWidth - margin - 16, 44.2, { align: 'center' });

  // Paid Badge (if approved and paid)
  if (status === 'APPROVED' && quotation.is_paid) {
    doc.setFillColor(16, 185, 129); // Emerald 500
    doc.roundedRect(pageWidth - margin - 60, 40, 25, 6, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('✓ PAID', pageWidth - margin - 47.5, 44.2, { align: 'center' });
  }

  // 4. Client Info Box (Bill To)
  const clientBoxY = 52;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, clientBoxY, pageWidth - margin * 2, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PREPARED FOR:', margin + 4, clientBoxY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(customer.company_name ? `${customer.name} (${customer.company_name})` : customer.name, margin + 4, clientBoxY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Email: ${customer.email} ${customer.phone ? `| Phone: ${customer.phone}` : ''}`, margin + 4, clientBoxY + 17);
  if (customer.billing_address || customer.city) {
    doc.text(`${customer.billing_address || ''} ${customer.city || ''} ${customer.state || ''} ${customer.country || ''}`.trim(), margin + 4, clientBoxY + 22);
  }

  // 5. Line Items Table
  const tableData = (quotation.items || []).map((item, index) => [
    (index + 1).toString(),
    item.description,
    item.quantity.toString(),
    item.unit || 'unit',
    formatCurrency(item.unit_price, quotation.currency),
    `${item.tax_rate || 0}%`,
    formatCurrency(item.line_total, quotation.currency),
  ]);

  autoTable(doc, {
    startY: clientBoxY + 31,
    margin: { left: margin, right: margin },
    head: [['#', 'Item & Description', 'Qty', 'Unit', 'Unit Price', 'Tax', 'Line Total']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontSize: 8.5,
      fontStyle: 'bold',
      cellPadding: 3,
    },
    bodyStyles: {
      textColor: [51, 65, 85],
      fontSize: 8.5,
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
  });

  // 6. Summary Totals Box
  const finalY = (doc as any).lastAutoTable.finalY + 6;
  const summaryX = pageWidth - margin - 75;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  doc.text('Subtotal:', summaryX, finalY);
  doc.text(formatCurrency(quotation.subtotal, quotation.currency), pageWidth - margin, finalY, { align: 'right' });

  let curY = finalY + 5;
  if (quotation.discount_amount > 0) {
    doc.text(`Discount (${quotation.discount_type === 'PERCENTAGE' ? `${quotation.discount_value}%` : 'Fixed'}):`, summaryX, curY);
    doc.setTextColor(220, 38, 38);
    doc.text(`-${formatCurrency(quotation.discount_amount, quotation.currency)}`, pageWidth - margin, curY, { align: 'right' });
    doc.setTextColor(100, 116, 139);
    curY += 5;
  }

  if (quotation.tax_amount > 0) {
    doc.text(`Tax (${quotation.tax_rate}%):`, summaryX, curY);
    doc.text(formatCurrency(quotation.tax_amount, quotation.currency), pageWidth - margin, curY, { align: 'right' });
    curY += 5;
  }

  // Grand Total Highlight
  doc.setFillColor(238, 242, 255); // Brand 50
  doc.roundedRect(summaryX - 4, curY - 1, 79, 9, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(67, 56, 202); // Brand 700
  doc.text('Grand Total:', summaryX, curY + 5);
  doc.text(formatCurrency(quotation.grand_total, quotation.currency), pageWidth - margin, curY + 5, { align: 'right' });

  // 7. Terms & Conditions / Notes
  let notesY = curY + 16;
  if (quotation.terms_conditions || quotation.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('Terms & Conditions:', margin, notesY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const terms = quotation.terms_conditions || 'Standard terms apply.';
    const splitTerms = doc.splitTextToSize(terms, 105);
    doc.text(splitTerms, margin, notesY + 5);
  }

  // 8. Digital Signature Seal (if Approved)
  if (quotation.status === 'APPROVED' && quotation.signature) {
    const sig = quotation.signature;
    const sigBoxY = Math.max(notesY + 25, 230);

    doc.setFillColor(240, 253, 244); // Green 50
    doc.setDrawColor(187, 247, 208); // Green 200
    doc.roundedRect(pageWidth - margin - 85, sigBoxY, 85, 34, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52); // Green 800
    doc.text('✓ DIGITALLY APPROVED & SIGNED', pageWidth - margin - 80, sigBoxY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Signer: ${sig.signer_name}`, pageWidth - margin - 80, sigBoxY + 12);
    doc.text(`Email: ${sig.signer_email}`, pageWidth - margin - 80, sigBoxY + 17);
    doc.text(`Date: ${format(new Date(sig.signed_at), 'dd MMM yyyy, hh:mm a')}`, pageWidth - margin - 80, sigBoxY + 22);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Hash: ${sig.document_hash.substring(0, 24)}...`, pageWidth - margin - 80, sigBoxY + 28);
  }

  // 9. Document Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const compName = org.name || 'our company';
  const footerText = (org.invoice_footer || `Thank you for partnering with ${compName}.`).replace(/The Mining Future/gi, compName);
  doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: 'center' });

  // Output as Uint8Array
  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
