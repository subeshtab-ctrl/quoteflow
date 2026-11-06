import { describe, it, expect, beforeEach } from 'vitest';
import { businessOperatorEngine } from '@/lib/ai/business-operator/operator-engine';
import { classifyCopilotIntent } from '@/lib/ai/intent-classifier';
import { store } from '@/lib/supabase/data-store';
import { Quotation, Customer } from '@/types/database';

describe('Business Operator Phase 3: Growth & Recovery Engine', () => {
  const TEST_ORG_ID = 'org-operator-phase3-test';

  const mockCustomerA: Customer = {
    id: 'cust-p3-alpha',
    organization_id: TEST_ORG_ID,
    name: 'Apex Infrastructure',
    company_name: 'Apex Infra Ltd',
    email: 'contact@apexinfra.com',
    phone: '+91 98888 11111',
    address: '100 Ring Road',
    city: 'Bangalore',
    country: 'India',
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockCustomerB: Customer = {
    id: 'cust-p3-beta',
    organization_id: TEST_ORG_ID,
    name: 'Zenith Logistics',
    company_name: 'Zenith Global',
    email: 'ops@zenithlogistics.com',
    phone: '+91 97777 22222',
    address: '45 Port Way',
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

    // Directly set mock customers in store
    (store as any).customers.set(mockCustomerA.id, mockCustomerA);
    (store as any).customers.set(mockCustomerB.id, mockCustomerB);
  });

  it('1. Correctly classifies Phase 3 natural language intents', () => {
    // Pipeline Health & Hot Deals
    const pipelineQueries = [
      'show hot leads',
      'show my hot deals',
      'deal temperature',
      'pipeline status',
      'pipeline health',
      'sales pipeline',
      'which deals are hot',
    ];
    for (const q of pipelineQueries) {
      const res = classifyCopilotIntent(q);
      expect(res.intent).toBe('pipeline_health');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    }

    // Lead Recovery
    const recoveryQueries = [
      'recover lost quotes',
      'recover leads',
      'lead recovery',
      'lost quote recovery',
      'unanswered quotes',
      'revive expired quotes',
    ];
    for (const q of recoveryQueries) {
      const res = classifyCopilotIntent(q);
      expect(res.intent).toBe('lead_recovery');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    }

    // Win/Loss Insights
    const winLossQueries = [
      'why are quotes not converting',
      'win loss analysis',
      'win/loss analysis',
      'quote conversion rate',
      'conversion insights',
    ];
    for (const q of winLossQueries) {
      const res = classifyCopilotIntent(q);
      expect(res.intent).toBe('win_loss_insights');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('2. Categorizes pipeline deals into HOT, WARM, and COLD with conversion scores', async () => {
    const now = Date.now();

    // Hot Deal: Viewed 3 times in portal, viewed 2 hours ago
    const hotQuote: Quotation = {
      id: 'quote-p3-hot',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-2026-HOT1',
      customer_id: mockCustomerA.id,
      customer: mockCustomerA,
      status: 'SENT',
      currency: 'INR',
      grand_total: 150000,
      view_count: 3,
      last_viewed_at: new Date(now - 2 * 3600000).toISOString(),
      created_at: new Date(now - 2 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Warm Deal: Sent 2 days ago, viewed 1 time
    const warmQuote: Quotation = {
      id: 'quote-p3-warm',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-2026-WARM1',
      customer_id: mockCustomerB.id,
      customer: mockCustomerB,
      status: 'SENT',
      currency: 'INR',
      grand_total: 60000,
      view_count: 1,
      last_viewed_at: new Date(now - 24 * 3600000).toISOString(),
      created_at: new Date(now - 2 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Cold Deal: Sent 10 days ago, 0 views
    const coldQuote: Quotation = {
      id: 'quote-p3-cold',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-2026-COLD1',
      customer_id: mockCustomerA.id,
      customer: mockCustomerA,
      status: 'SENT',
      currency: 'INR',
      grand_total: 40000,
      view_count: 0,
      created_at: new Date(now - 10 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    (store as any).quotations.set(hotQuote.id, hotQuote);
    (store as any).quotations.set(warmQuote.id, warmQuote);
    (store as any).quotations.set(coldQuote.id, coldQuote);

    const pipeline = await businessOperatorEngine.analyzePipelineTemperatures(TEST_ORG_ID);

    expect(pipeline.summary.totalDeals).toBeGreaterThanOrEqual(3);
    expect(pipeline.summary.hotDealsCount).toBeGreaterThanOrEqual(1);
    expect(pipeline.summary.coldDealsCount).toBeGreaterThanOrEqual(1);

    const hotDeal = pipeline.deals.find((d) => d.id === 'quote-p3-hot');
    expect(hotDeal).toBeDefined();
    expect(hotDeal?.temperature).toBe('HOT');
    expect(hotDeal?.score).toBeGreaterThanOrEqual(75);

    const coldDeal = pipeline.deals.find((d) => d.id === 'quote-p3-cold');
    expect(coldDeal).toBeDefined();
    expect(coldDeal?.temperature).toBe('COLD');
    expect(coldDeal?.score).toBeLessThanOrEqual(40);
  });

  it('3. Computes accurate pipeline values and summaries across temperature tiers', async () => {
    const pipeline = await businessOperatorEngine.analyzePipelineTemperatures(TEST_ORG_ID);

    expect(pipeline.summary.totalPipelineValue).toBeGreaterThanOrEqual(250000); // 150k + 60k + 40k
    expect(pipeline.summary.hotDealsValue).toBeGreaterThanOrEqual(150000);
    expect(pipeline.currency).toBe('INR');
  });

  it('4. Analyzes Win/Loss rates and average time to decision', async () => {
    const now = Date.now();

    // 2 Approved quotes (took 3 days)
    const approvedQ1: Quotation = {
      id: 'quote-p3-app1',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-2026-A1',
      customer_id: mockCustomerA.id,
      status: 'APPROVED',
      currency: 'INR',
      grand_total: 90000,
      subtotal: 90000,
      discount_value: 0,
      discount_type: 'PERCENTAGE',
      created_at: new Date(now - 5 * 86400000).toISOString(),
      updated_at: new Date(now - 2 * 86400000).toISOString(), // 3 days
    };
    const approvedQ2: Quotation = {
      id: 'quote-p3-app2',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-2026-A2',
      customer_id: mockCustomerB.id,
      status: 'APPROVED',
      currency: 'INR',
      grand_total: 80000,
      subtotal: 80000,
      discount_value: 5,
      discount_type: 'PERCENTAGE',
      created_at: new Date(now - 6 * 86400000).toISOString(),
      updated_at: new Date(now - 2 * 86400000).toISOString(), // 4 days
    };

    // 1 Rejected quote (took 6 days)
    const rejectedQ: Quotation = {
      id: 'quote-p3-rej1',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-2026-R1',
      customer_id: mockCustomerA.id,
      status: 'REJECTED',
      currency: 'INR',
      grand_total: 50000,
      subtotal: 50000,
      discount_value: 20,
      discount_type: 'PERCENTAGE',
      created_at: new Date(now - 10 * 86400000).toISOString(),
      updated_at: new Date(now - 4 * 86400000).toISOString(), // 6 days
    };

    (store as any).quotations.set(approvedQ1.id, approvedQ1);
    (store as any).quotations.set(approvedQ2.id, approvedQ2);
    (store as any).quotations.set(rejectedQ.id, rejectedQ);

    const winLoss = await businessOperatorEngine.analyzeWinLossDisparity(TEST_ORG_ID);

    expect(winLoss.metrics.approvedQuotesCount).toBeGreaterThanOrEqual(2);
    expect(winLoss.metrics.approvalRate).toBeGreaterThanOrEqual(40);
    expect(winLoss.metrics.averageTimeToApprovalDays).toBeGreaterThan(0);
    expect(winLoss.metrics.averageTimeToRejectionDays).toBeGreaterThan(0);
  });

  it('5. Detects discount disparity where high discounting does not improve win rate', async () => {
    const winLoss = await businessOperatorEngine.analyzeWinLossDisparity(TEST_ORG_ID);

    expect(winLoss.discountImpact.highDiscountThreshold).toBe(15);
    expect(winLoss.discountImpact.insight).toBeDefined();
    expect(winLoss.discountImpact.insight.length).toBeGreaterThan(15);
  });

  it('6. Detects unopened quotes and viewed unapproved quotes in the lead recovery engine', async () => {
    const now = Date.now();

    // Unopened quote sent 3 days ago
    const unopenedQ: Quotation = {
      id: 'quote-rec-unopened',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-2026-UNOPEN',
      customer_id: mockCustomerA.id,
      status: 'SENT',
      currency: 'INR',
      grand_total: 45000,
      view_count: 0,
      created_at: new Date(now - 3 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Viewed but unapproved sent 4 days ago
    const viewedUnapprovedQ: Quotation = {
      id: 'quote-rec-viewed',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-2026-VIEWED',
      customer_id: mockCustomerB.id,
      status: 'SENT',
      currency: 'INR',
      grand_total: 75000,
      view_count: 2,
      created_at: new Date(now - 4 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    (store as any).quotations.set(unopenedQ.id, unopenedQ);
    (store as any).quotations.set(viewedUnapprovedQ.id, viewedUnapprovedQ);

    const recoveryItems = await businessOperatorEngine.recoverLostLeads(TEST_ORG_ID);

    const unopenedItem = recoveryItems.find((r) => r.quoteId === 'quote-rec-unopened');
    expect(unopenedItem).toBeDefined();
    expect(unopenedItem?.recoveryType).toBe('UNOPENED');
    expect(unopenedItem?.value).toBe(45000);
    expect(unopenedItem?.suggestedMessage).toContain('re-sending the link');

    const viewedItem = recoveryItems.find((r) => r.quoteId === 'quote-rec-viewed');
    expect(viewedItem).toBeDefined();
    expect(viewedItem?.recoveryType).toBe('VIEWED_UNAPPROVED');
    expect(viewedItem?.value).toBe(75000);
  });

  it('7. Detects expired quotes and provides 1-click revival draft actions', async () => {
    const now = Date.now();

    const expiredQ: Quotation = {
      id: 'quote-rec-expired',
      organization_id: TEST_ORG_ID,
      quotation_number: 'Q-2026-EXPIRE-REVIVE',
      customer_id: mockCustomerA.id,
      status: 'EXPIRED',
      currency: 'INR',
      grand_total: 95000,
      created_at: new Date(now - 20 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    (store as any).quotations.set(expiredQ.id, expiredQ);

    const recoveryItems = await businessOperatorEngine.recoverLostLeads(TEST_ORG_ID);
    const expiredItem = recoveryItems.find((r) => r.quoteId === 'quote-rec-expired');

    expect(expiredItem).toBeDefined();
    expect(expiredItem?.recoveryType).toBe('EXPIRED_REVIVAL');
    expect(expiredItem?.actionKey).toBe('create_quote_draft');
    expect(expiredItem?.value).toBe(95000);
  });
});
