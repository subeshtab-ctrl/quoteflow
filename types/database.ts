export type UserRole =
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'SALES'
  | 'ACCOUNTS'
  | 'MARKETING'
  | 'CUSTOM'
  | 'STAFF';

export type {
  StaffRole,
  StaffPermissions,
  StaffMember,
  StaffActivityLog,
  StaffActivityFilterParams,
} from './staff';
export { isOwnerOrAdminRole, isStaffRole, ROLE_PERMISSION_PRESETS } from './staff';

export type QuotationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'SENT'
  | 'VIEWED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'PAYMENT_COMPLETED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type TaxSystem = 'GST' | 'VAT' | 'SALES_TAX' | 'CUSTOM';
export type TaxMode = 'exclusive' | 'inclusive';
export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PAID'
  | 'PARTIAL'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'VOIDED';

export type DiscountType = 'PERCENTAGE' | 'FIXED';
export type ActorType = 'USER' | 'CUSTOMER' | 'SYSTEM';
export type SignatureType = 'DRAWN' | 'TYPED';
export type CurrencyCode =
  | 'INR'
  | 'USD'
  | 'AED'
  | 'EUR'
  | 'GBP'
  | 'SAR'
  | 'KWD'
  | 'CAD'
  | 'AUD'
  | 'SGD'
  | 'JPY'
  | 'CNY'
  | 'CHF'
  | 'NZD'
  | 'BRL'
  | 'ZAR'
  | 'SEK'
  | 'NOK'
  | 'DKK'
  | 'PLN'
  | 'TRY'
  | 'RUB'
  | 'MXN'
  | 'THB'
  | 'MYR'
  | 'IDR'
  | 'PHP'
  | 'VND'
  | 'PKR'
  | 'BDT'
  | 'LKR'
  | 'NPR'
  | 'QAR'
  | 'OMR'
  | 'BHD'
  | 'EGP'
  | 'NGN'
  | 'KES'
  | 'GHS'
  | 'ILS'
  | 'HKD'
  | 'KRW'
  | 'TWD'
  | (string & {});
export type PaymentMethod =
  | 'BANK_TRANSFER'
  | 'UPI'
  | 'PAYMENT_LINK'
  | 'CASH'
  | 'CHEQUE'
  | 'CARD'
  | 'OTHER';

export type PaymentDisplayMode =
  | 'BOTH'
  | 'BANK_ONLY'
  | 'UPI_ONLY'
  | 'PAYMENT_LINK_ONLY'
  | 'CRYPTO_ONLY'
  | 'ALL'
  | 'CUSTOM';

export interface BankAccountDetails {
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  ifsc_code?: string;
  swift_bic?: string;
  swift_code?: string;
  iban?: string;
  branch?: string;
  branch_name?: string;
  upi_id?: string;
}

export interface UpiPaymentDetails {
  upi_id?: string;
  qr_code_url?: string;
  payee_name?: string;
}

