export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF';

export type QuotationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'SENT'
  | 'VIEWED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PAYMENT_COMPLETED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type TaxSystem = 'GST' | 'VAT' | 'SALES_TAX' | 'CUSTOM';
export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PAID'
  | 'PARTIAL'
  | 'OVERDUE'
  | 'CANCELLED';

export type DiscountType = 'PERCENTAGE' | 'FIXED';
export type ActorType = 'USER' | 'CUSTOMER' | 'SYSTEM';
export type SignatureType = 'DRAWN' | 'TYPED';
export type CurrencyCode = 'INR' | 'USD' | 'AED' | 'EUR' | 'GBP';
export type PaymentMethod =
  | 'BANK_TRANSFER'
  | 'UPI'
  | 'CASH'
  | 'CHEQUE'
  | 'CARD'
  | 'OTHER';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  business_type?: string | null;
  email: string;
  phone?: string | null;
  website?: string | null;
  gst_vat_number?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  tax_system?: TaxSystem | string | null;
  tax_id_label?: string | null;
  goods_classification_label?: string | null;
  service_classification_label?: string | null;
  tax_rate_type?: 'INTRASTATE_INTERSTATE' | 'SINGLE';
  postal_code?: string | null;
  logo_url?: string | null;
  brand_color?: string | null;
  default_currency: CurrencyCode;
  default_tax_rate: number;
  default_validity_days: number;
  quotation_prefix: string;
  quotation_start_number: number;
  current_quotation_counter: number;
  default_terms?: string | null;
  invoice_footer?: string | null;
  require_full_payment_for_invoice?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  profile?: Profile;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  tax_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  unit_price: number;
  unit: string;
  tax_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  sort_order: number;
  item_type?: 'GOODS' | 'SERVICE';
  classification_type?: string | null;
  classification_code?: string | null;
  cgst_rate?: number;
  cgst_amount?: number;
  sgst_rate?: number;
  sgst_amount?: number;
  igst_rate?: number;
  igst_amount?: number;
  tax_category?: string | null;
  created_at?: string;
}

export interface QuotationSignature {
  id: string;
  quotation_id: string;
  signer_name: string;
  signer_email: string;
  signer_company?: string;
  signature_data_url: string;
  signature_type: SignatureType;
  ip_address?: string;
  user_agent?: string;
  signed_at: string;
  document_hash: string;
}

export interface QuotationView {
  id: string;
  quotation_id: string;
  ip_address?: string;
  user_agent?: string;
  viewed_at: string;
}

export interface QuotationEvent {
  id: string;
  organization_id: string;
  quotation_id: string;
  actor_type: ActorType;
  actor_id?: string | null;
  actor_name?: string | null;
  event_type: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface QuotationAttachment {
  id: string;
  organization_id: string;
  quotation_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_by?: string;
  created_at: string;
}

export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  created_at: string;
}

export interface Quotation {
  id: string;
  organization_id: string;
  customer_id: string;
  quotation_number: string;
  revision_number: number;
  original_quotation_id?: string | null;
  title: string;
  status: QuotationStatus;
  issue_date: string;
  valid_until: string;
  currency: CurrencyCode;
  subtotal: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  notes?: string | null;
  terms_conditions?: string | null;
  public_token: string;
  public_token_hash: string;
  public_token_expires_at?: string | null;
  is_token_revoked: boolean;
  view_count: number;
  first_viewed_at?: string | null;
  last_viewed_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  rejection_comments?: string | null;
  approved_document_hash?: string | null;
  expired_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;

  // Payment Tracking
  is_paid?: boolean;
  paid_at?: string | null;
  payment_method?: PaymentMethod | string | null;
  payment_notes?: string | null;
  paid_amount?: number;
  balance_amount?: number;
  advance_percentage?: number | null;
  payment_status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  payment_confirmed_by_company?: boolean;
  payment_confirmed_at?: string | null;
  payment_confirmed_by?: string | null;
  payment_terms_instructions?: string | null;
  accepted_payment_methods?: string[] | null;

  // Chat Tracking
  has_unread_chat?: boolean;
  unread_chat_count?: number;
  chat_count?: number;

  // Completion Tracking
  completed_at?: string | null;
  completed_unpaid?: boolean;

  // Joined fields
  customer?: Customer;
  organization?: Organization;
  items?: QuotationItem[];
  signature?: QuotationSignature | null;
  events?: QuotationEvent[];
  views?: QuotationView[];
  attachments?: (QuotationAttachment | AttachmentItem)[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_type?: DiscountType;
  discount_value?: number;
  discount_amount?: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  sort_order: number;
  item_type?: 'GOODS' | 'SERVICE';
  classification_type?: string | null;
  classification_code?: string | null;
  cgst_rate?: number;
  cgst_amount?: number;
  sgst_rate?: number;
  sgst_amount?: number;
  igst_rate?: number;
  igst_amount?: number;
  tax_category?: string | null;
  created_at?: string;
}

export interface InvoiceTaxBreakdown {
  label: string;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  organization_id: string;
  customer_id: string;
  quotation_id?: string | null;
  invoice_number: string;
  po_number?: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  currency: CurrencyCode;
  subtotal: number;
  discount_type?: DiscountType;
  discount_value?: number;
  discount_amount?: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  tax_breakdown?: InvoiceTaxBreakdown[];
  notes?: string | null;
  terms_conditions?: string | null;
  payment_terms?: string | null;
  payment_method?: PaymentMethod | string | null;
  is_paid: boolean;
  paid_at?: string | null;
  payment_notes?: string | null;
  paid_amount?: number;
  balance_amount?: number;
  advance_percentage?: number | null;
  payment_status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | string | null;
  payment_confirmed_by_company?: boolean;
  payment_confirmed_at?: string | null;
  payment_confirmed_by?: string | null;
  attachments?: AttachmentItem[];
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
  // Audit History
  audit_history?: InvoiceAuditEvent[];

  // Joined fields
  customer?: Customer;
  organization?: Organization;
  items?: InvoiceItem[];
}

export interface InvoiceAuditEvent {
  id: string;
  user_name: string;
  user_role: string;
  action: string;
  details?: string;
  timestamp: string;
}

export interface PortalPinRegistration {
  id: string;
  quotation_id: string;
  customer_id?: string;
  customer_email: string;
  pin_hash: string;
  registered_at: string;
  updated_at?: string;
}

export interface ChatAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
  is_payment_proof?: boolean;
  deleted_at?: string | null;
  deleted_reason?: string | null;
}

export interface QuotationChatMessage {
  id: string;
  quotation_id: string;
  sender_role: 'CUSTOMER' | 'STAFF';
  sender?: 'CUSTOMER' | 'STAFF';
  sender_name: string;
  message: string;
  created_at: string;
  is_read?: boolean;
  attachment?: ChatAttachment | null;
}

export interface Notification {
  id: string;
  organization_id: string;
  user_id?: string;
  quotation_id?: string;
  title: string;
  message: string;
  type: 'VIEWED' | 'APPROVED' | 'REJECTED' | 'EXPIRING';
  is_read: boolean;
  created_at: string;
}

export interface Template {
  id: string;
  organization_id: string;
  name: string;
  layout_style: 'MODERN' | 'MINIMAL' | 'PROFESSIONAL';
  accent_color: string;
  is_default: boolean;
  created_at: string;
}
