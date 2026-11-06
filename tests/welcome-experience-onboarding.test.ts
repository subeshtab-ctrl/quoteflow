import { describe, it, expect, beforeEach } from 'vitest';
import {
  getWelcomeConfig,
  saveWelcomeConfig,
  getWelcomeLogs,
  saveWelcomeLogs,
  interpolateWelcomeTemplate,
  sanitizeEmailHtml,
  sendWelcomeEmailIfEligible,
  sendTestWelcomeEmail,
  isWelcomeEmailSent,
  getBusinessSetupStatus,
} from '@/lib/welcome/welcome-service';
import {
  createDefaultWelcomeTemplateVersion,
  DEFAULT_AI_WELCOME_CONFIG,
} from '@/lib/welcome/default-template';
import { store } from '@/lib/supabase/data-store';

describe('QuoteFlow New Customer Welcome & AI Onboarding System', () => {
  beforeEach(() => {
    // Reset test logs
    saveWelcomeLogs([]);
  });

  describe('1. HTML Sanitization & Variable Interpolation', () => {
    it('strips dangerous scripts, javascript: links and event handlers', () => {
      const unsafe = '<p onclick="steal()">Hello</p><script>alert(1)</script><a href="javascript:doEvil()">Click</a>';
      const clean = sanitizeEmailHtml(unsafe);
      expect(clean).not.toContain('<script');
      expect(clean).not.toContain('alert(1)');
      expect(clean).not.toContain('onclick');
      expect(clean).not.toContain('javascript:');
    });

    it('replaces all safe template variables correctly', () => {
      const template = {
        html: '<h1>Welcome {{owner_name}} to {{business_name}}!</h1><p>Plan: {{plan_name}}, Trial: {{trial_days}} days ends {{trial_end_date}}</p><a href="{{create_quote_url}}">Quote</a>',
        css: 'body { color: #333; }',
        subject: 'Welcome {{owner_name}} to QuoteFlow',
        preheader: 'Your trial for {{business_name}} is ready',
        variables: {
          owner_name: 'Sarah',
          business_name: 'BrightSpark Electrical',
          plan_name: 'Pro Plan',
          trial_days: 14,
          trial_end_date: '17 Nov 2026',
          create_quote_url: 'https://blendandbold.com/quotations/new',
        },
      };

      const result = interpolateWelcomeTemplate(template);
      expect(result.subject).toBe('Welcome Sarah to QuoteFlow');
      expect(result.preheader).toBe('Your trial for BrightSpark Electrical is ready');
      expect(result.html).toContain('Welcome Sarah to BrightSpark Electrical!');
      expect(result.html).toContain('Plan: Pro Plan, Trial: 14 days ends 17 Nov 2026');
      expect(result.html).toContain('https://blendandbold.com/quotations/new');
      // No raw curly brackets remain
      expect(result.html).not.toMatch(/{{\s*[\w_]+\s*}}/);
    });

    it('falls back gracefully when optional variables are missing', () => {
      const template = {
        html: '<p>{{owner_name}} at {{business_name}} with {{non_existent_token}}</p>',
        css: '',
        variables: {},
      };

      const result = interpolateWelcomeTemplate(template);
      expect(result.html).toContain('Workspace Owner');
      expect(result.html).toContain('Your Business');
      expect(result.html).not.toContain('{{');
      expect(result.html).not.toContain('}}');
    });
  });

  describe('2. Idempotency & Duplicate Send Protection', () => {
    it('sends exactly one welcome email to a newly created business and prevents duplicates', async () => {
      const testOrgId = `test_org_wel_${Date.now()}`;
      store.setCachedOrganization(testOrgId, {
        id: testOrgId,
        name: 'BrightSpark Electrical',
        email: 'sarah@brightspark.com',
        created_at: new Date().toISOString(),
      } as any);

      // 1st Attempt: Should succeed
      const first = await sendWelcomeEmailIfEligible({
        organizationId: testOrgId,
        ownerName: 'Sarah',
        email: 'sarah@brightspark.com',
        businessName: 'BrightSpark Electrical',
        userRole: 'OWNER',
        isStaff: false,
      });

      expect(first.sent).toBe(true);
      expect(isWelcomeEmailSent(testOrgId)).toBe(true);

      // 2nd Attempt (page refresh / webhook retry): Must be prevented
      const second = await sendWelcomeEmailIfEligible({
        organizationId: testOrgId,
        ownerName: 'Sarah',
        email: 'sarah@brightspark.com',
        businessName: 'BrightSpark Electrical',
        userRole: 'OWNER',
        isStaff: false,
      });

      expect(second.sent).toBe(false);
      expect(second.reason).toContain('Duplicate prevented');
    });

    it('never sends welcome emails for staff accounts', async () => {
      const staffResult = await sendWelcomeEmailIfEligible({
        organizationId: 'org_staff_test',
        ownerName: 'Staff Member',
        email: 'staff@company.com',
        userRole: 'STAFF',
        isStaff: true,
      });

      expect(staffResult.sent).toBe(false);
      expect(staffResult.reason).toContain('Staff accounts do not receive');
    });

    it('does not automatically send welcome emails to existing organizations created before activation date', async () => {
      const oldOrgId = `old_org_${Date.now()}`;
      store.setCachedOrganization(oldOrgId, {
        id: oldOrgId,
        name: 'Legacy Business',
        email: 'legacy@example.com',
        created_at: '2026-01-01T00:00:00.000Z', // Created in January 2026 (prior to feature)
      } as any);

      const result = await sendWelcomeEmailIfEligible({
        organizationId: oldOrgId,
        ownerName: 'Old Owner',
        email: 'legacy@example.com',
        businessName: 'Legacy Business',
        userRole: 'OWNER',
      });

      expect(result.sent).toBe(false);
      expect(result.reason).toContain('prior to welcome experience activation');
    });
  });

  describe('3. Test Email Dispatch', () => {
    it('dispatches test email with sample data without polluting customer delivery logs', async () => {
      const logsBefore = getWelcomeLogs().length;

      const res = await sendTestWelcomeEmail({
        toEmail: 'dev.tester@example.com',
      });

      expect(res.success).toBe(true);
      // Customer delivery logs length remains unchanged
      const logsAfter = getWelcomeLogs().filter((l) => !l.isTest).length;
      expect(logsAfter).toBe(logsBefore);
    });
  });

  describe('4. Business Setup Status Analysis for QuoteFlow AI', () => {
    it('evaluates business profile and recommends the next missing step logically', async () => {
      const orgId = `test_setup_${Date.now()}`;
      store.setCachedOrganization(orgId, {
        id: orgId,
        name: 'My Company', // Default generic name
        default_currency: 'USD',
      } as any);

      const status = await getBusinessSetupStatus(orgId);
      expect(status.overallPercent).toBeLessThan(100);
      expect(status.businessNameSet).toBe(false);
      expect(status.nextRecommendedStep).toContain('official Business');
    });
  });

  describe('5. Default AI Welcome Configuration', () => {
    it('provides structured action types and valid suggestions', () => {
      expect(DEFAULT_AI_WELCOME_CONFIG.enabled).toBe(true);
      expect(DEFAULT_AI_WELCOME_CONFIG.suggestions.length).toBeGreaterThanOrEqual(4);

      const actions = DEFAULT_AI_WELCOME_CONFIG.suggestions.map((s) => s.action);
      expect(actions).toContain('CREATE_FIRST_QUOTE');
      expect(actions).toContain('SETUP_BUSINESS');
      expect(actions).toContain('EXPLAIN_QUOTEFLOW');
      expect(actions).toContain('ADD_CUSTOMER');
    });
  });
});