export interface CryptoPaymentDetails {
  currency?: string;
  network?: string;
  wallet_address?: string;
  qr_code_url?: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  percentage?: number;
  method: string;
  date: string;
  notes?: string;
  is_cash?: boolean;
  cash_receipt_no?: string;
  cash_received_by?: string;
  created_at?: string;
}

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
  tax_label?: string | null;
  tax_id_label?: string | null;
  goods_classification_label?: string | null;
  service_classification_label?: string | null;
  tax_rate_type?: 'INTRASTATE_INTERSTATE' | 'SINGLE';
  default_tax_mode?: TaxMode;
  gst_registered?: boolean;
  gstin?: string | null;
  business_state?: string | null;
  state_code?: string | null;
  default_gst_rate?: number;
  hsn_sac_enabled?: boolean;
  postal_code?: string | null;
  logo_url?: string | null;
  brand_color?: string | null;
  default_currency: CurrencyCode;
  default_tax_rate: number;
  default_validity_days: number;
  quotation_prefix: string;
  quotation_start_number: number;
  current_quotation_counter: number;
  invoice_prefix?: string;
  invoice_start_number?: number;
  current_invoice_counter?: number;
  default_terms?: string | null;
  invoice_footer?: string | null;
  google_review_url?: string | null;
  require_full_payment_for_invoice?: boolean;
  default_payment_display_mode?: PaymentDisplayMode;
  default_show_bank_details?: boolean;
  default_show_upi_details?: boolean;
  default_show_payment_link?: boolean;
  default_show_crypto_details?: boolean;
  default_show_cash_details?: boolean;
  default_cash_instructions?: string | null;
  default_bank_details?: BankAccountDetails | null;
  default_upi_details?: UpiPaymentDetails | null;
  default_payment_link?: string | null;
  default_payment_link_label?: string | null;
  default_crypto_details?: CryptoPaymentDetails | null;
  mode?: 'test' | 'live';
  current_test_quotation_counter?: number;
  current_test_invoice_counter?: number;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
  business_country?: string | null; // ISO code e.g. "IN", "AE", "US", "GB"
  business_country_name?: string | null;
  billing_region?: 'INDIA' | 'INTERNATIONAL' | null;
  billing_currency?: 'INR' | 'USD' | null;
  payment_provider?: 'RAZORPAY' | 'NOWPAYMENTS' | null;
  country_locked?: boolean;
  country_pending_change?: {
    requested_country: string;
    requested_country_name: string;
    requested_at: string;
    apply_mode: 'next_cycle' | 'immediate';
    status: 'pending' | 'approved' | 'rejected';
    reason?: string;
  } | null;
  email_role?: 'owner' | 'staff';
  members?: BusinessSubscriptionMember[];
  // Business WhatsApp & Automation
  whatsapp_number?: string | null;
  whatsapp_country_code?: string | null;
  whatsapp_automation_enabled?: boolean;
  whatsapp_auto_reply_enabled?: boolean;
  whatsapp_quote_ready_template?: string | null;
  whatsapp_quote_reminder_template?: string | null;
  whatsapp_quote_approved_template?: string | null;
  whatsapp_payment_reminder_template?: string | null;
  whatsapp_template_chat_reply?: string | null;
  whatsapp_template_quote?: string | null;
  whatsapp_template_reminder?: string | null;
  whatsapp_template_payment?: string | null;
  whatsapp_linked_at?: string | null;
  document_language?: 'en' | 'ar' | 'both' | null;
  notification_preferences?: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  browserNotificationsEnabled: boolean;
  quoteViewed: boolean;
  quoteApprovedRejected: boolean;
  quoteWaitingApproval: boolean;
  paymentDueOverdue: boolean;
  paymentReceived: boolean;
  invoiceOverdue: boolean;
  customerActivity: boolean;
  quoteExpiringSoon: boolean;
  aiRecommendedFollowup: boolean;
  deliveryFailures: boolean;
}

export interface BusinessSubscriptionMember {
  email: string;
  role: 'owner' | 'staff';
  name?: string;
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

export type CustomerAuthMethod = 'MOBILE' | 'EMAIL' | 'BOTH';

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  phone_country_code?: string;
  auth_method?: CustomerAuthMethod;
  alternate_phone?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  tax_number?: string;
  customer_gstin?: string;
  billing_state?: string;
  state_code?: string;
  place_of_supply?: string;
  notes?: string;
  whatsapp_enabled?: boolean;
  email_enabled?: boolean;
  whatsapp_opt_in?: boolean;
  environment?: 'test' | 'live';
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
  is_demo?: boolean;
  demo_pin?: string;
  created_at: string;
  updated_at: string;
}

export interface TestUsageRecord {
  organization_id: string;
  usage_date: string; // YYYY-MM-DD in business timezone (UTC for now)
  orders_created: number;
  created_at: string;
  updated_at: string;
}

