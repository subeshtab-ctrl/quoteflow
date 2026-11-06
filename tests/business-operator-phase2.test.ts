import { describe, it, expect, beforeEach } from 'vitest';
import { businessOperatorEngine } from '@/lib/ai/business-operator/operator-engine';
import { controlledActionRegistry } from '@/lib/ai/business-operator/action-registry';
import { operatorRecommendationManager } from '@/lib/ai/business-operator/recommendation-manager';
import { businessMemoryService } from '@/lib/ai/business-operator/memory-service';
import { classifyCopilotIntent } from '@/lib/ai/intent-classifier';
import { store } from '@/lib/supabase/data-store';
import { Quotation, Invoice, Customer } from '@/types/database';

describe('Business Operator Phase 2: "What Should I Do Today?" Engine', () => {
  const TEST_ORG_ID = 'org-operator-phase2-test';

  const mockCustomer1: Customer = {
    id: 'cust-alpha',
    organization_id: TEST_ORG_ID,
    name: 'Alpha Technologies',
    company_name: 'Alpha Tech Pvt Ltd',
    email: 'contact@alphatech.com',
    phone: '+91 98765 43210',
    address: '10 Tech Park',
    city: 'Bangalore',
    country: 'India',
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockCustomer2: Customer = {
    id: 'cust-beta',
    organization_id: TEST_ORG_ID,
    name: 'Beta Global Logistics',
    company_name: 'Beta Global',
    email: 'billing@betaglobal.com',
    phone: '+91 91234 56789',
    address: '50 Harbor Road',
    city: 'Mumbai',
    country: 'India',
    created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Reset test organization state in store
    await store.updateOrganization(TEST_ORG_ID, {
      name: 'QuoteFlow Operator Solutions',
      currency: 'INR',
      default_currency: 'INR',
      default_tax_rate: 18,
    });

    // Seed AI profile with FRIENDLY tone
    await businessMemoryService.upsertProfile({
      organization_id: TEST_ORG_ID,
      business_summary: 'Enterprise software and cloud infrastructure consulting.',
      industry: 'IT & Cloud Services',
      preferred_tone: 'FRIENDLY',
      default_currency: 'INR',
      default_quote_validity_days: 14,
      default_payment_terms: 'Net 15',
    });

    // Add Customers directly to store
    (store as any).customers.set(mockCustomer1.id, mockCustomer1);
    (store as any).customers.set(mockCustomer2.id, mockCustomer2);
  });

  it('1. Correctly classifies natural language operator plan intents', () => {
    const queries = [
      'What should I do today?',
      'what do i do today',
      'What to do today?',
      'show me my daily action plan',
      'daily plan',
      'operator plan',
      'where are opportunities being lost?',
      'who should i follow up with today',
      'which quotes are ready to invoice',
    ];

    for (const q of queries) {
      const res = classifyCopilotIntent(q);
      expect(res.intent).toBe('operator_daily_plan');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('2. Detects hot quotes with customer views and high buying intent', async () => {
    // Quote with 4 client views
    const hotQuote: Quotation = {
      id: 'quote-hot-1',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-2026-HOT',
      customer_id: mockCustomer1.id,
      customer: mockCustomer1,
      status: 'SENT',
      currency: 'INR',
      grand_total: 85000,
      view_count: 4,
      first_viewed_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      last_viewed_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      public_token: 'tok_hot_1',
      items: [{ description: 'Cloud Audit', quantity: 1, unit_price: 85000 }],
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Directly set mock quote in store map to preserve test fixtures
    (store as any).quotations.set(hotQuote.id, hotQuote);

    const plan = await businessOperatorEngine.generateDailyActionPlan(TEST_ORG_ID);
    const hotAction = plan.actions.find((a) => a.resourceId === 'quote-hot-1');

    expect(hotAction).toBeDefined();
    expect(hotAction?.type).toBe('QUOTE_FOLLOWUP');
    expect(hotAction?.urgency).toBe('HIGH');
    expect(hotAction?.value).toBe(85000);
    expect(hotAction?.reason).toContain('4 times in the portal');
    expect(hotAction?.actionKey).toBe('send_whatsapp_followup');
    expect(hotAction?.suggestedMessage).toContain('Alpha Technologies');
    expect(hotAction?.suggestedMessage).toContain('Q-2026-HOT');
  });

  it('3. Detects quotes expiring within 48 to 72 hours', async () => {
    // Quote expiring tomorrow
    const expiringQuote: Quotation = {
      id: 'quote-expiring-2',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-2026-EXP',
      customer_id: mockCustomer2.id,
      customer: mockCustomer2,
      status: 'SENT',
      currency: 'INR',
      grand_total: 42000,
      view_count: 0,
      valid_until: new Date(Date.now() + 24 * 3600000).toISOString(), // 24 hours from now
      public_token: 'tok_exp_2',
      items: [{ description: 'Logistics Optimization', quantity: 1, unit_price: 42000 }],
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    (store as any).quotations.set(expiringQuote.id, expiringQuote);

    const plan = await businessOperatorEngine.generateDailyActionPlan(TEST_ORG_ID);
    const expAction = plan.actions.find((a) => a.resourceId === 'quote-expiring-2');

    expect(expAction).toBeDefined();
    expect(expAction?.type).toBe('QUOTE_FOLLOWUP');
    expect(expAction?.urgency).toBe('HIGH');
    expect(expAction?.dueOrExpiryText).toBe('Expires in 24 hours');
  });

  it('4. Detects approved quotes not yet converted into invoices', async () => {
    const approvedQuote: Quotation = {
      id: 'quote-approved-3',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-2026-APP',
      customer_id: mockCustomer1.id,
      customer: mockCustomer1,
      status: 'APPROVED',
      currency: 'INR',
      grand_total: 120000,
      has_issued_invoice: false,
      items: [{ description: 'Enterprise License', quantity: 2, unit_price: 60000 }],
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    (store as any).quotations.set(approvedQuote.id, approvedQuote);

    const plan = await businessOperatorEngine.generateDailyActionPlan(TEST_ORG_ID);
    const invoiceAction = plan.actions.find((a) => a.resourceId === 'quote-approved-3');

    expect(invoiceAction).toBeDefined();
    expect(invoiceAction?.type).toBe('CONVERT_APPROVED_QUOTE');
    expect(invoiceAction?.urgency).toBe('HIGH');
    expect(invoiceAction?.value).toBe(120000);
    expect(invoiceAction?.actionKey).toBe('create_invoice_draft');
    expect(invoiceAction?.draftPayload?.items.length).toBe(1);
  });

  it('5. Detects overdue invoices and prepares tailored payment reminders', async () => {
    const overdueInvoice: Invoice = {
      id: 'inv-overdue-4',
      organization_id: TEST_ORG_ID,
      invoice_number: 'INV-2026-004',
      customer_id: mockCustomer2.id,
      customer: mockCustomer2,
      status: 'SENT',
      currency: 'INR',
      grand_total: 55000,
      paid_amount: 15000,
      due_date: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10), // 10 days ago
      items: [{ description: 'Consulting Retainer', quantity: 1, unit_price: 55000, amount: 55000 }],
      created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    (store as any).invoices.set(overdueInvoice.id, overdueInvoice);

    const plan = await businessOperatorEngine.generateDailyActionPlan(TEST_ORG_ID);
    const overdueAction = plan.actions.find((a) => a.resourceId === 'inv-overdue-4');

    expect(overdueAction).toBeDefined();
    expect(overdueAction?.type).toBe('OVERDUE_INVOICE');
    expect(overdueAction?.urgency).toBe('MEDIUM');
    expect(overdueAction?.value).toBe(40000); // 55000 - 15000 unpaid
    expect(overdueAction?.dueOrExpiryText).toBe('10d overdue');
    expect(overdueAction?.suggestedMessage).toContain('Beta Global');
    expect(overdueAction?.suggestedMessage).toContain('INV-2026-004');
    expect(overdueAction?.suggestedMessage).toContain('40,000');
  });

  it('6. Calculates accurate total pipeline at stake and categories summary', async () => {
    const plan = await businessOperatorEngine.generateDailyActionPlan(TEST_ORG_ID);

    expect(plan.summary.totalActions).toBeGreaterThanOrEqual(4);
    expect(plan.summary.highUrgencyCount).toBeGreaterThanOrEqual(2);
    // Value = 85000 (hot) + 42000 (expiring) + 120000 (approved) + 40000 (overdue balance) = 287,000
    expect(plan.summary.totalValueAtStake).toBeGreaterThanOrEqual(287000);
    expect(plan.summary.currency).toBe('INR');
  });

  it('7. Enforces anti-nagging when actions are executed or dismissed', async () => {
    // Dismiss hot quote recommendation
    const recId = 'rec-quote-quote-hot-1';
    await operatorRecommendationManager.updateRecommendationStatus(
      TEST_ORG_ID,
      recId,
      'DISMISSED',
      'DISMISSED'
    );

    // Re-check active recommendations
    const active = await operatorRecommendationManager.getActiveRecommendations(TEST_ORG_ID);
    expect(active.some((r) => r.id === recId)).toBe(false);
  });

  it('8. Auto-reconciles recommendations when quotes are approved or invoices are paid', async () => {
    // Add active recommendation for quote-expiring-2
    await operatorRecommendationManager.addRecommendation(TEST_ORG_ID, {
      type: 'FOLLOWUP_QUOTE',
      title: 'Follow up on Q-2026-EXP',
      summary: 'Expiring soon',
      reason: '24 hours left',
      priority: 'HIGH',
      resource_type: 'quote',
      resource_id: 'quote-expiring-2',
      potential_value: 42000,
      currency: 'INR',
      action_label: 'WhatsApp Follow-Up',
      action_key: 'send_whatsapp_followup',
    });

    // Client approves the quote!
    await store.updateQuotation('quote-expiring-2', { status: 'APPROVED' });

    // Operator queries active recommendations
    const activeAfterApproval = await operatorRecommendationManager.getActiveRecommendations(TEST_ORG_ID);
    const stillActive = activeAfterApproval.find((r) => r.resource_id === 'quote-expiring-2');

    // Must be automatically marked COMPLETED and removed from active
    expect(stillActive).toBeUndefined();
  });
});
