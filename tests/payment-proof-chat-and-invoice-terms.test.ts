import { describe, it, expect } from 'vitest';
import { store } from '@/lib/supabase/data-store';
import { DEFAULT_INVOICE_TERMS, DEFAULT_INVOICE_NOTES } from '@/lib/supabase/data-store';
import { generateInvoicePdf } from '@/lib/pdf/invoice-pdf-generator';
import { generateQuotationPdf } from '@/lib/pdf/generator';

describe('Payment Proof Chat Attachment, Purge on Confirmation, & Invoice Terms', () => {
  const orgId = 'a0000000-0000-0000-0000-000000000001';

  it('records chat attachment for payment proof and deletes it after company confirms payment', async () => {
    const quotations = await store.getQuotations(orgId);
    expect(quotations.length).toBeGreaterThan(0);
    const quote = quotations[0];

    // 1. Customer attaches payment screenshot
    const customerMsg = await store.addQuotationChatMessage({
      quotationId: quote.id,
      organizationId: orgId,
      senderRole: 'CUSTOMER',
      senderName: 'Client Representative',
      message: 'Here is the payment transfer receipt screenshot for advance.',
      attachment: {
        name: 'payment_screenshot_hdfc_tx.png',
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        type: 'image/png',
        size: 1024,
        is_payment_proof: true,
      },
    });

    expect(customerMsg).toBeDefined();
    expect(customerMsg.attachment).toBeDefined();
    expect(customerMsg.attachment?.name).toBe('payment_screenshot_hdfc_tx.png');
    expect(customerMsg.attachment?.url).toContain('data:image/png');
    expect(customerMsg.attachment?.is_payment_proof).toBe(true);
    expect(customerMsg.attachment?.deleted_at).toBeFalsy();

    // Verify messages retrieved contains this attachment
    const messagesBefore = await store.getQuotationChatMessages(quote.id);
    const foundBefore = messagesBefore.find((m) => m.id === customerMsg.id);
    expect(foundBefore?.attachment?.url).toBeTruthy();

    // 2. Company confirms payment
    await store.updateQuotationPaymentDetails(quote.id, {
      confirmed: true,
      confirmed_by: 'Accounts Dept',
      paid_amount: 5000,
      payment_method: 'UPI',
      payment_notes: 'UPI/2026/092601928472',
    });

    // 3. Verify attachment URL is purged/cleared and marked deleted
    const messagesAfter = await store.getQuotationChatMessages(quote.id);
    const foundAfter = messagesAfter.find((m) => m.id === customerMsg.id);
    expect(foundAfter?.attachment).toBeDefined();
    expect(foundAfter?.attachment?.url).toBe('');
    expect(foundAfter?.attachment?.deleted_at).toBeTruthy();
    expect(foundAfter?.attachment?.deleted_reason).toContain('Payment verified');
  });

  it('invoice uses independent invoice terms and does not include quotation terms or notes', async () => {
    // 1. Create a quotation with specific quotation terms and notes
    const quote = await store.createQuotation({
      title: 'Enterprise Software Services',
      issue_date: '2026-09-26',
      valid_until: '2026-10-26',
      advance_percentage: 50,
      accepted_payment_methods: ['Bank Transfer (NEFT/RTGS)', 'UPI', 'Corporate Card'],
      payment_terms_instructions: 'Please transfer 50% advance to initiate sprint development.',
      notes: 'Payment within 30 days of completion.\nCustom project milestone notes.',
      terms_conditions:
        '1. Quotation valid for 30 days.\n2. 50% advance required to commence work.\n3. Taxes applicable as per local regulations.',
      items: [
        {
          description: 'Frontend Application',
          quantity: 1,
          unit: 'service',
          unit_price: 100000,
          tax_rate: 18,
        },
      ],
    });

    expect(quote.advance_percentage).toBe(50);
    expect(quote.accepted_payment_methods).toContain('UPI');
    expect(quote.payment_terms_instructions).toContain('50% advance');

    // 2. Generate Quotation PDF buffer
    const quotePdf = await generateQuotationPdf(quote);
    expect(quotePdf.length).toBeGreaterThan(100);

    // 3. Mark completed and generate Invoice
    quote.is_paid = true;
    quote.paid_at = new Date().toISOString();
    quote.payment_method = 'UPI';
    quote.payment_notes = 'TXN99281734612';

    const invoice = await store.ensureInvoiceForQuotation(quote);
    expect(invoice).toBeDefined();
    expect(invoice.quotation_id).toBe(quote.id);

    // Verify invoice notes & terms are NOT the old quotation terms
    expect(invoice.notes).not.toContain('Payment within 30 days of completion');
    expect(invoice.terms_conditions).not.toContain('Quotation valid for 30 days');
    expect(invoice.terms_conditions).not.toContain('50% advance required to commence work');

    // Verify it contains standard invoice terms
    expect(invoice.notes).toBe(DEFAULT_INVOICE_NOTES);
    expect(invoice.terms_conditions).toBe(DEFAULT_INVOICE_TERMS);

    // Verify payment mode and transaction reference are forwarded
    expect(invoice.payment_method).toBe('UPI');
    expect(invoice.payment_notes).toBe('TXN99281734612');

    // 4. Generate Invoice PDF buffer
    const invoicePdf = await generateInvoicePdf(invoice);
    expect(invoicePdf.length).toBeGreaterThan(100);
  });
});
