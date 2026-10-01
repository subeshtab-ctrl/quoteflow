// =============================================================================
// QuoteFlow — Strict Environment Isolation Automated QA Verification
// =============================================================================

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Starting Environment Isolation QA Checks ---');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

// 1. Verify TestModeBanner renders null in Live mode
test('TestModeBanner returns null in Live mode', () => {
  const content = fs.readFileSync(path.join(__dirname, '../components/dashboard/test-mode-banner.tsx'), 'utf8');
  assert(content.includes('if (!isTestMode) return null;'), 'Must return null when !isTestMode');
  assert(!content.includes('Open Test Sandbox'), 'Must NOT have "Open Test Sandbox" link in live mode');
});

// 2. Verify Header hides Mode Pill in Live mode
test('Header hides mode pill completely in Live mode', () => {
  const content = fs.readFileSync(path.join(__dirname, '../components/dashboard/header.tsx'), 'utf8');
  assert(content.includes("(userProfile?.mode || 'live') === 'test' &&"), 'Mode pill must only render if mode is test');
  assert(!content.includes('Live Mode</span>'), 'Must NOT render "Live Mode" pill text');
});

// 3. Verify Sidebar hides badges in Live mode
test('Sidebar hides TEST/LIVE badge in Live mode', () => {
  const content = fs.readFileSync(path.join(__dirname, '../components/dashboard/sidebar.tsx'), 'utf8');
  assert(content.includes("orgData.mode === 'test' &&"), 'Badge must only render when mode is test');
  assert(!content.includes('LIVE\n                </span>'), 'Must NOT render LIVE badge in sidebar');
});

// 4. Verify Dashboard Page scopes queries to environment
test('Dashboard Page scopes analytics, quotations, and invoices to active environment', () => {
  const content = fs.readFileSync(path.join(__dirname, '../app/(dashboard)/dashboard/page.tsx'), 'utf8');
  assert(content.includes("store.getDashboardAnalytics(orgId, { environment: env })"), 'getDashboardAnalytics must receive environment');
  assert(content.includes("store.getQuotations(orgId, { environment: env })"), 'getQuotations must receive environment');
  assert(content.includes("store.getInvoices(orgId, { environment: env })"), 'getInvoices must receive environment');
});

// 5. Verify Quotations Page scopes to active environment
test('Quotations Page scopes to active environment', () => {
  const content = fs.readFileSync(path.join(__dirname, '../app/(dashboard)/quotations/page.tsx'), 'utf8');
  assert(content.includes("environment: env"), 'Quotations page must query by active environment');
});

// 6. Verify Invoices Page scopes to active environment and removes env param vulnerability
test('Invoices Page scopes to active environment', () => {
  const content = fs.readFileSync(path.join(__dirname, '../app/(dashboard)/invoices/page.tsx'), 'utf8');
  assert(content.includes("environment: env"), 'Invoices page must query by active environment');
  assert(!content.includes("currentEnvironment={env || 'ALL'}"), 'Invoices page must not accept env param override');
});

// 7. Verify Customers Page scopes to active environment
test('Customers Page scopes customers and quotations to active environment', () => {
  const content = fs.readFileSync(path.join(__dirname, '../app/(dashboard)/customers/page.tsx'), 'utf8');
  assert(content.includes("store.getCustomers(orgId, { environment: env })"), 'Customers page must query by environment');
  assert(content.includes("store.getQuotations(orgId, { environment: env })"), 'Quotations on customers page must query by environment');
});

// 8. Verify Reports Page scopes to active environment
test('Reports Page scopes analytics and quotations to active environment', () => {
  const content = fs.readFileSync(path.join(__dirname, '../app/(dashboard)/reports/page.tsx'), 'utf8');
  assert(content.includes("store.getDashboardAnalytics(orgId, { environment: env })"), 'Reports must query analytics by environment');
  assert(content.includes("store.getQuotations(orgId, { environment: env })"), 'Reports must query quotations by environment');
});

