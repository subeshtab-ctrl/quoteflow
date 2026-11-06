import { describe, it, expect } from 'vitest';
import { store } from '@/lib/supabase/data-store';
import { getQuotationTargetTimestamp } from '@/components/public-quote/quotation-countdown-widget';

describe('In-Progress Timeline (Without Days, Today 0d, Countdown) and Done Option', () => {
  const orgId = 'test-org-done';

  it('allows setting in-progress without days (estimated_days = null)', async () => {
    const customer = await store.createCustomer({
      organization_id: orgId,
      name: 'Acme Corp',
      email: 'acme@example.com',
    });

    const quotation = await store.createQuotation({
      organization_id: orgId,
      customer_id: customer.id,
      quotation_number: 'Q-WITHOUT-DAYS',
      title: 'Open Timeline Service',
      issue_date: '2026-10-24',
      valid_until: '2026-11-24',
      currency: 'USD',
      items: [
        {
          description: 'Consulting Service',
          quantity: 1,
          unit: 'service',
          unit_price: 500,
          discount_type: 'PERCENTAGE',
          discount_value: 0,
          tax_rate: 0,
        },
      ],
    });

    // Mark in progress with estimatedDays: null (Without Days)
    const inProgress = await store.markQuotationInProgress(quotation.id, orgId, 'Admin', {
      estimatedDays: null as any,
      notes: 'Work started without fixed deadline',
    });

    expect(inProgress.status).toBe('IN_PROGRESS');
    expect(inProgress.estimated_days).toBeNull();
    expect(inProgress.estimated_completion_date).toBeNull();
    expect(inProgress.estimated_time_text).toBe('Work started without fixed deadline');

    // getQuotationTargetTimestamp returns null for open timeline
    const target = getQuotationTargetTimestamp(inProgress);
    expect(target).toBeNull();
  });

  it('allows setting in-progress for Today (0 days) with target time and generates countdown target', async () => {
    const customer = await store.createCustomer({
      organization_id: orgId,
      name: 'Same Day Client',
      email: 'sameday@example.com',
    });

    const quotation = await store.createQuotation({
      organization_id: orgId,
      customer_id: customer.id,
      quotation_number: 'Q-TODAY-0D',
      title: 'Same Day Delivery',
      issue_date: '2026-10-24',
      valid_until: '2026-11-24',
      currency: 'USD',
      items: [
        {
          description: 'Rush Delivery',
          quantity: 1,
          unit: 'unit',
          unit_price: 350,
          discount_type: 'PERCENTAGE',
          discount_value: 0,
          tax_rate: 0,
        },
      ],
    });

    const now = new Date();
    const targetIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 30, 0).toISOString();

    const inProgress = await store.markQuotationInProgress(quotation.id, orgId, 'Admin', {
      estimatedDays: 0,
      estimatedCompletionDate: targetIso,
      notes: 'Rush print - Today by 17:30',
    });

    expect(inProgress.status).toBe('IN_PROGRESS');
    expect(inProgress.estimated_days).toBe(0);
    expect(inProgress.estimated_completion_date).toBe(targetIso);

    // Target timestamp correctly calculates today's target time
    const target = getQuotationTargetTimestamp(inProgress);
    expect(target).not.toBeNull();
    expect(target).toBe(new Date(targetIso).getTime());
  });

  it('allows marking work as Done (COMPLETED) when quotation is unpaid', async () => {
    const customer = await store.createCustomer({
      organization_id: orgId,
      name: 'Unpaid Customer',
      email: 'unpaid@example.com',
    });

    const quotation = await store.createQuotation({
      organization_id: orgId,
      customer_id: customer.id,
      quotation_number: 'Q-DONE-UNPAID',
      title: 'Design Project',
      issue_date: '2026-10-24',
      valid_until: '2026-11-24',
      currency: 'USD',
      items: [
        {
          description: 'UI Design Package',
          quantity: 1,
          unit: 'package',
          unit_price: 1200,
          discount_type: 'PERCENTAGE',
          discount_value: 0,
          tax_rate: 0,
        },
      ],
    });

    // Mark as In Progress first
    await store.markQuotationInProgress(quotation.id, orgId, 'Admin', {
      estimatedDays: 3,
    });

    // Mark as Done (COMPLETED, unpaid: true)
    const completed = await store.markQuotationCompleted(quotation.id, orgId, 'Admin', {
      unpaid: true,
      reason: 'Work completed by team, awaiting customer payment',
    });

    expect(completed.status).toBe('COMPLETED');
    expect(completed.completed_unpaid).toBe(true);
    expect(completed.is_paid).toBe(false);
    expect(completed.completed_at).toBeTruthy();
  });
});
