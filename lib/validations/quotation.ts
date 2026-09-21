import { z } from 'zod';

export const LineItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().nullable().optional(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required').default('unit'),
  unit_price: z.coerce.number().min(0, 'Unit price cannot be negative'),
  discount_type: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  discount_value: z.coerce.number().min(0).default(0),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  sort_order: z.number().int().default(0),
});

export const QuotationFormSchema = z.object({
  id: z.string().optional(),
  customer_id: z.string().min(1, 'Please select or create a customer'),
  title: z.string().min(2, 'Quotation title is required'),
  issue_date: z.string().min(1, 'Issue date is required'),
  valid_until: z.string().min(1, 'Valid until date is required'),
  currency: z.enum(['INR', 'USD', 'AED', 'EUR', 'GBP']).default('INR'),
  discount_type: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  discount_value: z.coerce.number().min(0).default(0),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  terms_conditions: z.string().optional(),
  items: z.array(LineItemSchema).min(1, 'At least one line item is required'),
  status: z
    .enum([
      'DRAFT',
      'SENT',
      'VIEWED',
      'PENDING_APPROVAL',
      'APPROVED',
      'REJECTED',
      'EXPIRED',
      'CANCELLED',
    ])
    .default('DRAFT'),
});

export const CustomerFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Contact name is required'),
  company_name: z.string().optional(),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  alternate_phone: z.string().optional(),
  billing_address: z.string().optional(),
  shipping_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default('India'),
  postal_code: z.string().optional(),
  tax_number: z.string().optional(),
  notes: z.string().optional(),
});

export const ProductFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Product or service name is required'),
  sku: z.string().optional(),
  description: z.string().optional(),
  unit_price: z.coerce.number().min(0, 'Price cannot be negative'),
  unit: z.string().min(1).default('unit'),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  is_active: z.boolean().default(true),
});

export const ApprovalSchema = z.object({
  token: z.string().min(10, 'Invalid approval token'),
  signer_name: z.string().min(2, 'Please enter your full name'),
  signer_email: z.string().email('Please enter a valid email address'),
  signer_company: z.string().optional(),
  signature_data_url: z.string().min(20, 'Signature is required'),
  signature_type: z.enum(['DRAWN', 'TYPED']),
  agree_terms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the quotation terms and conditions' }),
  }),
});

export const RejectionSchema = z.object({
  token: z.string().min(10, 'Invalid token'),
  reason: z.enum([
    'Price too high',
    'Need changes',
    'Project cancelled',
    'Selected another supplier',
    'Other',
  ]),
  comments: z.string().min(5, 'Please provide rejection feedback or comments (min 5 characters)'),
});

export const OrganizationSettingsSchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  business_type: z.string().optional(),
  email: z.string().email('Valid business email is required'),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  gst_vat_number: z.string().optional(),
  address_line1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default('India'),
  postal_code: z.string().optional(),
  logo_url: z.string().optional().or(z.literal('')),
  brand_color: z.string().default('#4f46e5'),
  default_currency: z.enum(['INR', 'USD', 'AED', 'EUR', 'GBP']).default('INR'),
  default_tax_rate: z.coerce.number().min(0).max(100).default(18),
  default_validity_days: z.coerce.number().int().positive().default(30),
  quotation_prefix: z.string().min(1).default('Q-'),
  quotation_start_number: z.coerce.number().int().positive().default(1),
  default_terms: z.string().optional(),
  invoice_footer: z.string().optional(),
});
