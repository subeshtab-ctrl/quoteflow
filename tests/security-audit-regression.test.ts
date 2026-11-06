import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { store, DEFAULT_ORG_ID } from '@/lib/supabase/data-store';
import { _resetOtpStoresForTesting } from '@/lib/auth/otp-service';
import {
  verifyPassword,
  hashPassword,
  DEFAULT_DEVELOPER_ADMIN_PASSWORD,
  setDeveloperAdminPassword,
  getDeveloperAdminConfig,
  DEVELOPER_ADMIN_EMAIL,
} from '@/lib/billing/dev-admin-auth';
import { POST as postLoginPasswordRoute } from '@/app/api/admin/auth/login-password/route';
import { razorpayService } from '@/lib/billing/razorpay';
import { GET as getCustomersRoute, POST as postCustomersRoute } from '@/app/api/customers/route';
import { GET as getCustomerByIdRoute, PUT as putCustomerByIdRoute, DELETE as deleteCustomerByIdRoute } from '@/app/api/customers/[id]/route';
import { GET as getQuotationsRoute, POST as postQuotationsRoute } from '@/app/api/quotations/route';
import { GET as getQuotationByIdRoute, PUT as putQuotationByIdRoute, PATCH as patchQuotationByIdRoute, DELETE as deleteQuotationByIdRoute } from '@/app/api/quotations/[id]/route';
import { GET as getInvoicesRoute, POST as postInvoicesRoute } from '@/app/api/invoices/route';
import { GET as getInvoiceByIdRoute, PUT as putInvoiceByIdRoute, PATCH as patchInvoiceByIdRoute, DELETE as deleteInvoiceByIdRoute } from '@/app/api/invoices/[id]/route';
import { GET as getProductsRoute, POST as postProductsRoute } from '@/app/api/products/route';
import { PUT as putProductByIdRoute, DELETE as deleteProductByIdRoute } from '@/app/api/products/[id]/route';
import { GET as getSettingsRoute, PUT as putSettingsRoute, PATCH as patchSettingsRoute } from '@/app/api/settings/route';
import { GET as getNotificationsRoute } from '@/app/api/notifications/route';
import { POST as postMarkReadRoute } from '@/app/api/notifications/mark-read/route';
import { POST as postUploadLogoRoute } from '@/app/api/upload/logo/route';
import { POST as postUploadQrRoute } from '@/app/api/upload/qr/route';
import { POST as postMcpRoute } from '@/app/api/mcp/route';
import { POST as razorpayWebhookRoute } from '@/app/api/webhooks/razorpay/route';
import { POST as nowpaymentsWebhookRoute } from '@/app/api/webhooks/nowpayments/route';

