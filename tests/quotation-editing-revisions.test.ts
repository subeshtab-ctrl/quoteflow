import { describe, it, expect } from 'vitest';
import { store } from '../lib/supabase/data-store';

describe('Quotation Editing, Revisions & Customer Re-Approval Workflow', () => {
  const orgId = 'org-test-revisions-001';

  it('enables editing on unapproved, approved, and in-progress stages, adds REV01/REV02/REV03, resets customer approval, and locks completed quotes', async () => {
    // 1. Create a fresh quotation
    const quote = await store.createQuotation(
      {
        organization_id: orgId,
        customer_id: 'cust-123',
        title: 'Network Setup & Server Installation',
        issue_date: '2026-11-04',
        valid_until: '2026-11-20',
        currency: 'INR',
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        tax_rate: 18,
        items: [
          {
            description: 'Core Switch Installation',
            quantity: 1,
            unit: 'unit',
            unit_price: 15000,
            discount_type: 'PERCENTAGE',
            discount_value: 0,
            tax_rate: 18,
          },
        ],
      }
    );

    expect(quote).toBeDefined();
    expect(quote.quotation_number).toBeTruthy();
    const baseNumber = quote.quotation_number.replace(/[-_](REV|V|rev|v)[-_]?\d+$/i, '');

    // 2. Edit quote while in unapproved stage (e.g. DRAFT/SENT)
    const editedRev1 = await store.updateQuotation(
      quote.id,
      {
        title: 'Network Setup & Server Installation (Updated Rates)',
        items: [
          {
            description: 'Core Switch Installation (Enterprise Edition)',
            quantity: 1,
            unit: 'unit',
            unit_price: 18000,
            discount_type: 'PERCENTAGE',
            discount_value: 0,
            tax_rate: 18,
          },
        ],
      },
      orgId
    );

    // Verifies: quote number has -REV01 suffix, status is SENT (awaiting customer approval)
    expect(editedRev1.quotation_number).toBe(`${baseNumber}-REV01`);
    expect(editedRev1.revision_number).toBe(2);
    expect(editedRev1.status).toBe('SENT');
    expect(editedRev1.approved_at).toBeNull();
    expect(editedRev1.signature).toBeNull();

    // 3. Customer approves the quotation
    const approvedQuote = await store.approveQuotation({
      token: editedRev1.public_token,
      signer_name: 'David Client',
      signer_email: 'david@clientcorp.com',
      signature_type: 'DRAWN',
      signature_data: 'data:image/png;base64,mockSignature...',
    });

    expect(approvedQuote.status).toBe('APPROVED');
    expect(approvedQuote.approved_at).toBeTruthy();
    expect(approvedQuote.signature).toBeDefined();

    // 4. Edit quote while in APPROVED stage
    // (Must NOT throw an error, must add -REV02, and make customer approve again)
    const editedRev2 = await store.updateQuotation(
      quote.id,
      {
        title: 'Network Setup & Server Installation + Extra Cabling',
        items: [
          {
            description: 'Core Switch Installation (Enterprise Edition)',
            quantity: 1,
            unit: 'unit',
            unit_price: 18000,
            discount_type: 'PERCENTAGE',
            discount_value: 0,
            tax_rate: 18,
          },
          {
            description: 'Cat6 Shielded Cabling (100m spool)',
            quantity: 2,
            unit: 'spool',
            unit_price: 4500,
            discount_type: 'PERCENTAGE',
            discount_value: 0,
            tax_rate: 18,
          },
        ],
      },
      orgId
    );

    // Verifies: quote number has -REV02 suffix, customer approval cleared, status is SENT
    expect(editedRev2.quotation_number).toBe(`${baseNumber}-REV02`);
    expect(editedRev2.revision_number).toBe(3);
    expect(editedRev2.status).toBe('SENT');
    expect(editedRev2.approved_at).toBeNull();
    expect(editedRev2.signature).toBeNull();
    expect(editedRev2.approved_document_hash).toBeNull();

    // 5. Customer re-approves REV02, and work transitions to IN_PROGRESS
    await store.approveQuotation({
      token: editedRev2.public_token,
      signer_name: 'David Client',
      signer_email: 'david@clientcorp.com',
      signature_type: 'DRAWN',
      signature_data: 'data:image/png;base64,mockSignature2...',
    });

    const inProgressQuote = await store.markQuotationInProgress(
      quote.id,
      orgId,
      'Admin',
      {
        estimatedDays: 3,
        notes: '3 Days Scheduled',
      }
    );
    expect(inProgressQuote.status).toBe('IN_PROGRESS');

    // 6. Edit quote while in IN_PROGRESS stage
    // (Must NOT throw an error, must add -REV03, and reset status to SENT for re-approval)
    const editedRev3 = await store.updateQuotation(
      quote.id,
      {
        title: 'Network Setup & Server Installation (Revision 3 Scope Adjustment)',
        items: [
          {
            description: 'Core Switch Installation (Enterprise Edition)',
            quantity: 1,
            unit: 'unit',
            unit_price: 18000,
            discount_type: 'PERCENTAGE',
            discount_value: 0,
            tax_rate: 18,
          },
          {
            description: 'Cat6 Shielded Cabling (100m spool)',
            quantity: 3,
            unit: 'spool',
            unit_price: 4500,
            discount_type: 'PERCENTAGE',
            discount_value: 0,
            tax_rate: 18,
          },
        ],
      },
      orgId
    );

    // Verifies: quote number has -REV03 suffix, in_progress cleared, status requires customer approval
    expect(editedRev3.quotation_number).toBe(`${baseNumber}-REV03`);
    expect(editedRev3.revision_number).toBe(4);
    expect(editedRev3.status).toBe('SENT');
    expect(editedRev3.approved_at).toBeNull();
    expect(editedRev3.signature).toBeNull();
    expect(editedRev3.in_progress_at).toBeNull();

    // 7. Complete the quotation
    // Customer re-approves and staff completes work
    await store.approveQuotation({
      token: editedRev3.public_token,
      signer_name: 'David Client',
      signer_email: 'david@clientcorp.com',
      signature_type: 'DRAWN',
      signature_data: 'data:image/png;base64,mockSignature3...',
    });
    const completedQuote = await store.markQuotationCompleted(quote.id, orgId, 'Admin', {
      unpaid: true,
      reason: 'Work completed by team',
    });
    expect(completedQuote.status).toBe('COMPLETED');

    // 8. Attempting to edit a COMPLETED quotation MUST be locked and throw an error
    await expect(
      store.updateQuotation(
        quote.id,
        {
          title: 'Attempting to edit completed quotation',
        },
        orgId
      )
    ).rejects.toThrow('Completed quotation is locked and cannot be edited.');
  });
});
