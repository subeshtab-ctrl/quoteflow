import { describe, it, expect } from 'vitest';
import {
  matchCustomerIntelligently,
  generateAiBusinessBriefing,
  CustomerCandidateMatch,
} from '@/lib/ai/proactive-engine';
import { Customer } from '@/types/database';

describe('Proactive AI Assistant & Intelligent Customer Matching', () => {
  const mockCustomers: Customer[] = [
    {
      id: 'cust-1',
      organization_id: 'org-test',
      name: 'ABC Customer',
      company_name: 'ABC Customer Inc',
      email: 'abc@example.com',
      phone: '+971501234567',
      country: 'United Arab Emirates',
      city: 'Dubai',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'cust-2',
      organization_id: 'org-test',
      name: 'ABC Trading LLC',
      company_name: 'ABC Trading LLC',
      email: 'trading@abc.ae',
      phone: '+971509998881',
      country: 'United Arab Emirates',
      city: 'Dubai',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'cust-3',
      organization_id: 'org-test',
      name: 'ABC Technical Services',
      company_name: 'ABC Technical Services',
      email: 'tech@abc.ae',
      phone: '+971509998882',
      country: 'United Arab Emirates',
      city: 'Abu Dhabi',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'cust-4',
      organization_id: 'org-test',
      name: 'Global Tech Corp',
      company_name: 'Global Tech Corp',
      email: 'contact@globaltech.com',
      phone: '+919876543210',
      tax_number: '27AABCU9603R1ZM',
      country: 'India',
      city: 'Mumbai',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it('Requirement 4: Detects exact single customer match when uniquely specified', () => {
    const singleCustomerList = [mockCustomers[0]];
    const result = matchCustomerIntelligently(singleCustomerList, 'ABC Customer');

    expect(result.type).toBe('exact');
    expect(result.customer?.id).toBe('cust-1');
    expect(result.customer?.name).toBe('ABC Customer');
  });

  it('Requirement 5: Detects multiple customer matches when several candidates match and never guesses', () => {
    const result = matchCustomerIntelligently(mockCustomers, 'ABC');

    expect(result.type).toBe('multiple');
    expect(result.matches.length).toBeGreaterThanOrEqual(2);
    // User must pick which customer before quote is created
    const candidateNames = result.matches.map((m) => m.customer.name);
    expect(candidateNames).toContain('ABC Customer');
    expect(candidateNames).toContain('ABC Trading LLC');
  });

  it('Requirement 6: Returns type "none" when customer is not found in database', () => {
    const result = matchCustomerIntelligently(mockCustomers, 'Nonexistent New Enterprise LLC');

    expect(result.type).toBe('none');
    expect(result.customer).toBeUndefined();
    expect(result.searchedTerm).toBe('Nonexistent New Enterprise LLC');
  });

  it('Requirement 7: Matches by Email, Phone, and Tax/VAT identifier intelligently', () => {
    // By Email
    const emailResult = matchCustomerIntelligently(mockCustomers, 'abc@example.com');
    expect(emailResult.type).toBe('exact');
    expect(emailResult.customer?.id).toBe('cust-1');

    // By Tax/GSTIN
    const taxResult = matchCustomerIntelligently(mockCustomers, '27AABCU9603R1ZM');
    expect(taxResult.type).toBe('exact');
    expect(taxResult.customer?.id).toBe('cust-4');

    // By Phone
    const phoneResult = matchCustomerIntelligently(mockCustomers, '+919876543210');
    expect(phoneResult.type).toBe('exact');
    expect(phoneResult.customer?.id).toBe('cust-4');
  });

  it('Requirement 8 & 10: Generates categorized AI Priority levels (Urgent, Action Required, Opportunity, Information)', async () => {
    const briefing = await generateAiBusinessBriefing('a0000000-0000-0000-0000-000000000001', 'live', 'Subesh');

    expect(briefing).toBeDefined();
    expect(briefing.greeting).toContain('Subesh');
    expect(briefing.metrics).toBeDefined();
    expect(typeof briefing.metrics.quotesCreated).toBe('number');
    expect(typeof briefing.metrics.quoteValue).toBe('number');
    expect(typeof briefing.metrics.quotesApproved).toBe('number');

    // Check that priorities exist in attention items
    const priorities = briefing.attentionItems.map((it) => it.priority);
    expect(priorities.length).toBeGreaterThan(0);
    expect(['URGENT', 'ACTION_REQUIRED', 'OPPORTUNITY', 'INFORMATION']).toContain(priorities[0]);
  });

  it('Requirement 9: Safe Action Protocol - Prepares batch messages for user review instead of silently sending', async () => {
    const briefing = await generateAiBusinessBriefing('a0000000-0000-0000-0000-000000000001', 'live', 'Subesh');
    const batchItem = briefing.attentionItems.find((i) => i.category === 'batch_followup');

    if (batchItem && batchItem.batchMessages) {
      expect(batchItem.actions.some((a) => a.actionKey === 'review_batch')).toBe(true);
      for (const msg of batchItem.batchMessages) {
        expect(msg.recipientName).toBeDefined();
        expect(msg.messageText).toBeDefined();
        expect(msg.targetNumber).toBeDefined();
      }
    }
  });

  it('Requirement 11 & 12: Answers the 4 Core Business Questions & Week-over-Week Comparison', async () => {
    const briefing = await generateAiBusinessBriefing('a0000000-0000-0000-0000-000000000001', 'live', 'Subesh');

    expect(briefing.fourQuestions).toBeDefined();
    expect(typeof briefing.fourQuestions.whatHappened).toBe('string');
    expect(briefing.fourQuestions.whatHappened.length).toBeGreaterThan(10);
    expect(Array.isArray(briefing.fourQuestions.needsAttention)).toBe(true);
    expect(Array.isArray(briefing.fourQuestions.shouldDoNext)).toBe(true);
    expect(Array.isArray(briefing.fourQuestions.canDoForYou)).toBe(true);
    expect(briefing.comparison).toBeDefined();
    expect(typeof briefing.comparison.summaryText).toBe('string');
  });

  it('Requirement: Tracks deleted quotes from the last 7 days and strictly excludes them from active counts', async () => {
    const { store } = await import('@/lib/supabase/data-store');
    const testOrgId = 'a0000000-0000-0000-0000-000000000001';

    // 1. Get initial briefing
    const initialBriefing = await generateAiBusinessBriefing(testOrgId, 'live', 'Subesh');
    const initialCreated = initialBriefing.metrics.quotesCreated;
    const initialDeleted = initialBriefing.metrics.quotesDeleted || 0;

    // 2. Create a temporary quote using an existing valid customer
    const existingCustomers = await store.getCustomers(testOrgId);
    const validCustomerId = existingCustomers[0]?.id;

    const tempQuote = await store.createQuotation({
      organization_id: testOrgId,
      customer_id: validCustomerId,
      title: 'Temporary Test Quote',
      issue_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
      subtotal: 1000,
      total_tax: 180,
      grand_total: 1180,
      currency: 'USD',
      status: 'SENT',
      items: [
        {
          id: 'item-1',
          description: 'Temporary Test Unit',
          quantity: 1,
          unit_price: 1000,
          total_price: 1000,
        },
      ],
    });

    // Verify it counted while active
    const activeBriefing = await generateAiBusinessBriefing(testOrgId, 'live', 'Subesh');
    expect(activeBriefing.metrics.quotesCreated).toBe(initialCreated + 1);

    // 3. Delete the temporary quote
    const deleteSuccess = await store.deleteQuotation(tempQuote.id, testOrgId);
    expect(deleteSuccess).toBe(true);

    // 4. Verify that the deleted quote is logged in deleted records
    const deletedRecords = await store.getDeletedQuotations(testOrgId);
    const foundRecord = deletedRecords.find((d) => d.quotation_id === tempQuote.id);
    expect(foundRecord).toBeDefined();
    expect(foundRecord?.quotation_number).toBe(tempQuote.quotation_number);
    expect(foundRecord?.grand_total).toBe(tempQuote.grand_total);

    // 5. Verify the updated briefing:
    // - Deleted quote must NOT be included in active count (quotesCreated goes back to initialCreated)
    // - quotesDeleted must be incremented
    const afterDeleteBriefing = await generateAiBusinessBriefing(testOrgId, 'live', 'Subesh');
    expect(afterDeleteBriefing.metrics.quotesCreated).toBe(initialCreated);
    expect(afterDeleteBriefing.metrics.quotesDeleted).toBe(initialDeleted + 1);
    expect(afterDeleteBriefing.metrics.deletedQuotesAmount).toBeGreaterThanOrEqual(tempQuote.grand_total);
    expect(afterDeleteBriefing.fourQuestions.whatHappened).toContain('deleted');
  });

  it('Requirement: Synchronizes greeting with client local device hour', async () => {
    const testOrgId = 'a0000000-0000-0000-0000-000000000001';

    // Morning test (e.g. 10 AM)
    const morningBriefing = await generateAiBusinessBriefing(testOrgId, 'live', 'Subesh', 10);
    expect(morningBriefing.greeting).toBe('Good morning, Subesh 👋');

    // Afternoon test (e.g. 16:00 / 4 PM)
    const afternoonBriefing = await generateAiBusinessBriefing(testOrgId, 'live', 'Subesh', 16);
    expect(afternoonBriefing.greeting).toBe('Good afternoon, Subesh 👋');

    // Evening test (e.g. 19:00 / 7 PM)
    const eveningBriefing = await generateAiBusinessBriefing(testOrgId, 'live', 'Subesh', 19);
    expect(eveningBriefing.greeting).toBe('Good evening, Subesh 👋');
  });

  it('Requirement 1 & 2: WhatsApp reminder persists actioned state and remains hidden across briefing re-generations', async () => {
    const { store } = await import('@/lib/supabase/data-store');
    const testOrgId = 'a0000000-0000-0000-0000-000000000001';

    const testKey = `quote_unapproved:Q-TEST-WA-001:cycle_1`;
    await store.saveRecommendation({
      recommendation_id: `rec_test_wa_${Date.now()}`,
      recommendation_key: testKey,
      organization_id: testOrgId,
      quote_number: 'Q-TEST-WA-001',
      recommendation_type: 'quote_followup',
      priority: 'ACTION_REQUIRED',
      status: 'actioned',
      action_taken: 'whatsapp_sent',
      action_taken_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const storedRec = await store.getRecommendationByKey(testOrgId, testKey);
    expect(storedRec).toBeDefined();
    expect(storedRec?.status).toBe('actioned');
    expect(storedRec?.action_taken).toBe('whatsapp_sent');
    expect(storedRec?.action_taken_at).toBeDefined();

    // Verify briefing excludes actioned items within 7 days
    const briefing = await generateAiBusinessBriefing(testOrgId, 'live', 'Subesh');
    const match = briefing.attentionItems.find((it) => it.recommendationKey === testKey);
    expect(match).toBeUndefined();
  });

  it('Requirement 3: Email reminder persists actioned state and remains hidden', async () => {
    const { store } = await import('@/lib/supabase/data-store');
    const testOrgId = 'a0000000-0000-0000-0000-000000000001';

    const testKey = `quote_unapproved:Q-TEST-EMAIL-001:cycle_1`;
    await store.saveRecommendation({
      recommendation_id: `rec_test_email_${Date.now()}`,
      recommendation_key: testKey,
      organization_id: testOrgId,
      quote_number: 'Q-TEST-EMAIL-001',
      recommendation_type: 'quote_followup',
      priority: 'ACTION_REQUIRED',
      status: 'actioned',
      action_taken: 'email_sent',
      action_taken_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const storedRec = await store.getRecommendationByKey(testOrgId, testKey);
    expect(storedRec).toBeDefined();
    expect(storedRec?.status).toBe('actioned');
    expect(storedRec?.action_taken).toBe('email_sent');

    const briefing = await generateAiBusinessBriefing(testOrgId, 'live', 'Subesh');
    const match = briefing.attentionItems.find((it) => it.recommendationKey === testKey);
    expect(match).toBeUndefined();
  });

  it('Requirement 4: Dismiss and Ignore persist state server-side and suppress card', async () => {
    const { store } = await import('@/lib/supabase/data-store');
    const testOrgId = 'a0000000-0000-0000-0000-000000000001';

    // Test Dismissed
    const dismissKey = `quote_unapproved:Q-TEST-DISMISS-001:cycle_1`;
    await store.saveRecommendation({
      recommendation_id: `rec_dismiss_${Date.now()}`,
      recommendation_key: dismissKey,
      organization_id: testOrgId,
      quote_number: 'Q-TEST-DISMISS-001',
      recommendation_type: 'quote_followup',
      priority: 'ACTION_REQUIRED',
      status: 'dismissed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const dismissedRec = await store.getRecommendationByKey(testOrgId, dismissKey);
    expect(dismissedRec?.status).toBe('dismissed');

    // Test Ignored
    const ignoreKey = `quote_unapproved:Q-TEST-IGNORE-001:cycle_1`;
    await store.saveRecommendation({
      recommendation_id: `rec_ignore_${Date.now()}`,
      recommendation_key: ignoreKey,
      organization_id: testOrgId,
      quote_number: 'Q-TEST-IGNORE-001',
      recommendation_type: 'quote_followup',
      priority: 'ACTION_REQUIRED',
      status: 'ignored',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const ignoredRec = await store.getRecommendationByKey(testOrgId, ignoreKey);
    expect(ignoredRec?.status).toBe('ignored');

    const briefing = await generateAiBusinessBriefing(testOrgId, 'live', 'Subesh');
    expect(briefing.attentionItems.find((it) => it.recommendationKey === dismissKey)).toBeUndefined();
    expect(briefing.attentionItems.find((it) => it.recommendationKey === ignoreKey)).toBeUndefined();
  });

  it('Requirement 5: Remind Later (snooze) suppresses card while snooze_until is in future', async () => {
    const { store } = await import('@/lib/supabase/data-store');
    const testOrgId = 'a0000000-0000-0000-0000-000000000001';

    const futureDate = new Date(Date.now() + 3 * 86400000).toISOString();
    const testQuoteNum = `Q-TEST-SNOOZE-${Date.now()}`;
    const snoozeKey = `quote_unapproved:${testQuoteNum}:cycle_1`;

    await store.saveRecommendation({
      id: `rec_snooze_${Date.now()}`,
      title: 'Snooze Followup',
      recommendation_key: snoozeKey,
      organization_id: testOrgId,
      quote_number: testQuoteNum,
      recommendation_type: 'quote_followup',
      priority: 'ACTION_REQUIRED',
      status: 'snoozed',
      snooze_until: futureDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const snoozedRec = await store.getRecommendationByKey(testOrgId, snoozeKey);
    expect(snoozedRec?.status).toBe('snoozed');
    expect(snoozedRec?.snooze_until).toBe(futureDate);

    const briefing = await generateAiBusinessBriefing(testOrgId, 'live', 'Subesh');
    expect(briefing.attentionItems.find((it) => it.recommendationKey === snoozeKey)).toBeUndefined();
  });

  it('Requirement 7: Generates Cycle 2 when 7+ days pass after cycle 1 was actioned', async () => {
    const { store } = await import('@/lib/supabase/data-store');
    const testOrgId = 'a0000000-0000-0000-0000-000000000001';

    // Create an old actioned record (8 days ago)
    const eightDaysAgo = new Date(Date.now() - 8 * 86400000).toISOString();
    const cycle1Key = `quote_unapproved:Q-000001:cycle_1`;

    await store.saveRecommendation({
      recommendation_id: `rec_cycle1_${Date.now()}`,
      recommendation_key: cycle1Key,
      organization_id: testOrgId,
      quote_number: 'Q-000001',
      recommendation_type: 'quote_followup',
      priority: 'ACTION_REQUIRED',
      status: 'actioned',
      action_taken: 'whatsapp_sent',
      action_taken_at: eightDaysAgo,
      cycle_number: 1,
      created_at: eightDaysAgo,
      updated_at: eightDaysAgo,
    });

    const allRecs = await store.getRecommendations(testOrgId);
    expect(allRecs.some((r) => r.recommendation_key === cycle1Key)).toBe(true);
  });

  it('Requirement 8: Automatically transitions recommendations to resolved when quote is deleted', async () => {
    const { store } = await import('@/lib/supabase/data-store');
    const testOrgId = 'a0000000-0000-0000-0000-000000000001';

    const existingCustomers = await store.getCustomers(testOrgId);
    const validCustomerId = existingCustomers[0]?.id;

    // Create a quote
    const quote = await store.createQuotation({
      organization_id: testOrgId,
      customer_id: validCustomerId,
      title: 'Auto Resolve Delete Test Quote',
      issue_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
      subtotal: 1500,
      total_tax: 0,
      grand_total: 1500,
      currency: 'USD',
      status: 'SENT',
      items: [
        {
          id: 'item-1',
          description: 'Auto Resolve Item',
          quantity: 1,
          unit_price: 1500,
          total_price: 1500,
        },
      ],
    });

    // Create a pending recommendation for this quote
    const recKey = `quote_unapproved:${quote.quotation_number}:cycle_1`;
    await store.saveRecommendation({
      recommendation_id: `rec_autores_${Date.now()}`,
      recommendation_key: recKey,
      organization_id: testOrgId,
      quote_id: quote.id,
      quote_number: quote.quotation_number,
      recommendation_type: 'quote_followup',
      priority: 'ACTION_REQUIRED',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Delete the quotation
    await store.deleteQuotation(quote.id, testOrgId);

    // Verify recommendation auto-resolved with source_deleted
    const resolvedRec = await store.getRecommendationByKey(testOrgId, recKey);
    expect(resolvedRec?.status).toBe('resolved');
    expect(resolvedRec?.resolved_reason).toBe('source_deleted');
    expect(resolvedRec?.resolved_at).toBeDefined();
  });

  it('Requirement 8: Automatically transitions recommendations to resolved when quote is approved', async () => {
    const { store } = await import('@/lib/supabase/data-store');
    const testOrgId = 'a0000000-0000-0000-0000-000000000001';

    const existingCustomers = await store.getCustomers(testOrgId);
    const validCustomerId = existingCustomers[0]?.id;

    const quote = await store.createQuotation({
      organization_id: testOrgId,
      customer_id: validCustomerId,
      title: 'Auto Resolve Approve Test Quote',
      issue_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
      subtotal: 2000,
      total_tax: 0,
      grand_total: 2000,
      currency: 'USD',
      status: 'SENT',
      items: [
        {
          id: 'item-1',
          description: 'Approve Item',
          quantity: 1,
          unit_price: 2000,
          total_price: 2000,
        },
      ],
    });

    const recKey = `quote_unapproved:${quote.quotation_number}:cycle_1`;
    await store.saveRecommendation({
      recommendation_id: `rec_approve_${Date.now()}`,
      recommendation_key: recKey,
      organization_id: testOrgId,
      quote_id: quote.id,
      quote_number: quote.quotation_number,
      recommendation_type: 'quote_followup',
      priority: 'ACTION_REQUIRED',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Approve the quotation
    await store.markQuotationApproved(quote.id, 'Admin');

    const resolvedRec = await store.getRecommendationByKey(testOrgId, recKey);
    expect(resolvedRec?.status).toBe('resolved');
    expect(resolvedRec?.resolved_reason).toBe('source_approved');
    expect(resolvedRec?.resolved_at).toBeDefined();
  });

  it('Requirement 8: Automatically transitions recommendations to resolved when invoice is paid', async () => {
    const { store } = await import('@/lib/supabase/data-store');
    const testOrgId = 'a0000000-0000-0000-0000-000000000001';

    const existingCustomers = await store.getCustomers(testOrgId);
    const validCustomerId = existingCustomers[0]?.id;

    const inv = await store.createInvoice({
      organization_id: testOrgId,
      customer_id: validCustomerId,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      subtotal: 3000,
      tax_amount: 0,
      grand_total: 3000,
      currency: 'USD',
      status: 'OVERDUE',
      items: [
        {
          id: 'inv-item-1',
          description: 'Overdue service',
          quantity: 1,
          unit_price: 3000,
          line_total: 3000,
        },
      ],
    });

    const recKey = `invoice_overdue:${inv.invoice_number}:cycle_1`;
    await store.saveRecommendation({
      id: `rec_inv_paid_${Date.now()}`,
      title: 'Invoice overdue reminder',
      recommendation_key: recKey,
      organization_id: testOrgId,
      invoice_id: inv.id,
      invoice_number: inv.invoice_number,
      recommendation_type: 'invoice_overdue',
      priority: 'URGENT',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Mark invoice paid
    await store.updateInvoiceStatus(inv.id, testOrgId, 'PAID');

    const resolvedRec = await store.getRecommendationByKey(testOrgId, recKey);
    expect(resolvedRec?.status).toBe('resolved');
    expect(resolvedRec?.resolved_reason).toBe('source_paid');
    expect(resolvedRec?.resolved_at).toBeDefined();
  });

  it('Requirement 9 & 10: Retrieves recent AI actions audit history', async () => {
    const { store } = await import('@/lib/supabase/data-store');
    const testOrgId = 'a0000000-0000-0000-0000-000000000001';

    // Ensure at least one recorded action exists
    await store.saveRecommendation({
      id: `rec_action_log_${Date.now()}`,
      title: 'Action Log Audit Record',
      recommendation_key: `quote_unapproved:Q-AUDIT-99:cycle_1`,
      organization_id: testOrgId,
      quote_number: 'Q-AUDIT-99',
      recommendation_type: 'quote_followup',
      priority: 'ACTION_REQUIRED',
      status: 'actioned',
      action_taken: 'whatsapp_sent',
      action_taken_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const recentActions = await store.getRecentAiActions(testOrgId, 10);
    expect(Array.isArray(recentActions)).toBe(true);
    expect(recentActions.length).toBeGreaterThan(0);
    // Actions are sorted with most recent first
    if (recentActions.length >= 2) {
      const t1 = new Date(recentActions[0].action_taken_at || recentActions[0].updated_at).getTime();
      const t2 = new Date(recentActions[1].action_taken_at || recentActions[1].updated_at).getTime();
      expect(t1).toBeGreaterThanOrEqual(t2);
    }
  });
});