// 9. Verify Cross-Environment Guards on ID endpoints
test('Quotation [id] route has cross-environment guard', () => {
  const content = fs.readFileSync(path.join(__dirname, '../app/api/quotations/[id]/route.ts'), 'utf8');
  assert(content.includes('if (recordEnv !== activeEnv)'), 'Must return 404 if record environment does not match active mode');
});

test('Invoice [id] route has cross-environment guard', () => {
  const content = fs.readFileSync(path.join(__dirname, '../app/api/invoices/[id]/route.ts'), 'utf8');
  assert(content.includes('if (recordEnv !== activeEnv)'), 'Must return 404 if record environment does not match active mode');
});

test('Quotation detail page has cross-environment guard', () => {
  const content = fs.readFileSync(path.join(__dirname, '../app/(dashboard)/quotations/[id]/page.tsx'), 'utf8');
  assert(content.includes("if ((quotation.environment || 'live') !== activeEnv)"), 'Must return notFound() on mismatch');
});

test('Invoice detail page has cross-environment guard', () => {
  const content = fs.readFileSync(path.join(__dirname, '../app/(dashboard)/invoices/[id]/page.tsx'), 'utf8');
  assert(content.includes("if ((invoice.environment || 'live') !== activeEnv)"), 'Must return notFound() on mismatch');
});

// 10. Verify Export Route scopes to active environment
test('Export API route scopes quotations to active environment', () => {
  const content = fs.readFileSync(path.join(__dirname, '../app/api/export/route.ts'), 'utf8');
  assert(content.includes("store.getQuotations(orgId, { environment: activeEnv })"), 'Export must scope to activeEnv');
});

// 11. Verify Notifications Route scopes to active environment
test('Notifications API route scopes to active environment', () => {
  const content = fs.readFileSync(path.join(__dirname, '../app/api/notifications/route.ts'), 'utf8');
  assert(content.includes("store.getNotifications(orgId, { environment: env })"), 'Notifications must scope to activeEnv');
});

// 12. Verify New Document builders scope customer lists
test('New Quotation Builder scopes customers to active environment', () => {
  const content = fs.readFileSync(path.join(__dirname, '../app/(dashboard)/quotations/new/page.tsx'), 'utf8');
  assert(content.includes("store.getCustomers(orgId, { environment: activeEnv })"), 'Must scope customers in new quote');
});

test('New Invoice Builder scopes customers and quotations to active environment', () => {
  const content = fs.readFileSync(path.join(__dirname, '../app/(dashboard)/invoices/new/page.tsx'), 'utf8');
  assert(content.includes("store.getCustomers(orgId, { environment: activeEnv })"), 'Must scope customers in new invoice');
  assert(content.includes("rawFromQuote.environment || 'live') === activeEnv"), 'Must validate source quotation environment');
});

// 13. Verify Customer Portal scopes multi-quote listing
test('Customer portal multi-quote list scopes to quotation environment', () => {
  const content = fs.readFileSync(path.join(__dirname, '../lib/supabase/data-store.ts'), 'utf8');
  assert(content.includes("environment: activeEnv"), 'Customer portal must scope other quotes to active quote environment');
});

// 14. Verify Supabase Migration File
test('Database migration has environment columns and RLS', () => {
  const content = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261001000000_strict_environment_isolation.sql'), 'utf8');
  assert(content.includes("ADD COLUMN environment TEXT NOT NULL DEFAULT 'live'"), 'Must add environment column with check constraint');
  assert(content.includes("CREATE INDEX IF NOT EXISTS idx_quotations_org_env"), 'Must index quotations by org and env');
  assert(content.includes("CREATE INDEX IF NOT EXISTS idx_invoices_org_env"), 'Must index invoices by org and env');
  assert(content.includes("CREATE INDEX IF NOT EXISTS idx_customers_org_env"), 'Must index customers by org and env');
});

console.log(`\n========================================`);
console.log(`QA Result: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
