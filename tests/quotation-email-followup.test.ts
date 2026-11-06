import { describe, it, expect } from 'vitest';
import {
  generateQuotationSentEmail,
  generateQuotationReminderEmail,
  generateQuotationPaymentReminderEmail,
  sendQuotationEmail,
} from '@/lib/email/service';
import { buildWhatsAppMessage } from '@/lib/whatsapp/automation';

describe('Quotation Email & Follow-up Service', () => {
  it('generates standard quotation sent email correctly', () => {
    const email = generateQuotationSentEmail({
      customerName: 'Acme Corp',
      companyName: 'Blend & Bold Design',
      quotationNumber: 'Q-000061',
      amount: 14999,
      currency: 'INR',
      validUntil: '2026-11-15',
      publicUrl: 'https://www.blendandbold.com/q/tok_test_123',
    });

    expect(email.subject).toContain('Quotation Q-000061');
    expect(email.subject).toContain('Blend & Bold Design');
    expect(email.html).toContain('Q-000061');
    expect(email.html).toContain('NEW QUOTATION');
    expect(email.html).toContain('Your quotation is ready');
    expect(email.html).toContain('View &amp; Respond to Quote');
    expect(email.text).toContain('tok_test_123');
  });

  it('generates gentle follow-up quotation reminder email with custom note and PIN', () => {
    const email = generateQuotationReminderEmail({
      customerName: 'John Doe',
      companyName: 'Blend & Bold Design',
      quotationNumber: 'Q-000061',
      amount: 25000,
      currency: 'INR',
      validUntil: '2026-11-20',
      publicUrl: 'https://www.blendandbold.com/q/tok_test_456',
      pin: '4821',
      customNote: 'Looking forward to working together!',
    });

    expect(email.subject).toContain('Gentle Follow-up');
    expect(email.subject).toContain('Q-000061');
    expect(email.html).toContain('Quotation Follow-up');
    expect(email.html).toContain('4821');
    expect(email.html).toContain('Looking forward to working together!');
    expect(email.text).toContain('4821');
    expect(email.text).toContain('Gentle follow-up');
  });

  it('dispatches simulated test email for reminder template without errors', async () => {
    const mockQuotation = {
      id: 'quote_test_01',
      quotation_number: 'Q-000061',
      grand_total: 15000,
      currency: 'INR',
      valid_until: '2026-11-30',
      public_token: 'token_abc',
      environment: 'test',
      customer: {
        email: 'client@example.com',
        name: 'Client Tester',
      },
      organization: {
        name: 'My Org',
      },
    };

    const res = await sendQuotationEmail(mockQuotation, {
      template: 'quotation_reminder',
      customNote: 'Friendly check in.',
    });

    expect(res.success).toBe(true);
    expect(res.id).toMatch(/^test_sim_/);
  });

  it('generates payment reminder email with pending balance and bank details correctly', () => {
    const email = generateQuotationPaymentReminderEmail({
      customerName: 'Jane Smith',
      companyName: 'Apex Solutions',
      quotationNumber: 'Q-000061',
      amount: 50000,
      paidAmount: 20000,
      currency: 'INR',
      validUntil: '2026-11-25',
      publicUrl: 'https://www.blendandbold.com/q/tok_pay_999',
      pin: '1234',
      customNote: 'Please note payment is due prior to final dispatch.',
      bankDetails: {
        bank_name: 'HDFC Bank',
        account_name: 'Apex Solutions Pvt Ltd',
        account_number: '50200012345678',
        ifsc_code: 'HDFC0001234',
        upi_id: 'apex@hdfcbank',
      },
    });

    expect(email.subject).toContain('Payment Reminder');
    expect(email.subject).toContain('Q-000061');
    expect(email.subject).toContain('Apex Solutions');
    expect(email.html).toContain('💳 Payment Reminder');
    expect(email.html).toContain('Q-000061');
    expect(email.html).toContain('Balance Due');
    expect(email.html).toContain('30,000');
    expect(email.html).toContain('HDFC Bank');
    expect(email.html).toContain('apex@hdfcbank');
    expect(email.html).toContain('1234');
    expect(email.html).toContain('Pay Securely Online Now');
    expect(email.text).toContain('Q-000061');
    expect(email.text).toContain('Balance Due');
    expect(email.text).toContain('tok_pay_999');
  });

  it('dispatches simulated payment reminder email for quotation', async () => {
    const mockQuotation = {
      id: 'quote_test_pay',
      quotation_number: 'Q-000061',
      grand_total: 45000,
      paid_amount: 15000,
      currency: 'INR',
      valid_until: '2026-11-28',
      public_token: 'token_pay_xyz',
      environment: 'test',
      customer: {
        email: 'client@example.com',
        name: 'Client Tester',
      },
      organization: {
        name: 'My Org',
      },
    };

    const res = await sendQuotationEmail(mockQuotation, {
      template: 'payment_reminder',
      customNote: 'Reminder for second milestone payment.',
    });

    expect(res.success).toBe(true);
    expect(res.id).toMatch(/^test_sim_/);
  });

  it('builds WhatsApp payment reminder message for quotation with balance due', () => {
    const msg = buildWhatsAppMessage({
      type: 'PAYMENT_REMINDER',
      customer: { name: 'Rahul Sharma' },
      quotation: {
        quotation_number: 'Q-000061',
        grand_total: 30000,
        paid_amount: 10000,
        currency: 'INR',
        public_token: 'tok_whatsapp_pay',
        pin: '5678',
      },
      organization: { name: 'Acme Interiors' },
    });

    expect(msg).toContain('Rahul Sharma');
    expect(msg).toContain('Quotation Q-000061');
    expect(msg).toContain('Acme Interiors');
    expect(msg).toContain('currently pending');
    expect(msg).toContain('Balance Due');
    expect(msg).toContain('tok_whatsapp_pay');
    expect(msg).toContain('5678');
  });

  it('safely logs audit events without throwing "Cannot read properties of undefined (reading catch)"', async () => {
    const { store } = await import('@/lib/supabase/data-store');

    // Should return a Promise and allow both await and .catch()
    const logPromise = store.logEvent(
      'a0000000-0000-0000-0000-000000000001',
      'quote_test_01',
      'SYSTEM',
      'EMAIL_SENT',
      { to: 'client@example.com' }
    );

    expect(logPromise).toBeInstanceOf(Promise);
    const event = await logPromise.catch(() => null);
    expect(event).toBeDefined();
    expect(event?.event_type).toBe('EMAIL_SENT');
    expect(event?.actor_type).toBe('SYSTEM');
  });
});
