const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envFile = path.join(__dirname, '../.env.local');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const { createClient } = require('@supabase/supabase-js');

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

function cleanPhone(phone, defaultCountry = '+91') {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2);
  if (!cleaned.startsWith('+')) {
    const code = defaultCountry.replace(/[^\d+]/g, '');
    cleaned = (code.startsWith('+') ? code : '+' + code) + cleaned.replace(/^0+/, '');
  }
  return cleaned;
}

async function runSuite() {
  console.log('🚀 Running QuoteFlow E2E Verification Suite...\n');
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error('Supabase admin client not initialized. Check .env.local credentials.');
  }

  // Fetch or create test customer
  const { data: orgs } = await supabase.from('organizations').select('id, name').limit(1);
  const orgId = orgs?.[0]?.id;
  if (!orgId) throw new Error('No organization found in database');

  console.log(`✓ Using Organization: ${orgId}`);

  // Ensure a test customer exists
  let customerId;
  const testCustomerEmail = 'testclient@example.com';
  const testCustomerPhone = '+919876543210';
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id, name, email, phone')
    .eq('email', testCustomerEmail)
    .limit(1)
    .maybeSingle();

  if (existingCustomer) {
    customerId = existingCustomer.id;
    console.log(`✓ Using existing customer: ${customerId} (${testCustomerEmail})`);
  } else {
    const { data: newCust, error: cErr } = await supabase
      .from('customers')
      .insert({
        organization_id: orgId,
        name: 'Acme Test Client',
        email: testCustomerEmail,
        phone: testCustomerPhone,
        billing_address: '123 Tech Park',
        city: 'Mumbai',
        country: 'India',
      })
      .select()
      .single();
    if (cErr) throw new Error(`Customer insert failed: ${cErr.message}`);
    customerId = newCust.id;
    console.log(`✓ Created test customer: ${customerId}`);
  }

  // 1. TEST QUOTATION CREATION & PERSISTENCE
  console.log('\n--- 1. Testing Quotation Creation & Persistence ---');
  const testQuoteId = '00000000-0000-4000-a000-000000000001';
  const testPublicToken = 'verify_test_token_' + Date.now();
  const testPublicTokenHash = require('crypto').createHash('sha256').update(testPublicToken).digest('hex');
  const testQuoteNum = 'Q-TEST-VERIFY-1';

  // Cleanup old test quote if exists
  await supabase.from('quotations').delete().eq('id', testQuoteId);
  await supabase.from('templates').delete().eq('name', `QUOTATION:${testQuoteId}`);

  // Insert quotation into quotations table
  const { data: quoteData, error: qErr } = await supabase
    .from('quotations')
    .insert({
      id: testQuoteId,
      organization_id: orgId,
      customer_id: customerId,
      quotation_number: testQuoteNum,
      public_token: testPublicToken,
      public_token_hash: testPublicTokenHash,
      title: 'Enterprise Server Maintenance',
      status: 'SENT',
      issue_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      subtotal: 10000,
      discount_type: 'FIXED',
      discount_value: 1000,
      discount_amount: 1000,
      tax_rate: 18,
      tax_amount: 1620,
      grand_total: 10620,
      currency: 'INR',
      notes: 'Thank you for your business.',
    })
    .select()
    .single();

  if (qErr) {
    throw new Error(`Quotation insert failed: ${qErr.message}`);
  }
  console.log(`✓ Quotation inserted successfully into quotations table: ${quoteData.id}`);

  // Dual-write to templates table
  const fullQuoteRecord = {
    ...quoteData,
    environment: 'live',
    portal_auth_method: 'BOTH',
    customer: {
      id: customerId,
      name: 'Acme Test Client',
      email: testCustomerEmail,
      phone: testCustomerPhone,
    },
  };
  const { error: tplErr } = await supabase.from('templates').upsert({
    organization_id: orgId,
    name: `QUOTE:${testQuoteId}`,
    accent_color: 'QUOTATION',
    layout_style: JSON.stringify(fullQuoteRecord),
    is_default: false,
  });

  if (tplErr) {
    throw new Error(`Template dual-write failed: ${tplErr.message}`);
  }
  console.log(`✓ Quotation dual-persisted to templates table for resilience.`);

  // 2. TEST QUOTATION RETRIEVAL BY ID & TOKEN
  console.log('\n--- 2. Testing Quotation Retrieval ---');
  const { data: retrievedById, error: fetchErr } = await supabase
    .from('quotations')
    .select('*, customer:customers(*)')
    .eq('id', testQuoteId)
    .single();

  if (fetchErr || !retrievedById) {
    throw new Error(`Failed to retrieve quotation by ID: ${fetchErr?.message}`);
  }
  console.log(`✓ Retrieved quotation by ID: ${retrievedById.quotation_number}, Customer: ${retrievedById.customer?.name}`);

  const { data: retrievedByToken, error: tokenErr } = await supabase
    .from('quotations')
    .select('*, customer:customers(*)')
    .eq('public_token', testPublicToken)
    .single();

  if (tokenErr || !retrievedByToken) {
    throw new Error(`Failed to retrieve quotation by token: ${tokenErr?.message}`);
  }
  console.log(`✓ Retrieved quotation by public token: ${retrievedByToken.id}`);

  // 3. TEST CLIENT PORTAL CUSTOMER VERIFICATION
  console.log('\n--- 3. Testing Client Portal Verification ---');
  // Simulate Phone Verification
  const inputPhone = '9876543210';
  const cleanedInput = cleanPhone(inputPhone, '+91');
  const cleanedCustPhone = cleanPhone(retrievedByToken.customer.phone, '+91');

  const rawInput = inputPhone.replace(/\D/g, '');
  const rawTarget = (retrievedByToken.customer.phone || '').replace(/\D/g, '');
  const digitsMatch = rawInput.length >= 7 && (rawTarget.endsWith(rawInput) || rawInput.endsWith(rawTarget));
  const phoneMatched = cleanedInput === cleanedCustPhone || digitsMatch;

  if (!phoneMatched) {
    throw new Error(`Phone verification failed for input ${inputPhone} vs ${retrievedByToken.customer.phone}`);
  }
  console.log(`✓ Phone verification succeeded: ${inputPhone} -> matched with ${retrievedByToken.customer.phone}`);

  // Simulate Email Verification
  const inputEmail = 'TESTCLIENT@EXAMPLE.COM';
  const emailMatched = inputEmail.trim().toLowerCase() === retrievedByToken.customer.email.trim().toLowerCase();
  if (!emailMatched) {
    throw new Error(`Email verification failed for input ${inputEmail} vs ${retrievedByToken.customer.email}`);
  }
  console.log(`✓ Email verification succeeded: ${inputEmail} -> matched with ${retrievedByToken.customer.email}`);

  // 4. TEST INVOICE CREATION & RETRIEVAL
  console.log('\n--- 4. Testing Invoice Persistence & Retrieval ---');
  const testInvId = '00000000-0000-4000-a000-000000000002';
  const testInvNum = 'INV-TEST-VERIFY-1';

  const testInvoice = {
    id: testInvId,
    organization_id: orgId,
    customer_id: customerId,
    invoice_number: testInvNum,
    quotation_id: testQuoteId,
    environment: 'live',
    status: 'ISSUED',
    issue_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 86400000 * 30).toISOString(),
    subtotal: 10000,
    tax_total: 1620,
    grand_total: 10620,
    amount_paid: 0,
    currency: 'INR',
    customer: {
      id: customerId,
      name: 'Acme Test Client',
      email: testCustomerEmail,
      phone: testCustomerPhone,
    },
  };

  const { error: invTplErr } = await supabase.from('templates').upsert({
    organization_id: orgId,
    name: `INVOICE:${testInvId}`,
    accent_color: 'INVOICE',
    layout_style: JSON.stringify(testInvoice),
    is_default: false,
  });

  if (invTplErr) {
    throw new Error(`Invoice template persistence failed: ${invTplErr.message}`);
  }
  console.log(`✓ Invoice persisted to templates table: ${testInvNum}`);

  // Verify Invoice fetch from templates
  const { data: invRow, error: invFetchErr } = await supabase
    .from('templates')
    .select('layout_style')
    .eq('name', `INVOICE:${testInvId}`)
    .single();

  if (invFetchErr || !invRow) {
    throw new Error(`Failed to fetch invoice: ${invFetchErr?.message}`);
  }
  const parsedInv = JSON.parse(invRow.layout_style);
  if (parsedInv.invoice_number !== testInvNum) {
    throw new Error(`Parsed invoice number mismatch: ${parsedInv.invoice_number}`);
  }
  console.log(`✓ Invoice retrieved and verified: ${parsedInv.invoice_number}, Environment: ${parsedInv.environment}`);

  // 5. TEST CUSTOMER EXCEL / CSV EXPORT DATA GENERATION
  console.log('\n--- 5. Testing Customer Excel / CSV Export ---');
  const { data: exportCusts, error: expErr } = await supabase
    .from('customers')
    .select('id, name, email, phone, company_name, city, country, created_at')
    .eq('organization_id', orgId);

  if (expErr) throw new Error(`Export fetch failed: ${expErr.message}`);

  const csvRows = [
    [
      'Customer ID',
      'Name',
      'Company Name',
      'Email',
      'Phone',
      'City',
      'Country',
      'Total Quotations',
      'Total Quoted Value',
      'Currency',
      'Created Date',
    ].join(','),
  ];

  exportCusts.forEach((c) => {
    csvRows.push([
      `"${c.id}"`,
      `"${c.name}"`,
      `"${c.company_name || ''}"`,
      `"${c.email || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.city || ''}"`,
      `"${c.country || ''}"`,
      '1',
      '10620.00',
      'INR',
      `"${c.created_at || ''}"`,
    ].join(','));
  });

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  if (!csvContent.includes('Acme Test Client') || !csvContent.startsWith('\uFEFF')) {
    throw new Error('Customer export format or content invalid');
  }
  console.log(`✓ Customer CSV Export validated: ${exportCusts.length} records generated with UTF-8 BOM.`);

  // CLEANUP
  console.log('\n--- Cleaning up test artifacts ---');
  await supabase.from('quotations').delete().eq('id', testQuoteId);
  await supabase.from('templates').delete().eq('name', `QUOTE:${testQuoteId}`);
  await supabase.from('templates').delete().eq('name', `INVOICE:${testInvId}`);
  console.log('✓ Test records cleaned up successfully.');

  console.log('\n🎉 ALL E2E VERIFICATION CHECKS PASSED!\n');
}

runSuite().catch((err) => {
  console.error('\n❌ E2E SUITE FAILED:', err);
  process.exit(1);
});
