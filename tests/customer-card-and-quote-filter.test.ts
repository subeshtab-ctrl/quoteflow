import { describe, it, expect, beforeEach } from 'vitest';
import { store, DEFAULT_ORG_ID } from '@/lib/supabase/data-store';
import { checkQuotationInProgressOverdue } from '../lib/quotations/timeline';
import { StatusBadge } from '@/components/ui/badge';

describe('Customer Card UI & Strict Customer ID Quotation Filtering', () => {
  let customerAId: string;
  let customerBId: string;

  beforeEach(async () => {
    // 1. Create Two Customers with Similar Overlapping Names: "SHERIN" and "SHERIN BAHRAIN"
    const custA = await store.createCustomer({
      organization_id: DEFAULT_ORG_ID,
      name: 'SHERIN ' + Date.now(),
      company_name: 'Lucky Star Bahrain',
      email: `sherin1_${Date.now()}@client.local`,
      phone: '97311223344',
      phone_country_code: '+973',
    } as any);
    customerAId = custA.id;

    const custB = await store.createCustomer({
      organization_id: DEFAULT_ORG_ID,
      name: `${custA.name} BAHRAIN`,
      company_name: 'Pozone Bahrain',
      email: `sherin2_${Date.now()}@client.local`,
      phone: '97312345678',
      phone_country_code: '+973',
    } as any);
    customerBId = custB.id;

    // 2. Create Quotations for Customer A
    await store.createQuotation({
      organization_id: DEFAULT_ORG_ID,
      customer_id: customerAId,
      title: 'Quotation for Sherin Only',
      issue_date: '2026-10-26',
      valid_until: '2026-11-26',
      currency: 'INR',
      items: [
        {
          description: 'Web Design',
          quantity: 1,
          unit: 'pcs',
          unit_price: 10000,
          discount_type: 'PERCENTAGE',
          discount_value: 0,
          tax_rate: 18,
        },
      ],
    } as any);

    // 3. Create Quotations for Customer B
    await store.createQuotation({
      organization_id: DEFAULT_ORG_ID,
      customer_id: customerBId,
      title: 'Quotation for Sherin Bahrain Only',
      issue_date: '2026-10-26',
      valid_until: '2026-11-26',
      currency: 'INR',
      items: [
        {
          description: 'E-commerce System',
          quantity: 1,
          unit: 'pcs',
          unit_price: 25000,
          discount_type: 'PERCENTAGE',
          discount_value: 0,
          tax_rate: 18,
        },
      ],
    } as any);
  });

  it('demonstrates that search query on customer name text matches both overlapping customer names', async () => {
    const custA = await store.getCustomer(customerAId);
    // Searching text "SHERIN" matches both "SHERIN..." and "SHERIN... BAHRAIN"
    const searchResult = await store.getQuotations(DEFAULT_ORG_ID, { search: custA!.name });
    expect(searchResult.length).toBeGreaterThanOrEqual(2);
  });

  it('strictly isolates customer quotes when filtering by customerId without showing other customers with similar names', async () => {
    // 1. Filtering strictly by Customer A ID
    const quotesForA = await store.getQuotations(DEFAULT_ORG_ID, { customerId: customerAId });
    expect(quotesForA.length).toBe(1);
    expect(quotesForA[0].customer_id).toBe(customerAId);
    expect(quotesForA[0].title).toBe('Quotation for Sherin Only');

    // 2. Filtering strictly by Customer B ID
    const quotesForB = await store.getQuotations(DEFAULT_ORG_ID, { customerId: customerBId });
    expect(quotesForB.length).toBe(1);
    expect(quotesForB[0].customer_id).toBe(customerBId);
    expect(quotesForB[0].title).toBe('Quotation for Sherin Bahrain Only');
  });

  it('accurately calculates customer initials for creative colourful contact cards', () => {
    function getCustomerInitials(name: string, company?: string | null): string {
      const clean = (name || company || '').trim();
      if (!clean) return 'CU';

      const parts = clean.split(/[\s_-]+/).filter(Boolean);
      if (parts.length >= 2) {
        const firstLetter = parts[0][0];
        const secondLetter = parts[1][0];
        if (/[a-zA-Z]/.test(firstLetter) && /[a-zA-Z]/.test(secondLetter)) {
          return (firstLetter + secondLetter).toUpperCase();
        }
      }

      const lettersOnly = clean.replace(/[^a-zA-Z]/g, '');
      if (lettersOnly.length >= 2) {
        return lettersOnly.slice(0, 2).toUpperCase();
      }
      if (lettersOnly.length === 1) {
        return lettersOnly.toUpperCase();
      }
      return clean.slice(0, 2).toUpperCase();
    }

    expect(getCustomerInitials('TMF')).toBe('TM');
    expect(getCustomerInitials('ABC customer')).toBe('AC');
    expect(getCustomerInitials('ARSHAD')).toBe('AR');
    expect(getCustomerInitials('SHERIN')).toBe('SH');
    expect(getCustomerInitials('SHERIN BAHRAIN')).toBe('SB');
    expect(getCustomerInitials('Glass 500')).toBe('GL');
    expect(getCustomerInitials('John Doe')).toBe('JD');
  });

  it('correctly detects overdue in-progress status for business owner while shielding client portal', () => {
    // Case 1: In Progress with estimated date in past (Overdue)
    const pastQuote = {
      status: 'IN_PROGRESS',
      in_progress_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      estimated_days: 2,
      estimated_completion_date: new Date(Date.now() - 3 * 86400000).toISOString(),
    };
    const overdueResult = checkQuotationInProgressOverdue(pastQuote);
    expect(overdueResult.isOverdue).toBe(true);
    expect(overdueResult.overdueDays).toBeGreaterThanOrEqual(1);
    expect(overdueResult.overdueText).toContain('Overdue');

    // Case 2: In Progress with future timeline (Not overdue)
    const activeQuote = {
      status: 'IN_PROGRESS',
      in_progress_at: new Date().toISOString(),
      estimated_days: 7,
      estimated_completion_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    const activeResult = checkQuotationInProgressOverdue(activeQuote);
    expect(activeResult.isOverdue).toBe(false);
    expect(activeResult.overdueText).toBe('');

    // Case 3: Completed or other status (Never overdue)
    const completedQuote = {
      status: 'COMPLETED',
      estimated_completion_date: new Date(Date.now() - 10 * 86400000).toISOString(),
    };
    const completedResult = checkQuotationInProgressOverdue(completedQuote);
    expect(completedResult.isOverdue).toBe(false);
  });

  it('renders StatusBadge with amber warning color for overdue IN_PROGRESS, without any warning symbol', () => {
    // 1. Overdue IN_PROGRESS quotation
    const overdueQuote = {
      status: 'IN_PROGRESS',
      in_progress_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      estimated_days: 2,
      estimated_completion_date: new Date(Date.now() - 3 * 86400000).toISOString(),
    };

    const overdueBadge = StatusBadge({
      status: 'IN_PROGRESS',
      quotation: overdueQuote,
    });

    // Variant should be warning and classes should show amber warning palette
    expect(overdueBadge.props.variant).toBe('warning');
    expect(overdueBadge.props.className).toContain('bg-amber-100');
    expect(overdueBadge.props.className).toContain('text-amber-900');
    expect(overdueBadge.props.className).toContain('border-amber-300');

    // Children must only be the pulse dot and clean "In Progress" text (NO warning icon/symbol)
    const children = Array.isArray(overdueBadge.props.children)
      ? overdueBadge.props.children
      : [overdueBadge.props.children];
    expect(children).toHaveLength(2);
    // Pulse dot
    expect(children[0].props.className).toContain('bg-amber-500');
    expect(children[0].props.className).toContain('animate-pulse');
    // Text is strictly clean "In Progress"
    expect(children[1]).toBe('In Progress');

    // 2. Normal non-overdue IN_PROGRESS quotation
    const normalQuote = {
      status: 'IN_PROGRESS',
      in_progress_at: new Date().toISOString(),
      estimated_days: 5,
    };

    const normalBadge = StatusBadge({
      status: 'IN_PROGRESS',
      quotation: normalQuote,
    });

    expect(normalBadge.props.variant).toBe('cyan');
    expect(normalBadge.props.className).toContain('bg-sky-100');
    expect(normalBadge.props.className).toContain('text-sky-900');

    // 3. Client portal (hideWarning: true) shields overdue warning color
    const clientBadge = StatusBadge({
      status: 'IN_PROGRESS',
      quotation: overdueQuote,
      hideWarning: true,
    });

    expect(clientBadge.props.variant).toBe('cyan');
    expect(clientBadge.props.className).toContain('bg-sky-100');
    expect(clientBadge.props.className).toContain('text-sky-900');
  });
});