export interface TestEmailRecord {
  id: string;
  organization_id: string;
  document_type: 'QUOTE' | 'INVOICE' | 'APPROVAL' | 'REJECTION' | 'REMINDER' | 'PORTAL_INVITE';
  document_number: string;
  document_id: string;
  to_email: string;
  to_name?: string;
  subject: string;
  html_preview: string;
  text_preview: string;
  simulated_at: string;
  created_at: string;
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
  hsn_code?: string | null;
  classification_type?: string | null;
  category?: string | null;
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
  discount_percent?: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  tax_mode?: TaxMode;
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
  is_optional?: boolean;
  is_selected?: boolean;
  created_at?: string;
}

export interface QuotationSignature {
  id: string;
  quotation_id: string;
  signer_name: string;
  signer_email?: string;
  signer_phone?: string;
  phone_country_code?: string;
  signer_company?: string;
  signature_data_url: string;
  signature_type: SignatureType;
  ip_address?: string;
  user_agent?: string;
  signed_at: string;
  document_hash: string;
  /** IANA timezone resolved from signer's IP, e.g. "Asia/Kolkata". Stored for display only; signed_at is always UTC. */
  signer_timezone?: string;
}

export interface QuotationView {
  id: string;
  quotation_id: string;
  ip_address?: string;
  user_agent?: string;
  viewed_at: string;
  /** IANA timezone resolved from viewer's IP, e.g. "Asia/Kolkata". Stored for display only; viewed_at is always UTC. */
  viewer_timezone?: string;
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

export interface PaymentMilestone {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  due_stage: string;
  is_paid?: boolean;
  paid_at?: string | null;
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
  environment?: 'test' | 'live';
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
  issue_date: string;
  valid_until: string;
  currency: CurrencyCode;
  subtotal: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  tax_mode?: TaxMode;
  tax_name?: string | null;
  taxable_subtotal?: number;
  place_of_supply?: string | null;
  supplier_state?: string | null;
  supplier_gstin?: string | null;
  customer_gstin?: string | null;
  cgst_rate?: number;
  cgst_amount?: number;
  sgst_rate?: number;
  sgst_amount?: number;
  igst_rate?: number;
  igst_amount?: number;
  tax_breakdown?: InvoiceTaxBreakdown[];
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
  advance_payment_notes?: string | null;
  final_payment_notes?: string | null;
  paid_amount?: number;
  balance_amount?: number;
  advance_percentage?: number | null;
  enable_advance?: boolean;
  payment_status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  payment_confirmed_by_company?: boolean;
  payment_confirmed_at?: string | null;
  payment_confirmed_by?: string | null;
  payment_terms_instructions?: string | null;
  accepted_payment_methods?: string[] | null;
  payment_display_mode?: PaymentDisplayMode;
  show_bank_details?: boolean;
  show_upi_details?: boolean;
  show_payment_link?: boolean;
  show_crypto_details?: boolean;
  show_cash_details?: boolean;
  cash_instructions?: string | null;
  bank_details?: BankAccountDetails | null;
  upi_details?: UpiPaymentDetails | null;
  payment_link?: string | null;
  payment_link_label?: string | null;
  crypto_details?: CryptoPaymentDetails | null;
  payment_records?: PaymentRecord[];
  milestones?: PaymentMilestone[];
  payment_terms_type?: 'FULL' | 'ADVANCE_SPLIT' | 'MILESTONES';

  // Chat Tracking
  has_unread_chat?: boolean;
  unread_chat_count?: number;
  chat_count?: number;

  // Completion & In-Progress Tracking
  in_progress_at?: string | null;
  estimated_days?: number | null;
  estimated_completion_date?: string | null;
  estimated_time_text?: string | null;
  completed_at?: string | null;
  completed_unpaid?: boolean;

  // Invoice Tracking
  has_issued_invoice?: boolean;
  issued_invoice_id?: string | null;
  invoice_number?: string | null;

