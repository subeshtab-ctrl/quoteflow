import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '@/lib/supabase/data-store';
import { generateInvoicePdf } from '@/lib/pdf/invoice-pdf-generator';

describe('No Auto-Invoice Generation Until Explicitly Issued by Business', () => {
  const orgId = 'a0000000-0000-0000-0000-000000000001';

  it('does NOT automatically generate an invoice when client pays fully', async () => {
    // 1. Create a customer and quotation
    const customer = await store.createCustomer({
      organization_id: orgId,
      name: 'Invoice Test Customer',
      email: 'invoice.test@example.com',
    });

    const quotation = await store.createQuotation({
      organization_id: orgId,
      customer_id: customer.id,
      title: 'Commercial Roof Solar Installation',
      issue_date: '2026-10-09',
      valid_until: '2026-11-09',
      items: [
        {
          description: '50kW Solar Array Inverter Package',
          quantity: 1,
          unit_price: 150000,
          unit: 'set',
          tax_rate: 18,
        },
      ],
    });

    expect(quotation.id).toBeDefined();

    // 2. Approve the quotation
    await store.approveQuotation({
      token: quotation.public_token,
      signer_name: 'Invoice Test Customer',
      signer_email: 'invoice.test@example.com',
      signature_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signature_type: 'DRAWN',
    });

    // 3. Mark the quotation as 100% fully paid
    const updatedQuote = await store.updateQuotationPayment(quotation.id, {
      is_paid: true,
      payment_method: 'BANK_TRANSFER',
      paid_amount: quotation.grand_total,
      payment_notes: 'NEFT full payment clearance ref #NEFT992211',
    });

    expect(updatedQuote.is_paid).toBe(true);

    // Verify no invoice was automatically created for this quotation
    const allInvoices = await store.getInvoices(orgId);
    const matchedInvoice = allInvoices.find((inv) => inv.quotation_id === quotation.id);
    expect(matchedInvoice).toBeUndefined();

    // Verify getInvoiceByQuotationId returns null
    const existingInv = await store.getInvoiceByQuotationId(quotation.id, orgId);
    expect(existingInv).toBeNull();

    // Verify quotation reflects has_issued_invoice: false
    const refreshedQuote = await store.getQuotationById(quotation.id, orgId);
    expect(refreshedQuote?.has_issued_invoice).toBe(false);

    // 4. Now business explicitly creates/issues the invoice
    const issuedInvoice = await store.createInvoice({
      organization_id: orgId,
      customer_id: customer.id,
      quotation_id: quotation.id,
      issue_date: '2026-10-09',
      due_date: '2026-10-09',
      currency: 'INR',
      status: 'PAID',
      items: quotation.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_price,
        tax_rate: it.tax_rate,
      })),
    });

    expect(issuedInvoice.id).toBeDefined();
    expect(issuedInvoice.status).toBe('PAID');

    // 5. Verify that now getInvoiceByQuotationId finds the invoice
    const foundInvoice = await store.getInvoiceByQuotationId(quotation.id, orgId);
    expect(foundInvoice).toBeDefined();
    expect(foundInvoice?.id).toBe(issuedInvoice.id);

    // 6. Verify refreshed quotation now reflects has_issued_invoice: true
    const quoteAfterIssue = await store.getQuotationById(quotation.id, orgId);
    expect(quoteAfterIssue?.has_issued_invoice).toBe(true);
    expect(quoteAfterIssue?.issued_invoice_id).toBe(issuedInvoice.id);

    // 7. Verify invoice PDF can now be generated for the issued invoice
    const pdfBytes = await generateInvoicePdf(foundInvoice!);
    expect(pdfBytes.length).toBeGreaterThan(1000);
    const pdfHeader = Buffer.from(pdfBytes.slice(0, 4)).toString('ascii');
    expect(pdfHeader).toBe('%PDF');
  });
});
