import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { format } from 'date-fns';

/**
 * Generates an official payment receipt PDF for advance or full payments
 */
export async function generatePaymentReceiptPdf(quotation: Quotation): Promise<Uint8Array> {
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

  const customer = quotation.customer || {
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

  const currency = quotation.currency || 'INR';
  const grandTotal = Number(quotation.grand_total) || 0;
  const paidAmount = quotation.paid_amount !== undefined
    ? Number(quotation.paid_amount)
    : (quotation.is_paid ? grandTotal : 0);
  const balanceAmount = quotation.balance_amount !== undefined
    ? Number(quotation.balance_amount)
    : (quotation.is_paid ? 0 : grandTotal);
  const isFull = balanceAmount <= 0 && paidAmount > 0;

  // 1. Top Decorative Brand Bar
  doc.setFillColor(16, 185, 129); // Emerald Success Bar
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
        const ext = logoPath.endsWith('.png') ? 'PNG' : 'JPEG';
        const base64Img = `data:image/${ext.toLowerCase()};base64,${imgBuffer.toString('base64')}`;
        doc.addImage(base64Img, ext, margin, compY - 4, 28, 12);
        compY += 14;
      }
    } catch {
      // Graceful fallback to text header
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(org.name || 'QuoteFlow Organization', margin, compY);
  compY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const compLines: string[] = [
    org.address_line1 || '',
    `${org.city || ''} ${org.state || ''} ${org.postal_code || ''} ${org.country || ''}`.trim(),
    `Email: ${org.email} | Phone: ${org.phone || 'N/A'}`,
    org.gst_vat_number ? `Tax / GSTIN: ${org.gst_vat_number}` : '',
  ].filter(Boolean) as string[];

  compLines.forEach((line) => {
    doc.text(line, margin, compY);
    compY += 4;
  });

  // 3. Document Title & Details (Right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(5, 150, 105); // Emerald-600
  doc.text('PAYMENT RECEIPT', pageWidth - margin, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  const receiptNo = `REC-${quotation.quotation_number.replace(/^Q-/, '')}`;
  const paymentDate = quotation.paid_at
    ? format(new Date(quotation.paid_at), 'dd MMM yyyy')
    : format(new Date(), 'dd MMM yyyy');

  let rightY = 25;
  const metaLines = [
    ['Receipt #:', receiptNo],
    ['Date:', paymentDate],
    ['Quotation Ref:', quotation.quotation_number],
    ['Payment Status:', isFull ? 'PAID IN FULL' : 'ADVANCE PAYMENT'],
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

  // 4. Divider Line
  const headerBottomY = Math.max(compY, rightY) + 6;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);

  // 5. Received From (Customer Info)
  let custY = headerBottomY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('RECEIVED FROM:', margin, custY);
  custY += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const clientTitle = customer.company_name
    ? `${customer.company_name} (Attn: ${customer.name})`
    : customer.name;
  doc.text(clientTitle, margin, custY);
  custY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
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

  // 6. Payment Breakdown Table
  const tableStartY = custY + 4;
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      fontSize: 9,
      lineWidth: 0.2,
      lineColor: [226, 232, 240],
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      fontSize: 9,
      lineWidth: 0.2,
      lineColor: [241, 245, 249],
    },
    columns: [
      { header: 'Particulars & Description', dataKey: 'desc' },
      { header: 'Payment Method', dataKey: 'method' },
      { header: 'Ref / Transaction #', dataKey: 'ref' },
      { header: 'Amount Received', dataKey: 'amount' },
    ],
    body: [
      {
        desc: `Remittance for Quotation ${quotation.quotation_number}\n"${quotation.title}"`,
        method: quotation.payment_method || 'Electronic Bank Remittance',
        ref: quotation.payment_notes || 'Confirmed Bank Transfer / UPI',
        amount: formatCurrency(paidAmount, currency),
      },
    ],
    columnStyles: {
      desc: { cellWidth: 80 },
      method: { cellWidth: 40 },
      ref: { cellWidth: 35 },
      amount: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalTableY = (doc as any).lastAutoTable.finalY + 8;

  // 7. Summary Box (Total, Received, Balance)
  const sumBoxX = pageWidth - margin - 85;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(sumBoxX, finalTableY, 85, 34, 3, 3, 'FD');

  let sumY = finalTableY + 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Total Quotation Value:', sumBoxX + 5, sumY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(formatCurrency(grandTotal, currency), sumBoxX + 80, sumY, { align: 'right' });

  sumY += 7;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text('Total Amount Received:', sumBoxX + 5, sumY);
  doc.text(formatCurrency(paidAmount, currency), sumBoxX + 80, sumY, { align: 'right' });

  sumY += 7;
  doc.setDrawColor(226, 232, 240);
  doc.line(sumBoxX + 5, sumY - 2, sumBoxX + 80, sumY - 2);

  doc.setFont('helvetica', 'bold');
  if (balanceAmount <= 0) {
    doc.setTextColor(5, 150, 105);
    doc.text('Remaining Balance Due:', sumBoxX + 5, sumY + 3);
    doc.text('NIL (Paid in Full)', sumBoxX + 80, sumY + 3, { align: 'right' });
  } else {
    doc.setTextColor(225, 29, 72);
    doc.text('Remaining Balance Due:', sumBoxX + 5, sumY + 3);
    doc.text(formatCurrency(balanceAmount, currency), sumBoxX + 80, sumY + 3, { align: 'right' });
  }

  // 8. Official Confirmation Verification Seal (Left side)
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, finalTableY, 90, 34, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.text('OFFICIAL VERIFICATION & RECEIPT SEAL', margin + 5, finalTableY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61);
  doc.text(
    `Status: PAYMENT VERIFIED & CREDITED\nConfirmed By: ${quotation.payment_confirmed_by || 'Company Finance Team'}\nDate: ${paymentDate}\nNote: Official tax invoice issued upon 100% full settlement.`,
    margin + 5,
    finalTableY + 13
  );

  // 9. Footer
  const footerY = pageHeight - 16;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `This is a computer-generated official payment receipt issued by ${org.name}. No signature required.`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
