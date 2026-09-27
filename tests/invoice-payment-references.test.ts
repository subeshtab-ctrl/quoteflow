import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildInvoiceNotesWithPaymentRefs,
  DEFAULT_INVOICE_NOTES,
  store,
} from '@/lib/supabase/data-store';

describe('Invoice Payment References & Search', () => {
  describe('buildInvoiceNotesWithPaymentRefs', () => {
    it('formats single advance payment reference', () => {
      const notes = buildInvoiceNotesWithPaymentRefs(
        'Thank you for your business.',
        'UTR-ADV-001',
        null,
        'UTR-ADV-001'
      );

      expect(notes).toContain('Thank you for your business.');
      expect(notes).toContain('Payment References:');
      expect(notes).toContain('• Advance Payment Ref: UTR-ADV-001');
      expect(notes).not.toContain('• Final Settlement Ref:');
    });

    it('formats both advance and final payment references when fully settled', () => {
      const notes = buildInvoiceNotesWithPaymentRefs(
        'Special terms apply.',
        'UTR-ADV-001',
        'UTR-FINAL-002',
        'UTR-FINAL-002'
      );

      expect(notes).toContain('Special terms apply.');
      expect(notes).toContain('Payment References:');
      expect(notes).toContain('• Advance Payment Ref: UTR-ADV-001');
      expect(notes).toContain('• Final Settlement Ref: UTR-FINAL-002');
    });

    it('idempotently updates payment references without duplication', () => {
      // First update with advance
      const notes1 = buildInvoiceNotesWithPaymentRefs(
        DEFAULT_INVOICE_NOTES,
        'UTR-ADV-001',
        null,
        'UTR-ADV-001'
      );

      // Second update with final settlement
      const notes2 = buildInvoiceNotesWithPaymentRefs(
        notes1,
        'UTR-ADV-001',
        'UTR-FINAL-002',
        'UTR-FINAL-002'
      );

      // Should contain "Payment References:" only once
      const occurrences = (notes2.match(/Payment References?:/g) || []).length;
      expect(occurrences).toBe(1);

      // Should have both lines once
      expect(notes2).toContain('• Advance Payment Ref: UTR-ADV-001');
      expect(notes2).toContain('• Final Settlement Ref: UTR-FINAL-002');
    });

    it('falls back cleanly if no references are provided', () => {
      const notes = buildInvoiceNotesWithPaymentRefs(
        'Custom base note',
        null,
        null,
        null
      );
      expect(notes).toBe('Custom base note');
    });
  });

  describe('Two-stage payment settlement persistence', () => {
    const orgId = 'a0000000-0000-0000-0000-000000000001';

    it('saves advance payment reference and preserves it when later settled in full', async () => {
      // 1. Create a customer & quotation
      const customer = await store.createCustomer({
        name: 'Ref Test Customer',
        phone: '9876543210',
        email: 'ref-test@example.com',
        city: 'Mumbai',
        organization_id: orgId,
      });

      const quote = await store.createQuotation({
        organization_id: orgId,
        customer_id: customer.id,
        title: 'Industrial Project',
        issue_date: '2026-09-27',
        valid_until: '2026-10-27',
        items: [
          {
            description: 'Industrial Water Treatment System',
            quantity: 1,
            unit_price: 100000,
            tax_rate: 18,
            item_type: 'GOODS',
          },
        ],
      });

      const grandTotal = Number(quote.grand_total);
      expect(grandTotal).toBeGreaterThan(0);

      // 2. Stage 1: Partial Advance Payment (20%)
      const advanceRef = 'UTR-ADV-998877';
      const advancePaid = Math.round(grandTotal * 0.2);

      const quoteAfterAdvance = await store.updateQuotationPayment(quote.id, {
        is_paid: false,
        paid_amount: advancePaid,
        balance_amount: grandTotal - advancePaid,
        advance_percentage: 20,
        payment_status: 'PARTIALLY_PAID',
        payment_method: 'BANK_TRANSFER',
        payment_notes: advanceRef,
        advance_payment_notes: advanceRef,
        final_payment_notes: null,
      });

      expect(quoteAfterAdvance.advance_payment_notes).toBe(advanceRef);
      expect(quoteAfterAdvance.is_paid).toBe(false);

      // 3. Stage 2: Settle Remaining Balance in Full
      const finalRef = 'UTR-FINAL-443322';
      const quoteAfterFinal = await store.updateQuotationPayment(quote.id, {
        is_paid: true,
        paid_amount: grandTotal,
        balance_amount: 0,
        advance_percentage: 100,
        payment_status: 'PAID',
        payment_method: 'BANK_TRANSFER',
        payment_notes: finalRef,
        advance_payment_notes: advanceRef, // Advance ref preserved
        final_payment_notes: finalRef,
      });

      // Both payment reference numbers must be saved!
      expect(quoteAfterFinal.advance_payment_notes).toBe(advanceRef);
      expect(quoteAfterFinal.final_payment_notes).toBe(finalRef);
      expect(quoteAfterFinal.is_paid).toBe(true);

      // 4. Create or fetch linked invoice
      const invoice = await store.ensureInvoiceForQuotation(quoteAfterFinal);

      expect(invoice.advance_payment_notes).toBe(advanceRef);
      expect(invoice.final_payment_notes).toBe(finalRef);

      // Invoice notes must show both references in only ONE place (under notes)
      expect(invoice.notes).toContain('• Advance Payment Ref: UTR-ADV-998877');
      expect(invoice.notes).toContain('• Final Settlement Ref: UTR-FINAL-443322');

      // 5. Search Invoices by transaction reference
      // Search by advance reference
      const searchByAdv = await store.getInvoices(orgId, { search: 'UTR-ADV-998877' });
      expect(searchByAdv.some((inv) => inv.id === invoice.id)).toBe(true);

      // Search by final settlement reference
      const searchByFinal = await store.getInvoices(orgId, { search: 'UTR-FINAL-443322' });
      expect(searchByFinal.some((inv) => inv.id === invoice.id)).toBe(true);

      // Search by partial digits of reference
      const searchByPartial = await store.getInvoices(orgId, { search: '998877' });
      expect(searchByPartial.some((inv) => inv.id === invoice.id)).toBe(true);

      // Search by non-matching string
      const searchNonExistent = await store.getInvoices(orgId, { search: 'NO_SUCH_REF_ZZZ' });
      expect(searchNonExistent.some((inv) => inv.id === invoice.id)).toBe(false);
    });
  });
});
