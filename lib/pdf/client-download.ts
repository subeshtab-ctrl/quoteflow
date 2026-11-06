'use client';

/**
 * Universal client-side PDF downloader for QuoteFlow.
 * Generates and downloads PDFs directly inside the user's browser (0ms Cloudflare CPU usage),
 * eliminating Error 1102 ("Worker exceeded CPU time limit") completely.
 */

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 1000);
}

export async function downloadQuotationPdfClient(
  quotation: any,
  customFilename?: string
): Promise<boolean> {
  try {
    const { generateQuotationPdf } = await import('@/lib/pdf/generator');
    const pdfBytes = await generateQuotationPdf(quotation);
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const filename = customFilename || `Quotation-${quotation.quotation_number || quotation.id}.pdf`;
    triggerBlobDownload(blob, filename);
    return true;
  } catch (err) {
    console.error('[client-pdf] Client-side quotation PDF generation failed:', err);
    return false;
  }
}

export async function downloadInvoicePdfClient(
  invoice: any,
  customFilename?: string
): Promise<boolean> {
  try {
    const { generateInvoicePdf } = await import('@/lib/pdf/invoice-pdf-generator');
    const pdfBytes = await generateInvoicePdf(invoice);
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const filename = customFilename || `Invoice-${invoice.invoice_number || invoice.id}.pdf`;
    triggerBlobDownload(blob, filename);
    return true;
  } catch (err) {
    console.error('[client-pdf] Client-side invoice PDF generation failed:', err);
    return false;
  }
}

export async function downloadReceiptPdfClient(
  quotation: any,
  customFilename?: string
): Promise<boolean> {
  try {
    const { generatePaymentReceiptPdf } = await import('@/lib/pdf/receipt-pdf-generator');
    const pdfBytes = await generatePaymentReceiptPdf(quotation);
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const filename = customFilename || `Payment-Receipt-${quotation.quotation_number || quotation.id}.pdf`;
    triggerBlobDownload(blob, filename);
    return true;
  } catch (err) {
    console.error('[client-pdf] Client-side receipt PDF generation failed:', err);
    return false;
  }
}

export async function downloadPartyLedgerPdfClient(
  statement: any,
  organization?: any,
  customFilename?: string
): Promise<boolean> {
  try {
    const { generatePartyLedgerPdf } = await import('@/lib/export/party-ledger-pdf-generator');
    const pdfBytes = await generatePartyLedgerPdf({ statement, organization });
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const filename = customFilename || `Statement-${statement.customerName?.replace(/\s+/g, '_') || 'Customer'}.pdf`;
    triggerBlobDownload(blob, filename);
    return true;
  } catch (err) {
    console.error('[client-pdf] Client-side statement PDF generation failed:', err);
    return false;
  }
}