describe('QuoteFlow Comprehensive Security Regression Suite', () => {
  const TENANT_A_ORG = 'tenant-org-alpha-1111';
  const TENANT_B_ORG = 'tenant-org-beta-2222';

  beforeEach(async () => {
    // Ensure clean test setup
    _resetOtpStoresForTesting();
    await store.getOrganization(TENANT_A_ORG);
    await store.getOrganization(TENANT_B_ORG);
  });

  describe('1. Unauthenticated Access Protection (Rejection of Anonymous Requests)', () => {
    it('rejects unauthenticated GET /api/customers with 401', async () => {
      const res = await getCustomersRoute();
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('rejects unauthenticated POST /api/customers with 401', async () => {
      const req = new NextRequest('http://localhost/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacker Corp' }),
      });
      const res = await postCustomersRoute(req);
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated GET /api/customers/[id] with 401', async () => {
      const req = new NextRequest('http://localhost/api/customers/cust-123');
      const res = await getCustomerByIdRoute(req, { params: Promise.resolve({ id: 'cust-123' }) });
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated GET /api/quotations with 401', async () => {
      const req = new NextRequest('http://localhost/api/quotations');
      const res = await getQuotationsRoute(req);
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated GET /api/quotations/[id] with 401', async () => {
      const req = new NextRequest('http://localhost/api/quotations/quote-123');
      const res = await getQuotationByIdRoute(req, { params: Promise.resolve({ id: 'quote-123' }) });
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated GET /api/invoices with 401', async () => {
      const req = new NextRequest('http://localhost/api/invoices');
      const res = await getInvoicesRoute(req);
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated GET /api/invoices/[id] with 401', async () => {
      const req = new NextRequest('http://localhost/api/invoices/inv-123');
      const res = await getInvoiceByIdRoute(req, { params: Promise.resolve({ id: 'inv-123' }) });
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated GET /api/products with 401', async () => {
      const res = await getProductsRoute();
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated GET /api/settings with 401', async () => {
      const res = await getSettingsRoute();
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated PUT /api/settings with 401', async () => {
      const req = new NextRequest('http://localhost/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Tampered Company' }),
      });
      const res = await putSettingsRoute(req);
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated GET /api/notifications with 401', async () => {
      const res = await getNotificationsRoute();
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated POST /api/upload/logo with 401', async () => {
      const req = new NextRequest('http://localhost/api/upload/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: 'data:image/png;base64,xxxx' }),
      });
      const res = await postUploadLogoRoute(req);
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated POST /api/upload/qr with 401', async () => {
      const req = new NextRequest('http://localhost/api/upload/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: 'data:image/png;base64,xxxx' }),
      });
      const res = await postUploadQrRoute(req);
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated MCP tools/call invocation with 401', async () => {
      const req = new NextRequest('http://localhost/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 42,
          method: 'tools/call',
          params: {
            name: 'customer_ledger_lookup',
            arguments: { customer_name: 'Acme' },
          },
        }),
      });
      const res = await postMcpRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe(-32000);
    });
  });

  describe('2. Multi-Tenant Data Isolation (Cross-Tenant Tampering Prevention)', () => {
    it('prevents Tenant B from updating Tenant A customer', async () => {
      const customerA = await store.createCustomer({
        organization_id: TENANT_A_ORG,
        name: 'Alpha Customer',
        email: 'alpha@example.com',
        phone: '9876543210',
      });

      await expect(
        store.updateCustomer(customerA.id, { name: 'Compromised by Beta' }, TENANT_B_ORG)
      ).rejects.toThrow(/Unauthorized to update customer from another organization/);

      // Verify data remains untouched
      const checked = await store.getCustomerById(customerA.id, TENANT_A_ORG);
      expect(checked?.name).toBe('Alpha Customer');
    });

    it('prevents Tenant B from deleting Tenant A customer', async () => {
      const customerA = await store.createCustomer({
        organization_id: TENANT_A_ORG,
        name: 'Alpha Protected Customer',
        email: 'alpha.prot@example.com',
      });

      await expect(
        store.deleteCustomer(customerA.id, TENANT_B_ORG)
      ).rejects.toThrow(/Unauthorized to delete customer from another organization/);

      const checked = await store.getCustomerById(customerA.id, TENANT_A_ORG);
      expect(checked).not.toBeNull();
    });

    it('prevents Tenant B from updating Tenant A product', async () => {
      const productA = await store.createProduct({
        organization_id: TENANT_A_ORG,
        name: 'Alpha Industrial Filter',
        unit_price: 1500,
        unit: 'piece',
        tax_rate: 18,
        is_active: true,
      });

      await expect(
        store.updateProduct(productA.id, { unit_price: 1 }, TENANT_B_ORG)
      ).rejects.toThrow(/Unauthorized to update product from another organization/);

      const checked = (await store.getProducts(TENANT_A_ORG)).find((p) => p.id === productA.id);
      expect(checked?.unit_price).toBe(1500);
    });

    it('prevents Tenant B from deleting Tenant A product', async () => {
      const productA = await store.createProduct({
        organization_id: TENANT_A_ORG,
        name: 'Alpha High-Value Valve',
        unit_price: 25000,
        unit: 'piece',
        tax_rate: 18,
        is_active: true,
      });

      await expect(
        store.deleteProduct(productA.id, TENANT_B_ORG)
      ).rejects.toThrow(/Unauthorized to delete product from another organization/);

      const checked = (await store.getProducts(TENANT_A_ORG)).find((p) => p.id === productA.id);
      expect(checked).toBeDefined();
    });

    it('prevents Tenant B from deleting Tenant A quotation', async () => {
      const quoteA = await store.createQuotation({
        organization_id: TENANT_A_ORG,
        title: 'Confidential Enterprise Contract',
        items: [{ description: 'Security Platform', quantity: 1, unit_price: 50000 }],
        issue_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      });

      await expect(
        store.deleteQuotation(quoteA.id, TENANT_B_ORG)
      ).rejects.toThrow(/Unauthorized to delete quotation from another organization/);

      const checked = await store.getQuotationById(quoteA.id, TENANT_A_ORG);
      expect(checked).not.toBeNull();
    });

    it('prevents Tenant B from deleting Tenant A invoice', async () => {
      const quoteA = await store.createQuotation({
        organization_id: TENANT_A_ORG,
        title: 'Invoice Isolation Contract',
        items: [{ description: 'Cloud Setup', quantity: 1, unit_price: 10000 }],
        issue_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      });

      const invA = await store.createInvoice({
        organization_id: TENANT_A_ORG,
        customer_id: 'cust-123',
        quotation_id: quoteA.id,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        currency: 'INR',
        items: [{ description: 'Cloud Setup', quantity: 1, unit_price: 10000 }],
      });

      await expect(
        store.deleteInvoice(invA.id, TENANT_B_ORG)
      ).rejects.toThrow(/Unauthorized/);

      const checked = await store.getInvoiceById(invA.id, TENANT_A_ORG);
      expect(checked).not.toBeNull();
    });
  });

  describe('3. Developer Admin Authentication & Password Verification', () => {
    it('strictly verifies timing-safe PBKDF2 hash and rejects arbitrary plaintext bypass', () => {
      // Create a customized admin password hash
      const customSalt = 'strong_random_salt_9999';
      const customHash = hashPassword('MyCustomAdminPass#2026', customSalt).hash;

      // Correct password succeeds
      expect(verifyPassword('MyCustomAdminPass#2026', customHash, customSalt)).toBe(true);

      // Wrong password fails
      expect(verifyPassword('WrongPassword123', customHash, customSalt)).toBe(false);

      // Hardcoded default bypass "Subesh@123" MUST FAIL if custom password was set
      expect(verifyPassword(DEFAULT_DEVELOPER_ADMIN_PASSWORD, customHash, customSalt)).toBe(false);
    });

    it('changing developer admin password invalidates old password and allows login only with new password', async () => {
      const NEW_SECURE_PASSWORD = 'BrandNewDevAdminPass2026!';

      // Update password
      await setDeveloperAdminPassword(NEW_SECURE_PASSWORD);

      // 1. Attempt login with OLD password -> MUST BE 401 Unauthorized
      const oldReq = new NextRequest('http://localhost/api/admin/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: DEVELOPER_ADMIN_EMAIL,
          password: DEFAULT_DEVELOPER_ADMIN_PASSWORD,
        }),
      });
      const oldRes = await postLoginPasswordRoute(oldReq);
      expect(oldRes.status).toBe(401);
      const oldData = await oldRes.json();
      expect(oldData.error).toBe('Invalid credentials.');

      // Reset rate-limit cooldown for consecutive test call
      _resetOtpStoresForTesting();

      // 2. Attempt login with NEW password -> MUST BE 200 OK
      const newReq = new NextRequest('http://localhost/api/admin/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: DEVELOPER_ADMIN_EMAIL,
          password: NEW_SECURE_PASSWORD,
        }),
      });
      const newRes = await postLoginPasswordRoute(newReq);
      expect(newRes.status).toBe(200);
      const newData = await newRes.json();
      expect(newData.success).toBe(true);

      // Restore
      await setDeveloperAdminPassword(DEFAULT_DEVELOPER_ADMIN_PASSWORD);
    });
  });

  describe('4. Payment Webhook Security (Tampering & Spoofing Defense)', () => {
    it('rejects Razorpay webhooks with missing signature', async () => {
      const req = new NextRequest('http://localhost/api/webhooks/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'payment.captured' }),
      });

      const res = await razorpayWebhookRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Missing webhook signature');
    });

    it('rejects Razorpay webhooks with forged/invalid signature', async () => {
      const req = new NextRequest('http://localhost/api/webhooks/razorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': '0000000000000000000000000000000000000000000000000000000000000000',
        },
        body: JSON.stringify({ event: 'payment.captured' }),
      });

      const res = await razorpayWebhookRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Invalid webhook signature');
    });

    it('rejects NOWPayments IPN with missing signature', async () => {
      const req = new NextRequest('http://localhost/api/webhooks/nowpayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'finished', order_id: 'QF-SUB-org-123' }),
      });

      const res = await nowpaymentsWebhookRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Invalid webhook signature');
    });
  });
});
