/**
 * UAE Tax & E-Invoicing Utilities (EIS / Peppol PINT-AE)
 * STRICTLY ISOLATED TO THE UNITED ARAB EMIRATES (country === 'AE' or isUaeVat)
 * Adheres to UAE Federal Tax Authority (FTA) regulations and Ministerial Decision No. 244 of 2025.
 */

export interface UaeEmirate {
  code: string;
  name: string;
  boxIndex: string; // UAE VAT Return Form 201 Box index (1a to 1g)
}

export const UAE_EMIRATES: UaeEmirate[] = [
  { code: 'DXB', name: 'Dubai', boxIndex: '1b' },
  { code: 'AUH', name: 'Abu Dhabi', boxIndex: '1a' },
  { code: 'SHJ', name: 'Sharjah', boxIndex: '1c' },
  { code: 'AJM', name: 'Ajman', boxIndex: '1d' },
  { code: 'UAQ', name: 'Umm Al Quwain', boxIndex: '1e' },
  { code: 'RAK', name: 'Ras Al Khaimah', boxIndex: '1f' },
  { code: 'FUJ', name: 'Fujairah', boxIndex: '1g' },
];

/**
 * Validates a UAE Tax Registration Number (TRN).
 * Must be exactly 15 numeric digits (typically starts with 100).
 */
export function isValidUaeTrn(trn: string | null | undefined): boolean {
  if (!trn) return false;
  const clean = trn.replace(/[\s-]/g, '');
  return /^[0-9]{15}$/.test(clean);
}

/**
 * Sanitizes input to numeric only and max 15 digits.
 */
export function sanitizeUaeTrn(val: string): string {
  return val.replace(/[^0-9]/g, '').slice(0, 15);
}

/**
 * Formats a 15-digit TRN into standard readable chunks (e.g., 100-XXXX-XXXX-003).
 */
export function formatUaeTrnDisplay(trn: string): string {
  const digits = trn.replace(/[^0-9]/g, '');
  if (digits.length !== 15) return trn;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 12)}-${digits.slice(12, 15)}`;
}

/**
 * UAE VAT Classification Codes (PINT-AE / Peppol compliant)
 */
export interface UaeVatCategory {
  code: 'S' | 'Z' | 'E' | 'O';
  rate: number;
  label: string;
  description: string;
}

export const UAE_VAT_CATEGORIES: UaeVatCategory[] = [
  {
    code: 'S',
    rate: 5,
    label: 'Standard Rate (5%)',
    description: 'Standard taxable supplies of goods and services',
  },
  {
    code: 'Z',
    rate: 0,
    label: 'Zero-Rated (0%)',
    description: 'Exports outside GCC, international transport, certain healthcare & education',
  },
  {
    code: 'E',
    rate: 0,
    label: 'Exempt (0%)',
    description: 'Financial services, local passenger transport, residential bare land/leases',
  },
  {
    code: 'O',
    rate: 0,
    label: 'Out of Scope',
    description: 'Supplies outside the territorial scope of UAE VAT Law',
  },
];
