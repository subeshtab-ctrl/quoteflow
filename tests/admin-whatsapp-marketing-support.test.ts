import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAdminWhatsAppCredentials,
  sendAdminMarketingWhatsAppMessage,
  sendAdminSupportWhatsAppMessage,
  sendAdminOutreachWhatsAppMessage,
} from '@/lib/whatsapp/admin-whatsapp-service';
import { QUOTEFLOW_STANDARD_TEMPLATES } from '@/lib/whatsapp/meta-templates-library';

describe('Developer Admin Meta WhatsApp Integration (Marketing, Support, Outreach)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('contains admin templates in QUOTEFLOW_STANDARD_TEMPLATES', () => {
    expect(QUOTEFLOW_STANDARD_TEMPLATES['admin_marketing_broadcast']).toBeDefined();
    expect(QUOTEFLOW_STANDARD_TEMPLATES['admin_marketing_broadcast'].category).toBe('MARKETING');
    expect(QUOTEFLOW_STANDARD_TEMPLATES['admin_support_reply']).toBeDefined();
    expect(QUOTEFLOW_STANDARD_TEMPLATES['admin_support_reply'].category).toBe('UTILITY');
    expect(QUOTEFLOW_STANDARD_TEMPLATES['admin_business_outreach']).toBeDefined();
    expect(QUOTEFLOW_STANDARD_TEMPLATES['admin_business_outreach'].category).toBe('UTILITY');
  });

  it('resolves developer admin WhatsApp credentials safely in test environment', async () => {
    const creds = await getAdminWhatsAppCredentials();
    expect(creds).not.toBeNull();
    expect(creds?.phoneNumberId).toBeDefined();
    expect(creds?.accessToken).toBeDefined();
    expect(typeof creds?.source).toBe('string');
  });

  it('sends marketing WhatsApp message via Meta Cloud API service', async () => {
    const res = await sendAdminMarketingWhatsAppMessage({
      recipientPhone: '+919876543210',
      recipientName: 'Acme Test Corp',
      messageText: 'Special 50% discount on QuoteFlow Pro!',
      promoCode: 'OFFER50',
      promoLink: 'https://www.blendandbold.com/pricing',
      useTemplate: true,
    });

    expect(res.success).toBe(true);
    expect(res.messageId).toBeDefined();
    expect(res.messageId).toContain('wamid');
  });

  it('sends support WhatsApp notification via Meta Cloud API service', async () => {
    const res = await sendAdminSupportWhatsAppMessage({
      recipientPhone: '+919876543210',
      businessName: 'Acme Support Client',
      ticketNumber: 'QF-TICK-999',
      ticketId: 'test-ticket-uuid-123',
      replyMessage: 'We have updated your invoice format as requested.',
      useTemplate: true,
    });

    expect(res.success).toBe(true);
    expect(res.messageId).toBeDefined();
    expect(res.messageId).toContain('wamid');
  });

  it('sends business outreach WhatsApp message via Meta Cloud API service', async () => {
    const res = await sendAdminOutreachWhatsAppMessage({
      recipientPhone: '+919876543210',
      businessName: 'Beta Business',
      businessId: 'test-business-uuid-456',
      message: 'Your QuoteFlow Pro free trial has been extended by 7 days.',
      portalLink: 'https://www.blendandbold.com/billing',
      useTemplate: false,
    });

    expect(res.success).toBe(true);
    expect(res.messageId).toBeDefined();
    expect(res.messageId).toContain('wamid');
  });
});
