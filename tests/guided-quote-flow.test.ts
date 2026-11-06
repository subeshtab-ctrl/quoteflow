import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/copilot/route';
import { store } from '@/lib/supabase/data-store';

// Mock auth context
vi.mock('@/lib/supabase/auth-context', () => ({
  getAuthenticatedUserContext: vi.fn().mockResolvedValue({
    userId: 'user-123',
    orgId: 'a0000000-0000-0000-0000-000000000001',
    fullName: 'Subesh M',
    role: 'owner',
  }),
}));

describe('Draft a Quote — Guided AI Conversation Flow', () => {
  const orgId = 'a0000000-0000-0000-0000-000000000001';

  beforeEach(async () => {
    // Setup test customers in store
    const customers = await store.getCustomers(orgId, { environment: 'live' });
    if (!customers.some((c) => c.name === 'ABC Trading LLC')) {
      await store.createCustomer({
        organization_id: orgId,
        name: 'ABC Trading LLC',
        company_name: 'ABC Trading LLC',
        email: 'abc@trading.com',
        phone: '+971501234567',
        city: 'Dubai',
        country: 'United Arab Emirates',
        environment: 'live',
      });
    }
  });

  it('Step 1: When user clicks "Draft a quote", responds asking for products/services and prices without generic cards', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Draft a quote',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    if (data.actionType === 'customer_multi_match') {
      console.log('TEST 3 MULTI MATCH CANDIDATES:', data.candidateMatches);
    }

    expect(data.actionType).toBe('guided_quote_ask_items');
    expect(data.replyText).toContain('What products or services would you like to include?');
    expect(data.pendingQuotePayload).toBeDefined();
    expect(data.pendingQuotePayload.step).toBe('awaiting_items');
    // Must NOT have visual promotional cards attached
    expect(data.richPayload?.isVisualResponse).toBeFalsy();
  });

  it('Step 2 & 3: Parses items naturally and immediately asks "Who is this quote for?" without creating a quote', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Glass $500 and Battery $600',
        pendingQuotePayload: {
          step: 'awaiting_items',
          items: [],
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    if (data.actionType === 'customer_multi_match') {
      console.log('TEST 3 MULTI MATCH CANDIDATES:', data.candidateMatches);
    }

    expect(data.actionType).toBe('guided_quote_ask_customer');
    expect(data.replyText).toContain('Got it. Who is this quote for?');
    expect(data.pendingQuotePayload.items.length).toBe(2);
    expect(data.pendingQuotePayload.items[0].description).toBe('Glass');
    expect(data.pendingQuotePayload.items[0].unit_price).toBe(500);
    expect(data.pendingQuotePayload.items[1].description).toBe('Battery');
    expect(data.pendingQuotePayload.items[1].unit_price).toBe(600);
    expect(data.pendingQuotePayload.step).toBe('awaiting_customer');
    // Does NOT create database record yet
    expect(data.quotation).toBeUndefined();
  });

  it('Step 4 & 5: When user specifies customer, prepares uncommitted Quote Draft Preview with actions', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'ABC Trading',
        pendingQuotePayload: {
          step: 'awaiting_customer',
          items: [
            { description: 'Glass', quantity: 1, unit_price: 500 },
            { description: 'Battery', quantity: 1, unit_price: 600 },
          ],
          currency: 'USD',
          subtotal: 1100,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    if (data.actionType === 'customer_multi_match') {
      console.log('TEST 3 MULTI MATCH CANDIDATES:', data.candidateMatches);
    }

    expect(data.actionType).toBe('quote_draft_preview');
    expect(data.customer).toBeDefined();
    expect(data.customer.name).toContain('ABC Trading');
    expect(data.pendingQuotePayload.items.length).toBe(2);
    expect(data.pendingQuotePayload.step).toBe('draft_preview');
    // Still uncommitted in DB
    expect(data.quotation).toBeUndefined();
  });

  it('Step 6: Allows natural language editing of the uncommitted draft (e.g. Change Glass to $450, Battery quantity 2)', async () => {
    // Edit 1: Change price
    const reqPrice = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Change Glass to $450',
        pendingQuotePayload: {
          step: 'draft_preview',
          customer: { id: 'cust-1', name: 'ABC Trading LLC' },
          customerId: 'cust-1',
          currency: 'USD',
          items: [
            { description: 'Glass', quantity: 1, unit_price: 500 },
            { description: 'Battery', quantity: 1, unit_price: 600 },
          ],
        },
      }),
    });

    const resPrice = await POST(reqPrice);
    const dataPrice = await resPrice.json();

    expect(dataPrice.actionType).toBe('quote_draft_preview');
    const glassItem = dataPrice.pendingQuotePayload.items.find((i: any) => i.description === 'Glass');
    expect(glassItem.unit_price).toBe(450);

    // Edit 2: Change quantity
    const reqQty = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Battery quantity 2',
        pendingQuotePayload: dataPrice.pendingQuotePayload,
      }),
    });

    const resQty = await POST(reqQty);
    const dataQty = await resQty.json();

    const batteryItem = dataQty.pendingQuotePayload.items.find((i: any) => i.description === 'Battery');
    expect(batteryItem.quantity).toBe(2);
    // 450*1 + 600*2 = 1650
    expect(dataQty.pendingQuotePayload.subtotal).toBe(1650);
  });

  it('Step 6 Commit: Saves quote in database when user confirms "Create Quote" and returns next actions', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Create Quote',
        action: 'commit_quote',
        pendingQuotePayload: {
          customerId: 'cust-1',
          customer: { id: 'cust-1', name: 'ABC Trading LLC' },
          currency: 'USD',
          items: [
            { description: 'Glass', quantity: 1, unit_price: 450 },
            { description: 'Battery', quantity: 2, unit_price: 600 },
          ],
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    if (data.actionType === 'customer_multi_match') {
      console.log('TEST 3 MULTI MATCH CANDIDATES:', data.candidateMatches);
    }

    expect(data.actionType).toBe('quote_created');
    expect(data.quotation).toBeDefined();
    expect(data.quotation.id).toBeDefined();
    expect(data.quotation.quotation_number).toBeDefined();
    expect(data.sentDetails).toBeDefined();
    expect(data.sentDetails.quoteNumber).toBe(data.quotation.quotation_number);
    expect(data.replyText).toContain('Quotation');
    expect(data.replyText).toContain('created');
  });

  it('Direct Command: "Create quote Glass $500 Battery $600 for ABC" parses everything in one message without re-asking', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Create quote Glass $500 Battery $600 for ABC Trading',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    if (data.actionType === 'customer_multi_match') {
      console.log('TEST 3 MULTI MATCH CANDIDATES:', data.candidateMatches);
    }

    expect(data.actionType).toBe('quote_draft_preview');
    expect(data.customer.name).toContain('ABC Trading');
    expect(data.pendingQuotePayload.items.length).toBe(2);
  });

  it('Smart Reuse: "Create the same quote for XYZ" reuses items from pending payload', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Create the same quote for ABC Trading',
        pendingQuotePayload: {
          items: [
            { description: 'High-Performance Glass', quantity: 3, unit_price: 200 },
          ],
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    if (data.actionType === 'customer_multi_match') {
      console.log('TEST 3 MULTI MATCH CANDIDATES:', data.candidateMatches);
    }

    expect(data.actionType).toBe('quote_draft_preview');
    expect(data.customer.name).toContain('ABC Trading');
    expect(data.pendingQuotePayload.items[0].description).toBe('High-Performance Glass');
    expect(data.pendingQuotePayload.items[0].quantity).toBe(3);
  });

  it('Critical Workflow: Duplicate customer selection must continue quote draft by ID, not search again', async () => {
    // 1. Create two SUBESH customers
    const c1 = await store.createCustomer({
      organization_id: orgId,
      name: 'SUBESH M',
      company_name: 'SUBESH M',
      phone: '123456',
      city: 'Kochi',
      country: 'India',
      environment: 'live',
    });

    const c2 = await store.createCustomer({
      organization_id: orgId,
      name: 'Subesh M',
      company_name: 'ABC Company',
      email: 'abc@openai.com',
      phone: '12345678',
      city: 'Bangalore',
      country: 'India',
      environment: 'live',
    });

    // Step A: User requests quote for SUBESH
    const reqPrompt = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Create quote Battery $400 and Gas $100 for SUBESH',
      }),
    });

    const resPrompt = await POST(reqPrompt);
    expect(resPrompt.status).toBe(200);
    const dataPrompt = await resPrompt.json();

    // Must detect multiple matches
    expect(dataPrompt.actionType).toBe('customer_multi_match');
    expect(dataPrompt.candidateMatches.length).toBeGreaterThanOrEqual(2);
    expect(dataPrompt.pendingQuotePayload.items.length).toBe(2);
    expect(dataPrompt.pendingQuotePayload.step).toBe('waiting_for_customer_selection');

    // Step B: User clicks "Select" on c1 (SUBESH M)
    // Sends structured action with customer ID (never fuzzy searches again!)
    const reqSelect = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        action: 'select_customer',
        customerId: c1.id,
        confirmedCustomerId: c1.id,
        customer: c1,
        pendingQuotePayload: dataPrompt.pendingQuotePayload,
      }),
    });

    const resSelect = await POST(reqSelect);
    expect(resSelect.status).toBe(200);
    const dataSelect = await resSelect.json();

    // MUST NOT return customer_multi_match!
    expect(dataSelect.actionType).toBe('quote_draft_preview');
    expect(dataSelect.customer.id).toBe(c1.id);
    expect(dataSelect.customer.name).toBe('SUBESH M');
    expect(dataSelect.pendingQuotePayload.items.length).toBe(2);
    expect(dataSelect.pendingQuotePayload.subtotal).toBe(500);
    expect(dataSelect.pendingQuotePayload.step).toBe('draft_preview');
    expect(dataSelect.pendingQuotePayload.workflowStatus).toBe('draft_ready');

    // Step C: Fallback check — even if legacy message "Select customer SUBESH M" is sent,
    // it resolves without looping into another multi-match question
    const reqLegacy = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Select customer SUBESH M',
        confirmedCustomerId: c1.id,
        pendingQuotePayload: dataPrompt.pendingQuotePayload,
      }),
    });

    const resLegacy = await POST(reqLegacy);
    expect(resLegacy.status).toBe(200);
    const dataLegacy = await resLegacy.json();
    expect(dataLegacy.actionType).toBe('quote_draft_preview');
    expect(dataLegacy.customer.id).toBe(c1.id);

    // Step D: Explicit "Change customer" intent resets for a new customer
    const reqChange = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Change customer',
        pendingQuotePayload: dataSelect.pendingQuotePayload,
      }),
    });
    const resChange = await POST(reqChange);
    const dataChange = await resChange.json();
    expect(dataChange.actionType).toBe('guided_quote_ask_customer');
    expect(dataChange.pendingQuotePayload.step).toBe('awaiting_customer');
  });
});