  // PIN Protection Security
  pin_protection_enabled?: boolean;
  pin?: string | null;
  pin_hash?: string | null;
  pin_created_at?: string | null;

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
  discount_percent?: number;
  discount_amount?: number;
  tax_rate: number;
  tax_amount: number;
  tax_mode?: TaxMode;
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
  is_optional?: boolean;
  is_selected?: boolean;
  created_at?: string;
}

export interface InvoiceTaxBreakdown {
  label: string;
  name?: string;
  rate: number;
  amount: number;
  is_inclusive?: boolean;
}

export interface Invoice {
  id: string;
  organization_id: string;
  customer_id: string;
  quotation_id?: string | null;
  invoice_number: string;
  document_type?: 'tax_invoice' | 'proforma_invoice' | 'delivery_note' | 'delivery_challan';
  proforma_converted_invoice_id?: string | null;
  po_number?: string | null;
  status: InvoiceStatus;
  environment?: 'test' | 'live';
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancelled_by_role?: string | null;
  issue_date: string;
  due_date: string;
  currency: CurrencyCode;
  subtotal: number;
  discount_type?: DiscountType;
  discount_value?: number;
  discount_amount?: number;
  tax_rate: number;
  tax_amount: number;
  tax_mode?: TaxMode;
  tax_name?: string | null;
  taxable_subtotal?: number;
  place_of_supply?: string | null;
  supplier_state?: string | null;
  supplier_gstin?: string | null;
  customer_gstin?: string | null;
  cgst_rate?: number;
  cgst_amount?: number;
  sgst_rate?: number;
  sgst_amount?: number;
  igst_rate?: number;
  igst_amount?: number;
  grand_total: number;
  tax_breakdown?: InvoiceTaxBreakdown[];
  notes?: string | null;
  terms_conditions?: string | null;
  payment_terms?: string | null;
  payment_method?: PaymentMethod | string | null;
  is_paid: boolean;
  paid_at?: string | null;
  payment_notes?: string | null;
  advance_payment_notes?: string | null;
  final_payment_notes?: string | null;
  paid_amount?: number;
  balance_amount?: number;
  advance_percentage?: number | null;
  enable_advance?: boolean;
  payment_status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | string | null;
  payment_confirmed_by_company?: boolean;
  payment_confirmed_at?: string | null;
  payment_confirmed_by?: string | null;
  // Delivery Note & Physical/Digital Signatures
  delivery_recipient_name?: string | null;
  delivery_signature_data_url?: string | null;
  delivery_confirmed_at?: string | null;
  delivery_status?: 'PENDING' | 'DELIVERED';
  delivery_address?: string | null;
  delivery_contact_person?: string | null;
  delivery_contact_phone?: string | null;
  delivery_vehicle_no?: string | null;
  attachments?: AttachmentItem[];
  milestones?: PaymentMilestone[];
  payment_terms_type?: 'FULL' | 'ADVANCE_SPLIT' | 'MILESTONES';
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
  customer_email?: string;
  customer_phone?: string;
  phone_country_code?: string;
  auth_method?: CustomerAuthMethod;
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

export interface DeletedQuotationRecord {
  id: string;
  quotation_id: string;
  quotation_number: string;
  customer_name?: string;
  grand_total: number;
  currency: string;
  deleted_at: string;
  organization_id: string;
}

export type RecommendationStatus =
  | 'pending'
  | 'actioned'
  | 'dismissed'
  | 'ignored'
  | 'snoozed'
  | 'resolved';

export type RecommendationActionTaken =
  | 'whatsapp_sent'
  | 'email_sent'
  | 'dismissed'
  | 'ignored'
  | 'snoozed'
  | null;

export type RecommendationResolvedReason =
  | 'source_deleted'
  | 'source_approved'
  | 'source_paid'
  | 'source_rejected'
  | 'customer_deleted'
  | 'manually_resolved'
  | 'superseded'
  | null;

export interface PersistentRecommendationRecord {
  id: string;
  recommendation_key: string; // Stable fingerprint e.g. "quote_followup:Q-000016:awaiting_approval:cycle_1"
  organization_id: string;
  user_id?: string | null;
  user_name?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  quote_id?: string | null;
  quote_number?: string | null;
  invoice_id?: string | null;
  invoice_number?: string | null;
  recommendation_type:
    | 'invoice_overdue'
    | 'quote_expiring'
    | 'high_interest_lead'
    | 'quote_unapproved'
    | 'batch_followup'
    | 'system_update';
  priority: 'URGENT' | 'ACTION_REQUIRED' | 'OPPORTUNITY' | 'INFORMATION';
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  status: RecommendationStatus;
  action_taken?: RecommendationActionTaken;
  action_taken_at?: string | null;
  snooze_until?: string | null;
  last_reminder_sent_at?: string | null;
  cycle_number: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  resolved_reason?: RecommendationResolvedReason;
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

// ==============================================================================
// SUBSCRIPTION & BILLING TYPES
// ==============================================================================

export type SubscriptionStatus =
  | 'trial'
  | 'trialing'
  | 'pending'
  | 'payment_pending'
  | 'active'
  | 'payment_due'
  | 'payment_overdue'
  | 'grace_period'
  | 'restricted'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'halted'
  | 'failed';

export type SubscriptionPaymentStatus =
  | 'created'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  amount: number; // in paise (e.g. 9900 = ₹99)
  currency: string;
  billing_interval: string;
  billing_interval_count: number;
  trial_days: number;
  is_active: boolean;
  is_public: boolean;
  razorpay_plan_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessSubscription {
  id: string;
  business_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  provider: string;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  razorpay_plan_id: string | null;
  amount: number; // in paise
  currency: string;
  trial_start_at: string | null;
  trial_end_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_charge_at: string | null;
  promo_id: string | null;
  promo_months_remaining: number;
  promotional_cycles_completed: number;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  grace_period_start_at: string | null;
  grace_period_end_at: string | null;
  last_payment_at: string | null;
  last_payment_id: string | null;
  payment_failure_count: number;
  provider_payment_id?: string | null;
  provider_invoice_id?: string | null;
  provider_order_id?: string | null;
  nowpayments_invoice_id?: string | null;
  nowpayments_payment_id?: string | null;
  nowpayments_order_id?: string | null;
  nowpayments_pay_address?: string | null;
  payment_status?: string | null;
  payment_provider?: string | null;
  subscription_status?: SubscriptionStatus | null;
  period_start?: string | null;
  period_end?: string | null;
  paid_at?: string | null;
  billing_region?: 'INDIA' | 'INTERNATIONAL';
  billing_country?: string | null;
  billing_currency?: string | null;
  is_trial_prepaid?: boolean;
  plan_start_mode?: 'immediate' | 'after_trial';
  autopay_enabled?: boolean;
  account_access?: 'active' | 'restricted';
  scheduled_plan_id?: string | null;
  scheduled_subscription_id?: string | null;
  paid_scheduled_start?: string | null;
  is_test?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
  created_at: string;
  updated_at: string;
  // Hydrated references
  plan?: SubscriptionPlan;
  organization?: Organization;
  email_role?: 'owner' | 'staff';
  members?: BusinessSubscriptionMember[];
}

export interface SubscriptionPayment {
  id: string;
  business_id: string;
  subscription_id: string | null;
  provider?: 'razorpay' | 'nowpayments' | 'manual' | string;
  provider_payment_id?: string | null;
  provider_invoice_id?: string | null;
  provider_order_id?: string | null;
  razorpay_payment_id?: string;
  razorpay_subscription_id?: string | null;
  razorpay_invoice_id?: string | null;
  nowpayments_payment_id?: string | null;
  nowpayments_invoice_id?: string | null;
  nowpayments_order_id?: string | null;
  crypto_currency?: string | null;
  crypto_amount?: number | null;
  actually_paid?: number | null;
  outcome_amount?: number | null;
  outcome_currency?: string | null;
  pay_address?: string | null;
  network?: string | null;
  invoice_url?: string | null;
  amount: number; // in paise for INR, cents or whole dollars for USD
  currency: string;
  status: SubscriptionPaymentStatus | string;
  payment_method: string | null;
  card_details?: string | null;
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface PaymentCountryRule {
  country_code: string;
  country_name: string;
  flag?: string;
  razorpay_enabled: boolean;
  nowpayments_enabled: boolean;
  billing_currency: 'INR' | 'USD';
  plan_amount: number; // 99 for INR, 10 for USD
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentEvent {
  id: string;
  provider: 'razorpay' | 'nowpayments';
  provider_event_id?: string | null;
  organization_id?: string | null;
  subscription_id?: string | null;
  status: string;
  payload: Record<string, any>;
  signature_verified: boolean;
  created_at: string;
}

export interface SubscriptionEvent {
  id: string;
  event_id: string;
  event_type: string;
  razorpay_subscription_id: string | null;
  razorpay_payment_id: string | null;
  payload: Record<string, any>;
  processed: boolean;
  processing_error: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface Promotion {
  id: string;
  name: string;
  code: string;
  description: string | null;
  discount_type: 'PERCENTAGE' | 'FIXED' | 'FREE_DAYS' | 'TRIAL_EXTENSION';
  discount_value: number;
  promotional_price: number; // in paise
  currency: string;
  duration_months: number;
  max_redemptions: number | null;
  redemption_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromotionAssignment {
  id: string;
  promotion_id: string;
  business_id: string;
  status: 'eligible' | 'redeemed' | 'expired' | 'revoked';
  assigned_at: string;
  redeemed_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  promotion?: Promotion;
}

export interface AdminOffer {
  id: string;
  business_id: string;
  admin_user_id: string;
  admin_email?: string | null;
  offer_name: string;
  offer_type: 'PERCENTAGE' | 'FIXED' | 'FREE_DAYS' | 'TRIAL_EXTENSION';
  offer_value: number;
  reason: string;
  billing_cycles_affected?: number;
  effective_from: string;
  effective_until?: string | null;
  created_at: string;
}

export interface SubscriptionAccess {
  allowed: boolean;
  accountAccess: 'active' | 'restricted';
  status: SubscriptionStatus;
  isTrial: boolean;
  isPaid: boolean;
  isPaymentPending: boolean;
  isPaymentDue: boolean;
  isPaymentOverdue: boolean;
  isPastDue: boolean;
  isGracePeriod: boolean;
  isRestricted: boolean;
  isExpired: boolean;
  isHalted: boolean;
  isCancelled: boolean;
  daysRemainingInTrial: number;
  graceDaysRemaining: number;
  trialEndsAt: string | null;
  trialStartedAt?: string | null;
  nextPaymentDue: string | null;
  planName: string;
  planAmount: number;
  promoActive: boolean;
  promoMonthsRemaining: number;
  promotionalCyclesCompleted: number;
  isPrepaidTrial?: boolean;
  planStartMode?: 'immediate' | 'after_trial';
  autopayEnabled?: boolean;
  autopayNextDate?: string | null;
  autopayAmount?: number;
  razorpaySubscriptionId?: string | null;
  lastPaymentId?: string | null;
  cancelAtPeriodEnd?: boolean;
  activeUntil?: string | null;
  warningMessage: string | null;
  currency?: string;
  priceDisplay?: string;
}

export type EntitlementStatus = 'TRIALING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';

export interface OrganizationEntitlement {
  plan: 'PRO';
  status: EntitlementStatus;
  hasAccess: boolean;
  expiresAt: string | null;
  isTrial: boolean;
  isPaid: boolean;
  isCancelled: boolean;
  daysRemaining: number;
  reason?: string;
}

export interface UserAccessCheck {
  hasAccess: boolean;
  reason?: 'ACTIVE' | 'USER_DEACTIVATED' | 'USER_NOT_FOUND' | 'SUBSCRIPTION_EXPIRED' | 'ORGANIZATION_NOT_FOUND';
  entitlement: OrganizationEntitlement;
}

// ==============================================================================
// SUPPORT TICKET TYPES
// ==============================================================================

export type SupportTicketCategory =
  | 'Billing'
  | 'Subscription'
  | 'Quote'
  | 'Invoice'
  | 'Customer Portal'
  | 'Payment'
  | 'WhatsApp'
  | 'Technical Issue'
  | 'Bug Report'
  | 'Feature Request'
  | 'Other';

export type SupportTicketPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export type SupportTicketStatus =
  | 'open'
  | 'unread'
  | 'new'
  | 'in_progress'
  | 'in_process'
  | 'waiting_for_customer'
  | 'resolved'
  | 'closed';

export interface SupportTicket {
  id: string;
  business_id: string;
  created_by_user_id: string;
  ticket_number: string; // e.g. QF-2026-000001
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  description: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  callback_requested?: boolean;
  callback_phone?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
  is_test?: boolean;
  // Hydrated references
  business_name?: string;
  creator_email?: string;
  creator_name?: string;
  messages?: SupportTicketMessage[];
  attachments?: SupportTicketAttachment[];
  subscription_context?: {
    plan_name: string;
    subscription_status: SubscriptionStatus;
    current_period_end: string | null;
    last_payment_at: string | null;
    last_payment_status: string | null;
    payment_failure_count: number;
    grace_period_end_at: string | null;
  };
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  sender_user_id: string | null;
  sender_type: 'business' | 'developer' | 'system';
  sender_name: string | null;
  message: string;
  created_at: string;
  attachments?: SupportTicketAttachment[];
}

export interface SupportTicketAttachment {
  id: string;
  ticket_id: string;
  message_id: string | null;
  uploaded_by_user_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_user_id: string;
  admin_email: string | null;
  action: string;
  target_type: string;
  target_id: string;
  organization_id?: string | null;
  customer_id?: string | null;
  previous_value?: any;
  new_value?: any;
  reason?: string | null;
  ip_address?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

// ==============================================================================
// META WHATSAPP BUSINESS PLATFORM INTEGRATION TYPES
// ==============================================================================

export type WhatsAppConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'pending'
  | 'restricted'
  | 'revoked';

export type WhatsAppQualityRating = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';

export type WhatsAppTemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';

export type WhatsAppTemplateStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED'
  | 'PAUSED'
  | 'DISABLED'
  | 'IN_APPEAL'
  | 'DRAFT';

export type WhatsAppMessageStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED';

export interface WhatsAppConnection {
  id: string;
  organization_id: string;
  meta_business_id?: string | null;
  waba_id: string;
  phone_number_id: string;
  display_phone_number: string;
  verified_name?: string | null;
  connection_status: WhatsAppConnectionStatus;
  encrypted_access_token?: string | null;
  credential_reference?: string | null;
  token_expiry?: string | null;
  quality_rating?: WhatsAppQualityRating | string | null;
  messaging_status?: string | null;
  code_verification_status?: string | null;
  account_review_status?: string | null;
  connected_by_user_id?: string | null;
  connected_at: string;
  updated_at: string;
  disconnected_at?: string | null;
  metadata?: Record<string, any>;
}

export interface WhatsAppTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'LOCATION';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
    header_handle?: string[];
  };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export interface WhatsAppTemplate {
  id: string;
  organization_id: string;
  meta_template_id?: string | null;
  name: string;
  language: string;
  category: WhatsAppTemplateCategory;
  status: WhatsAppTemplateStatus;
  components: WhatsAppTemplateComponent[];
  header_type?: 'NONE' | 'TEXT' | 'DOCUMENT' | 'IMAGE' | string;
  body_text: string;
  sample_values?: Record<string, string>;
  rejection_reason?: string | null;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  organization_id: string;
  customer_id?: string | null;
  document_type?: 'QUOTATION' | 'INVOICE' | 'PAYMENT' | 'NOTIFICATION';
  document_id?: string | null;
  document_number?: string | null;
  recipient_phone: string;
  template_name?: string | null;
  template_language?: string;
  meta_message_id?: string | null;
  status: WhatsAppMessageStatus;
  error_code?: string | null;
  error_message?: string | null;
  idempotency_key?: string | null;
  channel?: string;
  sent_by_user_id?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  failed_at?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Hydrated references
  customer?: Customer;
}

