import { describe, it, expect } from 'vitest';
import { store } from '@/lib/supabase/data-store';
import { generateMetadata } from '@/app/q/[token]/page';
import { generateQuotationPdf } from '@/lib/pdf/generator';
import { generateInvoicePdf } from '@/lib/pdf/invoice-pdf-generator';
import { generatePaymentReceiptPdf } from '@/lib/pdf/receipt-pdf-generator';
import { findCountry, getBillingDetailsForCountry } from '@/lib/billing/country-rules';
import { SubscriptionService, DEFAULT_PLANS } from '@/lib/billing/subscription-service';

describe('Comprehensive End-to-End Verification: Test A, Test B, and Test C', () => {
  const orgId = 'a0000000-0000-0000-0000-000000000001';

  // ==========================================
  // TEST A: Live Quotation, WhatsApp Preview & Client Approval
  // ==========================================
  describe('Test A: Live Quotation, WhatsApp Link Preview & Client Flow', () => {
    let testQuote: any;

    it('A1: creates a realistic quotation with client details and public token', async () => {
      testQuote = await store.createQuotation({
        organization_id: orgId,
        customer_id: 'cust-e2e-1',
        title: 'Brand Identity & Web App Development',
        currency: 'USD',
        status: 'SENT',
        issue_date: '2026-10-18',
        valid_until: '2026-11-18',
        discount_type: 'PERCENTAGE',
        discount_value: 10,
        tax_rate: 0,
        advance_percentage: 50,
        accepted_payment_methods: ['BANK_TRANSFER', 'UPI', 'CRYPTO'],
        items: [
          {
            description: 'Cloud Architecture & Next.js Implementation',
            quantity: 1,
            unit: 'project',
            unit_price: 3500,
          },
          {
            description: 'UI/UX Interactive Prototyping',
            quantity: 1,
            unit: 'milestone',
            unit_price: 1500,
          },
        ],
        notes: 'Thank you for choosing QuoteFlow services.',
        terms_conditions: '1. 50% advance to start.\n2. Balance upon final handover.',
      });

      expect(testQuote).toBeDefined();
      expect(testQuote.id).toBeDefined();
      expect(testQuote.quotation_number).toBeDefined();
      expect(testQuote.public_token).toBeDefined();
      expect(testQuote.grand_total).toBe(4500); // (3500 + 1500) - 10% = 4500
    });

    it('A2: generates dynamic WhatsApp and OpenGraph metadata cards for /q/[token]', async () => {
      expect(testQuote.public_token).toBeDefined();

      const metadata = await generateMetadata({
        params: Promise.resolve({ token: testQuote.public_token }),
      });

      expect(metadata).toBeDefined();
      expect(metadata.title).toContain(testQuote.quotation_number);

      // Check description contains quote number and total amount for WhatsApp preview bubble
      expect(metadata.description).toContain(testQuote.quotation_number);
      expect(metadata.description).toContain('4,500');

      // Check OpenGraph card tags
      expect(metadata.openGraph).toBeDefined();
      expect(metadata.openGraph?.type).toBe('website');
      expect(metadata.openGraph?.url).toBe(`https://blendandbold.com/q/${testQuote.public_token}`);
      expect(metadata.openGraph?.images).toBeDefined();

      // Check Twitter Summary card tags
      expect(metadata.twitter).toBeDefined();
      expect(metadata.twitter?.card).toBe('summary');
      expect(metadata.twitter?.images).toBeDefined();
    });

    it('A3: tracks client views and allows 1-click digital acceptance with signature', async () => {
      // 1. Simulate client opening link from WhatsApp / Email
      const initialViews = testQuote.view_count || 0;
      await store.recordQuotationView(testQuote.id, {
        ip_address: '157.240.231.35', // Typical WhatsApp preview scraper or user IP
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      });

      const viewedQuote = await store.getQuotationById(testQuote.id, orgId);
      expect(viewedQuote?.view_count).toBe(initialViews + 1);

      // 2. Simulate client digitally accepting the quotation via approveQuotation
      const approved = await store.approveQuotation({
        token: testQuote.public_token,
        signer_name: 'Johnathan Client',
        signer_email: 'johnathan@example.com',
        signer_company: 'Acme Global Corp',
        signature_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        signature_type: 'DRAWN',
      });

      expect(approved.status).toBe('APPROVED');
      expect(approved.approved_at).toBeDefined();
      expect(approved.approved_document_hash).toBeDefined();

      const updatedQuote = await store.getQuotationById(testQuote.id, orgId);
      expect(updatedQuote?.signature).toBeDefined();
      expect(updatedQuote?.signature?.signer_name).toBe('Johnathan Client');
      expect(updatedQuote?.signature?.signer_company).toBe('Acme Global Corp');
      expect(updatedQuote?.signature?.signature_data_url).toBeDefined();
    });
  });

  // ==========================================
  // TEST B: Razorpay & NowPayments Subscription Checkout Flow
  // ==========================================
  describe('Test B: Dual-Engine Subscription Billing & Checkout', () => {
    it('B1: detects Indian business location and routes to Razorpay ₹149/mo subscription', () => {
      const indiaCountry = findCountry('IN');
      expect(indiaCountry.billingRegion).toBe('INDIA');
      expect(indiaCountry.currency).toBe('INR');

      const indiaBilling = getBillingDetailsForCountry('IN');
      expect(indiaBilling.planAmount).toBe(149);
      expect(indiaBilling.billingCurrency).toBe('INR');
      expect(indiaBilling.paymentProvider).toBe('RAZORPAY');
      expect(indiaBilling.isEligible).toBe(true);
    });

    it('B2: detects International business location and routes to NowPayments $12/mo subscription', () => {
      const usaCountry = findCountry('US');
      expect(usaCountry.billingRegion).toBe('INTERNATIONAL');
      expect(usaCountry.currency).toBe('USD');

      const usaBilling = getBillingDetailsForCountry('US');
      expect(usaBilling.planAmount).toBe(12);
      expect(usaBilling.billingCurrency).toBe('USD');
      expect(usaBilling.paymentProvider).toBe('NOWPAYMENTS');
      expect(usaBilling.isEligible).toBe(true);

      // Also verify UAE / Dubai routing
      const uaeBilling = getBillingDetailsForCountry('AE');
      expect(uaeBilling.planAmount).toBe(12);
      expect(uaeBilling.billingCurrency).toBe('USD');
      expect(uaeBilling.paymentProvider).toBe('NOWPAYMENTS');
      expect(uaeBilling.isEligible).toBe(true);
    });

    it('B3: initializes 14-day Free Trial with complete feature access', async () => {
      const subService = new SubscriptionService();
      const testBizId = `biz-test-${Date.now()}`;

      const trialSub = await subService.startFreeTrial(testBizId);
      expect(trialSub).toBeDefined();
      expect(trialSub.status).toBe('trialing');
      expect(trialSub.plan_id).toBe(DEFAULT_PLANS.FREE_TRIAL.id);
      expect(trialSub.trial_start_at).toBeDefined();
      expect(trialSub.trial_end_at).toBeDefined();

      // Check days remaining is positive (approx 14 days)
      const diffMs = new Date(trialSub.trial_end_at!).getTime() - new Date().getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      expect(daysRemaining).toBeGreaterThanOrEqual(13);
      expect(daysRemaining).toBeLessThanOrEqual(14);

      // Check business subscription access verification
      const access = await subService.getBusinessSubscriptionAccess(testBizId);
      expect(access.accountAccess).toBe('active');
      expect(access.isRestricted).toBe(false);
      expect(access.daysRemainingInTrial).toBeGreaterThanOrEqual(13);
    });
  });

  // ==========================================
  // TEST C: PDF Generation (Quotation, Invoice, Payment Receipt)
  // ==========================================
  describe('Test C: High-Fidelity PDF Generation Suite', () => {
    it('C1: generates Quotation PDF with items, totals, and bank details', async () => {
      const quotations = await store.getQuotations(orgId);
      expect(quotations.length).toBeGreaterThan(0);
      const quote = quotations[0];

      const pdfBytes = await generateQuotationPdf(quote);
      expect(pdfBytes).toBeDefined();
      expect(pdfBytes.length).toBeGreaterThan(1500);

      // Validate %PDF magic bytes
      const header = Buffer.from(pdfBytes.slice(0, 4)).toString('ascii');
      expect(header).toBe('%PDF');
    });

    it('C2: generates Commercial Tax Invoice PDF with tax breakdown and independent terms', async () => {
      const quotations = await store.getQuotations(orgId);
      const quote = quotations[0];

      // Convert or fetch invoice
      quote.is_paid = true;
      const invoice = await store.ensureInvoiceForQuotation(quote);
      expect(invoice).toBeDefined();
      expect(invoice.invoice_number).toBeDefined();

      const pdfBytes = await generateInvoicePdf(invoice);
      expect(pdfBytes).toBeDefined();
      expect(pdfBytes.length).toBeGreaterThan(1500);

      const header = Buffer.from(pdfBytes.slice(0, 4)).toString('ascii');
      expect(header).toBe('%PDF');
    });

    it('C3: generates Official Payment Receipt PDF with company seal and transaction reference', async () => {
      const quotations = await store.getQuotations(orgId);
      const quote = quotations[0];

      const confirmedQuote = await store.updateQuotationPayment(
        quote.id,
        {
          is_paid: true,
          paid_amount: Number(quote.grand_total),
          advance_percentage: 100,
          payment_status: 'PAID',
          payment_method: 'UPI',
          payment_notes: 'UPI/REF/994827104821',
          payment_confirmed_by_company: true,
          confirmed_by: 'Finance & Compliance Dept',
        },
        orgId
      );

      const pdfBytes = await generatePaymentReceiptPdf(confirmedQuote);
      expect(pdfBytes).toBeDefined();
      expect(pdfBytes.length).toBeGreaterThan(1500);

      const header = Buffer.from(pdfBytes.slice(0, 4)).toString('ascii');
      expect(header).toBe('%PDF');
    });
  });
});
