import { describe, it, expect } from 'vitest';
import { store } from '@/lib/supabase/data-store';

describe('Invoice Persistence and Quotation Completion Locking', () => {
  const orgId = 'a0000000-0000-0000-0000-000000000001';

  it('automatically creates and persists an invoice when a quotation is marked as PAID', async () => {
    // Seed quotation
    const quoteId = 'd0000000-0000-0000-0000-000000000003';

    // Mark as paid
    const paidQuote = await store.updateQuotationPayment(
      quoteId,
      {
        is_paid: true,
        paid_at: '2026-09-26T10:00:00.000Z',
        payment_method: 'UPI',
        payment_notes: 'Paid via PhonePe UPI Ref #998811',
      },
      orgId
    );

    expect(paidQuote.is_paid).toBe(true);

    // Verify invoice was created for this quotation
    const invoices = await store.getInvoices(orgId);
    const invoiceForQuote = invoices.find((inv) => inv.quotation_id === quoteId);

    expect(invoiceForQuote).toBeDefined();
    expect(invoiceForQuote!.status).toBe('PAID');
    expect(invoiceForQuote!.items?.length).toBeGreaterThan(0);

    // Retrieve directly by ID (must not be null / 404)
    const fetchedById = await store.getInvoiceById(invoiceForQuote!.id, orgId);
    expect(fetchedById).toBeDefined();
    expect(fetchedById!.id).toBe(invoiceForQuote!.id);
  });

  it('marks a paid quotation as completed and permanently locks it from edits', async () => {
    const quoteId = 'd0000000-0000-0000-0000-000000000003';

    // Mark as completed after paid
    const completed = await store.markQuotationCompleted(
      quoteId,
      orgId,
      'Admin User',
      { unpaid: false }
    );

    expect(completed.status).toBe('COMPLETED');
    expect(completed.completed_at).toBeDefined();
    expect(completed.completed_unpaid).toBe(false);
    expect(completed.is_paid).toBe(true);

    // Attempting to edit or change rates on a completed quotation must throw a lock error
    await expect(
      store.updateQuotation(quoteId, { title: 'Attempted Modification' }, orgId)
    ).rejects.toThrow('Completed quotation is locked and cannot be edited.');
  });

  it('marks an unpaid quotation as completed with unpaid flag and permanently locks it', async () => {
    // Create a new draft quotation
    const newQuote = await store.createQuotation(
      {
        customer_id: 'b0000000-0000-0000-0000-000000000001',
        title: 'Project Alpha (Unpaid Completed Test)',
        issue_date: '2026-09-26',
        valid_until: '2026-10-26',
        currency: 'INR',
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        tax_rate: 18,
        items: [
          {
            description: 'Engineering Consulting Service',
            quantity: 2,
            unit: 'hrs',
            unit_price: 5000,
            tax_rate: 18,
            line_total: 10000,
          },
        ],
      });

    expect(newQuote.is_paid).toBeFalsy();

    // Mark completed with unpaid: true
    const completedUnpaid = await store.markQuotationCompleted(
      newQuote.id,
      orgId,
      'Admin User',
      { unpaid: true, reason: 'Client opted for completion without advance payment' }
    );

    expect(completedUnpaid.status).toBe('COMPLETED');
    expect(completedUnpaid.completed_unpaid).toBe(true);
    expect(completedUnpaid.is_paid).toBe(false);

    // Must also be locked against any modifications
    await expect(
      store.updateQuotation(newQuote.id, { title: 'Modification Attempt' }, orgId)
    ).rejects.toThrow('Completed quotation is locked and cannot be edited.');
  });

  it('persists changes to an existing invoice when updated', async () => {
    const quoteId = 'd0000000-0000-0000-0000-000000000003';
    const invoices = await store.getInvoices(orgId);
    const invoice = invoices.find((inv) => inv.quotation_id === quoteId);

    expect(invoice).toBeDefined();

    // Update the invoice terms and notes
    const updated = await store.updateInvoice(
      invoice!.id,
      {
        payment_terms: 'Due on Receipt',
        notes: 'Custom invoice notes updated from invoice modal',
      },
      orgId
    );

    expect(updated.payment_terms).toBe('Due on Receipt');
    expect(updated.notes).toBe('Custom invoice notes updated from invoice modal');

    // Reload from store to verify persistence
    const reloaded = await store.getInvoiceById(invoice!.id, orgId);
    expect(reloaded!.payment_terms).toBe('Due on Receipt');
    expect(reloaded!.notes).toBe('Custom invoice notes updated from invoice modal');
  });
});
