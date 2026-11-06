import { CurrencyCode, DiscountType, QuotationItem, TaxMode } from '@/types/database';
import { isInterstateSupply, findIndianState } from '@/lib/tax/india-gst';
import { getCountryProfile } from '@/lib/tax/country-config';

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
  is_optional?: boolean;
  is_selected?: boolean;
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
  currency?: string;
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
  currency?: string;
}

export interface TaxBreakdownEntry {
  label: string;
  name?: string;
  rate: number;
  amount: number;
  is_inclusive?: boolean;
}

/**
 * Sanitizes tax breakdown entries for non-India countries.
 * Guarantees CGST, SGST, IGST, or Indian GST labels never appear for UAE or other foreign countries.
 * Even if older quotations have CGST/SGST saved in the database, this collapses them into a single clean VAT/Tax line.
 */
export function sanitizeTaxBreakdown(
  entries: Array<{ label?: string; name?: string; rate?: number; amount: number; is_inclusive?: boolean }> | undefined | null,
  isIndia: boolean,
  taxName: string = 'VAT',
  totalTaxAmount: number = 0,
  taxRate: number = 0
): TaxBreakdownEntry[] {
  if (isIndia) {
    return (entries || []).map((e) => ({
      ...e,
      rate: e.rate ?? 0,
      label: e.label || e.name || 'Tax',
      name: e.name || e.label || 'Tax',
    }));
  }

  // Filter out any entries mentioning CGST, SGST, IGST, or GST
  const cleaned = (entries || [])
    .filter((entry) => {
      const l = (entry.label || entry.name || '').toUpperCase();
      return !l.includes('CGST') && !l.includes('SGST') && !l.includes('IGST') && !l.includes('GST');
    })
    .map((e) => ({
      ...e,
      rate: e.rate ?? 0,
      label: e.label || e.name || (taxName || 'Tax'),
      name: e.name || e.label || (taxName || 'Tax'),
    }));

  if (cleaned.length > 0) {
    return cleaned;
  }

  // If previous entries were all CGST/SGST and got stripped out, provide a unified VAT/Tax breakdown
  if (totalTaxAmount > 0) {
    const name = taxName || 'VAT';
    const label = `${name}${taxRate > 0 ? ` ${taxRate}%` : ''}`;
    return [
      {
        label,
        name: label,
        rate: taxRate,
        amount: totalTaxAmount,
      },
    ];
  }

  return [];
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

    const resolvedCurrency = (currency || options?.currency || '').trim().toUpperCase();
    const resolvedCountry = (options?.country || '').trim().toLowerCase();

    let isIndiaOpt: boolean;
    if (options?.isIndiaGst !== undefined) {
      isIndiaOpt = options.isIndiaGst;
    } else if (resolvedCountry === 'in' || resolvedCountry === 'india' || resolvedCountry.includes('india')) {
      isIndiaOpt = true;
    } else if (resolvedCountry !== '') {
      // Explicit non-India country
      isIndiaOpt = false;
    } else if (resolvedCurrency === 'INR') {
      isIndiaOpt = true;
    } else if (resolvedCurrency !== '') {
      // Explicit foreign currency (e.g. AED, USD, EUR, GBP)
      isIndiaOpt = false;
    } else if (options?.gstEnabled !== undefined) {
      isIndiaOpt = options.gstEnabled;
    } else {
      isIndiaOpt = false;
    }

    const isUAE =
      resolvedCountry === 'ae' ||
      resolvedCountry === 'uae' ||
      resolvedCountry.includes('emirates') ||
      resolvedCurrency === 'AED';

    input = {
      items: inputOrItems,
      currency: resolvedCurrency,
      tax_mode: options?.taxMode || 'exclusive',
      supplier_state: options?.businessState,
      business_state: options?.businessState,
      place_of_supply: options?.placeOfSupply,
      discount_type: discountType || options?.discountType,
      discount_value: discountValue !== undefined ? discountValue : options?.discountValue,
      tax_rate: options?.taxRate,
      tax_name:
        options?.taxName && (!isIndiaOpt && options.taxName.toUpperCase().includes('GST'))
          ? (isUAE ? 'VAT' : 'Tax')
          : (options?.taxName || (isIndiaOpt ? 'GST' : (isUAE ? 'VAT' : 'Tax'))),
      country:
        options?.country ||
        (isIndiaOpt ? 'IN' : (isUAE ? 'AE' : (resolvedCurrency || 'US'))),
      is_india_gst: isIndiaOpt,
    };
  } else {
    input = inputOrItems;
  }

  const taxMode: TaxMode = input.tax_mode || 'exclusive';
  const supplierState = input.supplier_state ?? input.business_state;
  const currencyClean = (input.currency || '').trim().toUpperCase();
  const countryClean = (input.country || '').trim().toLowerCase();

  const isExplicitIndia =
    countryClean === 'india' ||
    countryClean === 'in' ||
    countryClean.includes('india');

  const isExplicitForeignCountry =
    countryClean !== '' &&
    !isExplicitIndia;

  const isForeignCurrency =
    currencyClean !== '' &&
    currencyClean !== 'INR';

  // Strict India GST determination:
  let isIndia = false;
  if (input.is_india_gst !== undefined) {
    isIndia = input.is_india_gst;
  } else if (isExplicitIndia) {
    isIndia = true;
  } else if (isExplicitForeignCountry || isForeignCurrency) {
    isIndia = false;
  } else if (currencyClean === 'INR') {
    isIndia = true;
  } else if (supplierState && findIndianState(supplierState)) {
    isIndia = true;
  } else {
    isIndia = false;
  }

  const isUAE =
    countryClean === 'ae' ||
    countryClean === 'uae' ||
    countryClean.includes('emirates') ||
    currencyClean === 'AED';

  const profile = getCountryProfile(input.country || input.currency || (isIndia ? 'IN' : 'AE'));

  let taxName = input.tax_name;
  if (!taxName || (!isIndia && (taxName.toUpperCase() === 'GST' || taxName.toUpperCase().includes('GST')))) {
    if (isIndia) {
      taxName = 'GST';
    } else if (profile.taxSystem === 'VAT' || isUAE) {
      taxName = 'VAT';
    } else {
      taxName = 'Tax';
    }
  }

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

  // Filter out optional items that are explicitly unselected by the client
  const includedItems = calculatedItems.filter(
    (item) => !(item.is_optional && item.is_selected === false)
  );

  let itemsSubtotal = 0;
  let overallDiscountAmount = 0;
  let taxableAmount = 0;
  let overallTaxAmount = 0;
  let grandTotal = 0;

  if (taxMode === 'inclusive') {
    // Total of entered inclusive line items
    const rawInclusiveSum = roundCurrency(
      includedItems.reduce((acc, item) => acc + item.line_total, 0)
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
        includedItems.reduce((acc, item) => acc + item.tax_amount, 0)
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
      includedItems.reduce((acc, item) => acc + item.line_subtotal, 0)
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
        includedItems.reduce((acc, item) => acc + item.tax_amount, 0)
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
/**
 * Returns clean, print-safe symbol or code for given currency code.
 * Replaces non-Latin Arabic glyphs with international ISO abbreviations
 * so PDF engines (Helvetica) and thermal printers never output question marks or corrupted glyphs.
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
      return '⃃'; // Unicode U+20C3: UAE Dirham currency symbol
    case 'SAR':
      return 'SAR';
    case 'KWD':
      return 'KWD';
    case 'QAR':
      return 'QAR';
    case 'OMR':
      return 'OMR';
    case 'BHD':
      return 'BHD';
    case 'CAD':
      return 'C$';
    case 'AUD':
      return 'A$';
    case 'SGD':
      return 'S$';
    case 'JPY':
    case 'CNY':
      return '¥';
    case 'CHF':
      return 'CHF';
    case 'NZD':
      return 'NZ$';
    case 'BRL':
      return 'R$';
    case 'ZAR':
      return 'R';
    case 'SEK':
    case 'NOK':
    case 'DKK':
      return 'kr';
    case 'PLN':
      return 'zł';
    case 'TRY':
      return '₺';
    case 'RUB':
      return '₽';
    case 'MXN':
      return 'Mex$';
    case 'THB':
      return '฿';
    case 'MYR':
      return 'RM';
    case 'IDR':
      return 'Rp';
    case 'PHP':
      return '₱';
    case 'VND':
      return '₫';
    case 'PKR':
    case 'LKR':
    case 'NPR':
      return 'Rs';
    case 'BDT':
      return '৳';
    case 'EGP':
      return 'E£';
    case 'NGN':
      return '₦';
    case 'KES':
      return 'KSh';
    case 'GHS':
      return 'GH₵';
    case 'ILS':
      return '₪';
    case 'HKD':
      return 'HK$';
    case 'KRW':
      return '₩';
    case 'TWD':
      return 'NT$';
    default:
      return curr;
  }
}

/**
 * Format currency with official symbols across all international documents.
 * Ensures consistent presentation across Preview, Print, PDF, WhatsApp, and Client Portal.
 * Example outputs:
 * - INR: ₹ 45,000.00
 * - USD: $ 1,500.00
 * - EUR: € 1,500.00
 * - GBP: £ 1,500.00
 * - AED: AED 1,500.00
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode | string = 'INR',
  options?: { useAsciiRupee?: boolean }
): string {
  const num = Number(amount) || 0;
  const curr = (currency || 'INR').toUpperCase();

  const standardFormatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  switch (curr) {
    case 'INR': {
      const inrFormatted = num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const sym = options?.useAsciiRupee ? 'Rs.' : '₹';
      return `${sym} ${inrFormatted}`;
    }
    case 'USD':
      return `$ ${standardFormatted}`;
    case 'EUR':
      return `€ ${standardFormatted}`;
    case 'GBP':
      return `£ ${standardFormatted}`;
    case 'AED':
      return `⃃ ${standardFormatted}`; // Display Unicode U+20C3 for UAE businesses
    case 'SAR':
      return `SAR ${standardFormatted}`;
    case 'KWD':
      return `KWD ${standardFormatted}`;
    case 'QAR':
      return `QAR ${standardFormatted}`;
    case 'OMR':
      return `OMR ${standardFormatted}`;
    case 'BHD':
      return `BHD ${standardFormatted}`;
    case 'CAD':
      return `C$ ${standardFormatted}`;
    case 'AUD':
      return `A$ ${standardFormatted}`;
    case 'SGD':
      return `S$ ${standardFormatted}`;
    default: {
      const sym = getCurrencySymbol(curr).trim();
      return `${sym} ${standardFormatted}`;
    }
  }
}

/**
 * Resolves the canonical, legal title of any document based strictly on its
 * explicit document_type and draft status.
 *
 * Rules:
 * - proforma_invoice -> PROFORMA INVOICE
 * - delivery_note / delivery_challan -> DELIVERY NOTE
 * - quotation -> QUOTATION
 * - estimate -> ESTIMATE
 * - receipt -> PAYMENT RECEIPT
 * - tax_invoice / invoice:
 *     - if status === 'DRAFT' -> DRAFT INVOICE
 *     - else if Indian GST registered business -> TAX INVOICE
 *     - else -> INVOICE
 */
export function getDocumentTitle(
  documentType?: string | null,
  status?: string | null,
  isIndiaGst: boolean = false
): string {
  const rawType = (documentType || 'tax_invoice').toLowerCase().trim();

  if (rawType === 'proforma_invoice') {
    return 'PROFORMA INVOICE';
  }
  if (rawType === 'delivery_note' || rawType === 'delivery_challan') {
    return 'DELIVERY NOTE';
  }
  if (rawType === 'quotation') {
    return 'QUOTATION';
  }
  if (rawType === 'estimate') {
    return 'ESTIMATE';
  }
  if (rawType === 'receipt') {
    return 'PAYMENT RECEIPT';
  }

  // Invoice types
  if (status === 'DRAFT') {
    return 'DRAFT INVOICE';
  }
  if (isIndiaGst) {
    return 'TAX INVOICE';
  }
  return 'INVOICE';
}

/**
 * Generates a clean, professional, sanitized filename for downloaded PDF documents.
 * Examples:
 * - Invoice_INV-2026-001.pdf
 * - TaxInvoice_INV-2026-001.pdf
 * - Quotation_QT-2026-0042.pdf
 * - Estimate_EST-2026-0042.pdf
 * - ProformaInvoice_PI-2026-0012.pdf
 * - DeliveryNote_DN-2026-0018.pdf
 * - Receipt_REC-2026-005.pdf
 */
export function getSanitizedPdfFilename(
  documentType?: string | null,
  documentNumber?: string | null,
  status?: string | null,
  isIndiaGst: boolean = false
): string {
  const title = getDocumentTitle(documentType, status, isIndiaGst);
  const words = title.split(/[\s_-]+/);
  let cleanPrefix = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
  if (cleanPrefix === 'PaymentReceipt') {
    cleanPrefix = 'Receipt';
  }
  const cleanNumber = (documentNumber || 'Document').replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${cleanPrefix}_${cleanNumber}.pdf`;
}

/**
 * Harmonizes payment terms instructions with the quotation's explicit advance_percentage.
 * Prevents mismatches where the badge states "100% Advance Required" while stale text says "50% advance".
 */
export function harmonizePaymentTerms(
  advancePercentage?: number | null,
  rawPaymentTermsInstructions?: string | null
): string {
  const rawTerms = rawPaymentTermsInstructions?.trim() || '';

  if (advancePercentage === 100) {
    if (!rawTerms || /50%\s*advance/i.test(rawTerms)) {
      return 'Payment terms: 100% advance required upon approval to commence work. Remit via Bank Transfer.';
    }
    return rawTerms.replace(/\b\d+%\s*advance/gi, '100% advance');
  }

  if (advancePercentage === 0 || advancePercentage === null) {
    if (!rawTerms || /50%\s*advance/i.test(rawTerms)) {
      return 'Payment terms: 100% full payment due upon project completion and delivery. Remit via Bank Transfer.';
    }
    return rawTerms.replace(/\b\d+%\s*advance/gi, '100% upon delivery');
  }

  if (advancePercentage !== undefined && advancePercentage !== null && advancePercentage > 0 && advancePercentage < 100) {
    if (!rawTerms || /50%\s*advance/i.test(rawTerms)) {
      return `Payment terms: ${advancePercentage}% advance to commence work, balance upon completion. Remit via Bank Transfer.`;
    }
    return rawTerms.replace(/\b\d+%\s*advance/gi, `${advancePercentage}% advance`);
  }

  return rawTerms || 'Payment terms: 100% payment upon agreement. Remit via Bank Transfer.';
}

/**
 * Harmonizes Terms & Conditions text with the quotation's explicit advance_percentage.
 * Eliminates contradictions such as "2. 50% advance required to commence work."
 * when the quotation explicitly requires 75% or 100% advance.
 */
export function harmonizeTermsAndConditions(
  advancePercentage?: number | null,
  rawTermsConditions?: string | null
): string {
  if (!rawTermsConditions || !rawTermsConditions.trim()) {
    if (advancePercentage === 100) {
      return '1. Quotation valid as per date.\n2. 100% advance required to commence work.\n3. Taxes applicable as per local regulations.';
    }
    if (advancePercentage === 0) {
      return '1. Quotation valid as per date.\n2. Full payment due upon completion / delivery.\n3. Taxes applicable as per local regulations.';
    }
    if (advancePercentage && advancePercentage > 0) {
      return `1. Quotation valid as per date.\n2. ${advancePercentage}% advance required to commence work.\n3. Taxes applicable as per local regulations.`;
    }
    return '';
  }

  const terms = rawTermsConditions.trim();
  if (advancePercentage === undefined) {
    return terms;
  }

  // Target any phrase like "50% advance required to commence work", "50% advance to commence work", "50% advance required upon signature to commence onboarding", "50% advance required", "50% advance"
  const advanceClauseRegex = /\b\d+%\s*advance(\s+(payment\s+)?(required|to\s+commence|upon|due)[^\n.,;]*)?/gi;

  if (advancePercentage === 100) {
    if (advanceClauseRegex.test(terms)) {
      return terms.replace(advanceClauseRegex, '100% advance required to commence work');
    }
    return terms;
  }

  if (advancePercentage === 0 || advancePercentage === null) {
    if (advanceClauseRegex.test(terms)) {
      return terms.replace(advanceClauseRegex, 'Full payment due upon completion / delivery');
    }
    return terms;
  }

  if (advancePercentage > 0 && advancePercentage < 100) {
    if (advanceClauseRegex.test(terms)) {
      return terms.replace(advanceClauseRegex, `${advancePercentage}% advance required to commence work`);
    }
    return terms;
  }

  return terms;
}
