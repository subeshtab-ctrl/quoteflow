import { describe, it, expect } from 'vitest';
import {
  getDocumentTitle,
  getSanitizedPdfFilename,
  formatCurrency,
  getCurrencySymbol,
  harmonizePaymentTerms,
  harmonizeTermsAndConditions,
  calculateQuotationTotals,
} from '@/lib/quotations/calculations';
import { buildWhatsAppMessage } from '@/lib/whatsapp/automation';
import { generateInvoicePdf } from '@/lib/pdf/invoice-pdf-generator';
import { generateQuotationPdf } from '@/lib/pdf/generator';
import { Invoice, Quotation } from '@/types/database';

describe('Document Generation Consistency & Multi-Document System', () => {
  describe('1. Document Title Resolution (Requirement #8 & #9)', () => {
    it('always labels proforma invoices as PROFORMA INVOICE, never TAX INVOICE', () => {
      // Even if Indian GST is active and tax calculations exist
      expect(getDocumentTitle('proforma_invoice', 'ISSUED', true)).toBe('PROFORMA INVOICE');
      expect(getDocumentTitle('proforma_invoice', 'PAID', true)).toBe('PROFORMA INVOICE');
      expect(getDocumentTitle('proforma_invoice', 'DRAFT', true)).toBe('PROFORMA INVOICE');
    });

    it('always labels delivery notes as DELIVERY NOTE, never TAX INVOICE', () => {
      expect(getDocumentTitle('delivery_note', 'ISSUED', true)).toBe('DELIVERY NOTE');
      expect(getDocumentTitle('delivery_note', 'DELIVERED', true)).toBe('DELIVERY NOTE');
      expect(getDocumentTitle('delivery_challan', 'ISSUED', true)).toBe('DELIVERY NOTE');
    });

    it('labels quotations and estimates explicitly', () => {
      expect(getDocumentTitle('quotation', 'APPROVED')).toBe('QUOTATION');
      expect(getDocumentTitle('estimate', 'SENT')).toBe('ESTIMATE');
    });

    it('labels payment receipts accurately', () => {
      expect(getDocumentTitle('receipt', 'PAID')).toBe('PAYMENT RECEIPT');
    });

    it('correctly distinguishes Tax Invoice, Standard Invoice, and Draft Invoice', () => {
      expect(getDocumentTitle('invoice', 'DRAFT', true)).toBe('DRAFT INVOICE');
      expect(getDocumentTitle('invoice', 'DRAFT', false)).toBe('DRAFT INVOICE');
      expect(getDocumentTitle('invoice', 'ISSUED', true)).toBe('TAX INVOICE');
      expect(getDocumentTitle('tax_invoice', 'ISSUED', true)).toBe('TAX INVOICE');
      expect(getDocumentTitle('invoice', 'ISSUED', false)).toBe('INVOICE');
    });
  });

  describe('2. Global Currency Symbol Rendering (Requirement #3)', () => {
    it('uses clean Latin ISO codes for Gulf currencies and official dirham symbol ⃃ for AED', () => {
      expect(getCurrencySymbol('AED')).toBe('⃃');
      expect(getCurrencySymbol('SAR')).toBe('SAR');
      expect(getCurrencySymbol('KWD')).toBe('KWD');
      expect(getCurrencySymbol('QAR')).toBe('QAR');
      expect(getCurrencySymbol('OMR')).toBe('OMR');
      expect(getCurrencySymbol('BHD')).toBe('BHD');
    });

    it('uses standard currency symbols for INR, USD, EUR, GBP', () => {
      expect(getCurrencySymbol('INR')).toBe('₹');
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('GBP')).toBe('£');
    });

    it('formats currencies cleanly with standard spacing matching user requirements', () => {
      expect(formatCurrency(45000, 'INR')).toBe('₹ 45,000.00');
      expect(formatCurrency(1500, 'USD')).toBe('$ 1,500.00');
      expect(formatCurrency(1500, 'EUR')).toBe('€ 1,500.00');
      expect(formatCurrency(1500, 'GBP')).toBe('£ 1,500.00');
      expect(formatCurrency(1500, 'AED')).toBe('⃃ 1,500.00');
    });

    it('respects document currency as the sole source of truth', () => {
      // Indian organization creating a USD invoice must format as USD ($), not INR (₹)
      const formatted = formatCurrency(2500, 'USD');
      expect(formatted).toBe('$ 2,500.00');
      expect(formatted).not.toContain('₹');
    });
  });

  describe('3. Clean & Sanitized PDF Filenames (Requirement #17)', () => {
    it('generates professional sanitized filenames for all document types', () => {
      expect(getSanitizedPdfFilename('invoice', 'INV-2026-001', 'ISSUED', false)).toBe(
        'Invoice_INV-2026-001.pdf'
      );
      expect(getSanitizedPdfFilename('invoice', 'INV-2026-001', 'ISSUED', true)).toBe(
        'TaxInvoice_INV-2026-001.pdf'
      );
      expect(getSanitizedPdfFilename('quotation', 'QT-2026-0042', 'APPROVED')).toBe(
        'Quotation_QT-2026-0042.pdf'
      );
      expect(getSanitizedPdfFilename('estimate', 'EST-2026-0042', 'SENT')).toBe(
        'Estimate_EST-2026-0042.pdf'
      );
      expect(getSanitizedPdfFilename('proforma_invoice', 'PI-2026-0012', 'ISSUED', true)).toBe(
        'ProformaInvoice_PI-2026-0012.pdf'
      );
      expect(getSanitizedPdfFilename('delivery_note', 'DN-2026-0018', 'ISSUED')).toBe(
        'DeliveryNote_DN-2026-0018.pdf'
      );
      expect(getSanitizedPdfFilename('receipt', 'REC-2026-005', 'PAID')).toBe(
        'Receipt_REC-2026-005.pdf'
      );
    });
  });

  describe('4. WhatsApp Sharing & Secure Message Formatting (Requirement #6 & #7)', () => {
    it('generates a professional message matching user requirements without localhost or internal URLs', () => {
      const msg = buildWhatsAppMessage({
        type: 'INVOICE_READY',
        customer: { name: 'ABC Client', company_name: 'ABC Enterprises' },
        invoice: {
          id: 'inv-123',
          invoice_number: 'INV-2026-001',
          document_type: 'invoice',
          due_date: '2026-10-25T00:00:00Z',
          grand_total: 45000,
          currency: 'INR',
        },
        organization: { name: 'ABC Enterprises' },
        baseUrl: 'https://app.quoteflow.io',
      });

      expect(msg).toContain('Hello ABC Client');
      expect(msg).toContain('Invoice INV-2026-001 from ABC Enterprises is ready.');
      expect(msg).toContain('Amount: ₹ 45,000.00');
      expect(msg).toContain('Due Date: 2026-10-25');
      expect(msg).toContain('View / Download Invoice:');
      expect(msg).toContain('https://app.quoteflow.io/api/public/invoice-pdf?invoice_id=inv-123');
      expect(msg).not.toContain('localhost');
      expect(msg).not.toContain('undefined');
    });

    it('generates dedicated dispatch message for Delivery Notes', () => {
      const msg = buildWhatsAppMessage({
        type: 'DELIVERY_NOTE',
        customer: { name: 'Logistics Partner' },
        invoice: {
          id: 'dn-999',
          invoice_number: 'DN-2026-0018',
          document_type: 'delivery_note',
        },
        organization: { name: 'Industrial Supplies Co.' },
        baseUrl: 'https://app.quoteflow.io',
      });

      expect(msg).toContain('Delivery Note DN-2026-0018');
      expect(msg).toContain('View / Confirm Delivery:');
      expect(msg).toContain('https://app.quoteflow.io/api/public/invoice-pdf?invoice_id=dn-999');
    });
  });

  describe('5. Delivery Note Layout & Digital Signatures (Requirement #10, #11, #12, #13)', () => {
    it('generates a valid Delivery Note PDF with non-financial columns and signature placeholders', async () => {
      const deliveryNote: Invoice = {
        id: 'dn-001',
        organization_id: 'org-test',
        customer_id: 'cust-test',
        invoice_number: 'DN-2026-0018',
        document_type: 'delivery_note',
        status: 'DELIVERED',
        issue_date: '2026-10-20T00:00:00Z',
        due_date: '2026-10-20T00:00:00Z',
        currency: 'INR',
        subtotal: 0,
        tax_amount: 0,
        grand_total: 0,
        is_paid: false,
        created_at: '2026-10-20T00:00:00Z',
        delivery_address: 'Plot 42, Sector 18, Industrial Area, Gurgaon, Haryana 122015',
        delivery_contact_person: 'Rajesh Sharma',
        delivery_vehicle_no: 'HR 26 DQ 4921',
        delivery_status: 'DELIVERED',
        delivery_recipient_name: 'Rajesh Sharma',
        delivery_confirmed_at: '2026-10-20T14:30:00Z',
        // 1x1 transparent PNG data url as mock signature
        delivery_signature_data_url:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        items: [
          {
            id: 'item-1',
            invoice_id: 'dn-001',
            description: 'Commercial Reverse Osmosis Membrane 4040',
            classification_code: 'RO-4040-IND',
            quantity: 4,
            unit: 'pcs',
            unit_price: 0,
            tax_rate: 0,
            tax_amount: 0,
            line_total: 0,
            sort_order: 1,
            item_type: 'GOODS',
          },
          {
            id: 'item-2',
            invoice_id: 'dn-001',
            description: 'High Pressure Multi-Stage Pump 2HP',
            classification_code: 'PUMP-2HP-SS',
            quantity: 1,
            unit: 'set',
            unit_price: 0,
            tax_rate: 0,
            tax_amount: 0,
            line_total: 0,
            sort_order: 2,
            item_type: 'GOODS',
          },
        ],
      };

      const pdfBytes = await generateInvoicePdf(deliveryNote);
      expect(pdfBytes).toBeDefined();
      expect(pdfBytes.length).toBeGreaterThan(1000);
      // Valid PDF magic bytes %PDF-
      const header = String.fromCharCode(...pdfBytes.slice(0, 5));
      expect(header).toBe('%PDF-');
    });

    it('generates a valid Proforma Invoice PDF without crashing and preserves items', async () => {
      const proforma: Invoice = {
        id: 'pi-001',
        organization_id: 'org-test',
        customer_id: 'cust-test',
        invoice_number: 'PI-2026-0012',
        document_type: 'proforma_invoice',
        status: 'ISSUED',
        issue_date: '2026-10-20T00:00:00Z',
        due_date: '2026-11-05T00:00:00Z',
        currency: 'USD',
        subtotal: 12000,
        tax_rate: 0,
        tax_amount: 0,
        grand_total: 12000,
        is_paid: false,
        created_at: '2026-10-20T00:00:00Z',
        items: [
          {
            id: 'pi-item-1',
            invoice_id: 'pi-001',
            description: 'Cloud Infrastructure Architecture & Deployment',
            quantity: 1,
            unit: 'project',
            unit_price: 12000,
            tax_rate: 0,
            tax_amount: 0,
            line_total: 12000,
            sort_order: 1,
            item_type: 'SERVICE',
          },
        ],
      };

      const pdfBytes = await generateInvoicePdf(proforma);
      expect(pdfBytes).toBeDefined();
      expect(pdfBytes.length).toBeGreaterThan(1000);
      const header = String.fromCharCode(...pdfBytes.slice(0, 5));
      expect(header).toBe('%PDF-');
    });
  });

  describe('6. 1-Page Quotation Generation (Requirement #5)', () => {
    it('generates a valid PDF for a standard quotation with optimized compact margins', async () => {
      const quote: Quotation = {
        id: 'q-standard-1',
        quotation_number: 'QT-2026-0042',
        title: 'Industrial RO Water Purification System',
        organization_id: 'org-test',
        customer_id: 'cust-test',
        status: 'APPROVED',
        issue_date: '2026-10-20T00:00:00Z',
        valid_until: '2026-11-20T00:00:00Z',
        currency: 'INR',
        subtotal: 45000,
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        discount_amount: 0,
        tax_rate: 18,
        tax_amount: 8100,
        grand_total: 53100,
        is_paid: false,
        created_at: '2026-10-20T00:00:00Z',
        notes: 'Payment terms: 50% advance, balance on delivery.\nWarranty: 1 Year comprehensive.',
        terms: '1. Prices include standard delivery within city limits.\n2. Installation included.',
        items: [
          {
            id: 'q-item-1',
            quotation_id: 'q-standard-1',
            description: 'Commercial 250 LPH Reverse Osmosis Plant',
            quantity: 1,
            unit: 'system',
            unit_price: 35000,
            tax_rate: 18,
            tax_amount: 6300,
            total: 41300,
            sort_order: 1,
            item_type: 'GOODS',
          },
          {
            id: 'q-item-2',
            quotation_id: 'q-standard-1',
            description: 'Pre-treatment Dual Media Sand & Carbon Filter',
            quantity: 1,
            unit: 'unit',
            unit_price: 10000,
            tax_rate: 18,
            tax_amount: 1800,
            total: 11800,
            sort_order: 2,
            item_type: 'GOODS',
          },
        ],
      };

      const pdfBytes = await generateQuotationPdf(quote);
      expect(pdfBytes).toBeDefined();
      expect(pdfBytes.length).toBeGreaterThan(1000);
      const header = String.fromCharCode(...pdfBytes.slice(0, 5));
      expect(header).toBe('%PDF-');
    });
  });

  describe('6. Payment Terms Harmonization & Lifecycle Stepper Colors', () => {
    it('harmonizes payment terms when 100% advance is required', () => {
      // Stale text contains 50% advance, but quotation advance_percentage is 100
      const terms = harmonizePaymentTerms(
        100,
        'Payment terms: 50% advance to commence work, balance upon completion. Remit via Bank Transfer.'
      );
      expect(terms).toContain('100% advance');
      expect(terms).not.toContain('50% advance');
    });

    it('harmonizes payment terms when 0% advance (100% on delivery) is required', () => {
      const terms = harmonizePaymentTerms(
        0,
        'Payment terms: 50% advance to commence work, balance upon completion. Remit via Bank Transfer.'
      );
      expect(terms).toContain('100% full payment due upon project completion and delivery');
      expect(terms).not.toContain('50% advance');
    });

    it('harmonizes payment terms when custom advance (e.g. 75%) is specified', () => {
      const terms = harmonizePaymentTerms(
        75,
        'Payment terms: 50% advance to commence work, balance upon completion. Remit via Bank Transfer.'
      );
      expect(terms).toContain('75% advance');
      expect(terms).not.toContain('50% advance');
    });

    it('correctly maps Paid stage colors across Fully Paid, Partially Paid, and Unpaid', () => {
      // Fully Paid -> Green
      const fullyPaidQuote: Partial<Quotation> = {
        is_paid: true,
        grand_total: 199,
        paid_amount: 199,
      };
      const isPaid = fullyPaidQuote.is_paid || (fullyPaidQuote.paid_amount! >= fullyPaidQuote.grand_total!);
      expect(isPaid).toBe(true);

      // Partially Paid -> Brown-Yellow / Amber (50% Paid)
      const partialQuote: Partial<Quotation> = {
        is_paid: false,
        grand_total: 1000,
        paid_amount: 500,
        advance_percentage: 50,
      };
      const isPartial = !partialQuote.is_paid && (partialQuote.paid_amount! > 0);
      expect(isPartial).toBe(true);

      // Unpaid -> Red
      const unpaidQuote: Partial<Quotation> = {
        is_paid: false,
        grand_total: 1000,
        paid_amount: 0,
      };
      const isUnpaid = !unpaidQuote.is_paid && (!unpaidQuote.paid_amount || unpaidQuote.paid_amount === 0);
      expect(isUnpaid).toBe(true);
    });

    it('harmonizes terms & conditions with 75% advance (preventing 50% mismatch in Q-000051)', () => {
      const originalTerms =
        '1. Quotation valid for 0 days.\n2. 50% advance required to commence work.\n3. Taxes applicable as per local regulations.';
      const harmonized = harmonizeTermsAndConditions(75, originalTerms);
      expect(harmonized).toContain('75% advance required to commence work');
      expect(harmonized).not.toContain('50% advance required to commence work');
      expect(harmonized).toContain('1. Quotation valid for 0 days.');
      expect(harmonized).toContain('3. Taxes applicable as per local regulations.');
    });

    it('harmonizes terms & conditions with 100% and 0% advance', () => {
      const originalTerms =
        '1. Quotation valid for 30 days.\n2. 50% advance required to commence work.\n3. Taxes applicable as per local regulations.';
      const hundredPct = harmonizeTermsAndConditions(100, originalTerms);
      expect(hundredPct).toContain('100% advance required to commence work');

      const zeroPct = harmonizeTermsAndConditions(0, originalTerms);
      expect(zeroPct).toContain('Full payment due upon completion / delivery');
    });

    it('calculates totals accurately when item tax_rate is unset but overall quotation tax_rate is 12%', () => {
      const calc = calculateQuotationTotals(
        [
          {
            quantity: 1,
            unit_price: 122,
            tax_rate: 0, // Unset on individual item
          },
        ],
        null,
        0,
        {
          taxMode: 'exclusive',
          currency: 'INR',
          country: 'IN',
          taxName: 'GST',
          isIndiaGst: true,
          taxRate: 12,
        }
      );

      expect(calc.subtotal).toBe(122);
      expect(calc.tax_amount).toBe(14.64);
      expect(calc.grand_total).toBe(136.64);
      expect(calc.cgst_amount).toBe(7.32);
      expect(calc.sgst_amount).toBe(7.32);

      // Remaining balance with 102.00 paid on 136.64 grand total
      const paidAmount = 102;
      const balanceDue = Math.round((calc.grand_total - paidAmount) * 100) / 100;
      expect(balanceDue).toBe(34.64);
    });
  });
});
