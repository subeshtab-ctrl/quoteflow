const assert = require('assert');

async function runTests() {
  console.log('--- RUNNING QUOTEFLOW REPORT GENERATION TESTS ---');

  // Test 1: Date Range Presets
  const { computeDatePresetRange } = await import('../lib/reports/report-calculator.ts');
  const thisMonth = computeDatePresetRange('this_month');
  assert(thisMonth.startDate, 'this_month must have startDate');
  assert(thisMonth.endDate, 'this_month must have endDate');
  assert(thisMonth.label.includes('This Month'), 'Label must match preset');
  console.log('✓ Test 1 Passed: Date range preset calculation works correctly');

  // Test 2: Report Calculation Engine
  const { calculateReportData } = await import('../lib/reports/report-calculator.ts');
  const mockOrg = {
    id: 'org_test_1',
    name: 'Acme Test Corp',
    slug: 'acme',
    country: 'IN',
    default_currency: 'INR',
    gst_vat_number: '29ABCDE1234F1Z5',
    mode: 'live',
  };

  const mockCustomer = {
    id: 'cust_1',
    organization_id: 'org_test_1',
    name: 'John Doe',
    company_name: 'Doe Enterprises',
    tax_number: '29AAAAA0000A1Z5',
    environment: 'live',
  };

  const mockInvoices = [
    {
      id: 'inv_1',
      organization_id: 'org_test_1',
      customer_id: 'cust_1',
      invoice_number: 'INV-000001',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'PAID',
      currency: 'INR',
      subtotal: 100000,
      tax_amount: 18000,
      grand_total: 118000,
      paid_amount: 118000,
      balance_amount: 0,
      is_paid: true,
      payment_method: 'BANK_TRANSFER',
      environment: 'live',
      items: [
        {
          id: 'item_1',
          description: 'Consulting Services',
          quantity: 1,
          unit_price: 100000,
          cgst_rate: 9,
          cgst_amount: 9000,
          sgst_rate: 9,
          sgst_amount: 9000,
          tax_amount: 18000,
          tax_rate: 18,
          classification_code: '998311',
          item_type: 'SERVICE',
        },
      ],
      created_at: new Date().toISOString(),
    },
    {
      id: 'inv_2',
      organization_id: 'org_test_1',
      customer_id: 'cust_1',
      invoice_number: 'INV-000002',
      issue_date: new Date(Date.now() - 40 * 86400000).toISOString().split('T')[0],
      due_date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
      status: 'ISSUED',
      currency: 'INR',
      subtotal: 50000,
      tax_amount: 9000,
      grand_total: 59000,
      paid_amount: 0,
      balance_amount: 59000,
      is_paid: false,
      environment: 'live',
      items: [],
      created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    },
  ];

  const mockQuotes = [
    {
      id: 'q_1',
      organization_id: 'org_test_1',
      customer_id: 'cust_1',
      quotation_number: 'QT-000001',
      title: 'Project Proposal',
      issue_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
      currency: 'INR',
      subtotal: 100000,
      tax_amount: 18000,
      grand_total: 118000,
      paid_amount: 50000,
      balance_amount: 68000,
      environment: 'live',
      items: [],
      created_at: new Date().toISOString(),
    },
  ];

  const reportData = calculateReportData({
    filters: {
      category: 'sales',
      reportType: 'sales-summary',
      preset: 'this_year',
      environment: 'live',
    },
    quotations: mockQuotes,
    invoices: mockInvoices,
    customers: [mockCustomer],
    products: [],
    organization: mockOrg,
    userRole: 'OWNER',
  });

  assert.strictEqual(reportData.metrics.totalInvoiced, 177000, 'Total invoiced must equal sum of mock invoices');
  assert.strictEqual(reportData.metrics.totalPaid, 118000, 'Total paid must match paid invoices');
  assert.strictEqual(reportData.metrics.totalOutstanding, 59000, 'Total outstanding must match unpaid invoice balance');
  assert.strictEqual(reportData.metrics.totalOverdue, 59000, 'Total overdue must include invoice past due date');
  console.log('✓ Test 2 Passed: Report Calculation Engine accurately aggregates KPIs & aging');

  // Test 3: India GST Country-Aware Calculations
  assert(reportData.taxSummary.isIndiaGst, 'Should detect India GST for IN country');
  assert.strictEqual(reportData.taxSummary.cgstTotal, 9000, 'CGST must match item calculations');
  assert.strictEqual(reportData.taxSummary.sgstTotal, 9000, 'SGST must match item calculations');
  assert(reportData.taxSummary.hsnSummary.length > 0, 'HSN summary must be generated');
  assert.strictEqual(reportData.taxSummary.hsnSummary[0].code, '998311', 'HSN code must match line item');
  console.log('✓ Test 3 Passed: Country-aware India GST, CGST, SGST, and HSN/SAC summary verified');

  // Test 4: PDF Generation
  const { generateQuoteFlowPdfReport } = await import('../lib/reports/pdf-report-builder.ts');
  const pdfBytes = await generateQuoteFlowPdfReport(reportData);
  assert(pdfBytes && pdfBytes.length > 100, 'PDF buffer must be generated');
  const pdfHeader = Buffer.from(pdfBytes.slice(0, 5)).toString('ascii');
  assert.strictEqual(pdfHeader, '%PDF-', 'PDF must have valid %PDF- magic bytes');
  console.log('✓ Test 4 Passed: Original QuoteFlow PDF report builder generates valid PDF document (%PDF-)');

  // Test 5: CSV Generation
  const { generateQuoteFlowCsvReport } = await import('../lib/reports/csv-report-builder.ts');
  const csvString = generateQuoteFlowCsvReport(reportData);
  assert(csvString.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');
  assert(csvString.includes('Blend & Bold QuoteFlow'), 'CSV must contain QuoteFlow metadata');
  assert(csvString.includes('INV-000001'), 'CSV must include invoice number');
  assert(csvString.includes('TOTALS'), 'CSV must include summary totals row');
  console.log('✓ Test 5 Passed: RFC 4180 CSV export with UTF-8 BOM & totals verified');

  // Test 6: Role Security Redactions
  const staffReportData = calculateReportData({
    filters: {
      category: 'sales',
      reportType: 'sales-summary',
      preset: 'this_year',
      environment: 'live',
    },
    quotations: mockQuotes,
    invoices: mockInvoices,
    customers: [mockCustomer],
    products: [],
    organization: mockOrg,
    userRole: 'STAFF',
  });
  assert.strictEqual(staffReportData.metrics.totalSales, 0, 'Staff must have sensitive revenue totals redacted');
  assert.strictEqual(staffReportData.taxSummary.totalTaxCollected, 0, 'Staff must have tax totals redacted');
  console.log('✓ Test 6 Passed: Role-based data protections for STAFF role verified');

  console.log('\nALL 6 REPORT ENGINE TESTS PASSED WITH 0 FAILURES!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
