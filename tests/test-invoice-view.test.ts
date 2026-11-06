import { describe, it, expect } from 'vitest';
import { calculateQuotationTotals, sanitizeTaxBreakdown } from '@/lib/quotations/calculations';
import { getCountryProfile } from '@/lib/tax/country-config';
import { buildWhatsAppMessage, getWhatsAppUrl } from '@/lib/whatsapp/automation';
import { buildUaePintXml } from '@/lib/tax/uae-pint-builder';

describe('Invoice Detail View Data Processing for UAE Invoice', () => {
  const org: any = {
    id: 'feebdd97-141c-4193-b176-b008aff9abdf',
    name: 'Samsung LLC',
    slug: 'samsung-llc-6172',
    email: 'applemedia123@atomicmail.io',
    phone: null,
    website: null,
    gst_vat_number: null,
    address_line1: null,
    city: null,
    state: null,
    country: 'United Arab Emirates',
    default_currency: 'AED',
    default_tax_rate: 0,
  };

  const customer: any = {
    id: 'c32730b3-794b-4303-a4ae-7f1dfe0a6a4c',
    name: 'Subesh',
    company_name: null,
    email: '12345678@mobile.client',
    phone: '+971 12345678',
    state: 'Dubai',
    country: 'India',
  };

  const invoice: any = {
    id: 'inv_1792674328118_krmwe',
    organization_id: 'feebdd97-141c-4193-b176-b008aff9abdf',
    customer_id: 'c32730b3-794b-4303-a4ae-7f1dfe0a6a4c',
    quotation_id: null,
    invoice_number: 'INV-000001',
    po_number: null,
    status: 'ISSUED',
    environment: 'live',
    issue_date: '2026-10-22',
    due_date: '2026-11-21',
    currency: 'AED',
    subtotal: 1500,
    discount_type: 'PERCENTAGE',
    discount_value: 0,
    discount_amount: 0,
    tax_rate: 0,
    tax_amount: 75,
    tax_mode: 'exclusive',
    tax_name: 'VAT',
    place_of_supply: 'Dubai',
    customer_gstin: null,
    grand_total: 1575,
    tax_breakdown: [{ label: 'VAT 5%', name: 'VAT 5%', rate: 5, amount: 75, is_inclusive: false }],
    notes: 'Thank you for your business.',
    terms_conditions: 'Standard terms',
    payment_terms: 'Net 30 Days',
    payment_method: 'Cash',
    is_paid: false,
    paid_amount: 0,
    balance_amount: 1575,
    organization: org,
    customer: customer,
    items: [
      {
        id: 'inv_item_1792674328347_0',
        invoice_id: 'inv_1792674328118_krmwe',
        description: 'Professional Consulting & Support Services',
        quantity: 1,
        unit: 'service',
        unit_price: 1500,
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        discount_amount: 0,
        tax_rate: 5,
        tax_amount: 75,
        line_total: 1575,
        item_type: 'SERVICE',
      },
    ],
  };

  it('calculates totals and processes UAE invoice data without error', () => {
    const currency = invoice.currency || 'INR';
    const countryNameOrCode = org.country || '';
    const isIndia = false;
    const isUAE = true;
    const countryProfile = getCountryProfile(countryNameOrCode || 'AE');
    const effectiveTaxName = 'VAT';
    const taxMode = invoice.tax_mode || 'exclusive';
    const placeOfSupply = invoice.place_of_supply;

    const calculated = calculateQuotationTotals(
      invoice.items.map((it: any) => ({
        quantity: Number(it.quantity) || 0,
        unit_price: Number(it.unit_price) || 0,
        tax_rate: Number(it.tax_rate) || 0,
      })),
      invoice.discount_type || null,
      Number(invoice.discount_value) || 0,
      {
        taxMode,
        currency,
        country: countryNameOrCode || (isUAE ? 'AE' : isIndia ? 'IN' : 'US'),
        taxName: effectiveTaxName,
        isIndiaGst: isIndia,
        businessState: org?.business_state || org?.state || null,
        placeOfSupply,
      }
    );

    expect(calculated.grand_total).toBe(1575);

    const displayTaxBreakdown = sanitizeTaxBreakdown(
      invoice.tax_breakdown && invoice.tax_breakdown.length > 0
        ? invoice.tax_breakdown
        : calculated.tax_breakdown,
      isIndia,
      effectiveTaxName,
      calculated.tax_amount,
      invoice.tax_rate || calculated.tax_rate || 5
    );

    expect(displayTaxBreakdown.length).toBe(1);

    const whatsappMsg = buildWhatsAppMessage({
      type: 'PAYMENT_REMINDER',
      template: org?.whatsapp_template_payment,
      customer,
      invoice,
      organization: org,
    });

    expect(whatsappMsg).toContain('INV-000001');

    const whatsappUrl = getWhatsAppUrl({
      targetPhone: customer?.phone,
      countryCode: customer?.phone_country_code || (isIndia ? '+91' : '+1'),
      message: whatsappMsg,
    });

    expect(whatsappUrl).toContain('97112345678');

    const xml = buildUaePintXml(invoice, org);
    expect(xml).toContain('INV-000001');
  });

  it('handles invoice when customer is undefined', () => {
    const invWithoutCustomer = { ...invoice, customer: undefined };
    const customer = invWithoutCustomer.customer;

    const whatsappMsg = buildWhatsAppMessage({
      type: 'PAYMENT_REMINDER',
      template: org?.whatsapp_template_payment,
      customer,
      invoice: invWithoutCustomer,
      organization: org,
    });

    expect(whatsappMsg).toBeDefined();

    const whatsappUrl = getWhatsAppUrl({
      targetPhone: customer?.phone,
      countryCode: customer?.phone_country_code || '+971',
      message: whatsappMsg,
    });

    expect(whatsappUrl).toBeDefined();
  });
});
