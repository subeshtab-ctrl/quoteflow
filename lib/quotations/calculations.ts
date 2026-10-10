import { CurrencyCode, DiscountType, QuotationItem, TaxMode } from '@/types/database';
import { isInterstateSupply } from '@/lib/tax/india-gst';

export interface LineItemInput {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_type?: DiscountType;
  discount_value?: number;
  tax_rate?: number;
  tax_mode?: TaxMode;
  product_id?: string | null;
  sort_order?: number;
  item_type?: 'GOODS' | 'SERVICE';
  classification_type?: string | null;
  classification_code?: string | null;
}

export interface CalculatedLineItem extends LineItemInput {
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  tax_mode: TaxMode;
  line_subtotal: number;
  taxable_amount: number;
  line_total: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
}

export interface QuotationCalculationInput {
  items: Array<Partial<LineItemInput> & { quantity: number; unit_price: number; discount_percent?: number }>;
  discount_type?: DiscountType;
  discount_value?: number;
  tax_rate?: number;
  tax_mode?: TaxMode;
  country?: string;
  supplier_state?: string | null;
  business_state?: string | null;
  place_of_supply?: string | null;
  tax_name?: string;
  is_india_gst?: boolean;
  gst_enabled?: boolean;
  gst_registered?: boolean;
}

export interface QuotationCalculationOptions {
  taxMode?: TaxMode;
  businessState?: string | null;
  placeOfSupply?: string | null;
  gstEnabled?: boolean;
  isIndiaGst?: boolean;
  discountType?: DiscountType;
  discountValue?: number;
  taxRate?: number;
  taxName?: string;
  country?: string;
}

export interface TaxBreakdownEntry {
  label: string;
  name: string;
  rate: number;
  amount: number;
  is_inclusive?: boolean;
}

export interface CalculatedQuotation {
  items: CalculatedLineItem[];
  subtotal: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  taxable_amount: number;
  tax_rate: number;
  effective_tax_rate: number;
  tax_amount: number;
  tax_mode: TaxMode;
  tax_name: string;
  grand_total: number;
  // Indian GST / Inter-state Breakdown
  is_interstate?: boolean;
  cgst_rate?: number;
  cgst_amount?: number;
  sgst_rate?: number;
  sgst_amount?: number;
  igst_rate?: number;
  igst_amount?: number;
  tax_breakdown: TaxBreakdownEntry[];
}

/**
 * Safe 2-decimal financial rounding to eliminate JavaScript floating point issues.
 */
export function roundCurrency(amount: number): number {
  return Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100;
}

/**
 * Helper to determine whether notes or terms & conditions have valid displayable content.
 * Returns false if text is empty, null, undefined, only whitespace, or 'N/A', 'Nil', 'None'.
 */
export function isValidDocumentText(text?: string | null): boolean {
  if (!text) return false;
  const clean = text.trim();
  if (clean.length === 0) return false;
  const lower = clean.toLowerCase();
  return !(
    lower === 'n/a' ||
    lower === 'nil' ||
    lower === 'none' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'n / a' ||
    lower === '-'
  );
}

/**
 * Calculate single line item values safely supporting both Exclusive and Inclusive taxes.
 */
