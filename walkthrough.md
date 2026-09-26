# QuoteFlow SaaS: Implementation & Verification Walkthrough

**QuoteFlow** is a cloud-hosted quotation creation, sharing, real-time tracking, digital approval, and electronic signature SaaS platform.

### 🌐 Live Production Deployment
- **Production URL**: [https://quoteflow-subesh1.vercel.app](https://quoteflow-subesh1.vercel.app)
- **GitHub Repository**: [https://github.com/subeshtab-ctrl/quoteflow](https://github.com/subeshtab-ctrl/quoteflow)
- **Customer Demo Quote**: [https://quoteflow-subesh1.vercel.app/q/demo_token_sent_q002](https://quoteflow-subesh1.vercel.app/q/demo_token_sent_q002)
- **Company Settings & Logo Upload**: [https://quoteflow-subesh1.vercel.app/settings](https://quoteflow-subesh1.vercel.app/settings)
- **Executive Dashboard**: [https://quoteflow-subesh1.vercel.app/dashboard](https://quoteflow-subesh1.vercel.app/dashboard)

---

## What Was Built & Verified

### 1. Cloud Architecture & Database Schema
- **Multi-Tenant Foundation**: Organization isolation on every database entity (`organization_id`).
- **PostgreSQL Row-Level Security (RLS)**: Policies written in `supabase/migrations/20260920000000_init_schema.sql` covering all tables (`organizations`, `profiles`, `organization_members`, `customers`, `products`, `quotations`, `quotation_items`, `quotation_signatures`, `quotation_views`, `quotation_events`, `notifications`, `templates`).
- **Atomic Concurrency-Safe Sequence**: PostgreSQL function `get_next_quotation_number` guarantees unique, organization-specific quotation numbering (e.g. `Q-000001`, `Q-000002`...).
- **Comprehensive Seed Data**: Included in `supabase/migrations/20260920000001_seed_data.sql` with sample organization ("Apex Technologies India"), customers, catalog products, and sample quotations across all lifecycle statuses (`DRAFT`, `SENT`, `APPROVED`, `REJECTED`).

---

### 2. Quotation Calculation Engine & Security
- **Strict Decimal Arithmetic** (`lib/quotations/calculations.ts`): Prevents JavaScript floating-point errors (e.g. `0.1 + 0.2 = 0.30000000000000004`).
- **Server-Side Verification**: Recalculates every line item discount, tax, subtotal, and grand total server-side prior to storage. Client-submitted totals are never trusted.
- **Multi-Currency Support**: Formats amounts in INR (₹), USD ($), EUR (€), GBP (£), and AED (AED).
- **Crypto-Secure Public Tokens** (`lib/quotations/tokens.ts`): 32-byte URL-safe base64url tokens indexed and verified via SHA-256 hashes.
- **Tamper-Evident Document Hashing**: Generates SHA-256 snapshot hashes of approved documents and signatures.

---

### 3. Public Customer Quotation & Approval Portal (`/q/[token]`)
- **Zero Login Friction**: Customers open the public URL directly without creating an account.
- **Real-Time View Tracking**: Automatically logs customer visits with IP and user-agent metadata, updates view counters, transitions `SENT` → `VIEWED`, and dispatches in-app notifications to the business.
- **Electronic Signature Pad** (`components/signature/signature-pad.tsx`):
  - **Draw Signature**: HTML5 Canvas with smooth bezier stroke interpolation for touchscreens, styluses, or mouse.
  - **Type Signature**: Instant rendering with stylized cursive script typography.
- **Approval Workflow** (`components/public-quote/approval-modal.tsx`): Legal disclaimer, signer contact verification, terms agreement checkbox, signature capture, and celebratory confetti.
- **Rejection Workflow** (`components/public-quote/rejection-modal.tsx`): Captures decline reasons (Price too high, Need changes, Project cancelled, etc.) and structured feedback.
- **Status Banners**: Handled for expired, revoked, approved, and rejected quotations.

---

### 4. Business Dashboard & Workflows
- **Executive Dashboard** (`/dashboard`): KPI cards (Total Pipeline, Approved Revenue, Win Rate, Client Views), monthly trend charts via Recharts, and recent quotations table.
- **Interactive Quotation Builder** (`/quotations/new`): Left-hand editable multi-step form with inline catalog picker, drag/reorder items, discounts, and real-time live preview sheet.
- **Audit History & Detail View** (`/quotations/[id]`): Detailed chronological audit log of all events (`CREATED`, `SENT`, `VIEWED`, `APPROVED`, `REJECTED`, `REVISED`).
- **Quotation Revision Engine**: "Create Revision" clones existing documents into Version 2 (`Q-000001-V2`), keeping approved documents strictly immutable.
- **Customer Directory** (`/customers`): Complete customer list with quotation history.
- **Product Catalog** (`/products`): Service and product catalog with SKU, default prices, and tax rates.
- **Company Settings** (`/settings`): Custom company branding, quotation prefix, tax rate, currency, and default legal terms.

---

### 5. Server-Side PDF Generation & Omnichannel Sharing
- **PDF Generator** (`lib/pdf/generator.ts`): High-DPI server-side rendering via `jspdf` and `jspdf-autotable`. Produces branded PDF invoices with items table, breakdown, and verified electronic signature seal.
- **WhatsApp Integration**: Instant prefilled WhatsApp message generator.
- **Email Service** (`lib/email/service.ts`): Resend abstraction with dev console logger fallback.

---

---

## 2. UPI & Crypto QR Code Upload & Display Resolution

### The Issue
- When uploading a UPI QR code or previewing quotations, a solid lime-green box was displayed instead of the actual QR code image.
- **Root Cause**: An automated test (`tests/quotation-payment-options.test.ts`) had previously executed against the data store and saved a 1×1 pixel green placeholder (`#66FF66`, `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`) directly into `data/org-payment-settings.json` and existing records. When rendered in the UI, that single pixel stretched across the 144×144 QR container.

### What Was Fixed & Enhanced
1. **Dedicated Server-Side QR Upload Route (`app/api/upload/qr/route.ts`)**:
   - Accepts PNG, JPG, WebP, and SVG files up to 5MB via `multipart/form-data`.
   - Automatically stores files in Supabase Storage (`logos` bucket) with local file storage fallback (`/public/uploads/qr-...`).
   - Eliminates oversized base64 data URLs in JSON state files, ensuring fast loads and reliable rendering.
2. **Purged Dummy Test Pixel**:
   - Cleaned `data/org-payment-settings.json`, `data/payments.json`, and `data/invoices.json` to purge the green pixel.
3. **Instant Auto-Save in Settings (`components/settings/settings-client-view.tsx`)**:
   - Uploading or removing a UPI or Crypto QR code now saves instantly to `/api/settings` with a feedback spinner and notification. Users no longer need to scroll down to click save.
4. **Dynamic QR Code Fallback & Resilience**:
   - If a custom QR code image is uploaded, it takes highest priority.
   - If no custom QR code image is uploaded, but a UPI ID is provided, QuoteFlow automatically generates and renders a live, scannable UPI QR code (`upi://pay?pa=...`) on the fly.
   - Applied across the Public Quote Portal, Quotation Detail page, and Quotation Builder live preview card.
5. **Test Isolation (`tests/quotation-payment-options.test.ts`)**:
   - Added `beforeAll` and `afterAll` hooks to snapshot and restore original database state, preventing future test runs from ever polluting persistent files.

---

## 3. Server-Side Rendering (SSR) Exception Fix & Resilience

### The Issue
- Users encountered `Application error: a server-side exception has occurred while loading www.blendandbold.com. Digest: 405613107` when navigating to `/quotations/[id]`.
- **Root Cause**: Next.js Server Components cannot have interactive client-side event handlers (like `onError={(e) => ...}`) passed to DOM elements (`<img />`). In React Server Component serialization, event handlers cannot be passed, triggering an unhandled server error during SSR.

### The Fix
1. **Removed Client Event Handlers from Server Component**:
   - In [app/(dashboard)/quotations/[id]/page.tsx](file:///c:/Users/user/OneDrive/Desktop/ro%20app/app/%28dashboard%29/quotations/%5Bid%5D/page.tsx), removed the `onError` DOM prop. The QR image source is already computed safely on the server using `upiInfo.qr_code_url || (upiInfo.upi_id ? dynamicQrUrl : '')`.
2. **Graceful Error Boundaries Added**:
   - Created [app/(dashboard)/quotations/[id]/error.tsx](file:///c:/Users/user/OneDrive/Desktop/ro%20app/app/%28dashboard%29/quotations/%5Bid%5D/error.tsx) and [app/(dashboard)/error.tsx](file:///c:/Users/user/OneDrive/Desktop/ro%20app/app/%28dashboard%29/error.tsx). If any server or client runtime error occurs, users are shown an elegant fallback card with a "Try Again" retry action and "Back to Quotations" navigation rather than Next.js's default crash screen.
3. **Verified Production Build**:
   - Verified with full Next.js production build (`npx next build`) — compiled and generated all 24+ static and dynamic routes with 0 errors.

---

## Verification & Test Results

### 1. Automated Vitest Test Suite (44/44 Passed across 12 files)
```bash
> npx vitest run

 ✓ tests/advance-payment-and-invoice-pdf.test.ts (4 tests)
 ✓ tests/payment-proof-chat-and-invoice-terms.test.ts (2 tests)
 ✓ tests/quotation-payment-options.test.ts (2 tests)
 ✓ tests/portal-pin-and-invoice-audit.test.ts (2 tests)
 ✓ tests/quotation-workflow.test.ts (4 tests)
 ✓ tests/calculations.test.ts (5 tests)
 ✓ tests/export-and-payment.test.ts (3 tests)
 ✓ tests/invoice-and-completion.test.ts (4 tests)
 ✓ tests/pdf.test.ts (1 test)
 ✓ tests/validations.test.ts (8 tests)
 ✓ tests/tokens.test.ts (3 tests)
 ✓ tests/logo.test.ts (6 tests)

 Test Files  12 passed (12)
      Tests  44 passed (44)
```

### 2. TypeScript Compilation Check
```bash
> node ./node_modules/typescript/bin/tsc --noEmit
# Result: 0 errors (clean exit code 0)
```
- `POST /api/public/approve` -> Successfully processed digital signature for John Mathew, transitioned status to `APPROVED`, created document hash `1937d29fb4...`.
- `GET /api/notifications` -> Dispatched real-time notifications to business: `Quotation Q-000002 Viewed` and `Quotation Q-000002 Approved!`.
- `POST /api/quotations/.../revision` -> Successfully created `Q-000002-V2` (DRAFT) while preserving `Q-000002` (APPROVED) as immutable.
- `POST /api/quotations` -> Atomically incremented sequence and created `Q-000005`.
- `POST /api/public/reject` -> Successfully processed rejection ("Need changes") with feedback comments, transitioned status to `REJECTED`, and recorded in audit log.

---

## 🚀 Advance Payments, Verified Receipts & Commercial Tax Invoices

### 1. Advance Payments with Presets & Live Balance Calculations
- **Payment Modal (`components/quotations/payment-modal.tsx`)**:
  - Full Payment (100%), Advance Payment (10%, 20%, 50%, or Custom Amount), and Unpaid modes.
  - Live calculations for **Paid Amount** and **Remaining Balance Due**.
  - Internal company verification checkbox (`payment_confirmed_by_company`) and actor attribution.

### 2. Client Portal Financial Summary & Verified Receipt Download
- **Public Quote View (`components/public-quote/public-quote-view.tsx`)**:
  - Financial breakdown displays Total Quotation Value, Amount Paid (with advance %), and Remaining Balance Due.
  - **Payment Receipt Download**: Unlocked **strictly when company confirms payment** (`payment_confirmed_by_company === true`).
  - When payment is recorded but unconfirmed, displays a clear verification pending notice: *"Receipt unlocks upon company confirmation"*.
  - **Tax Invoice Holding Notice**: Shows *"Note: Official Commercial Tax Invoice will only be generated once the quotation is marked as fully paid."* When 100% paid, unlocks the official commercial invoice PDF download.

### 3. Commercial Tax Invoice & Payment Receipt PDF Generators
- **Receipt PDF Generator (`lib/pdf/receipt-pdf-generator.ts`)**:
  - Generates official computer-generated receipt with company logo, payment breakdown, reference ID, and official verification seal.
- **Invoice PDF Generator (`lib/pdf/invoice-pdf-generator.ts`)**:
  - Generates high-DPI A4 commercial tax invoice with brand header bar, company logo, customer billing details, line items table with HSN/SAC classification, comprehensive CGST/SGST/IGST/VAT breakdown, and bank remittance instructions.
- **Fixed Invoice Print & Blank Page Issue**:
  - Attached `id="invoice-sheet"` to the printable container in `components/invoices/invoice-detail-view.tsx`.
  - Configured `@media print` in `app/globals.css` with `@page { size: A4 portrait; margin: 12mm; }`, `-webkit-print-color-adjust: exact`, and clean background overrides.
  - Added direct **"Download PDF"** buttons pointing to `/api/invoices/[id]/pdf`.

### 4. 1-Hour Rolling Window IP View Counting & Staff IP Privacy
- **Rolling Window Logic (`lib/supabase/data-store.ts`)**:
  - Visits from the same IP within 1 hour are recorded in the audit log with `counted: false` without inflating `view_count`.
  - Visits after 1 hour or from different IP addresses increment `view_count` normally.
- **Staff IP Masking (`components/quotations/quotation-audit-history.tsx`)**:
  - All IP addresses in audit events are automatically masked as `[Confidential - Admin Only]` when viewed by staff members.

### 5. Admin Settings Configuration
- **Company Settings (`components/settings/settings-client-view.tsx`)**:
  - Added admin toggle switch: *"Require 100% Full Payment for Commercial Tax Invoice Generation"*.
  - Persisted in `data/org-settings.json` and Supabase.

---

## 🧪 Comprehensive Automated Test Results

```bash
> cmd /c npx vitest run
✓ tests/pdf.test.ts (1 test)
✓ tests/advance-payment-and-invoice-pdf.test.ts (4 tests)
✓ tests/export-and-payment.test.ts (3 tests)
✓ tests/calculations.test.ts (5 tests)
✓ tests/invoice-and-completion.test.ts (4 tests)
✓ tests/portal-pin-and-invoice-audit.test.ts (2 tests)
✓ tests/quotation-workflow.test.ts (4 tests)
✓ tests/tokens.test.ts (3 tests)
✓ tests/validations.test.ts (8 tests)
✓ tests/logo.test.ts (6 tests)

Test Files: 10 passed (10)
Tests:      40 passed (40)
Typecheck:  0 errors via tsc --noEmit
```

