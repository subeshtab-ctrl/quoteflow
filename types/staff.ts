import { UserRole } from './database';

export type StaffRole =
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'SALES'
  | 'ACCOUNTS'
  | 'MARKETING'
  | 'CUSTOM'
  | 'STAFF';

export interface StaffPermissions {
  // Customers
  customers_view: boolean;
  customers_create: boolean;
  customers_edit: boolean;
  customers_delete: boolean;
  customers_export: boolean;

  // Quotes
  quotes_view: boolean;
  quotes_create: boolean;
  quotes_edit: boolean;
  quotes_delete: boolean;
  quotes_send: boolean;
  quotes_apply_discounts: boolean;
  quotes_view_values: boolean;

  // Invoices
  invoices_view: boolean;
  invoices_create: boolean;
  invoices_edit: boolean;
  invoices_delete: boolean;
  invoices_send: boolean;

  // Payments
  payments_view: boolean;
  payments_record: boolean;
  payments_edit_status: boolean;

  // Reports
  reports_view: boolean;
  reports_export: boolean;

  // QuoteFlow AI
  ai_use: boolean;
  ai_create_quotes: boolean;

  // Marketing
  marketing_view_leads: boolean;
  marketing_send_campaigns: boolean;
  marketing_manage_templates: boolean;

  // Staff Management
  staff_view: boolean;
  staff_add: boolean;
  staff_edit: boolean;
  staff_remove: boolean;
  staff_change_roles: boolean;

  // Settings
  settings_view: boolean;
  settings_edit: boolean;

  // Billing (Owner & Admin only by default)
  billing_view: boolean;
  billing_manage_subscription: boolean;
  billing_manage_payment_method: boolean;
}

export type PermissionKey = keyof StaffPermissions;

export const DEFAULT_FULL_PERMISSIONS: StaffPermissions = {
  customers_view: true,
  customers_create: true,
  customers_edit: true,
  customers_delete: true,
  customers_export: true,

  quotes_view: true,
  quotes_create: true,
  quotes_edit: true,
  quotes_delete: true,
  quotes_send: true,
  quotes_apply_discounts: true,
  quotes_view_values: true,

  invoices_view: true,
  invoices_create: true,
  invoices_edit: true,
  invoices_delete: true,
  invoices_send: true,

  payments_view: true,
  payments_record: true,
  payments_edit_status: true,

  reports_view: true,
  reports_export: true,

  ai_use: true,
  ai_create_quotes: true,

  marketing_view_leads: true,
  marketing_send_campaigns: true,
  marketing_manage_templates: true,

  staff_view: true,
  staff_add: true,
  staff_edit: true,
  staff_remove: true,
  staff_change_roles: true,

  settings_view: true,
  settings_edit: true,

  billing_view: true,
  billing_manage_subscription: true,
  billing_manage_payment_method: true,
};

export const DEFAULT_EMPTY_PERMISSIONS: StaffPermissions = {
  customers_view: false,
  customers_create: false,
  customers_edit: false,
  customers_delete: false,
  customers_export: false,

  quotes_view: false,
  quotes_create: false,
  quotes_edit: false,
  quotes_delete: false,
  quotes_send: false,
  quotes_apply_discounts: false,
  quotes_view_values: false,

  invoices_view: false,
  invoices_create: false,
  invoices_edit: false,
  invoices_delete: false,
  invoices_send: false,

  payments_view: false,
  payments_record: false,
  payments_edit_status: false,

  reports_view: false,
  reports_export: false,

  ai_use: false,
  ai_create_quotes: false,

  marketing_view_leads: false,
  marketing_send_campaigns: false,
  marketing_manage_templates: false,

  staff_view: false,
  staff_add: false,
  staff_edit: false,
  staff_remove: false,
  staff_change_roles: false,

  settings_view: false,
  settings_edit: false,

  billing_view: false,
  billing_manage_subscription: false,
  billing_manage_payment_method: false,
};

