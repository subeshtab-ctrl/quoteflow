import { describe, it, expect } from 'vitest';
import {
  ApprovalSchema,
  CustomerFormSchema,
  ProductFormSchema,
  QuotationFormSchema,
  RejectionSchema,
} from '@/lib/validations/quotation';

describe('Quotation Input Validation Schemas', () => {
  it('validates correct quotation creation payload', () => {
    const valid = {
      customer_id: 'cust_123',
      title: 'Infrastructure Modernization',
      issue_date: '2026-09-20',
      valid_until: '2026-10-20',
      currency: 'INR',
      discount_type: 'PERCENTAGE',
      discount_value: 5,
      tax_rate: 18,
      items: [
        {
          description: 'Consulting',
          quantity: 2,
          unit: 'days',
          unit_price: 15000,
          discount_type: 'PERCENTAGE',
          discount_value: 0,
          tax_rate: 18,
          sort_order: 0,
        },
      ],
    };

    const parsed = QuotationFormSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejects quotation without line items', () => {
    const invalid = {
      customer_id: 'cust_123',
      title: 'Infrastructure Modernization',
      issue_date: '2026-09-20',
      valid_until: '2026-10-20',
      items: [],
    };

    const parsed = QuotationFormSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('validates customer approval schema with signature data and terms agreement', () => {
    const validApproval = {
      token: 'demo_token_sent_q002',
      signer_name: 'John Mathew',
      signer_email: 'john@mathew.example.com',
      signature_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signature_type: 'DRAWN',
      agree_terms: true,
    };

    const parsed = ApprovalSchema.safeParse(validApproval);
    expect(parsed.success).toBe(true);
  });

  it('rejects approval when terms agreement checkbox is false', () => {
    const invalidApproval = {
      token: 'demo_token_sent_q002',
      signer_name: 'John Mathew',
      signer_email: 'john@mathew.example.com',
      signature_data_url: 'data:image/png;base64,...',
      signature_type: 'DRAWN',
      agree_terms: false,
    };

    const parsed = ApprovalSchema.safeParse(invalidApproval);
    expect(parsed.success).toBe(false);
  });

  it('validates customer rejection schema requiring reason and comments', () => {
    const validRejection = {
      token: 'demo_token_sent_q002',
      reason: 'Price too high',
      comments: 'Please revise line item #2 to fit within our Q3 budget.',
    };

    const parsed = RejectionSchema.safeParse(validRejection);
    expect(parsed.success).toBe(true);
  });

  it('validates product creation payload', () => {
    const validProduct = {
      name: 'Custom Web Development',
      sku: 'DEV-001',
      description: 'Full stack development service',
      unit_price: 50000,
      unit: 'project',
      tax_rate: 18,
      is_active: true,
    };

    const parsed = ProductFormSchema.safeParse(validProduct);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe('Custom Web Development');
      expect(parsed.data.unit_price).toBe(50000);
    }
  });

  it('validates product with optional/null fields', () => {
    const minimalProduct = {
      name: 'Support Hourly',
      unit_price: 1500,
    };

    const parsed = ProductFormSchema.safeParse(minimalProduct);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.unit).toBe('unit');
      expect(parsed.data.tax_rate).toBe(0);
      expect(parsed.data.is_active).toBe(true);
    }
  });

  it('rejects product without a name', () => {
    const invalidProduct = {
      name: '',
      unit_price: 1000,
    };

    const parsed = ProductFormSchema.safeParse(invalidProduct);
    expect(parsed.success).toBe(false);
  });
});