export function calculateLineItem(
  item: Partial<LineItemInput> & { quantity: number; unit_price: number; discount_percent?: number },
  inheritedTaxMode: TaxMode = 'exclusive',
  isIndia: boolean = true,
  isInterstate: boolean = false
): CalculatedLineItem {
  const quantity = Math.max(0, Number(item.quantity) || 0);
  const unitPrice = Math.max(0, Number(item.unit_price) || 0);
  const discountType = item.discount_type || 'PERCENTAGE';
  const discountValue = Math.max(
    0,
    Number(item.discount_value !== undefined ? item.discount_value : item.discount_percent) || 0
  );
  const taxRate = Math.max(0, Number(item.tax_rate) || 0);
  const taxMode: TaxMode = item.tax_mode || inheritedTaxMode;

  const rawBase = roundCurrency(quantity * unitPrice);
  let discountAmount = 0;

  if (discountType === 'PERCENTAGE') {
    discountAmount = (rawBase * Math.min(100, discountValue)) / 100;
  } else {
    discountAmount = Math.min(rawBase, discountValue);
  }
  discountAmount = roundCurrency(discountAmount);

  const netAfterDiscount = roundCurrency(Math.max(0, rawBase - discountAmount));

  let lineSubtotal = 0;
  let taxAmount = 0;
  let lineTotal = 0;

  if (taxMode === 'inclusive') {
    // When Tax Inclusive is selected, the entered amount already includes tax.
    // Formula:
    // Taxable Amount = Inclusive Total / (1 + Tax Rate / 100)
    // Tax Amount = Inclusive Total - Taxable Amount
    lineTotal = netAfterDiscount;
    if (taxRate > 0) {
      lineSubtotal = roundCurrency(lineTotal / (1 + taxRate / 100));
      taxAmount = roundCurrency(lineTotal - lineSubtotal);
    } else {
      lineSubtotal = lineTotal;
      taxAmount = 0;
    }
  } else {
    // Normal calculation:
    // Tax = Subtotal * Tax Rate / 100
    // Total = Subtotal + Tax
    lineSubtotal = netAfterDiscount;
    taxAmount = roundCurrency((lineSubtotal * taxRate) / 100);
    lineTotal = roundCurrency(lineSubtotal + taxAmount);
  }

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  if (isIndia && taxAmount > 0) {
    if (isInterstate) {
      igstAmount = taxAmount;
    } else {
      cgstAmount = roundCurrency(taxAmount / 2);
      sgstAmount = roundCurrency(taxAmount - cgstAmount);
    }
  }

  return {
    description: item.description || '',
    unit: item.unit || 'unit',
    ...item,
    quantity,
    unit_price: unitPrice,
    discount_type: discountType,
    discount_value: discountValue,
    discount_amount: discountAmount,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    tax_mode: taxMode,
    line_subtotal: lineSubtotal,
    taxable_amount: lineSubtotal,
    line_total: lineTotal,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
  };
}

/**
 * Recalculate quotation / invoice line items and grand totals accurately.
 * Central single source of truth for Create Quote, Edit Quote, Quote Preview, Quote PDF,
 * Create Invoice, Edit Invoice, Invoice Preview, Invoice PDF, Quote conversion, and Reports.
 * Supports both `calculateQuotationTotals({ items, ... })` and `calculateQuotationTotals(items, currency, options)`.
 */
