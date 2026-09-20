import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '@/lib/supabase/data-store';

describe('End-to-End Quotation Workflow & Audit Lifecycle', () => {
  it('executes the complete quotation lifecycle from creation to digital approval', async () => {
    // 1. Create a customer
    const customer = await store.createCustomer({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Dr. Sarah Connor',
      company_name: 'Cyberdyne Systems India',
      email: 'sarah@cyberdyne.example.com',
      phone: '+91 99887 76655',
      city: 'Hyderabad',
      state: 'Telangana',
    });
    expect(customer.id).toBeDefined();

    // 2. Business creates a quotation
    const quotation = await store.createQuotation({
      customer_id: customer.id,
      title: 'AI Security & Cloud Defense Infrastructure',
      issue_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      currency: 'INR',
      discount_type: 'PERCENTAGE',
      discount_value: 5,
      tax_rate: 18,
      items: [
        {
          description: 'Network Defense Engine (Node Setup)',
          quantity: 2,
          unit: 'servers',
          unit_price: 40000,
          discount_type: 'PERCENTAGE',
          discount_value: 0,
          tax_rate: 18,
          sort_order: 0,
        },
      ],
      status: 'SENT',
    });

    // Verify sequential quotation numbering
    expect(quotation.quotation_number).toMatch(/^Q-\d{6}$/);
    expect(quotation.status).toBe('SENT');
    expect(quotation.public_token).toBeDefined();
    expect(quotation.grand_total).toBeGreaterThan(0);

    // 3. Customer opens the secure public URL
    const fetched = await store.getQuotationByPublicToken(quotation.public_token);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(quotation.id);

    // 4. View Tracking: Customer views the quotation
    const viewResult = await store.recordQuotationView(quotation.id, {
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 Chrome/120.0 Safari/537.36',
    });

    expect(viewResult.firstView).toBe(true);
    expect(viewResult.quotation.view_count).toBe(1);
    expect(viewResult.quotation.status).toBe('VIEWED');

    // 5. Customer Approves and Signs Electronically
    const approved = await store.approveQuotation({
      token: quotation.public_token,
      signer_name: 'Sarah Connor',
      signer_email: 'sarah@cyberdyne.example.com',
      signer_company: 'Cyberdyne Systems India',
      signature_data_url:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAAAyCAYAAAAiO6mFAAAACXBIWXMAAAsTAAALEwEAmpwYAAA',
      signature_type: 'DRAWN',
      ip_address: '192.168.1.100',
      user_agent: 'Chrome Desktop',
    });

    expect(approved.status).toBe('APPROVED');
    expect(approved.approved_at).toBeDefined();
    expect(approved.approved_document_hash).toBeDefined();
    expect(approved.signature?.signer_name).toBe('Sarah Connor');

    // 6. Immutability verification: Approved quotation cannot be updated
    await expect(
      store.updateQuotation(approved.id, { title: 'Modified Title After Approval' })
    ).rejects.toThrow('Approved quotation is immutable');

    // 7. Revision Workflow: Create Revision V2
    const revision = await store.createQuotationRevision(approved.id);
    expect(revision.quotation_number).toBe(`${approved.quotation_number}-V2`);
    expect(revision.revision_number).toBe(2);
    expect(revision.status).toBe('DRAFT');
    expect(revision.original_quotation_id).toBe(approved.id);

    // Original approved quote remains unchanged
    const originalAfterRevision = await store.getQuotationById(approved.id);
    expect(originalAfterRevision?.status).toBe('APPROVED');

    // 8. Rejection Workflow on another quotation
    const quoteForReject = await store.createQuotation({
      customer_id: customer.id,
      title: 'Secondary Hardware Supply',
      issue_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      currency: 'INR',
      discount_type: 'PERCENTAGE',
      discount_value: 0,
      tax_rate: 18,
      items: [
        {
          description: 'Cables & Switches',
          quantity: 10,
          unit: 'pcs',
          unit_price: 1500,
          discount_type: 'PERCENTAGE',
          discount_value: 0,
          tax_rate: 18,
          sort_order: 0,
        },
      ],
      status: 'SENT',
    });

    const rejected = await store.rejectQuotation({
      token: quoteForReject.public_token,
      reason: 'Price too high',
      comments: 'Please offer an enterprise volume discount on cables.',
    });

    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejection_reason).toBe('Price too high');
    expect(rejected.rejection_comments).toContain('enterprise volume discount');
  });
});
