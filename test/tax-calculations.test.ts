import { describe, it, expect } from 'vitest';
import {
  calculateQuotationTotals,
  calculateLineItem,
  formatCurrency,
  isValidDocumentText,
} from '@/lib/quotations/calculations';
import { validateGstin, isInterstateSupply, getStateCodeByName } from '@/lib/tax/india-gst';

describe('Tax Inclusive & Exclusive Calculations (Requirements 1, 2, 3, 11)', () => {
  it('Test 1 — Inclusive Tax: Entered ₹5000 with 5% tax should retain ₹5000 total', () => {
    const result = calculateQuotationTotals({
      items: [
        {
          description: 'Web Design Package',
          quantity: 1,
          unit: 'service',
          unit_price: 5000,
          discount_value: 0,
          tax_rate: 5,
        },
      ],
      tax_rate: 5,
      tax_mode: 'inclusive',
      supplier_state: 'Karnataka',
      place_of_supply: 'Karnataka',
    });

    // Subtotal: ₹4,761.90
    expect(result.subtotal).toBe(4761.90);
    // Tax Amount: ₹238.10
    expect(result.tax_amount).toBe(238.10);
    // Grand Total: ₹5,000.00
    expect(result.grand_total).toBe(5000.00);
    // Invariant: Subtotal + Tax === Total
    expect(Math.round((result.subtotal + result.tax_amount) * 100) / 100).toBe(result.grand_total);

    // Intra-state GST breakdown
    expect(result.cgst_rate).toBe(2.5);
    expect(result.cgst_amount).toBe(119.05);
    expect(result.sgst_rate).toBe(2.5);
    expect(result.sgst_amount).toBe(119.05);
    expect(result.igst_amount).toBe(0);
    expect(result.cgst_amount! + result.sgst_amount!).toBe(result.tax_amount);

    expect(result.tax_breakdown).toMatchObject([
      { label: 'CGST 2.5% (Included)', rate: 2.5, amount: 119.05, is_inclusive: true },
      { label: 'SGST 2.5% (Included)', rate: 2.5, amount: 119.05, is_inclusive: true },
    ]);
  });

  it('Test 2 — Exclusive Tax: Entered ₹5000 with 5% tax should total ₹5250', () => {
    const result = calculateQuotationTotals({
      items: [
        {
          description: 'Consulting Services',
          quantity: 1,
          unit: 'service',
          unit_price: 5000,
          discount_value: 0,
          tax_rate: 5,
        },
      ],
      tax_rate: 5,
      tax_mode: 'exclusive',
      supplier_state: 'Karnataka',
      place_of_supply: 'Karnataka',
    });

    expect(result.subtotal).toBe(5000.00);
    expect(result.tax_amount).toBe(250.00);
    expect(result.grand_total).toBe(5250.00);
    expect(result.cgst_amount).toBe(125.00);
    expect(result.sgst_amount).toBe(125.00);
    expect(result.tax_breakdown).toMatchObject([
      { label: 'CGST 2.5%', rate: 2.5, amount: 125.00, is_inclusive: false },
      { label: 'SGST 2.5%', rate: 2.5, amount: 125.00, is_inclusive: false },
    ]);
  });

  it('Test 3 — No Tax: Entered ₹5000 with no tax should not show tax row', () => {
    const result = calculateQuotationTotals({
      items: [
        {
          description: 'Exempt Goods',
          quantity: 1,
          unit: 'pcs',
          unit_price: 5000,
          discount_value: 0,
          tax_rate: 0,
        },
      ],
      tax_rate: 0,
      tax_mode: 'exclusive',
    });

    expect(result.subtotal).toBe(5000.00);
    expect(result.tax_amount).toBe(0);
    expect(result.grand_total).toBe(5000.00);
    expect(result.tax_breakdown).toHaveLength(0);
  });

  it('Inter-State GST (IGST): Karnataka to Maharashtra splits into 100% IGST', () => {
    const result = calculateQuotationTotals({
      items: [
        {
          description: 'Server Migration',
          quantity: 1,
          unit: 'service',
          unit_price: 10000,
          discount_value: 0,
          tax_rate: 18,
        },
      ],
      tax_rate: 18,
      tax_mode: 'exclusive',
      supplier_state: 'Karnataka',
      place_of_supply: 'Maharashtra',
    });

    expect(result.subtotal).toBe(10000.00);
    expect(result.tax_amount).toBe(1800.00);
    expect(result.grand_total).toBe(11800.00);
    expect(result.igst_rate).toBe(18);
    expect(result.igst_amount).toBe(1800.00);
    expect(result.cgst_amount).toBe(0);
    expect(result.sgst_amount).toBe(0);
    expect(result.tax_breakdown).toMatchObject([
      { label: 'IGST 18%', rate: 18, amount: 1800.00, is_inclusive: false },
    ]);
  });

  it('Terms & Conditions and Notes validator hides empty/nil/whitespace', () => {
    expect(isValidDocumentText('')).toBe(false);
    expect(isValidDocumentText('   ')).toBe(false);
    expect(isValidDocumentText(null)).toBe(false);
    expect(isValidDocumentText(undefined)).toBe(false);
    expect(isValidDocumentText('N/A')).toBe(false);
    expect(isValidDocumentText('n/a')).toBe(false);
    expect(isValidDocumentText('Nil')).toBe(false);
    expect(isValidDocumentText('none')).toBe(false);
    expect(isValidDocumentText('-')).toBe(false);

    expect(isValidDocumentText('Payment due within 7 days.')).toBe(true);
    expect(isValidDocumentText('Goods once sold are non-refundable.')).toBe(true);
  });

  it('Currency formatting always shows official symbols', () => {
    expect(formatCurrency(5000, 'INR')).toBe('₹5,000.00');
    expect(formatCurrency(5000, 'USD')).toBe('$5,000.00');
    expect(formatCurrency(5000, 'EUR')).toBe('€5,000.00');
    expect(formatCurrency(5000, 'GBP')).toBe('£5,000.00');
    expect(formatCurrency(5000, 'AED')).toBe('د.إ 5,000.00');
    expect(formatCurrency(5000, 'SAR')).toBe('ر.س 5,000.00');
    expect(formatCurrency(5000, 'KWD')).toBe('د.ك 5,000.00');
  });

  it('Indian GSTIN validator validates 15-character structure', () => {
    // Valid Karnataka GSTIN
    const valid = validateGstin('29ABCDE1234F1Z5');
    expect(valid.isValid).toBe(true);
    expect(valid.stateCode).toBe('29');
    expect(valid.stateName).toBe('Karnataka');

    // Invalid GSTINs
    expect(validateGstin('123').isValid).toBe(false);
    expect(validateGstin('INVALIDGSTIN123').isValid).toBe(false);
  });

  it('India GST Intra-State vs Inter-State Automatic Breakdown (Kerala to Kerala vs Kerala to Karnataka)', () => {
    // Intra-State: Kerala -> Kerala @ 18% GST on ₹5,000
    const intra = calculateQuotationTotals(
      [{ quantity: 1, unit_price: 5000, discount_percent: 0, tax_rate: 18 }],
      'INR',
      {
        taxMode: 'exclusive',
        businessState: 'Kerala',
        placeOfSupply: 'Kerala',
        gstEnabled: true,
      }
    );
    expect(intra.subtotal).toBe(5000.00);
    expect(intra.cgst_amount).toBe(450.00);
    expect(intra.sgst_amount).toBe(450.00);
    expect(intra.igst_amount).toBe(0);
    expect(intra.grand_total).toBe(5900.00);
    expect(intra.tax_breakdown.map((b) => b.label)).toEqual(['CGST 9%', 'SGST 9%']);

    // Inter-State: Kerala -> Karnataka @ 18% GST on ₹5,000
    const inter = calculateQuotationTotals(
      [{ quantity: 1, unit_price: 5000, discount_percent: 0, tax_rate: 18 }],
      'INR',
      {
        taxMode: 'exclusive',
        businessState: 'Kerala',
        placeOfSupply: 'Karnataka',
        gstEnabled: true,
      }
    );
    expect(inter.subtotal).toBe(5000.00);
    expect(inter.igst_amount).toBe(900.00);
    expect(inter.cgst_amount).toBe(0);
    expect(inter.sgst_amount).toBe(0);
    expect(inter.grand_total).toBe(5900.00);
    expect(inter.tax_breakdown.map((b) => b.label)).toEqual(['IGST 18%']);
  });

  it('PDF Generation & Report Matrix (Quote, Invoice, Report PDFs across Inclusive/Exclusive/No Tax, Terms/Notes, INR/USD/EUR, Single/Multi-page)', async () => {
    const { generateQuotationPdf } = await import('@/lib/pdf/generator');
    const { generateInvoicePdf } = await import('@/lib/pdf/invoice-pdf-generator');
    const { calculateReportData } = await import('@/lib/reports/report-calculator');
    const { generateQuoteFlowPdfReport } = await import('@/lib/reports/pdf-report-builder');

    const baseOrg: any = {
      id: 'org-1',
      name: 'Blend & Bold Studio',
      slug: 'blend-bold',
      email: 'billing@blendandbold.com',
      phone: '+91 9876543210',
      address_line1: 'MG Road',
      city: 'Kochi',
      state: 'Kerala',
      business_state: 'Kerala',
      state_code: '32',
      country: 'India',
      default_currency: 'INR',
      default_tax_rate: 18,
      default_tax_mode: 'exclusive',
      gst_registered: true,
      gstin: '32AABCU9603R1ZM',
      gst_vat_number: '32AABCU9603R1ZM',
    };

    const baseCustomer: any = {
      id: 'cust-1',
      organization_id: 'org-1',
      name: 'Rahul Nair',
      company_name: 'Nair Enterprises',
      email: 'rahul@nair.in',
      phone: '9876543210',
      city: 'Kochi',
      state: 'Kerala',
      billing_state: 'Kerala',
      place_of_supply: 'Kerala',
      customer_gstin: '32ABCDE1234F1Z5',
      tax_number: '32ABCDE1234F1Z5',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const currencies = ['INR', 'USD', 'EUR'] as const;
    const taxModes = ['inclusive', 'exclusive'] as const;

    for (const curr of currencies) {
      for (const mode of taxModes) {
        // Single-page with Terms & Notes present
        const quoteBytes = await generateQuotationPdf({
          id: `q-${curr}-${mode}`,
          organization_id: 'org-1',
          quotation_number: `QT-2026-${curr}-${mode}`,
          customer_id: 'cust-1',
          title: 'Commercial Proposal',
          status: 'SENT',
          issue_date: '2026-10-10',
          valid_until: '2026-10-25',
          currency: curr,
          tax_mode: mode,
          place_of_supply: 'Kerala',
          subtotal: mode === 'inclusive' ? 4761.90 : 5000,
          discount_type: 'fixed',
          discount_value: 0,
          discount_amount: 0,
          tax_rate: 5,
          tax_amount: mode === 'inclusive' ? 238.10 : 250,
          grand_total: mode === 'inclusive' ? 5000 : 5250,
          notes: 'Please review the milestone schedule.',
          terms_conditions: 'Payment due within 7 days.',
          public_token: 'tok-123',
          created_by: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          organization: baseOrg,
          customer: baseCustomer,
          items: [
            {
              id: 'item-1',
              quotation_id: 'q-1',
              name: 'UI/UX Design',
              description: 'UI/UX Design',
              quantity: 1,
              unit: 'project',
              unit_price: 5000,
              discount_percent: 0,
              discount_amount: 0,
              tax_rate: 5,
              tax_amount: mode === 'inclusive' ? 238.10 : 250,
              total: mode === 'inclusive' ? 5000 : 5250,
              line_total: mode === 'inclusive' ? 5000 : 5250,
              sort_order: 0,
            },
          ],
        } as any);
        expect(quoteBytes.byteLength).toBeGreaterThan(1000);

        // Invoice with No Tax & Empty Terms/Notes
        const invBytes = await generateInvoicePdf({
          id: `inv-${curr}-${mode}`,
          organization_id: 'org-1',
          invoice_number: `INV-2026-${curr}-${mode}`,
          customer_id: 'cust-1',
          status: 'ISSUED',
          issue_date: '2026-10-10',
          due_date: '2026-10-17',
          payment_terms: 'Net 7',
          currency: curr,
          tax_mode: mode,
          place_of_supply: 'Karnataka',
          subtotal: 5000,
          discount_amount: 0,
          tax_rate: 0,
          tax_amount: 0,
          grand_total: 5000,
          notes: '',
          terms_conditions: '   ',
          is_paid: false,
          created_by: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          organization: baseOrg,
          customer: baseCustomer,
          items: [
            {
              id: 'ii-1',
              invoice_id: 'inv-1',
              description: 'Zero Tax Consulting',
              item_type: 'SERVICE',
              quantity: 1,
              unit: 'service',
              unit_price: 5000,
              discount_percent: 0,
              discount_amount: 0,
              tax_rate: 0,
              tax_amount: 0,
              line_total: 5000,
              sort_order: 0,
            },
          ],
        } as any);
        expect(invBytes.byteLength).toBeGreaterThan(1000);
      }
    }

    // Multi-page Invoice & Quote PDF test (35 line items)
    const manyItems = Array.from({ length: 35 }, (_, i) => ({
      id: `item-${i}`,
      quotation_id: 'q-multi',
      invoice_id: 'inv-multi',
      name: `Line Item #${i + 1}`,
      description: `Detailed Deliverable #${i + 1} with extended description text`,
      item_type: 'SERVICE' as const,
      quantity: 2,
      unit: 'hrs',
      unit_price: 1500,
      discount_percent: 0,
      discount_amount: 0,
      tax_rate: 18,
      tax_amount: 540,
      total: 3540,
      line_total: 3540,
      sort_order: i,
    }));

    const multiPageQuotePdf = await generateQuotationPdf({
      id: 'q-multi',
      organization_id: 'org-1',
      quotation_number: 'QT-MULTI-001',
      customer_id: 'cust-1',
      title: 'Multi-page Enterprise Rollout',
      status: 'APPROVED',
      issue_date: '2026-10-10',
      valid_until: '2026-11-10',
      currency: 'INR',
      tax_mode: 'exclusive',
      place_of_supply: 'Kerala',
      subtotal: 105000,
      discount_type: 'fixed',
      discount_value: 0,
      discount_amount: 0,
      tax_rate: 18,
      tax_amount: 18900,
      grand_total: 123900,
      notes: 'Multi-page notes check.',
      terms_conditions: 'Multi-page terms check.',
      public_token: 'tok-multi',
      created_by: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      organization: baseOrg,
      customer: baseCustomer,
      items: manyItems,
    } as any);
    expect(multiPageQuotePdf.byteLength).toBeGreaterThan(2000);

    const multiPageInvoicePdf = await generateInvoicePdf({
      id: 'inv-multi',
      organization_id: 'org-1',
      invoice_number: 'INV-MULTI-001',
      customer_id: 'cust-1',
      status: 'ISSUED',
      issue_date: '2026-10-10',
      due_date: '2026-11-10',
      payment_terms: 'Net 30',
      currency: 'INR',
      tax_mode: 'exclusive',
      place_of_supply: 'Kerala',
      subtotal: 105000,
      discount_amount: 0,
      tax_rate: 18,
      tax_amount: 18900,
      grand_total: 123900,
      notes: 'Multi-page invoice notes.',
      terms_conditions: 'Multi-page invoice terms.',
      is_paid: false,
      created_by: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      organization: baseOrg,
      customer: baseCustomer,
      items: manyItems,
    } as any);
    expect(multiPageInvoicePdf.byteLength).toBeGreaterThan(2000);

    // Multi-currency Report Calculation & PDF Generation (Requirement 9)
    const nowIso = new Date().toISOString();
    const reportData = calculateReportData({
      filters: {
        category: 'sales',
        reportType: 'sales-summary',
        preset: 'this_month',
      },
      quotations: [],
      invoices: [
        {
          id: 'inv-inr',
          organization_id: 'org-1',
          invoice_number: 'INV-INR-01',
          customer_id: 'cust-1',
          status: 'ISSUED',
          issue_date: nowIso,
          due_date: nowIso,
          payment_terms: 'Net 7',
          currency: 'INR',
          tax_mode: 'exclusive',
          subtotal: 50000,
          discount_amount: 0,
          tax_rate: 0,
          tax_amount: 0,
          grand_total: 50000,
          paid_amount: 30000,
          balance_amount: 20000,
          is_paid: false,
          created_by: 'user-1',
          created_at: nowIso,
          updated_at: nowIso,
          items: [],
        } as any,
        {
          id: 'inv-usd',
          organization_id: 'org-1',
          invoice_number: 'INV-USD-01',
          customer_id: 'cust-1',
          status: 'ISSUED',
          issue_date: nowIso,
          due_date: nowIso,
          payment_terms: 'Net 7',
          currency: 'USD',
          tax_mode: 'exclusive',
          subtotal: 2000,
          discount_amount: 0,
          tax_rate: 0,
          tax_amount: 0,
          grand_total: 2000,
          paid_amount: 1500,
          balance_amount: 500,
          is_paid: false,
          created_by: 'user-1',
          created_at: nowIso,
          updated_at: nowIso,
          items: [],
        } as any,
      ],
      customers: [baseCustomer],
      products: [],
      organization: baseOrg,
    });

    expect(reportData.currencyBreakdown).toHaveLength(2);
    const inrGroup = reportData.currencyBreakdown?.find((c) => c.currency === 'INR');
    const usdGroup = reportData.currencyBreakdown?.find((c) => c.currency === 'USD');
    expect(inrGroup?.totalInvoiced).toBe(50000);
    expect(inrGroup?.totalPaid).toBe(30000);
    expect(inrGroup?.totalOutstanding).toBe(20000);
    expect(usdGroup?.totalInvoiced).toBe(2000);
    expect(usdGroup?.totalPaid).toBe(1500);
    expect(usdGroup?.totalOutstanding).toBe(500);

    const reportPdfBytes = await generateQuoteFlowPdfReport(reportData);
    expect(reportPdfBytes.byteLength).toBeGreaterThan(1000);
  });
});
