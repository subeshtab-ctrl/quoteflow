import { describe, it, expect, beforeEach } from 'vitest';
import {
  StaffRole,
  StaffPermissions,
  ROLE_PERMISSION_PRESETS,
  DEFAULT_FULL_PERMISSIONS,
  isOwnerOrAdminRole,
  isStaffRole,
} from '../types/staff';
import { StaffService, staffService } from '../lib/staff/staff-service';

describe('QuoteFlow Staff Roles & Permissions System', () => {
  it('should define accurate permission presets for all standard roles', () => {
    // 1. Owner & Admin have full permissions
    expect(ROLE_PERMISSION_PRESETS.OWNER.billing_manage_subscription).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.OWNER.staff_remove).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.ADMIN.billing_manage_subscription).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.ADMIN.staff_add).toBe(true);

    // 2. Sales preset: Customers, Leads, Quotes & AI, but NO billing or staff management
    expect(ROLE_PERMISSION_PRESETS.SALES.customers_view).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.SALES.quotes_create).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.SALES.quotes_send).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.SALES.ai_use).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.SALES.billing_manage_subscription).toBe(false);
    expect(ROLE_PERMISSION_PRESETS.SALES.staff_remove).toBe(false);
    expect(ROLE_PERMISSION_PRESETS.SALES.reports_export).toBe(false);

    // 3. Accounts preset: Invoices, Payments, Tax, Reports, but NO marketing or staff management
    expect(ROLE_PERMISSION_PRESETS.ACCOUNTS.invoices_create).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.ACCOUNTS.payments_record).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.ACCOUNTS.reports_export).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.ACCOUNTS.marketing_send_campaigns).toBe(false);
    expect(ROLE_PERMISSION_PRESETS.ACCOUNTS.staff_remove).toBe(false);

    // 4. Marketing preset: Leads, Campaigns, Templates, but NO invoice creation or payments
    expect(ROLE_PERMISSION_PRESETS.MARKETING.marketing_view_leads).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.MARKETING.marketing_send_campaigns).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.MARKETING.invoices_create).toBe(false);
    expect(ROLE_PERMISSION_PRESETS.MARKETING.payments_record).toBe(false);
    expect(ROLE_PERMISSION_PRESETS.MARKETING.billing_manage_subscription).toBe(false);

    // 5. Manager preset: Operational access, but sensitive billing restricted
    expect(ROLE_PERMISSION_PRESETS.MANAGER.customers_create).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.MANAGER.quotes_create).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.MANAGER.invoices_create).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.MANAGER.reports_view).toBe(true);
    expect(ROLE_PERMISSION_PRESETS.MANAGER.billing_manage_subscription).toBe(false);
  });

  it('should correctly evaluate hasPermission based on role and custom overrides', () => {
    const service = new StaffService();

    // Owner and Admin always bypass check and return true
    expect(service.hasPermission('OWNER', undefined, 'billing_manage_subscription')).toBe(true);
    expect(service.hasPermission('ADMIN', undefined, 'staff_remove')).toBe(true);

    // Sales role default
    expect(service.hasPermission('SALES', undefined, 'quotes_create')).toBe(true);
    expect(service.hasPermission('SALES', undefined, 'invoices_create')).toBe(false);

    // Custom permission override for Sales user granted invoices_create
    const customPerms: StaffPermissions = {
      ...ROLE_PERMISSION_PRESETS.SALES,
      invoices_create: true,
    };
    expect(service.hasPermission('SALES', customPerms, 'invoices_create')).toBe(true);
    expect(service.hasPermission('SALES', customPerms, 'staff_remove')).toBe(false);
  });

  it('should identify owner/admin vs staff roles correctly', () => {
    expect(isOwnerOrAdminRole('OWNER')).toBe(true);
    expect(isOwnerOrAdminRole('ADMIN')).toBe(true);
    expect(isOwnerOrAdminRole('owner')).toBe(true);
    expect(isOwnerOrAdminRole('admin')).toBe(true);

    expect(isOwnerOrAdminRole('MANAGER')).toBe(false);
    expect(isOwnerOrAdminRole('SALES')).toBe(false);
    expect(isOwnerOrAdminRole('ACCOUNTS')).toBe(false);
    expect(isOwnerOrAdminRole('MARKETING')).toBe(false);
    expect(isOwnerOrAdminRole('STAFF')).toBe(false);
    expect(isOwnerOrAdminRole(null)).toBe(false);

    expect(isStaffRole('SALES')).toBe(true);
    expect(isStaffRole('MANAGER')).toBe(true);
    expect(isStaffRole('OWNER')).toBe(false);
    expect(isStaffRole('ADMIN')).toBe(false);
  });
});

describe('Staff Activity Log & Audit Trail Service', () => {
  const testOrgId = 'test-org-' + Date.now();
  const service = new StaffService();

  it('should log business actions and sanitize sensitive credentials', async () => {
    const logged = await service.logStaffActivity({
      organization_id: testOrgId,
      user_id: 'user-sales-1',
      user_name: 'Sarah Jenkins',
      user_email: 'sarah@company.com',
      user_role: 'SALES',
      action: 'CREATE',
      action_key: 'quote_created',
      module: 'QUOTATION',
      target_id: 'quote-1042',
      target_identifier: 'QF-1042',
      details: 'Created quote QF-1042 for Acme Corp ($4,500.00)',
      diff: {
        total_amount: 4500,
        temp_password: 'superSecretPassword123!',
        client_secret: 'sec_live_998877',
      },
    });

    expect(logged.id).toBeDefined();
    expect(logged.target_identifier).toBe('QF-1042');
    expect(logged.action).toBe('CREATE');
    expect(logged.module).toBe('QUOTATION');

    // Sensitive credentials must be redacted from diff
    expect(logged.diff.total_amount).toBe(4500);
    expect(logged.diff.temp_password).toBe('[REDACTED]');
    expect(logged.diff.client_secret).toBe('[REDACTED]');
  });

  it('should query and filter activity logs by module, role, and search query', async () => {
    await service.logStaffActivity({
      organization_id: testOrgId,
      user_id: 'user-accounts-1',
      user_name: 'David Miller',
      user_email: 'david@company.com',
      user_role: 'ACCOUNTS',
      action: 'CREATE',
      action_key: 'invoice_created',
      module: 'INVOICE',
      target_id: 'inv-8801',
      target_identifier: 'INV-8801',
      details: 'Issued commercial tax invoice INV-8801',
    });

    // 1. Search by target identifier
    const searchRes = await service.getStaffActivityLogs(testOrgId, {
      search: 'INV-8801',
    });
    expect(searchRes.logs.length).toBeGreaterThanOrEqual(1);
    expect(searchRes.logs[0].target_identifier).toBe('INV-8801');

    // 2. Filter by module
    const moduleRes = await service.getStaffActivityLogs(testOrgId, {
      module: 'INVOICE',
    });
    expect(moduleRes.logs.every((l) => l.module === 'INVOICE')).toBe(true);

    // 3. Filter by role
    const roleRes = await service.getStaffActivityLogs(testOrgId, {
      role: 'SALES',
    });
    expect(roleRes.logs.every((l) => l.user_role === 'SALES')).toBe(true);
  });
});
