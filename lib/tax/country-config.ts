import { CurrencyCode, TaxSystem } from '@/types/database';

export interface CountryTaxProfile {
  code: string;
  name: string;
  flag: string;
  defaultCurrency: CurrencyCode;
  taxSystem: TaxSystem;
  taxLabel: string;
  goodsClassificationLabel: string;
  goodsPlaceholder: string;
  serviceClassificationLabel: string;
  servicePlaceholder: string;
  defaultTaxRate: number;
  taxRates: Array<{ label: string; rate: number }>;
  isIndiaGst: boolean;
  isUaeVat: boolean;
}

export const COUNTRIES: CountryTaxProfile[] = [
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    defaultCurrency: 'INR',
    taxSystem: 'GST',
    taxLabel: 'GSTIN (Goods & Services Tax ID)',
    goodsClassificationLabel: 'HSN Code',
    goodsPlaceholder: 'e.g. 84713010',
    serviceClassificationLabel: 'SAC Code',
    servicePlaceholder: 'e.g. 998311',
    defaultTaxRate: 18,
    taxRates: [
      { label: 'GST 0% (Nil / Exempt)', rate: 0 },
      { label: 'GST 5% (CGST 2.5% + SGST 2.5% / IGST 5%)', rate: 5 },
      { label: 'GST 12% (CGST 6% + SGST 6% / IGST 12%)', rate: 12 },
      { label: 'GST 18% (CGST 9% + SGST 9% / IGST 18%)', rate: 18 },
      { label: 'GST 28% (CGST 14% + SGST 14% / IGST 28%)', rate: 28 },
    ],
    isIndiaGst: true,
    isUaeVat: false,
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    defaultCurrency: 'AED',
    taxSystem: 'VAT',
    taxLabel: 'TRN (Tax Registration Number)',
    goodsClassificationLabel: 'HS Code',
    goodsPlaceholder: 'e.g. 8471.30.00',
    serviceClassificationLabel: 'Service Category',
    servicePlaceholder: 'e.g. IT & Software Services',
    defaultTaxRate: 5,
    taxRates: [
      { label: 'Standard VAT 5%', rate: 5 },
      { label: 'Zero-rated VAT 0%', rate: 0 },
      { label: 'Exempt 0%', rate: 0 },
    ],
    isIndiaGst: false,
    isUaeVat: true,
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    defaultCurrency: 'USD',
    taxSystem: 'SALES_TAX',
    taxLabel: 'EIN / Tax ID',
    goodsClassificationLabel: 'Item / SKU Code',
    goodsPlaceholder: 'e.g. SKU-1002',
    serviceClassificationLabel: 'Service Code',
    servicePlaceholder: 'e.g. SVC-CONSULT',
    defaultTaxRate: 0,
    taxRates: [
      { label: 'No Sales Tax (0%)', rate: 0 },
      { label: 'Sales Tax 5%', rate: 5 },
      { label: 'Sales Tax 7.25%', rate: 7.25 },
      { label: 'Sales Tax 8.875%', rate: 8.875 },
    ],
    isIndiaGst: false,
    isUaeVat: false,
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    defaultCurrency: 'GBP',
    taxSystem: 'VAT',
    taxLabel: 'VAT Registration Number',
    goodsClassificationLabel: 'Commodity Code',
    goodsPlaceholder: 'e.g. 8471 30 00',
    serviceClassificationLabel: 'Service Category',
    servicePlaceholder: 'e.g. Professional Consulting',
    defaultTaxRate: 20,
    taxRates: [
      { label: 'Standard VAT 20%', rate: 20 },
      { label: 'Reduced Rate 5%', rate: 5 },
      { label: 'Zero Rate 0%', rate: 0 },
    ],
    isIndiaGst: false,
    isUaeVat: false,
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    flag: '🇸🇦',
    defaultCurrency: 'AED',
    taxSystem: 'VAT',
    taxLabel: 'VAT Account Number (ZATCA)',
    goodsClassificationLabel: 'HS Code',
    goodsPlaceholder: 'e.g. 8471.30',
    serviceClassificationLabel: 'Service Category',
    servicePlaceholder: 'e.g. Technical Services',
    defaultTaxRate: 15,
    taxRates: [
      { label: 'Standard VAT 15%', rate: 15 },
      { label: 'Zero-rated 0%', rate: 0 },
    ],
    isIndiaGst: false,
    isUaeVat: false,
  },
  {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    defaultCurrency: 'USD',
    taxSystem: 'SALES_TAX',
    taxLabel: 'GST/HST Number',
    goodsClassificationLabel: 'HS Code / SKU',
    goodsPlaceholder: 'e.g. 8471.30',
    serviceClassificationLabel: 'Service Category',
    servicePlaceholder: 'e.g. Software Development',
    defaultTaxRate: 13,
    taxRates: [
      { label: 'GST (5%)', rate: 5 },
      { label: 'HST Ontario (13%)', rate: 13 },
      { label: 'HST Atlantic (15%)', rate: 15 },
      { label: 'Zero-rated (0%)', rate: 0 },
    ],
    isIndiaGst: false,
    isUaeVat: false,
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    defaultCurrency: 'USD',
    taxSystem: 'GST',
    taxLabel: 'ABN (Australian Business Number)',
    goodsClassificationLabel: 'Tariff / Item Code',
    goodsPlaceholder: 'e.g. 8471.30.00',
    serviceClassificationLabel: 'Service Category',
    servicePlaceholder: 'e.g. Business Advisory',
    defaultTaxRate: 10,
    taxRates: [
      { label: 'GST 10%', rate: 10 },
      { label: 'GST Free 0%', rate: 0 },
    ],
    isIndiaGst: false,
    isUaeVat: false,
  },
  {
    code: 'DE',
    name: 'Germany (EU)',
    flag: '🇩🇪',
    defaultCurrency: 'EUR',
    taxSystem: 'VAT',
    taxLabel: 'USt-IdNr (VAT ID)',
    goodsClassificationLabel: 'TARIC / HS Code',
    goodsPlaceholder: 'e.g. 84713000',
    serviceClassificationLabel: 'Service Category',
    servicePlaceholder: 'e.g. Consulting & Engineering',
    defaultTaxRate: 19,
    taxRates: [
      { label: 'Standard VAT 19%', rate: 19 },
      { label: 'Reduced VAT 7%', rate: 7 },
      { label: 'Zero-rated / EU Reverse Charge 0%', rate: 0 },
    ],
    isIndiaGst: false,
    isUaeVat: false,
  },
  {
    code: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    defaultCurrency: 'USD',
    taxSystem: 'GST',
    taxLabel: 'GST Registration Number',
    goodsClassificationLabel: 'HS Code',
    goodsPlaceholder: 'e.g. 8471.30.10',
    serviceClassificationLabel: 'Service Category',
    servicePlaceholder: 'e.g. Managed IT Services',
    defaultTaxRate: 9,
    taxRates: [
      { label: 'GST 9%', rate: 9 },
      { label: 'Zero-rated 0%', rate: 0 },
    ],
    isIndiaGst: false,
    isUaeVat: false,
  },
  {
    code: 'OTHER',
    name: 'Other Country / International',
    flag: '🌍',
    defaultCurrency: 'USD',
    taxSystem: 'CUSTOM',
    taxLabel: 'Tax ID / Registration Number',
    goodsClassificationLabel: 'Item / Classification Code',
    goodsPlaceholder: 'e.g. SKU or Code',
    serviceClassificationLabel: 'Service Category / Code',
    servicePlaceholder: 'e.g. Service Category',
    defaultTaxRate: 0,
    taxRates: [
      { label: 'Standard Tax (Default)', rate: 0 },
    ],
    isIndiaGst: false,
    isUaeVat: false,
  },
];

