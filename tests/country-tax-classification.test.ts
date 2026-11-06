import { describe, it, expect } from 'vitest';
import {
  getCountryProfile,
  getCountryClassificationPresets,
  calculateItemTaxBreakdown,
} from '@/lib/tax/country-config';

describe('International Tax and Commodity Classification System', () => {
  it('correctly resolves UAE tax profile by country code, name, and AED currency', () => {
    const byCode = getCountryProfile('AE');
    expect(byCode.name).toBe('United Arab Emirates');
    expect(byCode.taxSystem).toBe('VAT');
    expect(byCode.taxLabel).toContain('TRN');
    expect(byCode.goodsClassificationLabel).toBe('HS Code');
    expect(byCode.serviceClassificationLabel).toBe('Service Category');
    expect(byCode.defaultTaxRate).toBe(5);
    expect(byCode.isIndiaGst).toBe(false);
    expect(byCode.isUaeVat).toBe(true);

    const byAlias = getCountryProfile('UAE');
    expect(byAlias.code).toBe('AE');

    const byCurrency = getCountryProfile('AED');
    expect(byCurrency.code).toBe('AE');
  });

  it('correctly provides UAE HS codes and VAT service presets', () => {
    const presets = getCountryClassificationPresets('AE');
    expect(presets.length).toBeGreaterThan(5);

    const waterGoods = presets.find((p) => p.code === '8421.21');
    expect(waterGoods).toBeDefined();
    expect(waterGoods?.type).toBe('HS');
    expect(waterGoods?.defaultTaxRate).toBe(5);

    const itService = presets.find((p) => p.code === 'SRV-IT-5');
    expect(itService).toBeDefined();
    expect(itService?.type).toBe('SERVICE');
    expect(itService?.defaultTaxRate).toBe(5);

    const exportService = presets.find((p) => p.code === 'SRV-EXP-0');
    expect(exportService).toBeDefined();
    expect(exportService?.defaultTaxRate).toBe(0);
  });

  it('correctly resolves India GST profile with HSN/SAC', () => {
    const profile = getCountryProfile('IN');
    expect(profile.taxSystem).toBe('GST');
    expect(profile.taxLabel).toContain('GSTIN');
    expect(profile.goodsClassificationLabel).toBe('HSN Code');
    expect(profile.serviceClassificationLabel).toBe('SAC Code');
    expect(profile.defaultTaxRate).toBe(18);
    expect(profile.isIndiaGst).toBe(true);
    expect(profile.isUaeVat).toBe(false);

    const presets = getCountryClassificationPresets('IN');
    const sacItem = presets.find((p) => p.code === '998311');
    expect(sacItem).toBeDefined();
    expect(sacItem?.type).toBe('SAC');
  });

  it('correctly resolves US Sales Tax and UK VAT profiles', () => {
    const usProfile = getCountryProfile('US');
    expect(usProfile.taxSystem).toBe('SALES_TAX');
    expect(usProfile.goodsClassificationLabel).toBe('Item / SKU Code');
    expect(usProfile.serviceClassificationLabel).toBe('Service Code');

    const ukProfile = getCountryProfile('GB');
    expect(ukProfile.taxSystem).toBe('VAT');
    expect(ukProfile.goodsClassificationLabel).toBe('Commodity Code');
    expect(ukProfile.defaultTaxRate).toBe(20);
  });

  it('calculates UAE VAT accurately without Indian CGST/SGST splits', () => {
    const uaeCalc = calculateItemTaxBreakdown({
      countryCode: 'AE',
      taxRate: 5,
      taxableAmount: 1000,
    });
    expect(uaeCalc.totalTax).toBe(50);
    expect(uaeCalc.vatAmount).toBe(50);
    expect(uaeCalc.cgstRate).toBeUndefined();
    expect(uaeCalc.sgstRate).toBeUndefined();
    expect(uaeCalc.breakdownSummary).toContain('UAE VAT @ 5%');
  });
});
