import { describe, it, expect } from 'vitest';
import { decodeGstin, lookupTaxId } from '@/lib/tax/tax-id-lookup';

describe('GSTIN and Tax ID Verification & Lookup', () => {
  it('correctly decodes Indian GSTIN for Kerala (32)', () => {
    // 32 = Kerala, AABCU9603R = PAN, 1 = 1st registration, Z = default, M = checksum
    const decoded = decodeGstin('32AABCU9603R1ZM');
    expect(decoded).not.toBeNull();
    expect(decoded?.valid).toBe(true);
    expect(decoded?.state).toBe('Kerala');
    expect(decoded?.stateCode).toBe('32');
    expect(decoded?.pan).toBe('AABCU9603R');
    expect(decoded?.entityType).toBe('Company / Private Limited');
    expect(decoded?.taxSystem).toBe('GST');
  });

  it('correctly decodes Indian GSTIN for Karnataka (29) Sole Proprietorship', () => {
    // 29 = Karnataka, 4th letter of PAN 'P' = Sole Proprietor
    const decoded = decodeGstin('29ABCPD1234F1Z5');
    expect(decoded).not.toBeNull();
    expect(decoded?.state).toBe('Karnataka');
    expect(decoded?.stateCode).toBe('29');
    expect(decoded?.entityType).toBe('Individual / Sole Proprietor');
  });

  it('handles invalid or malformed GSTIN gracefully', () => {
    const decoded = decodeGstin('INVALID123');
    expect(decoded).toBeNull();
  });

  it('performs lookupTaxId for GSTIN and returns state & PAN', async () => {
    const res = await lookupTaxId({ taxNumber: '32AABCU9603R1ZM', countryCode: 'IN' });
    expect(res.valid).toBe(true);
    expect(res.state).toBe('Kerala');
    expect(res.stateCode).toBe('32');
  });
});
