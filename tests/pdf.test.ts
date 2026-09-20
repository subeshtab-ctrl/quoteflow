import { describe, it, expect } from 'vitest';
import { generateQuotationPdf } from '@/lib/pdf/generator';
import { store } from '@/lib/supabase/data-store';

describe('Server-Side PDF Generation', () => {
  it('generates a valid binary PDF document with standard PDF header', async () => {
    const quotation = await store.getQuotationById('d0000000-0000-0000-0000-000000000003');
    expect(quotation).not.toBeNull();

    const pdfBytes = await generateQuotationPdf(quotation!);

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Verify PDF header magic bytes: "%PDF-"
    const header = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });
});
