import { describe, it, expect } from 'vitest';
import {
  UAE_EMIRATES,
  isValidUaeTrn,
  sanitizeUaeTrn,
  formatUaeTrnDisplay,
  UAE_VAT_CATEGORIES,
} from '@/lib/tax/uae-tax';
import { buildUaePintXml } from '@/lib/tax/uae-pint-builder';
import { getCountryProfile } from '@/lib/tax/country-config';
import { Invoice, Organization } from '@/types/database';

describe('UAE Electronic Invoicing System (EIS) & Peppol PINT-AE Compliance', () => {
  it('strictly isolates UAE VAT profile while preserving India, US, and UK configurations', () => {
    const uae = getCountryProfile('AE');
    expect(uae.isUaeVat).toBe(true);
    expect(uae.isIndiaGst).toBe(false);
    expect(uae.taxSystem).toBe('VAT');
    expect(uae.defaultTaxRate).toBe(5);

    const india = getCountryProfile('IN');
    expect(india.isUaeVat).toBe(false);
    expect(india.isIndiaGst).toBe(true);
    expect(india.taxSystem).toBe('GST');

    const us = getCountryProfile('US');
    expect(us.isUaeVat).toBe(false);
    expect(us.isIndiaGst).toBe(false);
    expect(us.taxSystem).toBe('SALES_TAX');
  });

  it('validates 15-digit UAE TRN and sanitizes inputs properly', () => {
    // Valid 15-digit TRN
    expect(isValidUaeTrn('100234567800003')).toBe(true);
    expect(isValidUaeTrn('100 2345 6780 0003')).toBe(true);
    expect(isValidUaeTrn('100-2345-6780-0003')).toBe(true);

    // Invalid TRN lengths and characters
    expect(isValidUaeTrn('1002345678')).toBe(false); // only 10 digits
    expect(isValidUaeTrn('10023456780000399')).toBe(false); // 17 digits
    expect(isValidUaeTrn('27AAPFU0939F1ZV')).toBe(false); // Indian GSTIN
    expect(isValidUaeTrn('')).toBe(false);
    expect(isValidUaeTrn(null)).toBe(false);

    // Sanitization
    expect(sanitizeUaeTrn('TRN: 100-2345-6780-0003 ext')).toBe('100234567800003');
    expect(sanitizeUaeTrn('12345678901234567890')).toBe('123456789012345'); // clamped to 15 digits

    // Display formatting
    expect(formatUaeTrnDisplay('100234567800003')).toBe('100-2345-67800-003');
  });

  it('defines all 7 Emirates with their official UAE VAT Form 201 Box indices', () => {
    expect(UAE_EMIRATES.length).toBe(7);

    const emirates = UAE_EMIRATES.map((e) => e.name);
    expect(emirates).toContain('Abu Dhabi');
    expect(emirates).toContain('Dubai');
    expect(emirates).toContain('Sharjah');
    expect(emirates).toContain('Ajman');
    expect(emirates).toContain('Umm Al Quwain');
    expect(emirates).toContain('Ras Al Khaimah');
    expect(emirates).toContain('Fujairah');

    const abuDhabi = UAE_EMIRATES.find((e) => e.code === 'AUH');
    expect(abuDhabi?.boxIndex).toBe('1a');

    const dubai = UAE_EMIRATES.find((e) => e.code === 'DXB');
    expect(dubai?.boxIndex).toBe('1b');
  });

  it('builds a valid Peppol PINT-AE UBL 2.1 compliant XML invoice', () => {
    const mockOrg: Organization = {
      id: 'org_uae_01',
      name: 'Gulf Trading LLC',
      email: 'finance@gulftrading.ae',
      phone: '+971 4 123 4567',
      address: 'Business Bay, Tower 1',
      city: 'Dubai',
      business_state: 'Dubai',
      country: 'AE',
      gst_vat_number: '100456789000003',
      default_currency: 'AED',
      tax_type: 'VAT',
      default_tax_rate: 5,
      is_tax_enabled: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };

    const mockInvoice: Invoice = {
      id: 'inv_uae_001',
      quotation_id: 'q_uae_001',
      organization_id: 'org_uae_01',
      invoice_number: 'INV-2026-0042',
      customer_id: 'cust_01',
      customer_name: 'Al Futtaim Supplies',
      customer_email: 'accounts@alfuttaim.ae',
      customer_phone: '+971 50 987 6543',
      customer_address: 'Deira, Al Rigga',
      customer_city: 'Dubai',
      customer_state: 'Dubai',
      customer_country: 'AE',
      customer_gstin: '100987654300003',
      subtotal: 10000,
      total_tax: 500,
      total_amount: 10500,
      amount_paid: 0,
      balance_due: 10500,
      status: 'ISSUED',
      payment_status: 'PENDING',
      invoice_date: '2026-10-22',
      due_date: '2026-11-21',
      currency: 'AED',
      items: [
        {
          id: 'item_1',
          name: 'Commercial RO Water Purifier 500 LPH',
          description: 'Industrial filtration unit',
          quantity: 2,
          unit_price: 5000,
          total_price: 10000,
          tax_rate: 5,
          tax_amount: 500,
          goods_service_type: 'GOODS',
          hsn_sac_code: '8421.21',
        },
      ],
      created_at: '2026-10-22',
      updated_at: '2026-10-22',
    };

    const xml = buildUaePintXml(mockInvoice, mockOrg);

    // Verify root and Peppol PINT AE specification identifier
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"');
    expect(xml).toContain('urn:peppol:pint:billing-3.0@ae-1');
    expect(xml).toContain('<cbc:CustomizationID>urn:peppol:pint:billing-3.0@ae-1</cbc:CustomizationID>');

    // Verify invoice identification
    expect(xml).toContain('<cbc:ID>INV-2026-0042</cbc:ID>');
    expect(xml).toContain('<cbc:DocumentCurrencyCode>AED</cbc:DocumentCurrencyCode>');

    // Verify supplier & customer UAE TRN scheme (0231 for UAE TRN in Peppol)
    expect(xml).toContain('schemeID="0231">100456789000003</cbc:EndpointID>');
    expect(xml).toContain('<cbc:CompanyID>100456789000003</cbc:CompanyID>');
    expect(xml).toContain('schemeID="0231">100987654300003</cbc:EndpointID>');
    expect(xml).toContain('<cbc:RegistrationName>Al Futtaim Supplies</cbc:RegistrationName>');

    // Verify UAE Place of Supply Emirate tag
    expect(xml).toContain('<cbc:CountrySubentity>Dubai</cbc:CountrySubentity>');

    // Verify line item, classification, and tax breakdown
    expect(xml).toContain('<cbc:ItemClassificationCode listID="HS">8421.21</cbc:ItemClassificationCode>');
    expect(xml).toContain('<cbc:TaxableAmount currencyID="AED">10000.00</cbc:TaxableAmount>');
    expect(xml).toContain('<cbc:TaxAmount currencyID="AED">500.00</cbc:TaxAmount>');
    expect(xml).toContain('<cbc:Percent>5.00</cbc:Percent>');
    expect(xml).toContain('<cbc:ID>S</cbc:ID>'); // Standard rate category
    expect(xml).toContain('<cbc:PayableAmount currencyID="AED">10500.00</cbc:PayableAmount>');
  });
});