export function getCountryProfile(countryCodeOrName?: string | null): CountryTaxProfile {
  if (!countryCodeOrName) {
    return COUNTRIES[0]; // Default India
  }

  const query = countryCodeOrName.trim().toUpperCase();
  const found = COUNTRIES.find(
    (c) => c.code.toUpperCase() === query || c.name.toUpperCase() === query
  );

  return found || COUNTRIES[COUNTRIES.length - 1]; // Fallback to Other
}

/**
 * Calculates item tax breakdown according to country profile
 */
export function calculateItemTaxBreakdown(params: {
  countryCode?: string | null;
  taxRate: number;
  taxableAmount: number;
  isInterstate?: boolean;
}): {
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
  vatAmount?: number;
  totalTax: number;
  breakdownSummary: string;
} {
  const profile = getCountryProfile(params.countryCode);
  const totalTax = Math.round(((params.taxableAmount * params.taxRate) / 100 + Number.EPSILON) * 100) / 100;

  if (profile.isIndiaGst) {
    if (params.isInterstate) {
      // Interstate: 100% IGST
      return {
        igstRate: params.taxRate,
        igstAmount: totalTax,
        totalTax,
        breakdownSummary: `IGST @ ${params.taxRate}%`,
      };
    } else {
      // Intrastate: 50% CGST + 50% SGST
      const halfRate = params.taxRate / 2;
      const halfAmount = Math.round(((totalTax / 2) + Number.EPSILON) * 100) / 100;
      return {
        cgstRate: halfRate,
        cgstAmount: halfAmount,
        sgstRate: halfRate,
        sgstAmount: totalTax - halfAmount,
        totalTax,
        breakdownSummary: `CGST ${halfRate}% + SGST ${halfRate}%`,
      };
    }
  }

  if (profile.isUaeVat) {
    return {
      vatAmount: totalTax,
      totalTax,
      breakdownSummary: `UAE VAT @ ${params.taxRate}%`,
    };
  }

  return {
    totalTax,
    breakdownSummary: `Tax @ ${params.taxRate}%`,
  };
}
