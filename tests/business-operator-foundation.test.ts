import { describe, it, expect, beforeEach } from 'vitest';
import { businessMemoryService } from '../lib/ai/business-operator/memory-service';
import { controlledActionRegistry } from '../lib/ai/business-operator/action-registry';
import { operatorRecommendationManager } from '../lib/ai/business-operator/recommendation-manager';
import { operatorAuditService } from '../lib/ai/business-operator/audit-service';
import { store } from '../lib/supabase/data-store';
import { ROLE_PERMISSION_PRESETS } from '../types/staff';

describe('QuoteFlow AI Business Operator — Phase 1 Foundation', () => {
  const ORG_A = 'org-operator-a-' + Date.now();
  const ORG_B = 'org-operator-b-' + Date.now();

  beforeEach(async () => {
    // Setup Organization A (Solar installer)
    await store.updateOrganization(ORG_A, {
      name: 'Northwest Solar Power Ltd',
      country: 'United Kingdom',
      city: 'Manchester',
      default_currency: 'GBP',
      default_tax_rate: 20,
    });

    // Setup Organization B (Catering service)
    await store.updateOrganization(ORG_B, {
      name: 'Gourmet Catering Co',
      country: 'India',
      city: 'Mumbai',
      default_currency: 'INR',
      default_tax_rate: 18,
    });
  });

  describe('1. Organization Isolation & Tenant Scoping', () => {
    it('should strictly isolate business profiles between organizations', async () => {
      const profileA = await businessMemoryService.getProfile(ORG_A);
      const profileB = await businessMemoryService.getProfile(ORG_B);

      expect(profileA.organization_id).toBe(ORG_A);
      expect(profileB.organization_id).toBe(ORG_B);
      expect(profileA.default_currency).toBe('GBP');
      expect(profileB.default_currency).toBe('INR');
    });

    it('should never leak memory rules from Org A to Org B', async () => {
      await businessMemoryService.addMemory(ORG_A, {
        organization_id: ORG_A,
        memory_type: 'CUSTOMER_RULE',
        subject_type: 'CUSTOMER',
        key: 'vip_client_discount',
        value: 'Manchester Logistics Hub always receives 10% discount on solar inverters.',
        source: 'MANUAL_SETTING',
        confidence: 100,
        confirmed: true,
        status: 'ACTIVE',
      });

      const memoriesA = await businessMemoryService.getMemories(ORG_A);
      const memoriesB = await businessMemoryService.getMemories(ORG_B);

      const hasVipInA = memoriesA.some((m) => m.key === 'vip_client_discount');
      const hasVipInB = memoriesB.some((m) => m.key === 'vip_client_discount');

      expect(hasVipInA).toBe(true);
      expect(hasVipInB).toBe(false);
    });
  });

  describe('2. Business Memory Engine (Profile, Rules, Observations)', () => {
    it('should allow Owner to update business profile and operational defaults', async () => {
      const updated = await businessMemoryService.upsertProfile(ORG_A, {
        industry: 'Renewable Energy & Solar',
        preferred_tone: 'CONCISE',
        default_quote_validity_days: 14,
      });

      expect(updated.industry).toBe('Renewable Energy & Solar');
      expect(updated.preferred_tone).toBe('CONCISE');
      expect(updated.default_quote_validity_days).toBe(14);
    });

    it('should support confirming unconfirmed observations into permanent rules', async () => {
      const observation = await businessMemoryService.addMemory(ORG_A, {
        organization_id: ORG_A,
        memory_type: 'AI_OBSERVATION',
        subject_type: 'PRICING',
        key: 'observed_reorder_cycle',
        value: 'Client ABC appears to order battery replacements every 90 days.',
        source: 'AI_OBSERVATION',
        confidence: 72,
        confirmed: false,
        status: 'ACTIVE',
      });

      expect(observation.confirmed).toBe(false);

      const confirmed = await businessMemoryService.confirmMemory(ORG_A, observation.id, 'user-admin-1');
      expect(confirmed?.confirmed).toBe(true);
      expect(confirmed?.source).toBe('CONFIRMED_USER');
    });

    it('should support disabling and deleting memory items', async () => {
      const mem = await businessMemoryService.addMemory(ORG_A, {
        organization_id: ORG_A,
        memory_type: 'EXPLICIT_RULE',
        subject_type: 'BUSINESS',
        key: 'temporary_promo',
        value: 'Free delivery for orders above £500 this weekend.',
        source: 'MANUAL_SETTING',
        confidence: 100,
        confirmed: true,
        status: 'ACTIVE',
      });

      // Disable rule
      const disabled = await businessMemoryService.disableMemory(ORG_A, mem.id);
      expect(disabled?.status).toBe('DISABLED');

      // Soft delete
      const deleted = await businessMemoryService.deleteMemory(ORG_A, mem.id);
      expect(deleted).toBe(true);

      const activeMemories = await businessMemoryService.getMemories(ORG_A, { status: 'ACTIVE' });
      expect(activeMemories.some((m) => m.id === mem.id)).toBe(false);
    });
  });

  describe('3. Controlled AI Action Registry & Permission Checking', () => {
    it('should block staff without required permission from executing restricted READ actions', async () => {
      const res = await controlledActionRegistry.executeAction(
        'get_payment_summary',
        {},
        {
          organizationId: ORG_A,
          userId: 'user-sales-1',
          userEmail: 'sales@northwest.co.uk',
          userRole: 'SALES',
          userPermissions: ROLE_PERMISSION_PRESETS.SALES, // Sales lacks payments_view
          subscriptionActive: true,
        }
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain('Permission Denied');
    });

    it('should permit Owner/Admin to execute any action without permission errors', async () => {
      const res = await controlledActionRegistry.executeAction(
        'get_payment_summary',
        {},
        {
          organizationId: ORG_A,
          userId: 'user-owner-1',
          userEmail: 'owner@northwest.co.uk',
          userRole: 'OWNER',
          subscriptionActive: true,
        }
      );

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data.currency).toBe('GBP');
    });

    it('should block actions if organization subscription has expired', async () => {
      const res = await controlledActionRegistry.executeAction(
        'search_customers',
        { query: 'test' },
        {
          organizationId: ORG_A,
          userId: 'user-owner-1',
          userEmail: 'owner@northwest.co.uk',
          userRole: 'OWNER',
          subscriptionActive: false, // EXPIRED
        }
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain('Subscription expired');
    });

    it('should prepare DRAFT quote with calculations without requiring sensitive confirmation', async () => {
      const res = await controlledActionRegistry.executeAction(
        'create_quote_draft',
        {
          customerName: 'Lancaster Commercial Plaza',
          items: [
            { description: 'Solar Panels 400W', quantity: 10, unit_price: 250 },
            { description: 'Inverter Unit', quantity: 1, unit_price: 1500 },
          ],
          discountValue: 10,
          discountType: 'PERCENTAGE',
          taxRate: 20,
        },
        {
          organizationId: ORG_A,
          userId: 'user-sales-1',
          userEmail: 'sales@northwest.co.uk',
          userRole: 'SALES',
          userPermissions: ROLE_PERMISSION_PRESETS.SALES,
          subscriptionActive: true,
        }
      );

      expect(res.success).toBe(true);
      expect(res.data.draftStatus).toBe('DRAFT_READY');
      expect(res.data.subtotal).toBe(4000); // (10 * 250) + 1500
      expect(res.data.discountAmount).toBe(400); // 10% of 4000
      expect(res.data.taxAmount).toBe(720); // 20% of 3600
      expect(res.data.grandTotal).toBe(4320); // 3600 + 720
    });

    it('should guard EXECUTE actions requiring explicit human confirmation', async () => {
      // 1. Calling EXECUTE without confirmation returns requiresConfirmation
      const unconfirmed = await controlledActionRegistry.executeAction(
        'record_payment',
        { invoiceId: 'inv-test-1', amount: 500 },
        {
          organizationId: ORG_A,
          userId: 'user-accounts-1',
          userEmail: 'accounts@northwest.co.uk',
          userRole: 'ACCOUNTS',
          userPermissions: ROLE_PERMISSION_PRESETS.ACCOUNTS,
          subscriptionActive: true,
        },
        false // confirmedByUser = false
      );

      expect(unconfirmed.success).toBe(false);
      expect(unconfirmed.requiresConfirmation).toBe(true);
      expect(unconfirmed.confirmationMessage).toBeDefined();

      // 2. Calling with confirmedByUser = true proceeds
      // (Fails gracefully on invoice lookup since inv-test-1 is mock ID, proving it entered handler)
      const confirmed = await controlledActionRegistry.executeAction(
        'record_payment',
        { invoiceId: 'inv-nonexistent', amount: 500 },
        {
          organizationId: ORG_A,
          userId: 'user-accounts-1',
          userEmail: 'accounts@northwest.co.uk',
          userRole: 'ACCOUNTS',
          userPermissions: ROLE_PERMISSION_PRESETS.ACCOUNTS,
          subscriptionActive: true,
        },
        true // confirmedByUser = true
      );

      expect(confirmed.requiresConfirmation).toBeUndefined();
      expect(confirmed.error).toContain('Invoice not found');
    });
  });

  describe('4. Recommendation Framework & Anti-Nagging Logic', () => {
    it('should generate recommendations and prevent duplicate nagging for the same resource', async () => {
      const rec1 = await operatorRecommendationManager.addRecommendation(ORG_A, {
        organization_id: ORG_A,
        type: 'FOLLOWUP_QUOTE',
        title: 'Follow Up on Quote QF-1042',
        summary: 'Quote viewed 3 times but not approved.',
        reason: 'Client viewed quote 3 times and expires in 2 days.',
        priority: 'HIGH',
        resource_type: 'quote',
        resource_id: 'quote-test-1042',
        action_label: 'Send WhatsApp Follow-Up',
        action_key: 'followup:quote-test-1042',
      });

      expect(rec1).toBeDefined();
      expect(rec1?.status).toBe('ACTIVE');

      // Attempting to add duplicate recommendation while active returns null
      const duplicate = await operatorRecommendationManager.addRecommendation(ORG_A, {
        organization_id: ORG_A,
        type: 'FOLLOWUP_QUOTE',
        title: 'Follow Up on Quote QF-1042',
        summary: 'Quote viewed 3 times but not approved.',
        reason: 'Client viewed quote 3 times and expires in 2 days.',
        priority: 'HIGH',
        resource_type: 'quote',
        resource_id: 'quote-test-1042',
        action_label: 'Send WhatsApp Follow-Up',
        action_key: 'followup:quote-test-1042',
      });

      expect(duplicate).toBeNull();
    });

    it('should automatically complete recommendations when source quote is approved', async () => {
      const cust = await store.createCustomer({
        organization_id: ORG_A,
        name: 'Auto-Reconcile Test Client',
      });

      const quote = await store.createQuotation({
        organization_id: ORG_A,
        customer_id: cust.id,
        title: 'Test Quotation for Auto Reconcile',
        status: 'SENT',
        currency: 'GBP',
      });

      // Add recommendation for this quote
      const rec = await operatorRecommendationManager.addRecommendation(ORG_A, {
        organization_id: ORG_A,
        type: 'FOLLOWUP_QUOTE',
        title: `Follow Up Quote ${quote.quotation_number}`,
        summary: 'Quote awaiting decision',
        reason: 'Quote pending',
        priority: 'MEDIUM',
        resource_type: 'quote',
        resource_id: quote.id,
        action_label: 'Follow Up',
        action_key: `followup:${quote.id}`,
      });

      expect(rec).toBeDefined();

      // Quote is now approved by customer
      await store.updateQuotation(quote.id, { status: 'APPROVED' });

      // Calling getActiveRecommendations should auto-complete this recommendation
      const active = await operatorRecommendationManager.getActiveRecommendations(ORG_A);
      const isStillActive = active.some((r) => r.id === rec!.id);

      expect(isStillActive).toBe(false);
    });
  });

  describe('5. AI Action Audit Log & Secrets Sanitization', () => {
    it('should log all executed AI actions and sanitize credentials', async () => {
      const log = await operatorAuditService.logAiAction({
        organization_id: ORG_A,
        user_id: 'user-sales-1',
        user_email: 'sales@northwest.co.uk',
        user_role: 'SALES',
        action: 'create_quote_draft',
        category: 'DRAFT',
        approval_required: false,
        execution_status: 'SUCCESS',
        metadata: {
          clientName: 'Lancaster Plaza',
          apiKey: 'super-secret-key-12345',
          password: 'plain-text-pass',
          quotedTotal: 4320,
        },
      });

      expect(log.id).toBeDefined();
      expect(log.metadata?.clientName).toBe('Lancaster Plaza');
      expect(log.metadata?.quotedTotal).toBe(4320);

      // Secrets must be redacted
      expect(log.metadata?.apiKey).toBe('[REDACTED]');
      expect(log.metadata?.password).toBe('[REDACTED]');
    });

    it('should record business outcomes and usage telemetry for Developer Admin', async () => {
      await operatorAuditService.recordOutcome({
        organization_id: ORG_A,
        recommendation_key: 'followup:QF-1042',
        action_type: 'FOLLOWUP_QUOTE',
        result_type: 'ACCEPTED',
        revenue_generated: 4500,
        currency: 'GBP',
      });

      const outcomes = await operatorAuditService.getOutcomes(ORG_A);
      expect(outcomes.length).toBeGreaterThan(0);
      expect(outcomes[0].revenue_generated).toBe(4500);

      await operatorAuditService.recordUsage({
        organization_id: ORG_A,
        user_id: 'user-owner-1',
        feature_name: 'action:get_sales_summary',
        response_time_ms: 45,
        success: true,
      });

      const summary = await operatorAuditService.getUsageSummary(ORG_A);
      expect(summary.totalRequests).toBeGreaterThanOrEqual(1);
      expect(summary.successRate).toBe(100);
      expect(summary.avgResponseTimeMs).toBeGreaterThan(0);
    });
  });
});
