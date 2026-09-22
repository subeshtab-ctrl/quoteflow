import { describe, it, expect } from 'vitest';
import { store } from '@/lib/supabase/data-store';
import { generateFinancialCsv } from '@/lib/export/csv-generator';
import { generateFinancialReportPdf } from '@/lib/export/report-pdf-generator';

describe('Financial Export & Payment Tracking System', () => {
  it('updates quotation payment status to PAID with payment details and logs audit event', async () => {
    const orgId = 'a0000000-0000-0000-0000-000000000001';
    const quoteId = 'd0000000-0000-0000-0000-000000000003'; // Approved quotation in seed data

    // 1. Mark as PAID
    const paidQuotation = await store.updateQuotationPayment(
      quoteId,
      {
        is_paid: true,
        paid_at: '2026-09-22T09:00:00.000Z',
        payment_method: 'BANK_TRANSFER',
        payment_notes: 'NEFT Ref #NEFT-20260922-9988',
      },
      orgId
    );

    expect(paidQuotation.is_paid).toBe(true);
    expect(paidQuotation.paid_at).toBe('2026-09-22T09:00:00.000Z');
    expect(paidQuotation.payment_method).toBe('BANK_TRANSFER');
    expect(paidQuotation.payment_notes).toBe('NEFT Ref #NEFT-20260922-9988');

    // Verify audit event
    const events = paidQuotation.events || [];
    const lastEvent = events[events.length - 1];
    expect(lastEvent.event_type).toBe('MARKED_PAID');

    // 2. Mark as UNPAID
    const unpaidQuotation = await store.updateQuotationPayment(
      quoteId,
      {
        is_paid: false,
      },
      orgId
    );

    expect(unpaidQuotation.is_paid).toBe(false);
    expect(unpaidQuotation.paid_at).toBeNull();
  });

  it('generates an RFC 4180 CSV document with UTF-8 BOM, Quotations, and Tax Invoices', async () => {
    const orgId = 'a0000000-0000-0000-0000-000000000001';
    const quotations = await store.getQuotations(orgId);
    const org = await store.getOrganization(orgId);

    const csvOutput = generateFinancialCsv({
      quotations,
      documentType: 'ALL',
      organization: org,
    });

    // Verify UTF-8 BOM is present for Excel compatibility
    expect(csvOutput.charCodeAt(0)).toBe(0xfeff);

    // Verify CSV Headers
    expect(csvOutput).toContain('Document Type');
    expect(csvOutput).toContain('Document Number');
    expect(csvOutput).toContain('Payment Status');
    expect(csvOutput).toContain('Payment Method');
    expect(csvOutput).toContain('Payment Notes');

    // Verify rows exist
    expect(csvOutput).toContain('Quotation');
    expect(csvOutput).toContain('Commercial Tax Invoice');
  });

  it('generates an executive summary financial statement PDF with KPI cards and table', async () => {
    const orgId = 'a0000000-0000-0000-0000-000000000001';
    const quotations = await store.getQuotations(orgId);
    const org = await store.getOrganization(orgId);

    const pdfBytes = await generateFinancialReportPdf({
      quotations,
      organization: org,
      dateRangeLabel: 'September 2026',
      statusLabel: 'All Records',
      paymentLabel: 'All',
      documentTypeLabel: 'Quotations & Invoices',
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1500);

    // Verify standard PDF header magic bytes: "%PDF-"
    const header = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });
});