export function calculateQuotationTotals(
  inputOrItems: QuotationCalculationInput | Array<Partial<LineItemInput> & { quantity: number; unit_price: number; discount_percent?: number }>,
  arg2?: CurrencyCode | DiscountType | string | null | QuotationCalculationOptions,
  arg3?: QuotationCalculationOptions | number,
  arg4?: QuotationCalculationOptions
): CalculatedQuotation {
  let input: QuotationCalculationInput;

  if (Array.isArray(inputOrItems)) {
    let currency: string | undefined;
    let discountType: DiscountType | undefined;
    let discountValue: number | undefined;
    let options: QuotationCalculationOptions | undefined;

    if (typeof arg3 === 'number' || arg4 !== undefined) {
      // 4-argument signature: (items, discountType, discountValue, options)
      discountType = (arg2 as DiscountType) || 'PERCENTAGE';
      discountValue = typeof arg3 === 'number' ? arg3 : 0;
      options = arg4;
    } else if (typeof arg2 === 'object' && arg2 !== null) {
      // 2-argument signature: (items, options)
      options = arg2 as QuotationCalculationOptions;
    } else {
      // 3-argument signature: (items, currency, options)
      currency = typeof arg2 === 'string' ? arg2 : undefined;
      options = arg3 as QuotationCalculationOptions | undefined;
    }

    const isIndiaOpt =
      options?.isIndiaGst ??
      options?.gstEnabled ??
      (currency ? currency.toUpperCase() === 'INR' : true);

    input = {
      items: inputOrItems,
      tax_mode: options?.taxMode || 'exclusive',
      supplier_state: options?.businessState,
      business_state: options?.businessState,
      place_of_supply: options?.placeOfSupply,
      discount_type: discountType || options?.discountType,
      discount_value: discountValue !== undefined ? discountValue : options?.discountValue,
      tax_rate: options?.taxRate,
      tax_name:
        options?.taxName ||
        (currency && currency.toUpperCase() !== 'INR' && !isIndiaOpt ? 'Tax' : 'GST'),
      country:
        options?.country ||
        (!isIndiaOpt && !options?.businessState && !options?.placeOfSupply
          ? currency?.toUpperCase() || 'US'
          : 'IN'),
      is_india_gst: isIndiaOpt,
    };
  } else {
    input = inputOrItems;
  }

  const taxMode: TaxMode = input.tax_mode || 'exclusive';
  const taxName = input.tax_name || 'GST';
  const supplierState = input.supplier_state ?? input.business_state;

  // --- India GST Automatic Breakdown ---
  const isIndia =
    input.is_india_gst !== undefined
      ? input.is_india_gst
      : !input.country ||
        input.country.toLowerCase() === 'india' ||
        input.country.toUpperCase() === 'IN' ||
        Boolean(supplierState || input.place_of_supply);

  const isInterstate = isIndia
    ? isInterstateSupply({
        supplierState,
        placeOfSupply: input.place_of_supply,
      })
    : false;

  const calculatedItems = (input.items || []).map((item) =>
    calculateLineItem(item, taxMode, isIndia, isInterstate)
  );

  const discountType = input.discount_type || 'PERCENTAGE';
  const discountValue = Math.max(0, Number(input.discount_value) || 0);
  const overallTaxRate = Math.max(0, Number(input.tax_rate) || 0);

  let itemsSubtotal = 0;
  let overallDiscountAmount = 0;
  let taxableAmount = 0;
  let overallTaxAmount = 0;
  let grandTotal = 0;

  if (taxMode === 'inclusive') {
    // Total of entered inclusive line items
    const rawInclusiveSum = roundCurrency(
      calculatedItems.reduce((acc, item) => acc + item.line_total, 0)
    );

    if (discountType === 'PERCENTAGE') {
      overallDiscountAmount = (rawInclusiveSum * Math.min(100, discountValue)) / 100;
    } else {
      overallDiscountAmount = Math.min(rawInclusiveSum, discountValue);
    }
    overallDiscountAmount = roundCurrency(overallDiscountAmount);

    grandTotal = roundCurrency(Math.max(0, rawInclusiveSum - overallDiscountAmount));

    // Calculate effective tax and taxable subtotal inside grandTotal
    if (overallTaxRate > 0) {
      taxableAmount = roundCurrency(grandTotal / (1 + overallTaxRate / 100));
      overallTaxAmount = roundCurrency(grandTotal - taxableAmount);
    } else {
      // If line items have individual tax rates, sum up their taxable and tax components
      const totalLineTax = roundCurrency(
        calculatedItems.reduce((acc, item) => acc + item.tax_amount, 0)
      );
      if (overallDiscountAmount > 0 && rawInclusiveSum > 0) {
        const factor = grandTotal / rawInclusiveSum;
        overallTaxAmount = roundCurrency(totalLineTax * factor);
        taxableAmount = roundCurrency(grandTotal - overallTaxAmount);
      } else {
        overallTaxAmount = totalLineTax;
        taxableAmount = roundCurrency(grandTotal - overallTaxAmount);
      }
    }

    // Subtotal / Taxable Amount display: strictly ensures Subtotal + Tax = Total
    itemsSubtotal = taxableAmount;
  } else {
    // Exclusive mode:
    itemsSubtotal = roundCurrency(
      calculatedItems.reduce((acc, item) => acc + item.line_subtotal, 0)
    );

    if (discountType === 'PERCENTAGE') {
      overallDiscountAmount = (itemsSubtotal * Math.min(100, discountValue)) / 100;
    } else {
      overallDiscountAmount = Math.min(itemsSubtotal, discountValue);
    }
    overallDiscountAmount = roundCurrency(overallDiscountAmount);

    taxableAmount = roundCurrency(Math.max(0, itemsSubtotal - overallDiscountAmount));

    if (overallTaxRate > 0) {
      overallTaxAmount = roundCurrency((taxableAmount * overallTaxRate) / 100);
    } else {
      overallTaxAmount = roundCurrency(
        calculatedItems.reduce((acc, item) => acc + item.tax_amount, 0)
      );
    }

    grandTotal = roundCurrency(taxableAmount + overallTaxAmount);
  }

  let cgstRate: number | undefined;
  let cgstAmount: number | undefined;
  let sgstRate: number | undefined;
  let sgstAmount: number | undefined;
  let igstRate: number | undefined;
  let igstAmount: number | undefined;
  const taxBreakdown: TaxBreakdownEntry[] = [];

  // Infer effectiveTaxRate from overallTaxRate, or from uniform line item tax_rate, or from ratio
  const uniformItemTaxRate =
    calculatedItems.length > 0 &&
    calculatedItems.every((it) => it.tax_rate === calculatedItems[0].tax_rate)
      ? calculatedItems[0].tax_rate
      : 0;

  const effectiveTaxRate =
    overallTaxRate > 0
      ? overallTaxRate
      : uniformItemTaxRate > 0
      ? uniformItemTaxRate
      : taxableAmount > 0
      ? roundCurrency((overallTaxAmount / taxableAmount) * 100)
      : 0;

  if (overallTaxAmount > 0) {
    const isInclusive = taxMode === 'inclusive';
    const incSuffix = isInclusive ? ' (Included)' : '';

    if (isIndia) {
      if (isInterstate) {
        // Inter-State: 100% IGST, NEVER show CGST or SGST
        igstRate = effectiveTaxRate;
        igstAmount = overallTaxAmount;
        cgstRate = 0;
        cgstAmount = 0;
        sgstRate = 0;
        sgstAmount = 0;

        const label = `IGST ${igstRate}%${incSuffix}`;
        taxBreakdown.push({
          label,
          name: label,
          rate: igstRate,
          amount: igstAmount,
          is_inclusive: isInclusive,
        });
      } else {
        // Intra-State: Split GST equally into CGST + SGST, NEVER show IGST
        cgstRate = roundCurrency(effectiveTaxRate / 2);
        sgstRate = roundCurrency(effectiveTaxRate / 2);
        cgstAmount = roundCurrency(overallTaxAmount / 2);
        // Avoid 0.01 floating point discrepancy:
        sgstAmount = roundCurrency(overallTaxAmount - cgstAmount);
        igstRate = 0;
        igstAmount = 0;

        const cgstLabel = `CGST ${cgstRate}%${incSuffix}`;
        const sgstLabel = `SGST ${sgstRate}%${incSuffix}`;
        taxBreakdown.push({
          label: cgstLabel,
          name: cgstLabel,
          rate: cgstRate,
          amount: cgstAmount,
          is_inclusive: isInclusive,
        });
        taxBreakdown.push({
          label: sgstLabel,
          name: sgstLabel,
          rate: sgstRate,
          amount: sgstAmount,
          is_inclusive: isInclusive,
        });
      }
    } else {
      // Other countries (e.g. VAT, Sales Tax)
      const label = `${taxName} ${effectiveTaxRate}%${incSuffix}`;
      taxBreakdown.push({
        label,
        name: label,
        rate: effectiveTaxRate,
        amount: overallTaxAmount,
        is_inclusive: isInclusive,
      });
    }
  }

  return {
    items: calculatedItems,
    subtotal: itemsSubtotal,
    discount_type: discountType,
    discount_value: discountValue,
    discount_amount: overallDiscountAmount,
    taxable_amount: taxableAmount,
    tax_rate: overallTaxRate,
    effective_tax_rate: effectiveTaxRate,
    tax_amount: overallTaxAmount,
    tax_mode: taxMode,
    tax_name: taxName,
    grand_total: grandTotal,
    is_interstate: isInterstate,
    cgst_rate: cgstRate,
    cgst_amount: cgstAmount,
    sgst_rate: sgstRate,
    sgst_amount: sgstAmount,
    igst_rate: igstRate,
    igst_amount: igstAmount,
    tax_breakdown: taxBreakdown,
  };
}

/**
 * Returns symbol for given currency code
 */
export function getCurrencySymbol(currency: CurrencyCode | string = 'INR'): string {
  const curr = (currency || 'INR').toUpperCase();
  switch (curr) {
    case 'INR':
      return '₹';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'AED':
      return 'د.إ ';
    case 'SAR':
      return 'ر.س ';
    case 'KWD':
      return 'د.ك ';
    case 'CAD':
      return 'C$';
    case 'AUD':
      return 'A$';
    default:
      return `${curr} `;
  }
}

/**
 * Format currency with official symbols across all international documents.
 * Never outputs a plain number without currency symbol.
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode | string = 'INR'
): string {
  const num = Number(amount) || 0;
  const curr = (currency || 'INR').toUpperCase();

  switch (curr) {
    case 'INR':
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    case 'USD':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    case 'EUR':
      return `€${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'GBP':
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    case 'AED':
      return `د.إ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'SAR':
      return `ر.س ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'KWD':
      return `د.ك ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'CAD':
      return `C$ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'AUD':
      return `A$ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    default: {
      const sym = getCurrencySymbol(curr);
      return `${sym}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }
}
