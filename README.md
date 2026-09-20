# QuoteFlow - Cloud Quotation Management & Digital Approval SaaS

QuoteFlow is a production-ready, multi-tenant cloud SaaS web application built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL, Auth, Storage, RLS)**.

It streamlines the entire B2B estimate-to-close cycle: businesses generate itemized quotations, dispatch secure public URLs without requiring customer account creation, monitor client view events in real-time, capture legally binding digital signatures, log immutable audit histories, and generate server-side PDFs.

---

## Architecture Overview

```
                        [ Customer Browser ]
                                 │
                     /q/[token] (Public Portal)
                                 │
                                 ▼
                     [ Next.js Edge / Node.js ]
                     (App Router + Server Actions)
                     ┌───────────┴────────────┐
                     │                        │
            [ Business Users ]         [ Public Customer ]
         (Dashboard / Auth / API)    (Secure Token / Sign)
                     │                        │
                     └───────────┬────────────┘
                                 │
                                 ▼
                     [ Supabase Cloud Engine ]
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
  [ PostgreSQL ]           [ Supabase Auth ]     [ Supabase Storage ]
  - Multi-tenant RLS       - Session Cookies     - Company Logos
  - Atomic Transactions    - User Roles          - Signatures
  - Audit Trail Log        - Org Memberships     - Quotation Attachments
```

---

## Core Capabilities

1. **Multi-Tenant SaaS Architecture**
   - Tenant isolation via `organization_id` on every business-owned database record.
   - Comprehensive PostgreSQL Row-Level Security (RLS) policies.
   - Role-Based Access Control: `OWNER`, `ADMIN`, `STAFF`.
2. **Atomic Quotation Numbering**
   - Concurrency-safe sequential number generator (`Q-000001`, `Q-000002`...).
   - Configurable per organization (custom prefix and starting sequence).
3. **Financial Precision Engine**
   - Strict decimal arithmetic preventing JavaScript floating-point rounding errors.
   - Line item discounts (% or fixed), item taxes, quotation-level discounts and taxes.
   - Server-side totals recalculation on every mutation (client totals are never trusted).
   - Multi-currency support: INR (₹), USD ($), EUR (€), GBP (£), AED (AED).
4. **Unguessable Public Customer Approval Portal (`/q/[token]`)**
   - 32-byte cryptographically secure random tokens stored hashed via SHA-256.
   - No login or registration required for customers.
   - Responsive, mobile-first signing experience for smartphone touchscreens, styluses, or desktop mice.
5. **Real-Time Client View Tracking**
   - Automatically records timestamp, IP address, and device user-agent when customer opens quotation.
   - Increments view counter and transitions quotation status from `SENT` → `VIEWED`.
   - Dispatches in-app notification to business dashboard.
6. **Legally Binding Digital Signatures**
   - Mode A: HTML5 Canvas drawing (smooth bezier curve interpolation, touch/mouse/stylus).
   - Mode B: Stylized typed signature with cursive script typography.
   - Terms and conditions legal agreement confirmation.
   - Generates immutable SHA-256 document snapshot hash for tamper detection.
7. **Rejection & Revision Workflow**
   - Customers can decline quotations, selecting structured reasons (Price too high, Need changes, Project cancelled, etc.) with detailed feedback comments.
   - Revision system clones approved or rejected estimates to Version 2 (`Q-000001-V2`), keeping the original approved version strictly immutable.
8. **Server-Side PDF Generation**
   - Professional high-DPI PDF generator via `jspdf` and `jspdf-autotable`.
   - Includes company header, customer details, line items, totals, and an official verified signature seal watermark when approved.
9. **Omnichannel Sharing**
   - Direct copy-to-clipboard public URL.
   - Pre-filled WhatsApp web/mobile sharing URL.
   - Transactional email dispatch via Resend abstraction (with development fallback logger).

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions, Route Handlers)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS, PostCSS, Lucide React
- **Database & Auth**: PostgreSQL via Supabase, Supabase Auth, Row-Level Security
- **Validation**: Zod, React Hook Form
- **PDF Generation**: jsPDF, jsPDF-AutoTable
- **Analytics & Charts**: Recharts
- **Date Handling**: date-fns
- **Testing**: Vitest

---

## Database Migrations & Seed Data

SQL migration scripts are located in `supabase/migrations/`:
- `20260920000000_init_schema.sql`: Contains full multi-tenant schema, enums, tables, indexes, atomic sequence triggers, and Row-Level Security (RLS) policies.
- `20260920000001_seed_data.sql`: Seed records for demo organization ("Apex Technologies India"), customers, catalog products, and sample quotations across all lifecycle statuses (`DRAFT`, `SENT`, `APPROVED`, `REJECTED`).

---

## Getting Started Locally

### 1. Prerequisites
- Node.js >= 18.18 (v20 or v24 recommended)
- npm or pnpm

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your variables:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (Optional for local testing; built-in persistent store works out-of-the-box)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Transactional Email (Resend)
RESEND_API_KEY=re_your_key_here
EMAIL_FROM="QuoteFlow <quotes@quoteflow.app>"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Automated Test Suite
```bash
npm test
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Test Accounts & Sample Portals

- **Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
  - Admin login pre-filled: `admin@apextechnologies.io` / `password123`
- **Interactive Customer Approval Portal**:
  - Sent Quotation (`Q-000002`): [http://localhost:3000/q/demo_token_sent_q002](http://localhost:3000/q/demo_token_sent_q002)
  - Approved Quotation (`Q-000003`): [http://localhost:3000/q/demo_token_approved_q003](http://localhost:3000/q/demo_token_approved_q003)
  - Rejected Quotation (`Q-000004`): [http://localhost:3000/q/demo_token_rejected_q004](http://localhost:3000/q/demo_token_rejected_q004)

---

## Production Deployment Checklist

1. **Vercel / Cloud Run Setup**
   - Connect repository to Vercel or your container hosting platform.
   - Set environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`).
2. **Supabase Production Project**
   - Create new project at [supabase.com](https://supabase.com).
   - Execute migrations in order: `20260920000000_init_schema.sql` followed by seed data if needed.
   - Confirm Row Level Security is active on all tables.
3. **Custom Domain & Resend DNS**
   - Verify domain sending identity in Resend for DKIM, SPF, and DMARC compliance.
