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

    // 3. Registering with an invalid PIN (less than 4 digits or non-numeric) must fail
    await expect(
      store.registerPortalPin(quote.id, customerEmail!, '123')
    ).rejects.toThrow(/Security PIN/);

    await expect(
      store.registerPortalPin(quote.id, customerEmail!, 'abcdef')
    ).rejects.toThrow(/Security PIN/);

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

  it('provides a fully functional Live Demo Approval Portal via token sec_8f92m1k4092b with Demo PIN 123456', async () => {
    // 1. Fetch demo quotation by public token sec_8f92m1k4092b
    const demoQuote = await store.getQuotationByPublicToken('sec_8f92m1k4092b');
    expect(demoQuote).toBeDefined();
    expect(demoQuote?.quotation_number).toBe('Q-000042');
    expect(demoQuote?.currency).toBe('USD');
    expect(demoQuote?.grand_total).toBe(9676);
    expect(demoQuote?.customer?.name).toBe('Sarah Jenkins');
    expect(demoQuote?.customer?.company_name).toBe('Apex Global Tech');
    expect(demoQuote?.items?.length).toBeGreaterThanOrEqual(2);

    // 2. Fetch multi-quote customer portal resolver
    const portal = await store.getCustomerPortalQuotationsByToken('sec_8f92m1k4092b');
    expect(portal.activeQuotation).toBeDefined();
    expect(portal.activeQuotation?.quotation_number).toBe('Q-000042');
    expect(portal.allQuotations.length).toBeGreaterThanOrEqual(1);

    // 3. Verify Demo PIN Gate security
    const pinReg = await store.getPortalPin(demoQuote!.id);
    expect(pinReg).toBeDefined();
    expect(pinReg?.pin_hash).toBeDefined();

    // 4. Entering Demo PIN 123456 must succeed
    const isDemoPinValid = await store.verifyPortalPin(demoQuote!.id, '123456');
    expect(isDemoPinValid).toBe(true);

    // 5. Entering incorrect PIN must fail
    const isWrongPinValid = await store.verifyPortalPin(demoQuote!.id, '999999');
    expect(isWrongPinValid).toBe(false);

    // 6. Approving demo quote digitally
    const approved = await store.approveQuotation({
      token: 'sec_8f92m1k4092b',
      signer_name: 'Sarah Jenkins',
      signer_company: 'Apex Global Tech',
      signature_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signature_type: 'DRAWN',
    });
    expect(approved.status).toBe('APPROVED');
    expect(approved.approved_at).toBeDefined();

    // Reset demo state for subsequent tests
    store.resetDemoQuotation();
  });
});
