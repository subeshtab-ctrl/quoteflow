import { describe, it, expect, beforeEach, vi } from 'vitest';
import { interpolateWelcomeTemplate } from '@/lib/welcome/template-interpolator';
import {
  sendWelcomeEmailIfEligible,
  isWelcomeEmailSent,
  getWelcomeLogs,
  saveWelcomeLogs,
} from '@/lib/welcome/welcome-service';

describe('Phase 3 — Welcome Email Lifecycle & Escaping Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Welcome Email Template HTML Escaping & URL Sanitization', () => {
    const rawTemplate = `
      <h1>Welcome, {{owner_name}}!</h1>
      <p>Company: {{business_name}}</p>
      <p>Email: {{email}}</p>
      <p>Plan: {{plan_name}}</p>
      <p>Country: {{country}} ({{currency}})</p>
      <a href="{{dashboard_url}}">Go to Dashboard</a>
      <a href="{{create_quote_url}}">Create Quote</a>
    `;

    it('escapes HTML injection attack vectors in user-provided names and companies', () => {
      const maliciousOwner = '<script>alert("pwned")</script>John';
      const maliciousCompany = 'Acme <img src=x onerror=alert(1)> Corp';
      const maliciousPlan = 'Pro" onmouseover="alert(1)';

      const result = interpolateWelcomeTemplate({
        html: rawTemplate,
        css: '',
        variables: {
          owner_name: maliciousOwner,
          business_name: maliciousCompany,
          plan_name: maliciousPlan,
          email: 'test@example.com',
          country: 'India',
          currency: 'INR',
        },
      });

      // Assert script tags are escaped
      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('&lt;script&gt;alert(&quot;pwned&quot;)&lt;&#x2F;script&gt;John');

      // Assert img tag is escaped
      expect(result.html).not.toContain('<img src=x');
      expect(result.html).toContain('Acme &lt;img src=x onerror=alert(1)&gt; Corp');

      // Assert quote breakouts are escaped
      expect(result.html).not.toContain('onmouseover="');
      expect(result.html).toContain('Pro&quot; onmouseover=&quot;alert(1)');
    });

    it('neutralizes malicious javascript: or data: URLs in links', () => {
      const result = interpolateWelcomeTemplate({
        html: rawTemplate,
        css: '',
        variables: {
          owner_name: 'Alice',
          business_name: 'Safe Corp',
          dashboard_url: 'javascript:alert(document.cookie)',
          create_quote_url: 'data:text/html,<script>alert(1)</script>',
        },
      });

      // Both dangerous URL schemes must be replaced with '#'
      expect(result.html).not.toContain('href="javascript:');
      expect(result.html).not.toContain('href="data:');
      expect(result.html).toContain('href="#"');
    });

    it('allows valid HTTPS dashboard and quotation links', () => {
      const result = interpolateWelcomeTemplate({
        html: rawTemplate,
        css: '',
        variables: {
          owner_name: 'Bob',
          business_name: 'Valid Corp',
          dashboard_url: 'https://app.quoteflow.com/dashboard',
          create_quote_url: 'https://app.quoteflow.com/quotations/new',
        },
      });

      expect(result.html).toContain('href="https://app.quoteflow.com/dashboard"');
      expect(result.html).toContain('href="https://app.quoteflow.com/quotations/new"');
    });
  });

  describe('Welcome Email Exactly-Once & Role Enforcement', () => {
    it('rejects staff accounts from receiving business welcome emails', async () => {
      const result = await sendWelcomeEmailIfEligible({
        organizationId: 'org_test_staff',
        userId: 'user_staff_123',
        ownerName: 'Staff Member',
        email: 'staff@example.com',
        userRole: 'STAFF',
        isStaff: true,
      });

      expect(result.sent).toBe(false);
      expect(result.reason).toContain('Staff accounts do not receive');
    });

    it('prevents duplicate welcome emails if already recorded as sent', async () => {
      const testOrgId = `org_idempotency_${Date.now()}`;
      const logs = getWelcomeLogs();

      // Seed a log entry indicating it was previously sent
      logs.unshift({
        id: `log_${Date.now()}`,
        organizationId: testOrgId,
        businessName: 'Already Sent Co',
        ownerName: 'Existing Owner',
        email: 'sent@example.com',
        templateVersion: 1,
        status: 'SENT',
        sentAt: new Date().toISOString(),
      });
      saveWelcomeLogs(logs);

      expect(isWelcomeEmailSent(testOrgId)).toBe(true);

      const res = await sendWelcomeEmailIfEligible({
        organizationId: testOrgId,
        userId: 'user_sent_123',
        ownerName: 'Existing Owner',
        email: 'sent@example.com',
        userRole: 'OWNER',
      });

      expect(res.sent).toBe(false);
      expect(res.reason).toContain('Duplicate prevented');
    });
  });
});
