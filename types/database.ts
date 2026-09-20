export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF';

export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type DiscountType = 'PERCENTAGE' | 'FIXED';
export type ActorType = 'USER' | 'CUSTOMER' | 'SYSTEM';
export type SignatureType = 'DRAWN' | 'TYPED';
export type CurrencyCode = 'INR' | 'USD' | 'AED' | 'EUR' | 'GBP';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  business_type?: string;
  email: string;
  phone?: string;
  website?: string;
  gst_vat_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  logo_url?: string;
  brand_color?: string;
  default_currency: CurrencyCode;
  default_tax_rate: number;
  default_validity_days: number;
  quotation_prefix: string;
  quotation_start_number: number;
  current_quotation_counter: number;
  default_terms?: string;
  invoice_footer?: string;
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
  email: string;
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
  sku?: string;
  description?: string;
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
  notes?: string;
  terms_conditions?: string;
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
  created_by?: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  customer?: Customer;
  organization?: Organization;
  items?: QuotationItem[];
  signature?: QuotationSignature | null;
  events?: QuotationEvent[];
  views?: QuotationView[];
  attachments?: QuotationAttachment[];
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
