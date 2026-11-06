import { describe, it, expect } from 'vitest';
import {
  isGccCountry,
  getEffectiveDocumentLanguage,
  getLocalizedTerm,
  GCC_COUNTRY_CODES,
  GCC_COUNTRIES_METADATA,
  GCC_TERMS,
} from '@/lib/tax/gcc-translations';
import { OrganizationSettingsSchema } from '@/lib/validations/quotation';

describe('GCC Document Language & Localization Suite', () => {
  describe('isGccCountry Detection', () => {
    it('detects all 6 GCC member state ISO codes', () => {
      expect(isGccCountry('AE')).toBe(true);
      expect(isGccCountry('SA')).toBe(true);
      expect(isGccCountry('QA')).toBe(true);
      expect(isGccCountry('KW')).toBe(true);
      expect(isGccCountry('BH')).toBe(true);
      expect(isGccCountry('OM')).toBe(true);
    });

    it('detects GCC currencies', () => {
      expect(isGccCountry(null, 'AED')).toBe(true);
      expect(isGccCountry(null, 'SAR')).toBe(true);
      expect(isGccCountry(null, 'QAR')).toBe(true);
      expect(isGccCountry(null, 'KWD')).toBe(true);
      expect(isGccCountry(null, 'BHD')).toBe(true);
      expect(isGccCountry(null, 'OMR')).toBe(true);
    });

    it('detects GCC country names and variations', () => {
      expect(isGccCountry('United Arab Emirates')).toBe(true);
      expect(isGccCountry('UAE')).toBe(true);
      expect(isGccCountry('Saudi Arabia')).toBe(true);
      expect(isGccCountry('KSA')).toBe(true);
      expect(isGccCountry('Kingdom of Saudi Arabia')).toBe(true);
      expect(isGccCountry('State of Qatar')).toBe(true);
      expect(isGccCountry('Kuwait')).toBe(true);
      expect(isGccCountry('Kingdom of Bahrain')).toBe(true);
      expect(isGccCountry('Sultanate of Oman')).toBe(true);
    });

    it('returns false for non-GCC countries and currencies', () => {
      expect(isGccCountry('India', 'INR')).toBe(false);
      expect(isGccCountry('IN', 'INR')).toBe(false);
      expect(isGccCountry('United States', 'USD')).toBe(false);
      expect(isGccCountry('US', 'USD')).toBe(false);
      expect(isGccCountry('United Kingdom', 'GBP')).toBe(false);
      expect(isGccCountry('Germany', 'EUR')).toBe(false);
      expect(isGccCountry('Singapore', 'SGD')).toBe(false);
      expect(isGccCountry(null, null)).toBe(false);
      expect(isGccCountry('', '')).toBe(false);
    });
  });

  describe('getEffectiveDocumentLanguage Resolution', () => {
    it('defaults GCC businesses to bilingual "both" for ZATCA and UAE FTA compliance when unconfigured', () => {
      const uaeOrg = {
        country: 'United Arab Emirates',
        default_currency: 'AED',
      };
      expect(getEffectiveDocumentLanguage(uaeOrg)).toBe('both');

      const saudiOrg = {
        business_country: 'SA',
        default_currency: 'SAR',
      };
      expect(getEffectiveDocumentLanguage(saudiOrg)).toBe('both');
    });

    it('respects explicitly chosen document_language preference for GCC orgs', () => {
      const orgWithEnglish = {
        country: 'AE',
        default_currency: 'AED',
        document_language: 'en' as const,
      };
      expect(getEffectiveDocumentLanguage(orgWithEnglish)).toBe('en');

      const orgWithArabic = {
        country: 'SA',
        default_currency: 'SAR',
        document_language: 'ar' as const,
      };
      expect(getEffectiveDocumentLanguage(orgWithArabic)).toBe('ar');

      const orgWithBoth = {
        country: 'QA',
        default_currency: 'QAR',
        document_language: 'both' as const,
      };
      expect(getEffectiveDocumentLanguage(orgWithBoth)).toBe('both');
    });

    it('defaults non-GCC businesses (e.g. India, US) to "en"', () => {
      const indiaOrg = {
        country: 'India',
        business_country: 'IN',
        default_currency: 'INR',
      };
      expect(getEffectiveDocumentLanguage(indiaOrg)).toBe('en');

      const usOrg = {
        country: 'United States',
        default_currency: 'USD',
      };
      expect(getEffectiveDocumentLanguage(usOrg)).toBe('en');
    });

    it('respects override parameter when supplied', () => {
      const org = {
        country: 'AE',
        default_currency: 'AED',
        document_language: 'both' as const,
      };
      expect(getEffectiveDocumentLanguage(org, 'en')).toBe('en');
      expect(getEffectiveDocumentLanguage(org, 'ar')).toBe('ar');
    });
  });

  describe('getLocalizedTerm Translation Formats', () => {
    it('returns bilingual format (English / Arabic) when lang is "both"', () => {
      expect(getLocalizedTerm('tax_invoice', 'both')).toBe('Tax Invoice / فاتورة ضريبية');
      expect(getLocalizedTerm('subtotal', 'both')).toBe('Subtotal / المجموع الفرعي');
      expect(getLocalizedTerm('billed_to', 'both')).toBe('Billed To / فاتورة إلى');
      expect(getLocalizedTerm('quotation', 'both')).toBe('Quotation / عرض أسعار');
      expect(getLocalizedTerm('trn_tax_id', 'both')).toBe('TRN / Tax ID / الرقم الضريبي');
      expect(getLocalizedTerm('bank_details', 'both')).toBe('Bank Remittance Details / بيانات التحويل البنكي');
      expect(getLocalizedTerm('terms_conditions', 'both')).toBe('Terms & Conditions / الشروط والأحكام');
    });

    it('returns Arabic only when lang is "ar"', () => {
      expect(getLocalizedTerm('tax_invoice', 'ar')).toBe('فاتورة ضريبية');
      expect(getLocalizedTerm('subtotal', 'ar')).toBe('المجموع الفرعي');
      expect(getLocalizedTerm('grand_total', 'ar')).toBe('المجموع الكلي');
      expect(getLocalizedTerm('billed_to', 'ar')).toBe('فاتورة إلى');
      expect(getLocalizedTerm('quantity', 'ar')).toBe('الكمية');
      expect(getLocalizedTerm('rate', 'ar')).toBe('سعر الوحدة');
    });

    it('returns English only when lang is "en"', () => {
      expect(getLocalizedTerm('tax_invoice', 'en')).toBe('Tax Invoice');
      expect(getLocalizedTerm('subtotal', 'en')).toBe('Subtotal');
      expect(getLocalizedTerm('grand_total', 'en')).toBe('Grand Total');
      expect(getLocalizedTerm('billed_to', 'en')).toBe('Billed To');
      expect(getLocalizedTerm('quantity', 'en')).toBe('Qty');
      expect(getLocalizedTerm('rate', 'en')).toBe('Rate');
    });

    it('supports custom English labels with Arabic pairings', () => {
      expect(getLocalizedTerm('tax_invoice', 'both', 'Commercial Tax Invoice')).toBe(
        'Commercial Tax Invoice / فاتورة ضريبية'
      );
      expect(getLocalizedTerm('grand_total', 'both', 'Total Amount')).toBe(
        'Total Amount / المجموع الكلي'
      );
    });

    it('gracefully handles missing keys by returning the key or custom English', () => {
      expect(getLocalizedTerm('unknown_term_xyz', 'en')).toBe('unknown_term_xyz');
      expect(getLocalizedTerm('unknown_term_xyz', 'both', 'Custom Fallback')).toBe('Custom Fallback');
    });
  });

  describe('OrganizationSettingsSchema Validation', () => {
    it('validates document_language values: "en", "ar", "both", or null', () => {
      const base = {
        name: 'Gulf Trading LLC',
        country: 'United Arab Emirates',
        default_currency: 'AED',
      };

      const parsedBoth = OrganizationSettingsSchema.parse({
        ...base,
        document_language: 'both',
      });
      expect(parsedBoth.document_language).toBe('both');

      const parsedArabic = OrganizationSettingsSchema.parse({
        ...base,
        document_language: 'ar',
      });
      expect(parsedArabic.document_language).toBe('ar');

      const parsedEnglish = OrganizationSettingsSchema.parse({
        ...base,
        document_language: 'en',
      });
      expect(parsedEnglish.document_language).toBe('en');

      const parsedNull = OrganizationSettingsSchema.parse({
        ...base,
        document_language: null,
      });
      expect(parsedNull.document_language).toBeNull();
    });

    it('rejects invalid document_language strings', () => {
      const invalid = {
        name: 'Gulf Trading LLC',
        document_language: 'french',
      };
      expect(() => OrganizationSettingsSchema.parse(invalid)).toThrow();
    });
  });
});
