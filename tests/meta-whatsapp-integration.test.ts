import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '@/lib/supabase/data-store';
import { encryptToken, decryptToken } from '@/lib/whatsapp/encryption';
import {
  verifyMetaWebhookSignature,
  sendWhatsAppTemplateMessage,
} from '@/lib/whatsapp/meta-cloud-api';
import {
  QUOTEFLOW_STANDARD_TEMPLATES,
  buildTemplateParameters,
} from '@/lib/whatsapp/meta-templates-library';

describe('QuoteFlow Meta WhatsApp Business Platform Integration Suite', () => {
  const orgA = 'org_test_tenant_a_' + Date.now();
  const orgB = 'org_test_tenant_b_' + Date.now();

  beforeEach(() => {
    process.env.META_APP_SECRET = 'test_meta_app_secret_32bytes_value!!';
    process.env.ENCRYPTION_SECRET = 'test_aes_secret_key_32chars_long!';
  });

  describe('1. AES-256-GCM Credential Security & Encryption', () => {
    it('encrypts and decrypts access tokens symmetrically without data loss', () => {
      const rawToken = 'EAABwzLIXs50BAK8z...super_secret_system_user_token_12345';
      const encrypted = encryptToken(rawToken);

      // Verify encrypted token format: iv:authTag:ciphertext
      expect(encrypted).not.toBe(rawToken);
      expect(encrypted.split(':')).toHaveLength(3);

      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(rawToken);
    });

    it('generates unique initialization vectors (IV) for the same token', () => {
      const token = 'EAA_SAME_TOKEN_TEST';
      const enc1 = encryptToken(token);
      const enc2 = encryptToken(token);

      expect(enc1).not.toBe(enc2);
      expect(decryptToken(enc1)).toBe(token);
      expect(decryptToken(enc2)).toBe(token);
    });

    it('gracefully returns empty string if decryption fails or authentication tag is tampered', () => {
      const encrypted = encryptToken('valid_token');
      const parts = encrypted.split(':');
      // Tamper with the ciphertext
      const tampered = `${parts[0]}:${parts[1]}:deadbeef`;

      const decrypted = decryptToken(tampered);
      expect(decrypted).toBe('');
    });
  });

  describe('2. Multi-Tenant Connection Storage & Strict Isolation', () => {
    it('saves WhatsApp connection for Org A and isolates it from Org B', async () => {
      const connA = await store.saveWhatsAppConnection({
        organization_id: orgA,
        waba_id: 'waba_1001',
        phone_number_id: 'phone_1001',
        display_phone_number: '+91 98765 00001',
        verified_name: 'Org A Enterprises',
        connection_status: 'connected',
        encrypted_access_token: encryptToken('token_for_org_a'),
        quality_rating: 'GREEN',
      });

      expect(connA.organization_id).toBe(orgA);
      expect(connA.phone_number_id).toBe('phone_1001');

      // Org B must not see Org A connection
      const connB = await store.getWhatsAppConnection(orgB);
      expect(connB).toBeNull();

      // Org A retrieves its own connection
      const fetchedA = await store.getWhatsAppConnection(orgA);
      expect(fetchedA?.waba_id).toBe('waba_1001');
      expect(fetchedA?.display_phone_number).toBe('+91 98765 00001');
    });

    it('disconnects WhatsApp cleanly and clears sensitive credentials', async () => {
      await store.disconnectWhatsApp(orgA);
      const conn = await store.getWhatsAppConnection(orgA);

      expect(conn?.connection_status).toBe('disconnected');
      expect(conn?.encrypted_access_token).toBeNull();
      expect(conn?.disconnected_at).toBeDefined();
    });
  });

  describe('3. Standard Meta WhatsApp Templates & Parameter Builder', () => {
    it('defines standard Meta Utility templates for QuoteFlow workflows', () => {
      expect(QUOTEFLOW_STANDARD_TEMPLATES.quotation_created).toBeDefined();
      expect(QUOTEFLOW_STANDARD_TEMPLATES.quotation_reminder).toBeDefined();
      expect(QUOTEFLOW_STANDARD_TEMPLATES.invoice_created).toBeDefined();
      expect(QUOTEFLOW_STANDARD_TEMPLATES.payment_reminder).toBeDefined();
      expect(QUOTEFLOW_STANDARD_TEMPLATES.payment_received).toBeDefined();

      const quoteCreated = QUOTEFLOW_STANDARD_TEMPLATES.quotation_created;
      expect(quoteCreated.category).toBe('UTILITY');
      expect(quoteCreated.language).toBe('en_US');
    });

    it('builds ordered positional template parameters for Meta Cloud API format', () => {
      const params = buildTemplateParameters('quotation_created', {
        customer_name: 'Subesh V',
        quotation_number: 'QT-2026-1024',
        business_name: 'BlendAndBold',
        amount: '₹45,000',
        quote_link: 'https://blendandbold.com/q/sec_token_99',
      });

      expect(params).toHaveLength(5);
      expect(params[0]).toEqual({ type: 'text', text: 'Subesh V' });
      expect(params[1]).toEqual({ type: 'text', text: 'QT-2026-1024' });
      expect(params[2]).toEqual({ type: 'text', text: 'BlendAndBold' });
      expect(params[3]).toEqual({ type: 'text', text: '₹45,000' });
      expect(params[4]).toEqual({ type: 'text', text: 'https://blendandbold.com/q/sec_token_99' });
    });
  });

  describe('4. Message Dispatch & Multi-Tenant Audit History', () => {
    it('records dispatched WhatsApp messages in multi-tenant audit trail', async () => {
      const msg = await store.createWhatsAppMessage({
        organization_id: orgA,
        document_type: 'QUOTATION',
        document_number: 'QT-9999',
        recipient_phone: '+919876543210',
        template_name: 'quotation_created',
        meta_message_id: 'wamid.HBgL123456789==',
        status: 'SENT',
      });

      expect(msg.id).toBeDefined();
      expect(msg.status).toBe('SENT');
      expect(msg.sent_at).toBeDefined();

      const messagesA = await store.getWhatsAppMessages(orgA);
      expect(messagesA.length).toBeGreaterThan(0);
      expect(messagesA[0].document_number).toBe('QT-9999');

      // Org B should not see Org A message history
      const messagesB = await store.getWhatsAppMessages(orgB);
      expect(messagesB).toHaveLength(0);
    });

    it('updates delivery status when Meta webhook triggers delivery or read receipts', async () => {
      const metaId = 'wamid.HBgL123456789==';
      await store.updateWhatsAppMessageStatus(metaId, 'DELIVERED');

      let history = await store.getWhatsAppMessages(orgA);
      let target = history.find((m) => m.meta_message_id === metaId);
      expect(target?.status).toBe('DELIVERED');
      expect(target?.delivered_at).toBeDefined();

      await store.updateWhatsAppMessageStatus(metaId, 'READ');
      history = await store.getWhatsAppMessages(orgA);
      target = history.find((m) => m.meta_message_id === metaId);
      expect(target?.status).toBe('READ');
      expect(target?.read_at).toBeDefined();
    });

    it('records failed status and error reasons when recipient number is unreachable', async () => {
      const failMetaId = 'wamid.FAIL_998877';
      await store.createWhatsAppMessage({
        organization_id: orgA,
        document_type: 'INVOICE',
        document_number: 'INV-2026-001',
        recipient_phone: '+919999999999',
        template_name: 'invoice_created',
        meta_message_id: failMetaId,
        status: 'SENT',
      });

      await store.updateWhatsAppMessageStatus(
        failMetaId,
        'FAILED',
        'Recipient phone number not on WhatsApp (Code 131026)'
      );

      const history = await store.getWhatsAppMessages(orgA);
      const target = history.find((m) => m.meta_message_id === failMetaId);
      expect(target?.status).toBe('FAILED');
      expect(target?.error_message).toContain('Recipient phone number not on WhatsApp');
    });
  });

  describe('5. Webhook Security & HMAC SHA-256 Signature Verification', () => {
    it('verifies valid HMAC SHA-256 signatures from Meta webhooks', () => {
      const secret = 'test_meta_app_secret_32bytes_value!!';
      const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });

      const crypto = require('crypto');
      const validHash = crypto.createHmac('sha256', secret).update(body).digest('hex');
      const signatureHeader = `sha256=${validHash}`;

      const isValid = verifyMetaWebhookSignature(body, signatureHeader, secret);
      expect(isValid).toBe(true);
    });

    it('rejects tampered or mismatched webhook payloads', () => {
      const secret = 'test_meta_app_secret_32bytes_value!!';
      const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
      const tamperedBody = JSON.stringify({ object: 'whatsapp_business_account', entry: ['tampered'] });

      const crypto = require('crypto');
      const validHash = crypto.createHmac('sha256', secret).update(body).digest('hex');
      const signatureHeader = `sha256=${validHash}`;

      const isValid = verifyMetaWebhookSignature(tamperedBody, signatureHeader, secret);
      expect(isValid).toBe(false);
    });
  });
});
