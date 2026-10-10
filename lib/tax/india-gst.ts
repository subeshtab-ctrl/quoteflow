export interface IndianState {
  code: string;
  name: string;
}

export const INDIAN_STATES: IndianState[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh (New)' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

/**
 * Normalizes state name or code for robust matching
 */
export function normalizeState(input?: string | null): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Finds an IndianState object by name or 2-digit state code
 */
export function findIndianState(stateNameOrCode?: string | null): IndianState | undefined {
  if (!stateNameOrCode) return undefined;
  const clean = stateNameOrCode.trim();
  const norm = normalizeState(clean);
  return INDIAN_STATES.find(
    (s) => s.code === clean || normalizeState(s.name) === norm
  );
}

/**
 * Resolves 2-digit GST state code from name or code
 */
export function getStateCodeByName(stateNameOrCode?: string | null): string | null {
  const found = findIndianState(stateNameOrCode);
  if (found) return found.code;
  if (stateNameOrCode && /^\d{2}$/.test(stateNameOrCode.trim())) {
    return stateNameOrCode.trim();
  }
  return null;
}

/**
 * Resolves state name from 2-digit code
 */
export function getStateNameByCode(code?: string | null): string | null {
  if (!code) return null;
  const found = findIndianState(code);
  return found ? found.name : code.trim();
}

/**
 * Strict Indian GSTIN validation (15 alphanumeric characters)
 * Format: 2-digit state code + 10-char PAN + 1-digit entity code + 'Z' + 1 checksum char
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGstin(gstin?: string | null): {
  isValid: boolean;
  valid: boolean;
  stateCode?: string;
  stateName?: string;
  message?: string;
  error?: string;
} {
  if (!gstin || !gstin.trim()) {
    const msg = 'GSTIN is required';
    return { isValid: false, valid: false, message: msg, error: msg };
  }

  const clean = gstin.trim().toUpperCase();

  if (clean.length !== 15) {
    const msg = `GSTIN must be exactly 15 characters (entered ${clean.length})`;
    return {
      isValid: false,
      valid: false,
      message: msg,
      error: msg,
    };
  }

  if (!GSTIN_REGEX.test(clean)) {
    const msg = 'Invalid GSTIN format. Expected format: 22AAAAA0000A1Z5';
    return {
      isValid: false,
      valid: false,
      message: msg,
      error: msg,
    };
  }

  const stateCode = clean.substring(0, 2);
  const state = INDIAN_STATES.find((s) => s.code === stateCode);

  return {
    isValid: true,
    valid: true,
    stateCode,
    stateName: state?.name,
  };
}

/**
 * Determine if transaction is Inter-State (IGST) or Intra-State (CGST + SGST)
 * Place of Supply vs Supplier State
 */
export function isInterstateSupply(params: {
  supplierState?: string | null;
  placeOfSupply?: string | null;
}): boolean {
  const { supplierState, placeOfSupply } = params;
  if (!supplierState || !placeOfSupply) {
    // If not specified, default to Intra-state
    return false;
  }

  const code1 = getStateCodeByName(supplierState);
  const code2 = getStateCodeByName(placeOfSupply);

  if (code1 && code2) {
    return code1 !== code2;
  }

  // Fallback to normalized name comparison
  return normalizeState(supplierState) !== normalizeState(placeOfSupply);
}
