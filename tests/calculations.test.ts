import { describe, it, expect } from 'vitest';
import {
  calculateLineItem,
  calculateQuotationTotals,
  formatCurrency,
  roundCurrency,
} from '@/lib/quotations/calculations';

describe('Quotation Financial Calculations Engine', () => {
  it('safely rounds decimal values without floating-point errors', () => {
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
    expect(roundCurrency(10.555)).toBe(10.56);
    expect(roundCurrency(10.554)).toBe(10.55);
  });

  it('calculates single line item with percentage discount and tax accurately', () => {
    // 2 units * 1000 = 2000. 10% discount = 200. Subtotal = 1800. 18% tax on 1800 = 324. Total = 2124.
    const item = calculateLineItem({
      description: 'Consulting Service',
      quantity: 2,
      unit: 'days',
      unit_price: 1000,
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      tax_rate: 18,
    });

    expect(item.discount_amount).toBe(200);
    expect(item.line_subtotal).toBe(1800);
    expect(item.tax_amount).toBe(324);
    expect(item.line_total).toBe(2124);
  });

  it('calculates single line item with fixed discount', () => {
    // 1 unit * 5000 = 5000. Fixed discount = 500. Subtotal = 4500. 10% tax = 450. Total = 4950.
    const item = calculateLineItem({
      description: 'Server Rack',
      quantity: 1,
      unit: 'unit',
      unit_price: 5000,
      discount_type: 'FIXED',
      discount_value: 500,
      tax_rate: 10,
    });

    expect(item.discount_amount).toBe(500);
    expect(item.line_subtotal).toBe(4500);
    expect(item.tax_amount).toBe(450);
    expect(item.line_total).toBe(4950);
  });

  it('calculates multi-item quotation totals and overall discount/tax', () => {
    const input = {
      items: [
        {
          description: 'Web Development',
          quantity: 10,
          unit: 'hrs',
          unit_price: 2000, // 20,000
          discount_type: 'PERCENTAGE' as const,
          discount_value: 0,
          tax_rate: 0,
        },
        {
          description: 'UI/UX Design',
          quantity: 5,
          unit: 'hrs',
          unit_price: 1000, // 5,000
          discount_type: 'PERCENTAGE' as const,
          discount_value: 0,
          tax_rate: 0,
        },
      ],
      discount_type: 'PERCENTAGE' as const,
      discount_value: 10, // 10% of 25,000 = 2,500
      tax_rate: 18, // 18% of 22,500 = 4,050
    };

    const result = calculateQuotationTotals(input);

    expect(result.subtotal).toBe(25000);
    expect(result.discount_amount).toBe(2500);
    expect(result.taxable_amount).toBe(22500);
    expect(result.tax_amount).toBe(4050);
    expect(result.grand_total).toBe(26550);
  });

  it('formats currency correctly for multiple countries', () => {
    expect(formatCurrency(50000, 'INR')).toContain('50,000');
    expect(formatCurrency(1200.5, 'USD')).toContain('1,200.50');
    expect(formatCurrency(850, 'EUR')).toContain('850,00');
  });
});
