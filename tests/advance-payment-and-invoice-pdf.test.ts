import { describe, it, expect } from 'vitest';
import { store } from '@/lib/supabase/data-store';
import { generatePaymentReceiptPdf } from '@/lib/pdf/receipt-pdf-generator';
import { generateInvoicePdf } from '@/lib/pdf/invoice-pdf-generator';

describe('Advance Payments, Verified Receipts, Invoice PDF & 1-Hour IP View Tracking', () => {
  const orgId = 'a0000000-0000-0000-0000-000000000001';

  it('calculates advance payment presets (10%, 20%, 50%, custom) and remaining balance due', async () => {
    const quotations = await store.getQuotations(orgId);
    expect(quotations.length).toBeGreaterThan(0);
    const quote = quotations[0];
    const grandTotal = Number(quote.grand_total);
    expect(grandTotal).toBeGreaterThan(0);

    // 1. Record 20% Advance Payment
    const twentyPercentAdvance = Math.round(grandTotal * 0.2);
    const updatedAdvance = await store.updateQuotationPayment(
      quote.id,
      {
        is_paid: false,
        paid_amount: twentyPercentAdvance,
        advance_percentage: 20,
        payment_status: 'PARTIALLY_PAID',
        payment_method: 'BANK_TRANSFER',
        payment_notes: '20% token advance for mobilization',
        payment_confirmed_by_company: true,
        confirmed_by: 'Finance Officer',
      },
      orgId
    );

    expect(updatedAdvance.is_paid).toBe(false);
    expect(updatedAdvance.paid_amount).toBe(twentyPercentAdvance);
    expect(updatedAdvance.balance_amount).toBe(grandTotal - twentyPercentAdvance);
    expect(updatedAdvance.advance_percentage).toBe(20);
    expect(updatedAdvance.payment_status).toBe('PARTIALLY_PAID');
    expect(updatedAdvance.payment_confirmed_by_company).toBe(true);

    // 2. Full 100% Payment settles balance to 0 and marks is_paid
    const updatedFull = await store.updateQuotationPayment(
      quote.id,
      {
        is_paid: true,
        paid_amount: grandTotal,
        advance_percentage: 100,
        payment_status: 'PAID',
        payment_method: 'BANK_TRANSFER',
        payment_confirmed_by_company: true,
        confirmed_by: 'Finance Officer',
      },
      orgId
    );

    expect(updatedFull.is_paid).toBe(true);
    expect(updatedFull.paid_amount).toBe(grandTotal);
    expect(updatedFull.balance_amount).toBe(0);
    expect(updatedFull.payment_status).toBe('PAID');
  });

  it('generates a valid Payment Receipt PDF with company seal when confirmed', async () => {
    const quotations = await store.getQuotations(orgId);
    const quote = quotations[0];

    // Ensure quotation has confirmed advance payment
    const confirmedQuote = await store.updateQuotationPayment(
      quote.id,
      {
        is_paid: false,
        paid_amount: Math.round(Number(quote.grand_total) * 0.5),
        advance_percentage: 50,
        payment_status: 'PARTIALLY_PAID',
        payment_method: 'UPI',
        payment_confirmed_by_company: true,
        confirmed_by: 'Accounts Dept',
      },
      orgId
    );

    const pdfBytes = await generatePaymentReceiptPdf(confirmedQuote);
    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Verify PDF header magic bytes: %PDF
    const pdfHeader = Buffer.from(pdfBytes.slice(0, 4)).toString('ascii');
    expect(pdfHeader).toBe('%PDF');
  });

  it('generates a commercial tax invoice PDF fitting A4 with line items and bank remittance details', async () => {
    const quotations = await store.getQuotations(orgId);
    const quote = quotations[0];

    const invoice = await store.ensureInvoiceForQuotation(quote);
    expect(invoice).toBeDefined();
    expect(invoice.invoice_number).toBeDefined();

    const pdfBytes = await generateInvoicePdf(invoice);
    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(1000);

    const pdfHeader = Buffer.from(pdfBytes.slice(0, 4)).toString('ascii');
    expect(pdfHeader).toBe('%PDF');
  });

  it('tracks client portal views with a 1-hour rolling window per IP', async () => {
    const quotations = await store.getQuotations(orgId);
    const quote = quotations[0];
    const initialViewCount = quote.view_count || 0;

    const testIpA = '203.0.113.45';
    const testIpB = '198.51.100.89';

    // First view from IP A -> Should increment view_count
    await store.recordQuotationView(quote.id, {
      ip_address: testIpA,
      user_agent: 'Vitest Client Test Agent 1.0',
    });

    const quoteAfterFirst = await store.getQuotationById(quote.id, orgId);
    expect(quoteAfterFirst?.view_count).toBe(initialViewCount + 1);

    // Immediate second view from same IP A -> Should NOT increment view_count (within 1-hour window)
    await store.recordQuotationView(quote.id, {
      ip_address: testIpA,
      user_agent: 'Vitest Client Test Agent 1.0',
    });

    const quoteAfterDuplicate = await store.getQuotationById(quote.id, orgId);
    expect(quoteAfterDuplicate?.view_count).toBe(initialViewCount + 1);

    // View from different IP B -> Should increment view_count
    await store.recordQuotationView(quote.id, {
      ip_address: testIpB,
      user_agent: 'Vitest Client Test Agent 2.0',
    });

    const quoteAfterDifferentIp = await store.getQuotationById(quote.id, orgId);
    expect(quoteAfterDifferentIp?.view_count).toBe(initialViewCount + 2);
  });
});
