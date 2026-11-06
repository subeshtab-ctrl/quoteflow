import { INDIAN_STATES } from './india-gst';

export interface TaxIdLookupResult {
  valid: boolean;
  taxNumber: string;
  country: string;
  companyName?: string;
  tradeName?: string;
  address?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  postalCode?: string;
  entityType?: string;
  pan?: string;
  status?: string;
  taxSystem: 'GST' | 'VAT' | 'SALES_TAX' | 'CUSTOM';
  source: 'gstin_decoder' | 'gst_portal' | 'eu_vies' | 'uk_hmrc' | 'fallback';
}

const PAN_ENTITY_MAP: Record<string, string> = {
  C: 'Company / Private Limited',
  P: 'Individual / Sole Proprietor',
  H: 'Hindu Undivided Family (HUF)',
  F: 'Partnership Firm / LLP',
  A: 'Association of Persons (AOP)',
  T: 'Trust',
  B: 'Body of Individuals (BOI)',
  L: 'Local Authority',
  J: 'Artificial Juridical Person',
  G: 'Government Agency',
};

/**
 * Validates and decodes Indian GSTIN structure
 * GSTIN Format: 2-digit State Code + 10-char PAN + 1-char Entity No + 'Z' + 1 Checksum
 */
export function decodeGstin(gstinRaw: string): TaxIdLookupResult | null {
  const clean = gstinRaw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean || clean.length !== 15) {
    return null;
  }

  // Regex check for 15-char Indian GSTIN
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const isWellFormed = gstinRegex.test(clean);

  const stateCode = clean.slice(0, 2);
  const pan = clean.slice(2, 12);
  const entityChar = clean.charAt(5); // 4th char of PAN represents entity type
  const entityType = PAN_ENTITY_MAP[entityChar] || 'Business Entity';

  const matchedState = INDIAN_STATES.find((s) => s.code === stateCode);
  const stateName = matchedState ? matchedState.name : '';

  return {
    valid: isWellFormed,
    taxNumber: clean,
    country: 'India',
    state: stateName,
    stateCode,
    pan,
    entityType,
    status: isWellFormed ? 'ACTIVE' : 'FORMAT_MISMATCH',
    taxSystem: 'GST',
    source: 'gstin_decoder',
  };
}

/**
 * Perform live lookup across India GST, EU VIES, and UK HMRC
 */
export async function lookupTaxId(params: {
  taxNumber: string;
  countryCode?: string;
}): Promise<TaxIdLookupResult> {
  const rawNum = params.taxNumber.trim().toUpperCase().replace(/[\s-]/g, '');
  const country = (params.countryCode || '').trim().toUpperCase();

  // 1. India GSTIN Lookup
  const isIndiaCandidate =
    country === 'IN' ||
    country === 'INDIA' ||
    /^[0-9]{2}[A-Z]{5}[0-9]{4}/.test(rawNum);

  if (isIndiaCandidate && rawNum.length === 15) {
    const decoded = decodeGstin(rawNum);
    if (decoded) {
      // Try public GST lookup endpoint with short timeout
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);

        // Call public GST lookup service (e.g. open community GST API)
        const response = await fetch(`https://sheet.gstincheck.co.in/check/${rawNum}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'QuoteFlow/2.0' },
        }).catch(() => null);

        clearTimeout(timeout);

        if (response && response.ok) {
          const data = await response.json().catch(() => null);
          if (data && data.flag && data.data) {
            const d = data.data;
            const legalName = d.lgnm || d.tradeNam || '';
            const tradeName = d.tradeNam || d.lgnm || '';
            const addrObj = d.pradr?.addr || {};
            const addressParts = [
              addrObj.bno,
              addrObj.bnm,
              addrObj.st,
              addrObj.loc,
              addrObj.dst,
            ].filter(Boolean);

            return {
              valid: true,
              taxNumber: rawNum,
              country: 'India',
              companyName: tradeName || legalName,
              tradeName,
              address: addressParts.join(', ') || undefined,
              city: addrObj.dst || addrObj.city || undefined,
              state: decoded.state,
              stateCode: decoded.stateCode,
              postalCode: addrObj.pncd || undefined,
              pan: decoded.pan,
              entityType: decoded.entityType,
              status: d.sts || 'Active',
              taxSystem: 'GST',
              source: 'gst_portal',
            };
          }
        }
      } catch {
        // Fall back gracefully to decoded info
      }

      return decoded;
    }
  }

  // 2. European Union VIES VAT Lookup
  // EU VAT numbers start with 2-letter country code (e.g. DE, FR, IT, ES, NL, BE)
  const euMatch = rawNum.match(/^([A-Z]{2})([A-Z0-9]+)$/);
  if (euMatch && (country !== 'IN')) {
    const msCode = euMatch[1];
    const vatNum = euMatch[2];
    const EU_MEMBERS = [
      'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES',
      'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
      'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
    ];

    if (EU_MEMBERS.includes(msCode)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const viesUrl = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${msCode}/vat/${vatNum}`;
        const res = await fetch(viesUrl, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (data && data.isValid) {
            return {
              valid: true,
              taxNumber: rawNum,
              country: msCode,
              companyName: data.name !== '---' ? data.name : undefined,
              address: data.address !== '---' ? data.address : undefined,
              status: 'VALID',
              taxSystem: 'VAT',
              source: 'eu_vies',
            };
          }
        }
      } catch {}
    }
  }

  // 3. United Kingdom HMRC VAT Lookup
  const isUk = country === 'GB' || country === 'UK' || rawNum.startsWith('GB');
  const ukVatNum = rawNum.replace(/^GB/, '');
  if (isUk && /^[0-9]{9}$/.test(ukVatNum)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const hmrcUrl = `https://api.service.hmrc.gov.uk/organisations/vat/check-vat-number/lookup/${ukVatNum}`;
      const res = await fetch(hmrcUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data && data.target) {
          const target = data.target;
          const addr = target.address
            ? [target.address.line1, target.address.line2, target.address.postcode, target.address.countryCode]
                .filter(Boolean)
                .join(', ')
            : undefined;

          return {
            valid: true,
            taxNumber: rawNum.startsWith('GB') ? rawNum : `GB${rawNum}`,
            country: 'United Kingdom',
            companyName: target.name,
            address: addr,
            city: target.address?.line2 || undefined,
            postalCode: target.address?.postcode || undefined,
            status: 'VALID',
            taxSystem: 'VAT',
            source: 'uk_hmrc',
          };
        }
      }
    } catch {}
  }

  // Fallback for general tax IDs
  return {
    valid: rawNum.length > 3,
    taxNumber: rawNum,
    country: params.countryCode || 'International',
    status: 'RECORDED',
    taxSystem: 'CUSTOM',
    source: 'fallback',
  };
}
