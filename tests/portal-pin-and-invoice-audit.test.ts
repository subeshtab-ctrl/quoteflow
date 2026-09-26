import { describe, it, expect } from 'vitest';
import { store } from '@/lib/supabase/data-store';
import { InvoiceStatus } from '@/types/database';

describe('Client Portal PIN Security & Invoice Audit History', () => {
  const orgId = 'a0000000-0000-0000-0000-000000000001';

  it('enforces 6-digit PIN registration with matching customer email', async () => {
    // 1. Fetch an existing quotation
    const quotations = await store.getQuotations(orgId);
    expect(quotations.length).toBeGreaterThan(0);
    const quote = quotations[0];
    const customerEmail = quote.customer?.email;
    expect(customerEmail).toBeDefined();

    // 2. Registering with an incorrect email must fail
    await expect(
      store.registerPortalPin(quote.id, 'wrong.email@randomdomain.com', '123456')
    ).rejects.toThrow(/does not match the registered client email/);

    // 3. Registering with an invalid PIN (less than 6 digits or non-numeric) must fail
    await expect(
      store.registerPortalPin(quote.id, customerEmail!, '1234')
    ).rejects.toThrow(/exactly 6 digits/);

    await expect(
      store.registerPortalPin(quote.id, customerEmail!, 'abcdef')
    ).rejects.toThrow(/exactly 6 digits/);

    // 4. Registering with correct email and 6-digit PIN must succeed
    const regResult = await store.registerPortalPin(quote.id, customerEmail!, '654321');
    expect(regResult.success).toBe(true);

    // 5. Verification with the correct PIN must return true
    const isValid = await store.verifyPortalPin(quote.id, '654321');
    expect(isValid).toBe(true);

    // 6. Verification with an incorrect PIN must return false
    const isInvalid = await store.verifyPortalPin(quote.id, '000000');
    expect(isInvalid).toBe(false);

    // 7. Reset PIN with matching email
    const resetResult = await store.resetPortalPin(quote.id, customerEmail!, '998877');
    expect(resetResult.success).toBe(true);

    const isNewPinValid = await store.verifyPortalPin(quote.id, '998877');
    expect(isNewPinValid).toBe(true);

    const isOldPinValid = await store.verifyPortalPin(quote.id, '654321');
    expect(isOldPinValid).toBe(false);
  });

  it('records audit events with user name, role, action, and timestamp on invoice changes', async () => {
    // 1. Create a test invoice
    const customers = await store.getCustomers(orgId);
    const customerId = customers[0].id;

    const newInvoice = await store.createInvoice({
      organization_id: orgId,
      customer_id: customerId,
      issue_date: '2026-09-26',
      due_date: '2026-10-26',
      currency: 'INR',
      items: [
        {
          description: 'Consulting Services',
          quantity: 2,
          unit_price: 5000,
          line_total: 10000,
          item_type: 'SERVICE',
          classification_type: 'SAC',
          classification_code: '998314',
          tax_rate: 18,
          tax_amount: 1800,
        },
      ],
      created_by: 'Super Admin',
    });

    expect(newInvoice.id).toBeDefined();
    expect(newInvoice.audit_history).toBeDefined();
    expect(newInvoice.audit_history!.length).toBeGreaterThan(0);
    expect(newInvoice.audit_history![0].action).toBe('CREATED');

    // 2. Update invoice particulars with actor context
    const updatedInvoice = await store.updateInvoice(
      newInvoice.id,
      {
        payment_terms: 'Immediate on Receipt',
        notes: 'Updated invoice notes for financial audit test',
      },
      orgId,
      { name: 'Finance Staff Priya', role: 'STAFF' }
    );

    expect(updatedInvoice.audit_history).toBeDefined();
    expect(updatedInvoice.audit_history!.length).toBeGreaterThanOrEqual(2);

    const latestAudit = updatedInvoice.audit_history![0];
    expect(latestAudit.user_name).toBe('Finance Staff Priya');
    expect(latestAudit.user_role).toBe('STAFF');
    expect(latestAudit.action).toBe('UPDATED');
    expect(latestAudit.timestamp).toBeDefined();

    // 3. Update invoice status (e.g. mark as PAID) with actor context
    const paidInvoice = await store.updateInvoiceStatus(
      newInvoice.id,
      orgId,
      'PAID' as InvoiceStatus,
      { payment_method: 'BANK_TRANSFER', payment_notes: 'NEFT UTR Ref #889900' },
      { name: 'Admin Subesh', role: 'ADMIN' }
    );

    expect(paidInvoice.status).toBe('PAID');
    expect(paidInvoice.is_paid).toBe(true);
    expect(paidInvoice.paid_at).toBeDefined();

    const statusAudit = paidInvoice.audit_history![0];
    expect(statusAudit.user_name).toBe('Admin Subesh');
    expect(statusAudit.user_role).toBe('ADMIN');
    expect(statusAudit.action).toBe('STATUS_CHANGED');
    expect(statusAudit.details).toContain('PAID');
  });
});
