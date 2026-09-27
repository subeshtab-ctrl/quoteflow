import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { store, DEFAULT_ORG_ID } from '@/lib/supabase/data-store';

describe('Sequential Invoice Number Auto-Generation & Refresh Stability', () => {
  let initialCounter = 20;

  beforeAll(async () => {
    const org = await store.getOrganization(DEFAULT_ORG_ID);
    initialCounter = org?.current_invoice_counter || 20;
  });

  afterAll(async () => {
    const org = await store.getOrganization(DEFAULT_ORG_ID);
    if (org) {
      org.current_invoice_counter = initialCounter;
      await store.updateOrganization(DEFAULT_ORG_ID, { current_invoice_counter: initialCounter });
    }
  });

  it('does not change or update the invoice number when the creation page is refreshed', async () => {
    // Calling peekNextInvoiceNumber multiple times simulates refreshing /invoices/new
    const peek1 = await store.peekNextInvoiceNumber(DEFAULT_ORG_ID);
    const peek2 = await store.peekNextInvoiceNumber(DEFAULT_ORG_ID);
    const peek3 = await store.peekNextInvoiceNumber(DEFAULT_ORG_ID);

    expect(peek1).toBeDefined();
    expect(peek1).toMatch(/^INV\d{4,}$/);
    expect(peek2).toBe(peek1);
    expect(peek3).toBe(peek1);
  });

  it('generates invoice numbers in order (e.g. INV0001 then INV0002) and advances only when saved', async () => {
    const nextBefore = await store.peekNextInvoiceNumber(DEFAULT_ORG_ID);
    const matchBefore = nextBefore.match(/(\d+)$/);
    expect(matchBefore).not.toBeNull();
    const numBefore = parseInt(matchBefore![1], 10);

    // Create an invoice with the peeked number
    const inv1 = await store.createInvoice({
      organization_id: DEFAULT_ORG_ID,
      customer_id: 'b0000000-0000-0000-0000-000000000001',
      invoice_number: nextBefore,
      issue_date: '2026-09-27',
      due_date: '2026-10-27',
      currency: 'USD',
      items: [
        {
          description: 'Web development services',
          quantity: 1,
          unit_price: 500,
        },
      ],
    });

    expect(inv1.invoice_number).toBe(nextBefore);

    // Peek again - it must have advanced to next in order!
    const nextAfter = await store.peekNextInvoiceNumber(DEFAULT_ORG_ID);
    const matchAfter = nextAfter.match(/(\d+)$/);
    expect(matchAfter).not.toBeNull();
    const numAfter = parseInt(matchAfter![1], 10);

    expect(numAfter).toBe(numBefore + 1);

    // Multiple refreshes after saving inv1 must remain stable on numAfter
    const nextAfterRefresh = await store.peekNextInvoiceNumber(DEFAULT_ORG_ID);
    expect(nextAfterRefresh).toBe(nextAfter);

    // Create a second invoice without passing invoice_number - it should auto-assign nextAfter
    const inv2 = await store.createInvoice({
      organization_id: DEFAULT_ORG_ID,
      customer_id: 'b0000000-0000-0000-0000-000000000001',
      issue_date: '2026-09-27',
      due_date: '2026-10-27',
      currency: 'USD',
      items: [
        {
          description: 'Consulting services',
          quantity: 1,
          unit_price: 300,
        },
      ],
    });

    expect(inv2.invoice_number).toBe(nextAfter);

    // Next after inv2 must be numBefore + 2
    const nextAfter2 = await store.peekNextInvoiceNumber(DEFAULT_ORG_ID);
    const numAfter2 = parseInt(nextAfter2.match(/(\d+)$/)![1], 10);
    expect(numAfter2).toBe(numBefore + 2);

    // Clean up created test invoices
    await store.deleteInvoice(inv1.id);
    await store.deleteInvoice(inv2.id);
  });

  it('rejects old random timestamp invoice numbers (> 50000) and replaces with sequential order', async () => {
    // Attempting to pass a random timestamp like INV-121467 or Date.now slice
    const inv = await store.createInvoice({
      organization_id: DEFAULT_ORG_ID,
      customer_id: 'b0000000-0000-0000-0000-000000000001',
      invoice_number: 'INV-121467',
      issue_date: '2026-09-27',
      due_date: '2026-10-27',
      currency: 'USD',
      items: [
        {
          description: 'IT Support',
          quantity: 1,
          unit_price: 200,
        },
      ],
    });

    // It must NOT be INV-121467! It must follow the sequential order
    expect(inv.invoice_number).not.toBe('INV-121467');
    const seqNum = parseInt(inv.invoice_number.match(/(\d+)$/)![1], 10);
    expect(seqNum).toBeLessThan(50000);

    // Clean up created test invoice
    await store.deleteInvoice(inv.id);
  });
});
