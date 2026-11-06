import { describe, it, expect, beforeEach } from 'vitest';
import { businessOperatorEngine } from '@/lib/ai/business-operator/operator-engine';
import { store } from '@/lib/supabase/data-store';
import { Quotation, Invoice, Customer } from '@/types/database';

describe('Business Operator Phase 4 & 5: Advanced Intelligence & Automation Engine', () => {
  const TEST_ORG_ID = 'org-operator-phase45-test';

  const mockCustomer1: Customer = {
    id: 'cust-p4-alpha',
    organization_id: TEST_ORG_ID,
    name: 'SolarGrid Technologies',
    company_name: 'SolarGrid Pvt Ltd',
    email: 'billing@solargrid.com',
    phone: '+91 99999 44444',
    address: 'Solar Park 4',
    city: 'Hyderabad',
    country: 'India',
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
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

    (store as any).customers.set(mockCustomer1.id, mockCustomer1);
  });

  it('1. Analyzes pricing & margins and flags unusual discount leakage', async () => {
    const quoteHeavyDiscount: Quotation = {
      id: 'quote-p4-heavy-disc',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-2026-DISC1',
      customer_id: mockCustomer1.id,
      status: 'SENT',
      currency: 'INR',
      subtotal: 100000,
      discount_value: 25, // 25% discount (>20% threshold)
      discount_type: 'PERCENTAGE',
      discount_amount: 25000,
      grand_total: 75000,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const quoteStandard: Quotation = {
      id: 'quote-p4-standard',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-2026-NORM1',
      customer_id: mockCustomer1.id,
      status: 'SENT',
      currency: 'INR',
      subtotal: 50000,
      discount_value: 5,
      discount_type: 'PERCENTAGE',
      discount_amount: 2500,
      grand_total: 47500,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    (store as any).quotations.set(quoteHeavyDiscount.id, quoteHeavyDiscount);
    (store as any).quotations.set(quoteStandard.id, quoteStandard);

    const pricing = await businessOperatorEngine.analyzePricingAndMargins(TEST_ORG_ID);

    expect(pricing.unusualDiscountsCount).toBeGreaterThanOrEqual(1);
    expect(pricing.averageMarginPercentage).toBeGreaterThan(0);
    expect(pricing.insights.length).toBeGreaterThanOrEqual(1);

    const leakageInsight = pricing.insights.find((i) => i.title.includes('High Discount'));
    expect(leakageInsight).toBeDefined();
    expect(leakageInsight?.impact).toBe('HIGH');
    expect(leakageInsight?.potentialGain).toBeGreaterThan(0);
  });

  it('2. Suggests cross-sell items based on co-occurrence in historical quotes', async () => {
    // 3 past quotes bundling "Solar Inverter 5kVA" and "Battery Bank 200Ah"
    const quote1: Quotation = {
      id: 'q-bundle-1',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-B1',
      status: 'APPROVED',
      currency: 'INR',
      grand_total: 120000,
      items: [
        { description: 'Solar Inverter 5kVA', quantity: 1, unit_price: 60000 },
        { description: 'Battery Bank 200Ah', quantity: 2, unit_price: 30000 },
      ],
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const quote2: Quotation = {
      id: 'q-bundle-2',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-B2',
      status: 'APPROVED',
      currency: 'INR',
      grand_total: 120000,
      items: [
        { description: 'Solar Inverter 5kVA', quantity: 1, unit_price: 60000 },
        { description: 'Battery Bank 200Ah', quantity: 2, unit_price: 30000 },
      ],
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    (store as any).quotations.set(quote1.id, quote1);
    (store as any).quotations.set(quote2.id, quote2);

    const suggestions = await businessOperatorEngine.recommendCrossSellItems(TEST_ORG_ID, [
      'Solar Inverter 5kVA',
    ]);

    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    const batterySuggestion = suggestions.find((s) => s.recommendedItem.toLowerCase().includes('battery bank'));
    expect(batterySuggestion).toBeDefined();
    expect(batterySuggestion?.frequency).toBeGreaterThanOrEqual(50);
    expect(batterySuggestion?.explanation).toContain('Solar Inverter');
  });

  it('3. Computes 30-day cash flow projections from confirmed, overdue and weighted pipeline', async () => {
    const now = Date.now();

    // 1. Confirmed invoice due in 10 days (unpaid 45,000)
    const confirmedInvoice: Invoice = {
      id: 'inv-cf-confirmed',
      organization_id: TEST_ORG_ID,
      invoice_number: 'INV-CF-101',
      customer_id: mockCustomer1.id,
      status: 'SENT',
      currency: 'INR',
      grand_total: 45000,
      paid_amount: 0,
      due_date: new Date(now + 10 * 86400000).toISOString().slice(0, 10), // 10 days from now
      items: [],
      created_at: new Date(now - 10 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 2. Overdue invoice by 15 days (balance 30,000 -> 50% recovery expectation = 15,000)
    const overdueInvoice: Invoice = {
      id: 'inv-cf-overdue',
      organization_id: TEST_ORG_ID,
      invoice_number: 'INV-CF-102',
      customer_id: mockCustomer1.id,
      status: 'SENT',
      currency: 'INR',
      grand_total: 30000,
      paid_amount: 0,
      due_date: new Date(now - 15 * 86400000).toISOString().slice(0, 10), // 15 days ago
      items: [],
      created_at: new Date(now - 45 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 3. Hot open quote (value 100,000, view_count 3 -> 70% weighted expectation = 70,000)
    const hotQuote: Quotation = {
      id: 'quote-cf-hot',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-CF-HOT',
      customer_id: mockCustomer1.id,
      status: 'SENT',
      currency: 'INR',
      grand_total: 100000,
      view_count: 3,
      created_at: new Date(now - 2 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    (store as any).invoices.set(confirmedInvoice.id, confirmedInvoice);
    (store as any).invoices.set(overdueInvoice.id, overdueInvoice);
    (store as any).quotations.set(hotQuote.id, hotQuote);

    const projection = await businessOperatorEngine.projectCashFlow(TEST_ORG_ID);

    expect(projection.horizonDays).toBe(30);
    expect(projection.summary.confirmedInflow).toBeGreaterThanOrEqual(45000);
    expect(projection.summary.overdueRecoverableInflow).toBeGreaterThanOrEqual(15000);
    expect(projection.summary.pipelineWeightedInflow).toBeGreaterThanOrEqual(70000);
    expect(projection.summary.totalProjectedInflow).toBeGreaterThanOrEqual(130000);

    // Weekly breakdown covers 4 weeks
    expect(projection.weeklyBreakdown.length).toBe(4);
    expect(projection.weeklyBreakdown[0].week).toContain('Week 1');
  });

  it('4. Initializes and manages tenant-scoped Business Automation Rules (Phase 5)', async () => {
    const rules = await businessOperatorEngine.getAutomationRules(TEST_ORG_ID);

    expect(rules.length).toBeGreaterThanOrEqual(5);

    // Verify all rules enforce human confirmation by default
    for (const rule of rules) {
      expect(rule.requiresHumanConfirmation).toBe(true);
      expect(rule.organization_id).toBe(TEST_ORG_ID);
    }

    const firstRule = rules[0];
    expect(firstRule.enabled).toBe(true);

    // Toggle rule off
    const toggled = await businessOperatorEngine.toggleAutomationRule(
      TEST_ORG_ID,
      firstRule.id,
      false
    );
    expect(toggled?.enabled).toBe(false);

    // Re-check from store
    const updatedRules = await businessOperatorEngine.getAutomationRules(TEST_ORG_ID);
    const rechecked = updatedRules.find((r) => r.id === firstRule.id);
    expect(rechecked?.enabled).toBe(false);
  });
});
