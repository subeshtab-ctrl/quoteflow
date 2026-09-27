import { describe, it, expect } from 'vitest';
import { CustomerFormSchema, ApprovalSchema } from '@/lib/validations/quotation';
import {
  getDefaultCountryCode,
  cleanPhoneNumber,
  formatPhoneNumber,
  maskPhone,
  COUNTRY_CODES,
} from '@/lib/country-codes';
import { store, DEFAULT_ORG_ID } from '@/lib/supabase/data-store';

describe('Customer Client Authentication & Details', () => {
  describe('Country Codes & Phone Utility', () => {
    it('sets default country code based on registered business country', () => {
      expect(getDefaultCountryCode('India')).toBe('+91');
      expect(getDefaultCountryCode('IN')).toBe('+91');
      expect(getDefaultCountryCode('United Arab Emirates')).toBe('+971');
      expect(getDefaultCountryCode('UAE')).toBe('+971');
      expect(getDefaultCountryCode('Dubai, UAE')).toBe('+971');
      expect(getDefaultCountryCode('United States')).toBe('+1');
      expect(getDefaultCountryCode('USA')).toBe('+1');
      expect(getDefaultCountryCode('United Kingdom')).toBe('+44');
      expect(getDefaultCountryCode('UK')).toBe('+44');
      expect(getDefaultCountryCode('Saudi Arabia')).toBe('+966');
      expect(getDefaultCountryCode('Singapore')).toBe('+65');
      // Default fallback
      expect(getDefaultCountryCode(null)).toBe('+91');
      expect(getDefaultCountryCode('')).toBe('+91');
    });

    it('contains comprehensive list of country codes with dial codes and flags', () => {
      expect(COUNTRY_CODES.length).toBeGreaterThan(30);
      const india = COUNTRY_CODES.find((c) => c.code === 'IN');
      expect(india).toBeDefined();
      expect(india?.dialCode).toBe('+91');
      expect(india?.flag).toBe('🇮🇳');

      const uae = COUNTRY_CODES.find((c) => c.code === 'AE');
      expect(uae).toBeDefined();
      expect(uae?.dialCode).toBe('+971');
    });

    it('cleans mobile numbers to digits only and strips accidental duplicate country code or leading 0', () => {
      expect(cleanPhoneNumber('98765 43210', '+91')).toBe('9876543210');
      expect(cleanPhoneNumber('+91 98765 43210', '+91')).toBe('9876543210');
      expect(cleanPhoneNumber('09876543210', '+91')).toBe('9876543210');
      expect(cleanPhoneNumber('+971 50 123 4567', '+971')).toBe('501234567');
      expect(cleanPhoneNumber('(555) 123-4567', '+1')).toBe('5551234567');
    });

    it('formats phone numbers for display with separate country code', () => {
      expect(formatPhoneNumber('+91', '9876543210')).toBe('+91 9876543210');
      expect(formatPhoneNumber('+971', '501234567')).toBe('+971 501234567');
    });

    it('masks phone numbers securely for public client portal display', () => {
      expect(maskPhone('9876543210', '+91')).toBe('+91 ******3210');
      expect(maskPhone('501234567', '+971')).toBe('+971 ******4567');
    });
  });

  describe('Customer Form Schema Validation (Mobile vs Email)', () => {
    it('accepts customer with only mobile number (email blank, no auth_method specified)', () => {
      const mobileOnly = {
        name: 'Arjun Das',
        company_name: 'Das Enterprises',
        phone_country_code: '+91',
        phone: '9812345678',
        email: '',
      };

      const result = CustomerFormSchema.safeParse(mobileOnly);
      expect(result.success).toBe(true);
    });

    it('accepts customer with only email address (phone blank, no auth_method specified)', () => {
      const emailOnly = {
        name: 'Sarah Connor',
        email: 'sarah@skynet.example.com',
        phone: '',
      };

      const result = CustomerFormSchema.safeParse(emailOnly);
      expect(result.success).toBe(true);
    });

    it('accepts customer with both mobile and email provided', () => {
      const bothProvided = {
        name: 'John Wick',
        phone_country_code: '+1',
        phone: '5551234567',
        email: 'john@continental.com',
      };

      const result = CustomerFormSchema.safeParse(bothProvided);
      expect(result.success).toBe(true);
    });

    it('rejects customer when both mobile and email are blank', () => {
      const bothBlank = {
        name: 'Ghost User',
        phone: '',
        email: '',
      };

      const result = CustomerFormSchema.safeParse(bothBlank);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('phone'))).toBe(true);
        expect(result.error.issues.some((i) => i.path.includes('email'))).toBe(true);
      }
    });

    it('accepts customer with explicit mobile authentication and optional email', () => {
      const validMobileCust = {
        name: 'Arjun Das',
        company_name: 'Das Enterprises',
        auth_method: 'MOBILE',
        phone_country_code: '+91',
        phone: '9812345678',
        email: '', // Optional for mobile
      };

      const result = CustomerFormSchema.safeParse(validMobileCust);
      expect(result.success).toBe(true);
    });

    it('rejects customer with explicit mobile authentication when mobile number is missing or too short', () => {
      const invalidMobileCust = {
        name: 'Arjun Das',
        auth_method: 'MOBILE',
        phone_country_code: '+91',
        phone: '', // Empty
      };

      const result = CustomerFormSchema.safeParse(invalidMobileCust);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('phone'))).toBe(true);
      }
    });

    it('accepts customer with explicit email authentication and optional phone', () => {
      const validEmailCust = {
        name: 'Sarah Connor',
        auth_method: 'EMAIL',
        email: 'sarah@skynet.example.com',
        phone: '', // Optional for email
      };

      const result = CustomerFormSchema.safeParse(validEmailCust);
      expect(result.success).toBe(true);
    });

    it('rejects customer with explicit email authentication when email is missing', () => {
      const invalidEmailCust = {
        name: 'Sarah Connor',
        auth_method: 'EMAIL',
        email: '',
      };

      const result = CustomerFormSchema.safeParse(invalidEmailCust);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('email'))).toBe(true);
      }
    });
  });

  describe('Data Store Integration & Authentication Flow', () => {
    it('creates customer with only mobile number and infers MOBILE auth method', async () => {
      const created = await store.createCustomer({
        organization_id: DEFAULT_ORG_ID,
        name: 'Sunil Verma',
        company_name: 'Verma Logistics',
        phone_country_code: '+91',
        phone: '98444 55566',
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Sunil Verma');
      expect(created.auth_method).toBe('MOBILE');
      expect(created.phone_country_code).toBe('+91');
      expect(created.phone).toBe('9844455566'); // cleaned without spaces or +91
    });

    it('creates customer with only email and infers EMAIL auth method', async () => {
      const created = await store.createCustomer({
        organization_id: DEFAULT_ORG_ID,
        name: 'Priya Sharma',
        company_name: 'Sharma Tech',
        email: 'priya@sharmatech.in',
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Priya Sharma');
      expect(created.auth_method).toBe('EMAIL');
      expect(created.email).toBe('priya@sharmatech.in');
    });

    it('creates customer with both mobile and email and infers BOTH auth method', async () => {
      const created = await store.createCustomer({
        organization_id: DEFAULT_ORG_ID,
        name: 'Anil Kapoor',
        company_name: 'Kapoor Films',
        phone_country_code: '+91',
        phone: '98222 33344',
        email: 'anil@kapoorfilms.in',
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Anil Kapoor');
      expect(created.auth_method).toBe('BOTH');
      expect(created.phone).toBe('9822233344');
      expect(created.email).toBe('anil@kapoorfilms.in');
    });

    it('handles portal PIN registration and verification with mobile number', async () => {
      // 1. Create a customer with MOBILE auth
      const customer = await store.createCustomer({
        organization_id: DEFAULT_ORG_ID,
        name: 'Vikram Seth',
        auth_method: 'MOBILE',
        phone_country_code: '+91',
        phone: '9877766655',
      });

      // 2. Create quotation for this customer
      const quotation = await store.createQuotation({
        organization_id: DEFAULT_ORG_ID,
        customer_id: customer.id,
        title: 'Network Modernization',
        issue_date: '2026-09-27',
        valid_until: '2026-10-27',
        currency: 'INR',
        items: [
          {
            description: 'Fiber Deployment',
            quantity: 1,
            unit: 'lot',
            unit_price: 45000,
            sort_order: 0,
          },
        ],
      });

      // 3. Register PIN using mobile number
      // Trying with wrong mobile fails
      await expect(
        store.registerPortalPin(quotation.id, '9999999999', '123456', 'MOBILE')
      ).rejects.toThrow();

      // Registering with correct mobile succeeds
      const regResult = await store.registerPortalPin(
        quotation.id,
        '98777 66655',
        '654321',
        'MOBILE'
      );
      expect(regResult.success).toBe(true);

      // Verify PIN works
      const pinReg = await store.getPortalPin(quotation.id);
      expect(pinReg).toBeDefined();
      expect(pinReg?.customer_phone).toBe('9877766655');
      expect(pinReg?.phone_country_code).toBe('+91');
      expect(pinReg?.auth_method).toBe('MOBILE');

      const isPinValid = await store.verifyPortalPin(quotation.id, '654321');
      expect(isPinValid).toBe(true);

      const isWrongPinValid = await store.verifyPortalPin(quotation.id, '000000');
      expect(isWrongPinValid).toBe(false);
    });

    it('approves quotation with mobile signer details', async () => {
      const customer = await store.createCustomer({
        organization_id: DEFAULT_ORG_ID,
        name: 'Deepak Roy',
        auth_method: 'MOBILE',
        phone_country_code: '+91',
        phone: '9855566677',
      });

      const quote = await store.createQuotation({
        organization_id: DEFAULT_ORG_ID,
        customer_id: customer.id,
        title: 'Security Audit',
        issue_date: '2026-09-27',
        valid_until: '2026-10-27',
        currency: 'INR',
        items: [
          {
            description: 'Security Audit',
            quantity: 1,
            unit: 'system',
            unit_price: 35000,
            sort_order: 0,
          },
        ],
      });

      const approved = await store.approveQuotation({
        token: quote.public_token,
        signer_name: 'Deepak Roy',
        signer_phone: '9855566677',
        phone_country_code: '+91',
        signature_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        signature_type: 'DRAWN',
      });

      expect(approved.status).toBe('APPROVED');
      const sig = store['signatures'].get(quote.id);
      expect(sig).toBeDefined();
      expect(sig?.signer_name).toBe('Deepak Roy');
      expect(sig?.signer_phone).toBe('9855566677');
      expect(sig?.phone_country_code).toBe('+91');
    });

    it('enables editing customer details including phone, email, and company details', async () => {
      // 1. Create initial customer
      const customer = await store.createCustomer({
        organization_id: DEFAULT_ORG_ID,
        name: 'Rohan Sharma',
        company_name: 'RS Traders',
        phone_country_code: '+91',
        phone: '9811122233',
        email: 'rohan@rstraders.com',
        city: 'Mumbai',
        state: 'Maharashtra',
      });

      expect(customer.auth_method).toBe('BOTH');

      // 2. Edit contact person name, company name, city, and tax number
      const updated1 = await store.updateCustomer(customer.id, {
        name: 'Rohan M. Sharma',
        company_name: 'RS Global Enterprises',
        city: 'Pune',
        state: 'Maharashtra',
        tax_number: '27AAAAA0000A1Z5',
      });

      expect(updated1.name).toBe('Rohan M. Sharma');
      expect(updated1.company_name).toBe('RS Global Enterprises');
      expect(updated1.city).toBe('Pune');
      expect(updated1.tax_number).toBe('27AAAAA0000A1Z5');
      expect(updated1.phone).toBe('9811122233');
      expect(updated1.email).toBe('rohan@rstraders.com');

      // 3. Edit mobile number with different country code (UAE +971)
      const updated2 = await store.updateCustomer(customer.id, {
        phone_country_code: '+971',
        phone: '50 999 8888',
      });

      expect(updated2.phone_country_code).toBe('+971');
      expect(updated2.phone).toBe('509998888');
      expect(updated2.auth_method).toBe('BOTH');

      // 4. Edit to clear email, leaving only phone
      const updated3 = await store.updateCustomer(customer.id, {
        email: '',
      });

      expect(updated3.email).toBeUndefined();
      expect(updated3.phone).toBe('509998888');
      expect(updated3.auth_method).toBe('MOBILE');

      // 5. Edit to clear phone, leaving only email
      const updated4 = await store.updateCustomer(customer.id, {
        phone: '',
        email: 'rohan.new@global.com',
      });

      expect(updated4.phone).toBeUndefined();
      expect(updated4.email).toBe('rohan.new@global.com');
      expect(updated4.auth_method).toBe('EMAIL');
    });
  });
});
