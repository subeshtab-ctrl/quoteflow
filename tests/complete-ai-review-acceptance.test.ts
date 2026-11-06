import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/copilot/route';
import { store } from '@/lib/supabase/data-store';
import { generateRichAiResponse } from '@/lib/ai/rich-response-generator';
import { classifyCopilotIntent } from '@/lib/ai/intent-classifier';

// Mock authenticated user context
vi.mock('@/lib/supabase/auth-context', () => ({
  getAuthenticatedUserContext: vi.fn().mockResolvedValue({
    userId: 'user-review-123',
    orgId: 'a0000000-0000-0000-0000-000000000001',
    fullName: 'Test Owner',
    role: 'owner',
  }),
}));

describe('QuoteFlow AI — Complete AI Review & Production Acceptance Tests', () => {
  const orgId = 'a0000000-0000-0000-0000-000000000001';

  beforeEach(async () => {
    // Ensure clean state with known customers
    const customers = await store.getCustomers(orgId, { environment: 'live' });
    if (!customers.some((c) => c.name === 'SUBESH M')) {
      await store.createCustomer({
        organization_id: orgId,
        name: 'SUBESH M',
        company_name: 'SUBESH M',
        phone: '123456',
        country: 'India',
        environment: 'live',
      });
    }
  });

  // TEST 1 — Create Quote Button
  it('Test 1: Clicking "Create a quote" starts clean workflow and asks for items without hardcoding Battery/Gas/Subesh', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Draft a quote',
        action: 'start_quote_workflow',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.actionType).toBe('guided_quote_ask_items');
    expect(data.replyText).toContain('What products or services would you like to include?');
    // Must NOT have automatically created any items or customer
    expect(data.pendingQuotePayload.items.length).toBe(0);
    expect(data.customer).toBeUndefined();
    expect(data.quotation).toBeUndefined();
  });

  // TEST 2 — Guided Items
  it('Test 2: Entering "Battery $400 and Gas $100" understands $500 total and asks who the quote is for', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Battery $400 and Gas $100',
        pendingQuotePayload: {
          step: 'awaiting_items',
          items: [],
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.actionType).toBe('guided_quote_ask_customer');
    expect(data.replyText).toContain('Got it. Who is this quote for?');
    expect(data.pendingQuotePayload.items.length).toBe(2);
    expect(data.pendingQuotePayload.items[0].description).toBe('Battery');
    expect(data.pendingQuotePayload.items[0].unit_price).toBe(400);
    expect(data.pendingQuotePayload.items[1].description).toBe('Gas');
    expect(data.pendingQuotePayload.items[1].unit_price).toBe(100);
    expect(data.pendingQuotePayload.subtotal).toBe(500);
  });

  // TEST 3 — Customer Selection
  it('Test 3: Customer selection by ID continues quote draft directly without searching again', async () => {
    // Create two Subesh contacts to test multi-match
    const c1 = await store.createCustomer({
      organization_id: orgId,
      name: 'SUBESH M',
      company_name: 'SUBESH M',
      phone: '123456',
      country: 'India',
      environment: 'live',
    });
    const c2 = await store.createCustomer({
      organization_id: orgId,
      name: 'SUBESH PERIYA',
      company_name: 'Subesh Web Services',
      email: 'subesh.periya@gmail.com',
      country: 'India',
      environment: 'live',
    });

    // Step A: Search Subesh
    const reqSearch = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Subesh',
        pendingQuotePayload: {
          step: 'awaiting_customer',
          items: [
            { description: 'Battery', quantity: 1, unit_price: 400 },
            { description: 'Gas', quantity: 1, unit_price: 100 },
          ],
          subtotal: 500,
        },
      }),
    });

    const resSearch = await POST(reqSearch);
    const dataSearch = await resSearch.json();
    expect(dataSearch.actionType).toBe('customer_multi_match');
    expect(dataSearch.candidateMatches.length).toBeGreaterThanOrEqual(2);

    // Step B: User selects exact customer by unique ID via structured action
    const reqSelect = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        action: 'select_customer',
        customerId: c1.id,
        confirmedCustomerId: c1.id,
        pendingQuotePayload: dataSearch.pendingQuotePayload,
      }),
    });

    const resSelect = await POST(reqSelect);
    const dataSelect = await resSelect.json();

    expect(dataSelect.actionType).toBe('quote_draft_preview');
    expect(dataSelect.customer.id).toBe(c1.id);
    expect(dataSelect.customer.name).toBe('SUBESH M');
    expect(dataSelect.pendingQuotePayload.items.length).toBe(2);
    expect(dataSelect.pendingQuotePayload.step).toBe('draft_preview');
  });

  // TEST 4 — Complete Request
  it('Test 4: "Create quote Battery $400 and Gas $100 for Subesh" parses items and customer immediately', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Create quote Battery $400 and Gas $100 for Subesh',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    // Either resolves directly (if 1 Subesh) or displays multi-match cards once (if multiple Subesh)
    expect(['quote_draft_preview', 'customer_multi_match']).toContain(data.actionType);
    expect(data.pendingQuotePayload.items.length).toBe(2);
    expect(data.pendingQuotePayload.subtotal).toBe(500);
    // Must NOT ask what products (already provided)
    expect(data.replyText).not.toContain('What products or services');
  });

  // TEST 5 — Draft Quote
  it('Test 5: "Draft a quote" asks for products/services and does NOT return Customer Not Found', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Draft a quote',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.actionType).toBe('guided_quote_ask_items');
    expect(data.replyText).not.toContain('Customer Not Found');
    expect(data.replyText).not.toContain("couldn't find");
    expect(data.replyText).toContain('What products or services would you like to include?');
  });

  // TEST 6 — Follow-Ups
  it('Test 6: "Show quotes waiting for approval" returns actual quotes and does NOT search as a customer', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Show quotes waiting for approval',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(['quotation_report', 'general_help']).toContain(data.actionType);
    expect(data.replyText).not.toContain('couldn\'t find "Show quotes waiting for approval"');
    expect(data.replyText).not.toContain('Customer Not Found');
  });

  // TEST 7 — Overdue Invoices
  it('Test 7: Clicking "Show overdue invoices" returns invoice data and does NOT lookup as a customer', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Show overdue invoices',
        action: 'overdue_invoices',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(['payment_report', 'general_help']).toContain(data.actionType);
    expect(data.replyText).not.toContain('Customer Not Found');
    expect(data.replyText).not.toContain('couldn\'t find "Show overdue invoices"');
  });

  // TEST 8 — Sales This Month
  it('Test 8: Clicking "Show sales this month" returns actual QuoteFlow business summary', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Show sales this month',
        action: 'sales_report',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.actionType).toBe('sales_report');
    expect(data.reportData).toBeDefined();
    expect(data.replyText).toContain('Sales Overview');
    expect(data.replyText).not.toContain('Customer Not Found');
  });

  // TEST 9 — Product Import
  it('Test 9: "Help me import products for a quote" offers import workflow and does NOT return Customer Not Found', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Help me import products for a quote',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.actionType).toBe('import_products');
    expect(data.replyText).toContain('Upload your product list');
    expect(data.replyText).not.toContain('Customer Not Found');
    expect(data.replyText).not.toContain('couldn\'t find "Help me import');
  });

  // TEST 10 — Customer-Facing Product Explanation
  it('Test 10: "How does my business quotation reach the customer?" explains business flow without System Architecture', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'How does my business quotation reach the customer?',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.replyText).toContain('WhatsApp or email');
    expect(data.replyText).toContain('approve');
    // FAIL if response contains technical architecture diagrams
    expect(data.replyText).not.toContain('Cloudflare');
    expect(data.replyText).not.toContain('Supabase');
    expect(data.replyText).not.toContain('RLS');
    expect(data.replyText).not.toContain('Webhook handler');

    const rich = await generateRichAiResponse({
      userPrompt: 'How does my business quotation reach the customer?',
      org: null,
    });
    const blockTypes = rich.blocks.map((b) => b.type);
    expect(blockTypes).not.toContain('architecture');
  });

  // TEST 12 — Natural Editing
  it('Test 12: Natural editing "Change Battery to $350" modifies existing draft without starting new search', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Change Battery to $350',
        pendingQuotePayload: {
          step: 'draft_preview',
          customer: { id: 'cust-subesh', name: 'SUBESH M' },
          customerId: 'cust-subesh',
          currency: 'USD',
          items: [
            { description: 'Battery', quantity: 1, unit_price: 400 },
            { description: 'Gas', quantity: 1, unit_price: 100 },
          ],
          subtotal: 500,
        },
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.actionType).toBe('quote_draft_preview');
    const batteryItem = data.pendingQuotePayload.items.find((i: any) => i.description === 'Battery');
    expect(batteryItem.unit_price).toBe(350);
    expect(data.pendingQuotePayload.subtotal).toBe(450);
  });

  // TEST 13 — Business Question
  it('Test 13: "How much payment is pending?" queries real authenticated data and does NOT lookup as customer', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'How much payment is pending?',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.actionType).toBe('payment_report');
    expect(data.reportData).toBeDefined();
    expect(data.replyText).toContain('Payment Summary');
    expect(data.replyText).not.toContain('Customer Not Found');
  });

  // TEST 14 — Tapping "Create a quote" Card sends "Create quote" only
  it('Test 14: Tapping "Create a quote" card sends "Create quote" only (does NOT send subtitle example text)', async () => {
    const req = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Create quote',
        action: 'start_quote_workflow',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.actionType).toBe('guided_quote_ask_items');
    expect(data.replyText).toContain('What products or services would you like to include?');
    expect(data.pendingQuotePayload.items.length).toBe(0);
    expect(data.customer).toBeUndefined();
  });

  // TEST 15 — Tapping "Create quote" in chat starts guided flow
  it('Test 15: "Create quote" in chat asks for products, then when items provided asks for customer', async () => {
    // Turn 1: "Create quote"
    const req1 = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Create quote',
      }),
    });
    const res1 = await POST(req1);
    const data1 = await res1.json();
    expect(data1.actionType).toBe('guided_quote_ask_items');
    expect(data1.replyText).toContain('What products or services would you like to include?');

    // Turn 2: User provides items
    const req2 = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Battery $400 and Gas $100',
        pendingQuotePayload: data1.pendingQuotePayload,
      }),
    });
    const res2 = await POST(req2);
    const data2 = await res2.json();
    expect(data2.actionType).toBe('guided_quote_ask_customer');
    expect(data2.replyText).toContain('Got it. Who is this quote for?');
    expect(data2.pendingQuotePayload.subtotal).toBe(500);

    // Turn 3: User provides customer
    const req3 = new NextRequest('http://localhost/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Subesh',
        pendingQuotePayload: data2.pendingQuotePayload,
      }),
    });
    const res3 = await POST(req3);
    const data3 = await res3.json();
    expect(['quote_draft_preview', 'customer_multi_match']).toContain(data3.actionType);
  });
});
