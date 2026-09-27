import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '@/lib/supabase/data-store';
import { InvoiceCancelSchema } from '@/lib/validations/quotation';

describe('Test Mode & Live Invoice Protection Suite', () => {
  const TEST_ORG_ID = 'test-org-' + Date.now();
  const OTHER_ORG_ID = 'other-org-' + Date.now();

  beforeEach(async () => {
    // Set up test organization
    await store.updateOrganization(TEST_ORG_ID, {
      name: 'Test Enterprise Corp',
      mode: 'live',
      current_invoice_counter: 100,
      current_test_invoice_counter: 10,
    });
  });

  it('Requirement 8: Backend derives environment from org.mode and prevents spoofing', async () => {
    // When org is in live mode
    await store.updateOrganization(TEST_ORG_ID, { mode: 'live' });
    const liveInvoice = await store.createInvoice({
      organization_id: TEST_ORG_ID,
      customer_id: 'cust-1',
      issue_date: '2026-09-27',
      due_date: '2026-10-27',
      currency: 'USD',
      items: [
        {
          description: 'Production Software License',
          quantity: 1,
          unit_price: 5000,
        },
      ],
    });
    expect(liveInvoice.environment).toBe('live');

    // When org is in test mode
    await store.updateOrganization(TEST_ORG_ID, { mode: 'test' });
    const testInvoice = await store.createInvoice({
      organization_id: TEST_ORG_ID,
      customer_id: 'cust-1',
      issue_date: '2026-09-27',
      due_date: '2026-10-27',
      currency: 'USD',
      items: [
        {
          description: 'Test Demo Widget',
          quantity: 1,
          unit_price: 250,
        },
      ],
    });
    expect(testInvoice.environment).toBe('test');
  });

  it('Requirement 9: Test invoices use separate prefix and counter without affecting live counter', async () => {
    const liveNum1 = await store.generateNextInvoiceNumber(TEST_ORG_ID, 'live');
    expect(liveNum1).toMatch(/^INV-\d{6}$/);

    const testNum1 = await store.generateNextInvoiceNumber(TEST_ORG_ID, 'test');
    expect(testNum1).toMatch(/^TEST-INV-\d{5}$/);

    const liveNum2 = await store.generateNextInvoiceNumber(TEST_ORG_ID, 'live');
    expect(liveNum2).toMatch(/^INV-\d{6}$/);
    expect(liveNum2).not.toBe(liveNum1);
  });

  it('Requirement 1: Deleting a live invoice is strictly forbidden and throws error', async () => {
    await store.updateOrganization(TEST_ORG_ID, { mode: 'live' });
    const liveInv = await store.createInvoice({
      organization_id: TEST_ORG_ID,
      customer_id: 'cust-1',
      issue_date: '2026-09-27',
      due_date: '2026-10-27',
      currency: 'USD',
      items: [{ description: 'Live Service', quantity: 1, unit_price: 1000 }],
    });

    expect(liveInv.environment).toBe('live');

    // Attempting delete should throw
    await expect(
      store.deleteInvoice(liveInv.id, TEST_ORG_ID, 'OWNER')
    ).rejects.toThrow(/Live invoices cannot be permanently deleted/i);

    // Verify invoice still exists intact
    const fetched = await store.getInvoiceById(liveInv.id, TEST_ORG_ID);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(liveInv.id);
  });

  it('Requirement 2: Deleting a test invoice permanently removes it (OWNER/ADMIN)', async () => {
    await store.updateOrganization(TEST_ORG_ID, { mode: 'test' });
    const testInv = await store.createInvoice({
      organization_id: TEST_ORG_ID,
      customer_id: 'cust-1',
      issue_date: '2026-09-27',
      due_date: '2026-10-27',
      currency: 'USD',
      items: [{ description: 'Test Demo Item', quantity: 1, unit_price: 100 }],
    });

    expect(testInv.environment).toBe('test');

    const result = await store.deleteInvoice(testInv.id, TEST_ORG_ID, 'ADMIN');
    expect(result).toBe(true);

    const fetched = await store.getInvoiceById(testInv.id, TEST_ORG_ID);
    expect(fetched).toBeNull();
  });

  it('Requirement 3: Staff cannot delete test invoices', async () => {
    await store.updateOrganization(TEST_ORG_ID, { mode: 'test' });
    const testInv = await store.createInvoice({
      organization_id: TEST_ORG_ID,
      customer_id: 'cust-1',
      issue_date: '2026-09-27',
      due_date: '2026-10-27',
      currency: 'USD',
      items: [{ description: 'Test Demo Item', quantity: 1, unit_price: 100 }],
    });

    await expect(
      store.deleteInvoice(testInv.id, TEST_ORG_ID, 'STAFF')
    ).rejects.toThrow(/Staff members cannot delete invoices/i);

    const fetched = await store.getInvoiceById(testInv.id, TEST_ORG_ID);
    expect(fetched).not.toBeNull();
  });

  it('Requirement 4: Staff cannot cancel or void live invoices', async () => {
    await store.updateOrganization(TEST_ORG_ID, { mode: 'live' });
    const liveInv = await store.createInvoice({
      organization_id: TEST_ORG_ID,
      customer_id: 'cust-1',
      issue_date: '2026-09-27',
      due_date: '2026-10-27',
      currency: 'USD',
      items: [{ description: 'Live Service', quantity: 1, unit_price: 2000 }],
    });

    await expect(
      store.cancelInvoice({
        id: liveInv.id,
        orgId: TEST_ORG_ID,
        reason: 'Customer requested change of billing address',
        action: 'CANCEL',
        actor: { name: 'Staff Member', role: 'STAFF' },
      })
    ).rejects.toThrow(/Staff members cannot cancel or void invoices/i);

    const fetched = await store.getInvoiceById(liveInv.id, TEST_ORG_ID);
    expect(fetched?.status).not.toBe('CANCELLED');
  });

  it('Requirement 5: Cancelling without a reason (< 5 characters) is rejected by schema and store', async () => {
    // Zod schema validation
    expect(() =>
      InvoiceCancelSchema.parse({ reason: 'abc', action: 'CANCEL' })
    ).toThrow();

    await store.updateOrganization(TEST_ORG_ID, { mode: 'live' });
    const liveInv = await store.createInvoice({
      organization_id: TEST_ORG_ID,
      customer_id: 'cust-1',
      issue_date: '2026-09-27',
      due_date: '2026-10-27',
      currency: 'USD',
      items: [{ description: 'Live Service', quantity: 1, unit_price: 1500 }],
    });

    await expect(
      store.cancelInvoice({
        id: liveInv.id,
        orgId: TEST_ORG_ID,
        reason: '123',
        action: 'CANCEL',
        actor: { name: 'Admin User', role: 'ADMIN' },
      })
    ).rejects.toThrow(/Cancellation reason must be between 5 and 500 characters/i);
  });

  it('Requirement 6: Cancelling a live invoice with reason updates status to CANCELLED and creates audit history', async () => {
    await store.updateOrganization(TEST_ORG_ID, { mode: 'live' });
    const liveInv = await store.createInvoice({
      organization_id: TEST_ORG_ID,
      customer_id: 'cust-1',
      issue_date: '2026-09-27',
      due_date: '2026-10-27',
      currency: 'USD',
      items: [{ description: 'Consulting Project', quantity: 1, unit_price: 4500 }],
    });

    const reason = 'Client scope revised, replacing with updated invoice';
    const cancelled = await store.cancelInvoice({
      id: liveInv.id,
      orgId: TEST_ORG_ID,
      reason,
      action: 'CANCEL',
      actor: { name: 'Jane Doe', role: 'OWNER' },
    });

    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancellation_reason).toBe(reason);
    expect(cancelled.cancelled_by).toBe('Jane Doe');
    expect(cancelled.cancelled_by_role).toBe('OWNER');
    expect(cancelled.cancelled_at).toBeDefined();

    // Check audit trail
    const auditEntries = cancelled.audit_history || [];
    const cancelEvent = auditEntries.find((e) => e.action === 'CANCELLED');
    expect(cancelEvent).toBeDefined();
    expect(cancelEvent?.user_name).toBe('Jane Doe');
    expect(cancelEvent?.user_role).toBe('OWNER');
    expect(cancelEvent?.details).toContain(reason);
  });

  it('Requirement 7: Cancelling an already cancelled or voided invoice throws error', async () => {
    await store.updateOrganization(TEST_ORG_ID, { mode: 'live' });
    const liveInv = await store.createInvoice({
      organization_id: TEST_ORG_ID,
      customer_id: 'cust-1',
      issue_date: '2026-09-27',
      due_date: '2026-10-27',
      currency: 'USD',
      items: [{ description: 'Support Retainer', quantity: 1, unit_price: 800 }],
    });

    await store.cancelInvoice({
      id: liveInv.id,
      orgId: TEST_ORG_ID,
      reason: 'Billed to wrong subsidiary entity',
      action: 'CANCEL',
      actor: { name: 'Admin User', role: 'ADMIN' },
    });

    // Second cancellation attempt
    await expect(
      store.cancelInvoice({
        id: liveInv.id,
        orgId: TEST_ORG_ID,
        reason: 'Attempting duplicate cancel',
        action: 'VOID',
        actor: { name: 'Admin User', role: 'ADMIN' },
      })
    ).rejects.toThrow(/This invoice has already been cancelled or voided/i);
  });

  it('Requirement 10: Dashboard analytics excludes test invoices and quotations from totals', async () => {
    await store.updateOrganization(TEST_ORG_ID, { mode: 'test' });
    await store.createQuotation({
      organization_id: TEST_ORG_ID,
      customer_id: 'cust-1',
      title: 'Massive Test Demo Quote',
      issue_date: '2026-09-27',
      valid_until: '2026-10-27',
      currency: 'USD',
      status: 'APPROVED',
      items: [{ description: 'Test Mega Item', quantity: 1, unit_price: 9999999 }],
    });

    const analytics = await store.getDashboardAnalytics(TEST_ORG_ID);
    // Since the only quote in TEST_ORG_ID is in test environment, it should NOT count in live totals
    expect(analytics.totalValue).toBe(0);
    expect(analytics.approvedValue).toBe(0);
  });

  it('Requirement 11: Live invoice protection cannot be bypassed by switching to test mode', async () => {
    // 1. Create a live invoice while in live mode
    await store.updateOrganization(TEST_ORG_ID, { mode: 'live' });
    const liveInv = await store.createInvoice({
      organization_id: TEST_ORG_ID,
      customer_id: 'cust-1',
      issue_date: '2026-09-27',
      due_date: '2026-10-27',
      currency: 'USD',
      items: [{ description: 'Permanent Live Asset', quantity: 1, unit_price: 12000 }],
    });
    expect(liveInv.environment).toBe('live');

    // 2. Switch organization mode to 'test'
    await store.updateOrganization(TEST_ORG_ID, { mode: 'test' });

    // 3. Try to permanently delete the live invoice while the org is in test mode
    await expect(
      store.deleteInvoice(liveInv.id, TEST_ORG_ID, 'OWNER')
    ).rejects.toThrow(/Live invoices cannot be permanently deleted/i);

    // Live invoice is still preserved
    const stillExists = await store.getInvoiceById(liveInv.id, TEST_ORG_ID);
    expect(stillExists).not.toBeNull();
    expect(stillExists?.environment).toBe('live');
  });

  it('Requirement 12: Cross-tenant isolation prevents accessing or modifying invoices of other orgs', async () => {
    await store.updateOrganization(TEST_ORG_ID, { mode: 'live' });
    const liveInv = await store.createInvoice({
      organization_id: TEST_ORG_ID,
      customer_id: 'cust-1',
      issue_date: '2026-09-27',
      due_date: '2026-10-27',
      currency: 'USD',
      items: [{ description: 'Org A Secret Data', quantity: 1, unit_price: 5000 }],
    });

    // Access from OTHER_ORG_ID should return null / fail
    const crossAccess = await store.getInvoiceById(liveInv.id, OTHER_ORG_ID);
    expect(crossAccess).toBeNull();

    await expect(
      store.cancelInvoice({
        id: liveInv.id,
        orgId: OTHER_ORG_ID,
        reason: 'Malicious cross-tenant attempt',
        action: 'CANCEL',
        actor: { name: 'Hacker', role: 'ADMIN' },
      })
    ).rejects.toThrow();
  });
});