export const ROLE_PERMISSION_PRESETS: Record<StaffRole, StaffPermissions> = {
  OWNER: {
    ...DEFAULT_FULL_PERMISSIONS,
  },
  ADMIN: {
    ...DEFAULT_FULL_PERMISSIONS,
  },
  MANAGER: {
    customers_view: true,
    customers_create: true,
    customers_edit: true,
    customers_delete: false,
    customers_export: true,

    quotes_view: true,
    quotes_create: true,
    quotes_edit: true,
    quotes_delete: false,
    quotes_send: true,
    quotes_apply_discounts: true,
    quotes_view_values: true,

    invoices_view: true,
    invoices_create: true,
    invoices_edit: true,
    invoices_delete: false,
    invoices_send: true,

    payments_view: true,
    payments_record: true,
    payments_edit_status: true,

    reports_view: true,
    reports_export: true,

    ai_use: true,
    ai_create_quotes: true,

    marketing_view_leads: true,
    marketing_send_campaigns: true,
    marketing_manage_templates: true,

    staff_view: true,
    staff_add: false,
    staff_edit: false,
    staff_remove: false,
    staff_change_roles: false,

    settings_view: true,
    settings_edit: false,

    billing_view: false,
    billing_manage_subscription: false,
    billing_manage_payment_method: false,
  },
  SALES: {
    customers_view: true,
    customers_create: true,
    customers_edit: true,
    customers_delete: false,
    customers_export: false,

    quotes_view: true,
    quotes_create: true,
    quotes_edit: true,
    quotes_delete: false,
    quotes_send: true,
    quotes_apply_discounts: true,
    quotes_view_values: true,

    invoices_view: true,
    invoices_create: false,
    invoices_edit: false,
    invoices_delete: false,
    invoices_send: false,

    payments_view: false,
    payments_record: false,
    payments_edit_status: false,

    reports_view: false,
    reports_export: false,

    ai_use: true,
    ai_create_quotes: true,

    marketing_view_leads: true,
    marketing_send_campaigns: false,
    marketing_manage_templates: false,

    staff_view: false,
    staff_add: false,
    staff_edit: false,
    staff_remove: false,
    staff_change_roles: false,

    settings_view: false,
    settings_edit: false,

    billing_view: false,
    billing_manage_subscription: false,
    billing_manage_payment_method: false,
  },
  ACCOUNTS: {
    customers_view: true,
    customers_create: false,
    customers_edit: false,
    customers_delete: false,
    customers_export: false,

    quotes_view: true,
    quotes_create: false,
    quotes_edit: false,
    quotes_delete: false,
    quotes_send: false,
    quotes_apply_discounts: false,
    quotes_view_values: true,

    invoices_view: true,
    invoices_create: true,
    invoices_edit: true,
    invoices_delete: false,
    invoices_send: true,

    payments_view: true,
    payments_record: true,
    payments_edit_status: true,

    reports_view: true,
    reports_export: true,

    ai_use: false,
    ai_create_quotes: false,

    marketing_view_leads: false,
    marketing_send_campaigns: false,
    marketing_manage_templates: false,

    staff_view: false,
    staff_add: false,
    staff_edit: false,
    staff_remove: false,
    staff_change_roles: false,

    settings_view: false,
    settings_edit: false,

    billing_view: false,
    billing_manage_subscription: false,
    billing_manage_payment_method: false,
  },
  MARKETING: {
    customers_view: true,
    customers_create: true,
    customers_edit: false,
    customers_delete: false,
    customers_export: false,

    quotes_view: false,
    quotes_create: false,
    quotes_edit: false,
    quotes_delete: false,
    quotes_send: false,
    quotes_apply_discounts: false,
    quotes_view_values: false,

    invoices_view: false,
    invoices_create: false,
    invoices_edit: false,
    invoices_delete: false,
    invoices_send: false,

    payments_view: false,
    payments_record: false,
    payments_edit_status: false,

    reports_view: false,
    reports_export: false,

    ai_use: true,
    ai_create_quotes: false,

    marketing_view_leads: true,
    marketing_send_campaigns: true,
    marketing_manage_templates: true,

    staff_view: false,
    staff_add: false,
    staff_edit: false,
    staff_remove: false,
    staff_change_roles: false,

    settings_view: false,
    settings_edit: false,

    billing_view: false,
    billing_manage_subscription: false,
    billing_manage_payment_method: false,
  },
  CUSTOM: {
    ...DEFAULT_EMPTY_PERMISSIONS,
    customers_view: true,
    quotes_view: true,
    invoices_view: true,
  },
  STAFF: {
    customers_view: true,
    customers_create: true,
    customers_edit: true,
    customers_delete: false,
    customers_export: false,

    quotes_view: true,
    quotes_create: true,
    quotes_edit: true,
    quotes_delete: false,
    quotes_send: true,
    quotes_apply_discounts: true,
    quotes_view_values: true,

    invoices_view: true,
    invoices_create: true,
    invoices_edit: false,
    invoices_delete: false,
    invoices_send: true,

    payments_view: true,
    payments_record: false,
    payments_edit_status: false,

    reports_view: false,
    reports_export: false,

    ai_use: true,
    ai_create_quotes: true,

    marketing_view_leads: false,
    marketing_send_campaigns: false,
    marketing_manage_templates: false,

    staff_view: false,
    staff_add: false,
    staff_edit: false,
    staff_remove: false,
    staff_change_roles: false,

    settings_view: false,
    settings_edit: false,

    billing_view: false,
    billing_manage_subscription: false,
    billing_manage_payment_method: false,
  },
};

export interface StaffMember {
  id: string; // user id
  organization_id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  branch?: string | null;
  role: StaffRole;
  permissions: StaffPermissions;
  is_active: boolean;
  email_confirmed: boolean;
  must_change_password: boolean;
  created_at: string;
  last_sign_in_at?: string | null;
}

export type ActivityModule =
  | 'Quotes'
  | 'Invoices'
  | 'Customers'
  | 'Payments'
  | 'Reports'
  | 'Marketing'
  | 'Staff'
  | 'Settings'
  | 'Auth'
  | 'AI';

export interface ActivityDiffItem {
  field?: string;
  previous?: any;
  current?: any;
}

export interface StaffActivityLog {
  id: string;
  organization_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: StaffRole;
  action: string; // e.g. "Quote Created", "Invoice Updated", "Staff Invited"
  action_key: string; // e.g. "quote_created", "quote_updated"
  module: ActivityModule;
  target_id?: string;
  target_identifier?: string; // e.g. "QF-1042", "INV-304", "ABC Solar"
  details?: string;
  diff?: ActivityDiffItem[];
  metadata?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface StaffActivityFilterParams {
  staffId?: string;
  role?: string;
  action?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function isOwnerOrAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const upper = role.toUpperCase();
  return upper === 'OWNER' || upper === 'ADMIN' || upper === 'SUPER_ADMIN';
}

export function isStaffRole(role?: string | null): boolean {
  return !isOwnerOrAdminRole(role);
}
