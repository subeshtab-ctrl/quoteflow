import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { store } from '@/lib/supabase/data-store';
import { generateQuotationPdf } from '@/lib/pdf/generator';

describe('Quotation Bank, UPI QR & Crypto Payment Options', () => {
  const orgId = 'a0000000-0000-0000-0000-000000000001';
  let originalQuote: any = null;
  let originalOrg: any = null;

  beforeAll(async () => {
    const quotations = await store.getQuotations(orgId);
    if (quotations.length > 0) {
      originalQuote = JSON.parse(JSON.stringify(quotations[0]));
    }
    const org = await store.getOrganization(orgId);
    if (org) {
      originalOrg = JSON.parse(JSON.stringify(org));
    }
  });

  afterAll(async () => {
    if (originalQuote) {
      await store.updateQuotation(originalQuote.id, originalQuote);
    }
    if (originalOrg) {
      await store.updateOrganization(orgId, originalOrg);
    }
  });

  it('saves and retrieves bank details, UPI ID with QR code, and crypto wallet with display modes', async () => {
    const quotations = await store.getQuotations(orgId);
    expect(quotations.length).toBeGreaterThan(0);
    const quote = quotations[0];

    // Sample 1x1 base64 transparent PNG for QR code test
    const dummyQrBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const updated = await store.updateQuotation(quote.id, {
      payment_display_mode: 'ALL',
      show_bank_details: true,
      show_upi_details: true,
      show_crypto_details: true,
      bank_details: {
        bank_name: 'HDFC Bank',
        account_name: 'SUBESH M LLC',
        account_number: '50200099887766',
        ifsc_code: 'HDFC0001234',
        swift_code: 'HDFCINBBXXX',
        branch_name: 'Marine Drive, Kochi',
      },
      upi_details: {
        upi_id: 'subeshtab@okhdfcbank',
        payee_name: 'SUBESH M LLC',
        qr_code_url: dummyQrBase64,
      },
      crypto_details: {
        currency: 'USDT',
        network: 'TRC20',
        wallet_address: 'TY9Y4g6vK8G3aVjW97xZ1bN5k3z1B9xQ5M',
        qr_code_url: dummyQrBase64,
      },
    });

    expect(updated).toBeDefined();
    expect(updated?.payment_display_mode).toBe('ALL');
    expect(updated?.show_bank_details).toBe(true);
    expect(updated?.show_upi_details).toBe(true);
    expect(updated?.show_crypto_details).toBe(true);
    expect(updated?.bank_details?.bank_name).toBe('HDFC Bank');
    expect(updated?.bank_details?.ifsc_code).toBe('HDFC0001234');
    expect(updated?.bank_details?.swift_code).toBe('HDFCINBBXXX');
    expect(updated?.upi_details?.upi_id).toBe('subeshtab@okhdfcbank');
    expect(updated?.upi_details?.qr_code_url).toContain('data:image/png');
    expect(updated?.crypto_details?.currency).toBe('USDT');
    expect(updated?.crypto_details?.network).toBe('TRC20');
    expect(updated?.crypto_details?.wallet_address).toBe('TY9Y4g6vK8G3aVjW97xZ1bN5k3z1B9xQ5M');

    // Retrieve via getQuotationById
    const fetched = await store.getQuotationById(quote.id);
    expect(fetched?.bank_details?.account_number).toBe('50200099887766');
    expect(fetched?.upi_details?.payee_name).toBe('SUBESH M LLC');
    expect(fetched?.crypto_details?.network).toBe('TRC20');

    // Verify PDF generation handles the quotation with all payment options and QR codes
    const org = await store.getOrganization(orgId);
    expect(org).toBeDefined();

    const pdfBuffer = await generateQuotationPdf({ ...fetched!, organization: org! });
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(100);
    // Verify standard PDF magic header (%PDF-)
    const pdfHeader = Buffer.from(pdfBuffer).slice(0, 5).toString('ascii');
    expect(pdfHeader).toBe('%PDF-');
  });

  it('updates and persists organization default payment settings', async () => {
    const dummyQrBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const updatedOrg = await store.updateOrganization(orgId, {
      default_payment_display_mode: 'BOTH',
      default_show_bank_details: true,
      default_show_upi_details: true,
      default_show_crypto_details: false,
      default_bank_details: {
        bank_name: 'State Bank of India',
        account_name: 'SUBESH M LLC',
        account_number: '12345678901',
        ifsc_code: 'SBIN0001234',
        branch_name: 'Main Branch',
      },
      default_upi_details: {
        upi_id: 'subeshm@sbi',
        payee_name: 'SUBESH M LLC',
        qr_code_url: dummyQrBase64,
      },
      default_crypto_details: {
        currency: 'USDT',
        network: 'TRC20',
        wallet_address: 'TDefaultWalletAddress123',
      },
    });

    expect(updatedOrg.default_payment_display_mode).toBe('BOTH');
    expect(updatedOrg.default_show_bank_details).toBe(true);
    expect(updatedOrg.default_show_upi_details).toBe(true);
    expect(updatedOrg.default_bank_details?.bank_name).toBe('State Bank of India');
    expect(updatedOrg.default_upi_details?.upi_id).toBe('subeshm@sbi');

    // Refetch organization
    const org = await store.getOrganization(orgId);
    expect(org?.default_payment_display_mode).toBe('BOTH');
    expect(org?.default_bank_details?.account_number).toBe('12345678901');
    expect(org?.default_upi_details?.upi_id).toBe('subeshm@sbi');
  });
});
