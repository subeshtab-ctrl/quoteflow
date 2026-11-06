import { describe, it, expect, beforeEach } from 'vitest';
import { growthEngine } from '../lib/ai/growth-engine';
import { store } from '../lib/supabase/data-store';
import { Quotation, Invoice, Customer, Organization } from '../types/database';

describe('QuoteFlow AI — Business Learning, Mistake Detection & Lead Generation', () => {
  const TEST_ORG_ID = 'org-growth-test-' + Date.now();

  beforeEach(async () => {
    // Setup test organization
    await store.updateOrganization(TEST_ORG_ID, {
      name: 'Apex Solar & Electrical Solutions',
      country: 'United Kingdom',
      city: 'Manchester',
      default_currency: 'GBP',
      default_tax_rate: 20,
    });
  });

  describe('1. Mistake Detection Engine', () => {
    it('should detect expired quotations without follow-up and calculate revenue impact', async () => {
      const cust = await store.createCustomer({
        organization_id: TEST_ORG_ID,
        name: 'Manchester Warehouse Ltd',
        email: 'ops@manchesterwh.co.uk',
        city: 'Manchester',
        country: 'United Kingdom',
      });

      // Create expired quote without follow-up
      await store.createQuotation({
        organization_id: TEST_ORG_ID,
        customer_id: cust.id,
        title: 'Warehouse Solar PV 50kW',
        status: 'SENT',
        issue_date: '2026-09-01',
        valid_until: '2026-09-30', // expired in the past
        items: [
          {
            description: 'Commercial Solar Installation',
            quantity: 1,
            unit: 'unit',
            unit_price: 14200,
            discount_type: 'PERCENTAGE',
            discount_value: 0,
            tax_rate: 20,
          },
        ],
        currency: 'GBP',
      });

      const mistakes = await growthEngine.analyzeBusinessMistakes(TEST_ORG_ID, 'OWNER');
      const expiredMistake = mistakes.find((m) => m.type === 'EXPIRED_NO_FOLLOWUP');

      expect(expiredMistake).toBeDefined();
      expect(expiredMistake?.severity).toBe('HIGH');
      expect(expiredMistake?.affectedCount).toBeGreaterThanOrEqual(1);
      expect(expiredMistake?.potentialRevenueImpact).toBeGreaterThanOrEqual(14200);
      expect(expiredMistake?.currency).toBe('GBP');
    });

    it('should detect approved quotes that have not been converted to invoices', async () => {
      const cust = await store.createCustomer({
        organization_id: TEST_ORG_ID,
        name: 'Salford Commercial Plaza',
        email: 'management@salfordplaza.co.uk',
        city: 'Manchester',
        country: 'United Kingdom',
      });

      // Create APPROVED quote
      await store.createQuotation({
        organization_id: TEST_ORG_ID,
        customer_id: cust.id,
        title: 'HVAC Maintenance & Inverter Replacement',
        status: 'APPROVED',
        issue_date: '2026-10-15',
        valid_until: '2026-11-15',
        items: [
          {
            description: 'Industrial Inverter Unit',
            quantity: 2,
            unit: 'unit',
            unit_price: 3500,
            discount_type: 'PERCENTAGE',
            discount_value: 0,
            tax_rate: 20,
          },
        ],
        currency: 'GBP',
      });

      const mistakes = await growthEngine.analyzeBusinessMistakes(TEST_ORG_ID, 'OWNER');
      const uninvoicedMistake = mistakes.find((m) => m.type === 'APPROVED_NOT_INVOICED');

      expect(uninvoicedMistake).toBeDefined();
      expect(uninvoicedMistake?.severity).toBe('HIGH');
      expect(uninvoicedMistake?.actionLabel).toContain('Convert');
    });

    it('should detect overdue invoices and highlight cashflow risk', async () => {
      const cust = await store.createCustomer({
        organization_id: TEST_ORG_ID,
        name: 'Cheshire Logistics Hub',
        email: 'accounts@cheshirelog.co.uk',
        city: 'Cheshire',
        country: 'United Kingdom',
      });

      // Create overdue invoice
      await store.createInvoice({
        organization_id: TEST_ORG_ID,
        customer_id: cust.id,
        invoice_number: 'INV-2026-0099',
        status: 'OVERDUE',
        issue_date: '2026-09-01',
        due_date: '2026-09-15',
        items: [
          {
            description: 'Electrical Safety Inspection & Certification',
            quantity: 1,
            unit: 'unit',
            unit_price: 2800,
            discount_type: 'PERCENTAGE',
            discount_value: 0,
            tax_rate: 20,
          },
        ],
        paid_amount: 0,
        currency: 'GBP',
      });

      const mistakes = await growthEngine.analyzeBusinessMistakes(TEST_ORG_ID, 'OWNER');
      const overdueMistake = mistakes.find((m) => m.type === 'OVERDUE_INVOICES');

      expect(overdueMistake).toBeDefined();
      expect(overdueMistake?.potentialRevenueImpact).toBeGreaterThanOrEqual(2800);
    });

    it('should respect staff role permissions and not expose financial mistakes to unauthorized roles', async () => {
      const marketingMistakes = await growthEngine.analyzeBusinessMistakes(TEST_ORG_ID, 'MARKETING');
      // Marketing role should NOT see invoice financial mistakes
      const overdueForMarketing = marketingMistakes.find((m) => m.type === 'OVERDUE_INVOICES');
      expect(overdueForMarketing).toBeUndefined();
    });
  });

  describe('2. Growth Opportunities & Lead Recovery', () => {
    it('should identify high-impact growth opportunities with confidence scoring', async () => {
      const opportunities = await growthEngine.identifyGrowthOpportunities(TEST_ORG_ID, 'OWNER');

      expect(Array.isArray(opportunities)).toBe(true);
      expect(opportunities.length).toBeGreaterThan(0);

      // Verify structure of opportunities
      for (const opp of opportunities) {
        expect(opp.id).toBeDefined();
        expect(opp.title).toBeDefined();
        expect(opp.confidence).toBeGreaterThanOrEqual(50);
        expect(opp.confidence).toBeLessThanOrEqual(100);
        expect(opp.actionLabel).toBeDefined();
      }
    });

    it('should suppress dismissed recommendations when feedback is recorded', async () => {
      // Record a dismissal for a specific key
      growthEngine.recordRecommendationFeedback(
        TEST_ORG_ID,
        'DISCOUNT_CEILING',
        'DISMISSED'
      );

      const mistakes = await growthEngine.analyzeBusinessMistakes(TEST_ORG_ID, 'OWNER');
      const discountMistake = mistakes.find((m) => m.actionKey === 'DISCOUNT_CEILING');
      expect(discountMistake).toBeUndefined();
    });
  });

  describe('3. Transparent Business Health Score', () => {
    it('should calculate an explainable 0-100 score across 5 key components', async () => {
      const health = await growthEngine.calculateBusinessHealth(TEST_ORG_ID);

      expect(health.overallScore).toBeGreaterThanOrEqual(0);
      expect(health.overallScore).toBeLessThanOrEqual(100);
      expect(['Excellent', 'Good', 'Fair', 'Needs Attention']).toContain(health.grade);

      // Verify all 5 components are present with benchmarks and formulas
      expect(health.components.quoteConversion).toBeDefined();
      expect(health.components.quoteConversion.benchmark).toBeDefined();
      expect(health.components.quoteConversion.metricValue).toContain('%');

      expect(health.components.paymentCollection).toBeDefined();
      expect(health.components.customerRetention).toBeDefined();
      expect(health.components.followUpExecution).toBeDefined();
      expect(health.components.pipelineHealth).toBeDefined();
    });
  });

  describe('4. Targeted B2B Prospect Discovery & Explainable Lead Scoring', () => {
    it('should discover relevant prospects matching business location and category', async () => {
      const prospects = await growthEngine.generateTargetedProspects(TEST_ORG_ID, {
        targetCity: 'Manchester',
        targetCategory: 'Commercial Real Estate',
        count: 5,
      });

      expect(prospects.length).toBeGreaterThan(0);

      for (const p of prospects) {
        expect(p.businessName).toBeDefined();
        expect(p.category).toBeDefined();
        expect(p.city).toBe('Manchester');
        expect(p.leadScore).toBeGreaterThanOrEqual(60);
        expect(p.leadScore).toBeLessThanOrEqual(100);
        expect(p.fitReason).toBeDefined();
        expect(p.scoreReasons.length).toBeGreaterThan(0);
        expect(p.leadSource).toBeDefined();

        // Strict rule: No hallucinated private email domains
        if (p.contactEmail) {
          expect(p.contactEmail).not.toContain('fake-private');
        }
      }
    });
  });

  describe('5. Ask QuoteFlow AI Naturally (Calculations, Not Hallucinations)', () => {
    it('should answer "Why are my sales down?" with concrete data', async () => {
      const res = await growthEngine.answerNaturalBusinessQuestion(
        TEST_ORG_ID,
        'Why are my sales down?',
        'OWNER'
      );

      expect(res.answerMarkdown).toContain('Sales');
      expect(res.suggestedFollowUps.length).toBeGreaterThan(0);
    });

    it('should answer "Which services make me the most money?" with ranked revenue', async () => {
      const res = await growthEngine.answerNaturalBusinessQuestion(
        TEST_ORG_ID,
        'Which services make me the most money?',
        'OWNER'
      );

      expect(res.answerMarkdown).toContain('Services');
      expect(res.dataPoints?.length).toBeGreaterThan(0);
    });

    it('should answer "Which quotes should I follow up today?" with high-priority list', async () => {
      const res = await growthEngine.answerNaturalBusinessQuestion(
        TEST_ORG_ID,
        'Which quotes should I follow up today?',
        'OWNER'
      );

      expect(res.answerMarkdown).toContain('Follow-Ups');
      expect(res.actionLink).toBeDefined();
    });

    it('should answer "Which customers haven\'t paid?" with unpaid totals', async () => {
      const res = await growthEngine.answerNaturalBusinessQuestion(
        TEST_ORG_ID,
        "Which customers haven't paid?",
        'ACCOUNTS'
      );

      expect(res.answerMarkdown).toContain('Outstanding Unpaid Invoices');
      expect(res.dataPoints?.length).toBeGreaterThan(0);
    });
  });
});
