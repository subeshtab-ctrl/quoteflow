import { CurrencyCode, DiscountType, QuotationItem } from '@/types/database';

export interface LineItemInput {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_type?: DiscountType;
  discount_value?: number;
  tax_rate?: number;
  product_id?: string | null;
  sort_order?: number;
}

export interface CalculatedLineItem extends LineItemInput {
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_subtotal: number;
  line_total: number;
}

export interface QuotationCalculationInput {
  items: LineItemInput[];
  discount_type?: DiscountType;
  discount_value?: number;
  tax_rate?: number;
}

export interface CalculatedQuotation {
  items: CalculatedLineItem[];
  subtotal: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  taxable_amount: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
}

/**
 * Safe 2-decimal financial rounding
 */
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate single line item values safely
 */
export function calculateLineItem(item: LineItemInput): CalculatedLineItem {
  const quantity = Math.max(0, Number(item.quantity) || 0);
  const unitPrice = Math.max(0, Number(item.unit_price) || 0);
  const discountType = item.discount_type || 'PERCENTAGE';
  const discountValue = Math.max(0, Number(item.discount_value) || 0);
  const taxRate = Math.max(0, Number(item.tax_rate) || 0);

  const rawBase = quantity * unitPrice;
  let discountAmount = 0;

  if (discountType === 'PERCENTAGE') {
    discountAmount = (rawBase * Math.min(100, discountValue)) / 100;
  } else {
    discountAmount = Math.min(rawBase, discountValue);
  }
  discountAmount = roundCurrency(discountAmount);

  const lineSubtotal = roundCurrency(Math.max(0, rawBase - discountAmount));
  const taxAmount = roundCurrency((lineSubtotal * taxRate) / 100);
  const lineTotal = roundCurrency(lineSubtotal + taxAmount);

  return {
    ...item,
    quantity,
    unit_price: unitPrice,
    discount_type: discountType,
    discount_value: discountValue,
    discount_amount: discountAmount,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    line_subtotal: lineSubtotal,
    line_total: lineTotal,
  };
}

/**
 * Recalculate quotation line items and grand totals accurately server-side.
 * NEVER trust totals coming from the client browser.
 */
export function calculateQuotationTotals(
  input: QuotationCalculationInput
): CalculatedQuotation {
  const calculatedItems = (input.items || []).map(calculateLineItem);

  // Subtotal is sum of line subtotals (after item discounts)
  const itemsSubtotal = roundCurrency(
    calculatedItems.reduce((acc, item) => acc + item.line_subtotal, 0)
  );

  const discountType = input.discount_type || 'PERCENTAGE';
  const discountValue = Math.max(0, Number(input.discount_value) || 0);

  let overallDiscountAmount = 0;
  if (discountType === 'PERCENTAGE') {
    overallDiscountAmount = (itemsSubtotal * Math.min(100, discountValue)) / 100;
  } else {
    overallDiscountAmount = Math.min(itemsSubtotal, discountValue);
  }
  overallDiscountAmount = roundCurrency(overallDiscountAmount);

  const taxableAmount = roundCurrency(Math.max(0, itemsSubtotal - overallDiscountAmount));

  // Overall tax or combined line item taxes
  const overallTaxRate = Math.max(0, Number(input.tax_rate) || 0);
  let overallTaxAmount = 0;

  if (overallTaxRate > 0) {
    overallTaxAmount = roundCurrency((taxableAmount * overallTaxRate) / 100);
  } else {
    // If no overall tax rate is set, aggregate line item taxes
    overallTaxAmount = roundCurrency(
      calculatedItems.reduce((acc, item) => acc + item.tax_amount, 0)
    );
  }

  const grandTotal = roundCurrency(taxableAmount + overallTaxAmount);

  return {
    items: calculatedItems,
    subtotal: itemsSubtotal,
    discount_type: discountType,
    discount_value: discountValue,
    discount_amount: overallDiscountAmount,
    taxable_amount: taxableAmount,
    tax_rate: overallTaxRate,
    tax_amount: overallTaxAmount,
    grand_total: grandTotal,
  };
}

/**
 * Format currency with international symbols
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'INR'
): string {
  const num = Number(amount) || 0;

  switch (currency) {
    case 'INR':
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(num);
    case 'USD':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(num);
    case 'EUR':
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 2,
      }).format(num);
    case 'GBP':
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        maximumFractionDigits: 2,
      }).format(num);
    case 'AED':
      return new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: 'AED',
        maximumFractionDigits: 2,
      }).format(num);
    default:
      return `${currency} ${num.toFixed(2)}`;
  }
}
