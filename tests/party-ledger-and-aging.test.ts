import { describe, it, expect } from 'vitest';
import { calculateCustomerLedger } from '@/lib/reports/party-ledger-calculator';
import { Customer, Invoice, Organization } from '@/types/database';

describe('Party Ledger & Overdue Aging Calculator', () => {
  const mockCustomer: Customer = {
    id: 'cust-123',
    organization_id: 'org-1',
    name: 'Anand Kumar',
    company_name: 'AK Enterprises',
    email: 'anand@akenterprises.in',
    phone: '+91 98470 12345',
    customer_gstin: '32AABCA1234A1Z5',
    billing_address: 'Main Road, MG Road',
    city: 'Kochi',
    state: 'Kerala',
    country: 'India',
    postal_code: '682001',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const mockOrg: Organization = {
    id: 'org-1',
    name: 'QuoteFlow Kerala Hub',
    slug: 'quoteflow-kerala',
    email: 'info@quoteflow.in',
    phone: '+91 484 2345678',
    country: 'India',
    default_currency: 'INR',
    default_tax_rate: 18,
    default_validity_days: 30,
    quotation_prefix: 'Q-',
    quotation_start_number: 1,
    current_quotation_counter: 1,
  };

  it('calculates running ledger entries with correct debits, credits, and balance due', () => {
    const invoices: Invoice[] = [
      {
        id: 'inv-1',
        organization_id: 'org-1',
        customer_id: 'cust-123',
        invoice_number: 'INV-1001',
        document_type: 'tax_invoice',
        status: 'ISSUED',
        issue_date: '2026-02-01T00:00:00Z',
        due_date: '2026-03-01T00:00:00Z',
        currency: 'INR',
        subtotal: 10000,
        tax_rate: 18,
        tax_amount: 1800,
        grand_total: 11800,
        paid_amount: 5000,
        balance_amount: 6800,
        is_paid: false,
        created_at: '2026-02-01T00:00:00Z',
      },
      {
        id: 'inv-2',
        organization_id: 'org-1',
        customer_id: 'cust-123',
        invoice_number: 'INV-1002',
        document_type: 'tax_invoice',
        status: 'PAID',
        issue_date: '2026-03-01T00:00:00Z',
        due_date: '2026-03-15T00:00:00Z',
        currency: 'INR',
        subtotal: 5000,
        tax_rate: 18,
        tax_amount: 900,
        grand_total: 5900,
        paid_amount: 5900,
        balance_amount: 0,
        is_paid: true,
        paid_at: '2026-03-10T00:00:00Z',
        created_at: '2026-03-01T00:00:00Z',
      },
    ];

    const statement = calculateCustomerLedger({
      customer: mockCustomer,
      organization: mockOrg,
      invoices,
    });

    expect(statement.customerName).toBe('Anand Kumar');
    expect(statement.companyName).toBe('AK Enterprises');
    expect(statement.totalInvoiced).toBe(17700); // 11800 + 5900
    expect(statement.totalPaid).toBe(10900); // 5000 + 5900
    expect(statement.netBalanceDue).toBe(6800);
    expect(statement.entries.length).toBeGreaterThanOrEqual(2);
  });

  it('correctly categorizes overdue invoices into aging buckets', () => {
    // Current date assumed to be April 2026 or later
    const invoices: Invoice[] = [
      {
        id: 'inv-fresh',
        organization_id: 'org-1',
        customer_id: 'cust-123',
        invoice_number: 'INV-FRESH',
        document_type: 'tax_invoice',
        status: 'ISSUED',
        issue_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 10 * 86400000).toISOString(), // 10 days in future (not overdue)
        currency: 'INR',
        subtotal: 1000,
        tax_rate: 0,
        tax_amount: 0,
        grand_total: 1000,
        paid_amount: 0,
        balance_amount: 1000,
        is_paid: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 'inv-old',
        organization_id: 'org-1',
        customer_id: 'cust-123',
        invoice_number: 'INV-OLD',
        document_type: 'tax_invoice',
        status: 'ISSUED',
        issue_date: '2025-01-01T00:00:00Z',
        due_date: '2025-02-01T00:00:00Z', // > 90 days overdue
        currency: 'INR',
        subtotal: 5000,
        tax_rate: 0,
        tax_amount: 0,
        grand_total: 5000,
        paid_amount: 0,
        balance_amount: 5000,
        is_paid: false,
        created_at: '2025-01-01T00:00:00Z',
      },
    ];

    const statement = calculateCustomerLedger({
      customer: mockCustomer,
      organization: mockOrg,
      invoices,
    });

    expect(statement.aging.current).toBe(1000);
    expect(statement.aging.days90plus).toBe(5000);
    expect(statement.aging.totalOverdue).toBe(5000);
  });
});
