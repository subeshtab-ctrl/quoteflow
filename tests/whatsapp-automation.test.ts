import { describe, it, expect } from 'vitest';
import {
  buildWhatsAppMessage,
  cleanWhatsAppNumber,
  getWhatsAppUrl,
  getBusinessDirectWhatsAppUrl,
  DEFAULT_WHATSAPP_TEMPLATES,
} from '@/lib/whatsapp/automation';

describe('WhatsApp Automation & Business Reminders', () => {
  const mockOrg = {
    name: 'Blend & Bold Studio',
    whatsapp_number: '9847012345',
    whatsapp_country_code: '+91',
    default_currency: 'INR',
  };

  const mockCustomer = {
    name: 'Rahul Nair',
    phone: '9876543210',
    phone_country_code: '+91',
  };

  const mockQuote = {
    quotation_number: 'Q-2026-0042',
    grand_total: 75000,
    currency: 'INR',
    public_token: 'token-xyz-123',
    pin: '5678',
    pin_protection_enabled: true,
  };

  it('correctly cleans phone number to wa.me digit format', () => {
    expect(cleanWhatsAppNumber('9847012345', '+91')).toBe('919847012345');
    expect(cleanWhatsAppNumber('+971 50 123 4567')).toBe('971501234567');
  });

  it('builds standard QUOTE_READY message with placeholders replaced', () => {
    const msg = buildWhatsAppMessage({
      type: 'QUOTE_READY',
      customer: mockCustomer,
      quotation: mockQuote as any,
      organization: mockOrg as any,
      baseUrl: 'https://blendandbold.com',
    });

    expect(msg).toContain('Rahul Nair');
    expect(msg).toContain('Q-2026-0042');
    expect(msg).toContain('Blend & Bold Studio');
    expect(msg).toContain('https://blendandbold.com/q/token-xyz-123');
    expect(msg).toContain('5678');
  });

  it('builds QUOTE_REMINDER message with custom template if provided', () => {
    const customTemplate = 'Reminder for {customer_name}: Quote {quotation_number} of {amount} is awaiting approval at {quote_link}';
    const msg = buildWhatsAppMessage({
      type: 'QUOTE_REMINDER',
      template: customTemplate,
      customer: mockCustomer,
      quotation: mockQuote as any,
      organization: mockOrg as any,
      baseUrl: 'https://blendandbold.com',
    });

    expect(msg).toBe(
      'Reminder for Rahul Nair: Quote Q-2026-0042 of ₹ 75,000.00 is awaiting approval at https://blendandbold.com/q/token-xyz-123'
    );
  });

  it('constructs wa.me customer link and business direct contact link', () => {
    const customerUrl = getWhatsAppUrl({
      targetPhone: mockCustomer.phone,
      countryCode: mockCustomer.phone_country_code,
      message: 'Hello from QuoteFlow',
    });
    expect(customerUrl.startsWith('https://wa.me/919876543210?text=Hello%20from%20QuoteFlow')).toBe(true);

    const bizUrl = getBusinessDirectWhatsAppUrl({
      businessWhatsAppNumber: mockOrg.whatsapp_number,
      businessCountryCode: mockOrg.whatsapp_country_code,
      quotationNumber: mockQuote.quotation_number,
      companyName: mockOrg.name,
      customerName: mockCustomer.name,
    });
    expect(bizUrl).toContain('https://wa.me/919847012345');
    expect(bizUrl).toContain('Q-2026-0042');
  });
});
