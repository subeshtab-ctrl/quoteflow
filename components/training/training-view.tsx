'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Building2,
  FileText,
  Receipt,
  Globe,
  Users,
  BarChart3,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Video,
  X,
  FileSpreadsheet,
  Lock,
  Smartphone,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoStep {
  title: string;
  durationSec: number;
  narration: string;
  actionSummary: string;
  mockup: {
    screenTitle: string;
    screenBadge: string;
    fields: { label: string; value: string; highlight?: boolean }[];
    highlightText?: string;
    buttonAction?: string;
    resultPreview?: string;
  };
}

interface VideoChapter {
  id: number;
  title: string;
  category: string;
  duration: string;
  durationSec: number;
  description: string;
  cta: string;
  ctaHref: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  steps: VideoStep[];
}

const chapters: VideoChapter[] = [
  {
    id: 1,
    title: '1. Business Setup & Company Branding',
    category: 'Core Setup',
    duration: '3:30',
    durationSec: 210,
    description: 'Configure your company profile, logo branding, GSTIN/tax identifier, default currency, bank account, and UPI QR code.',
    cta: 'Go to Settings',
    ctaHref: '/settings',
    icon: Building2,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-100 dark:border-indigo-900/50',
    steps: [
      {
        title: 'Step 1: Enter Business Profile & Address',
        durationSec: 40,
        narration: 'Navigate to Settings from the sidebar. Enter your Legal Business Name, registered street address, city, state, official billing email, and contact phone number. This information will appear on the header of all your quotes, invoices, and payment receipts.',
        actionSummary: 'Open Settings → Organization Profile → Fill Legal Name, Address & Contact',
        mockup: {
          screenTitle: 'Settings → Organization Profile',
          screenBadge: 'Header & Legal Info',
          fields: [
            { label: 'Company Name', value: 'Blend & Bold Tech Studio Pvt Ltd', highlight: true },
            { label: 'Official Email', value: 'billing@blendandbold.com' },
            { label: 'Contact Phone', value: '+91 98765 43210' },
            { label: 'Registered Address', value: 'Level 4, Innovate Tower, MG Road, Bengaluru - 560001' },
          ],
          highlightText: 'Information entered here auto-populates all client-facing document headers.',
          buttonAction: 'Save Organization Profile',
        },
      },
      {
        title: 'Step 2: Upload Brand Logo & Custom Shape',
        durationSec: 40,
        narration: 'Upload your company logo. QuoteFlow lets you customize your logo shape to Square, Rounded, or Circle, and choose between Contain or Fill. The live preview updates instantly to ensure your documents look ultra-clean.',
        actionSummary: 'Upload Logo Graphic → Select Shape (Rounded/Circle) → Adjust Fit',
        mockup: {
          screenTitle: 'Settings → Brand Logo & Styling',
          screenBadge: 'Branding Preview',
          fields: [
            { label: 'Uploaded File', value: 'blend_and_bold_logo.png (120 KB)' },
            { label: 'Logo Shape', value: 'Rounded Squircle (Modern)', highlight: true },
            { label: 'Image Fit', value: 'Contain with subtle drop-shadow' },
          ],
          highlightText: 'Preview shows high-DPI crystal clear rendering for client portal & PDFs.',
          buttonAction: 'Update Logo & Visual Style',
        },
      },
      {
        title: 'Step 3: Tax Identification (GSTIN) & Default Currency',
        durationSec: 45,
        narration: 'Enter your business Tax Identifier, such as your 15-digit GSTIN, and select your operating currency (INR ₹, USD $, EUR €, GBP £, etc.). All calculations, currency symbols, and tax splits will automatically adapt to your selection.',
        actionSummary: 'Set GSTIN/Tax ID → Select Currency (INR ₹, USD $, EUR €) → Set Default Tax Slab',
        mockup: {
          screenTitle: 'Settings → Tax & Accounting',
          screenBadge: 'Tax Compliance',
          fields: [
            { label: 'GSTIN / Tax ID', value: '29ABCDE1234F1Z5', highlight: true },
            { label: 'Operating Currency', value: 'INR - Indian Rupee (₹)', highlight: true },
            { label: 'Default Tax Rate', value: '18% GST (CGST 9% + SGST 9%)' },
          ],
          highlightText: 'Quotes & Invoices will automatically compute GST breakdowns and display tax summaries.',
          buttonAction: 'Save Tax Settings',
        },
      },
      {
        title: 'Step 4: Bank Account & UPI QR Scan-to-Pay',
        durationSec: 45,
        narration: 'Under Payment Settings, enter your Bank Name, Account Number, IFSC code, and Branch. Add your UPI ID (e.g., yourcompany@bank) and upload your official UPI QR code graphic. You can choose whether to display Bank details, UPI, or both.',
        actionSummary: 'Input Bank Details → Set UPI VPA → Upload QR Graphic → Enable Scan-to-Pay',
        mockup: {
          screenTitle: 'Settings → Default Payment Details',
          screenBadge: 'Scan & Pay Enabled',
          fields: [
            { label: 'Bank Name & A/C', value: 'HDFC Bank • A/C No: 50200084729104', highlight: true },
            { label: 'IFSC Code & Branch', value: 'HDFC0000240 (Indiranagar, Bengaluru)' },
            { label: 'UPI VPA ID', value: 'blendandbold@hdfcbank', highlight: true },
            { label: 'Display Option', value: 'Display Both Bank Remittance & UPI QR Code' },
          ],
          highlightText: 'Clients can scan your QR code directly on their smartphone from the online client portal!',
          buttonAction: 'Save Payment Information',
        },
      },
      {
        title: 'Step 5: Sequential Invoicing & Default Terms',
        durationSec: 40,
        narration: 'Customize your invoice prefix (like INV-) and starting sequential number. Add your default proposal terms, validity period (e.g. 14 days), and advance payment percentage (e.g. 50%). Every new quotation will now inherit these presets automatically.',
        actionSummary: 'Set Prefix INV- → Define Default Terms → Set Advance % & Validity Period',
        mockup: {
          screenTitle: 'Settings → Invoicing & Proposal Terms',
          screenBadge: 'Presets Configured',
          fields: [
            { label: 'Invoice Prefix', value: 'INV- (e.g., INV-000001)', highlight: true },
            { label: 'Default Validity', value: '14 Days from Issue Date' },
            { label: 'Default Advance %', value: '50% Upfront Deposit Required' },
            { label: 'Payment Terms Note', value: '50% Advance with order; balance 50% upon milestone completion.' },
          ],
          highlightText: 'Your business setup is complete! You are ready to issue professional quotes.',
          buttonAction: 'Save All Preferences',
          resultPreview: 'Setup 100% Complete • System Ready for Production',
        },
      },
    ],
  },
  {
    id: 2,
    title: '2. Creating & Sending Winning Quotations',
    category: 'Sales Proposals',
    duration: '4:15',
    durationSec: 255,
    description: 'Build an itemized sales proposal, configure customer details, add discounts and GST taxes, set advance requirements, and share the secure client link.',
    cta: 'Create a Quotation',
    ctaHref: '/quotations/new',
    icon: FileText,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-100 dark:border-emerald-900/50',
    steps: [
      {
        title: 'Step 1: Start a New Quotation',
        durationSec: 40,
        narration: 'From the dashboard, click Quotations in the sidebar and tap "+ New Quotation". QuoteFlow generates a unique proposal reference (e.g., QT-2026-0042) and sets the current date.',
        actionSummary: 'Navigate to Quotations → Click "+ New Quotation"',
        mockup: {
          screenTitle: 'Quotations → Create New Proposal',
          screenBadge: 'Draft Mode',
          fields: [
            { label: 'Quotation Number', value: 'QT-2026-0042 (Auto-Generated)', highlight: true },
            { label: 'Issue Date', value: 'Today (02 Oct 2026)' },
            { label: 'Validity Period', value: '14 Days (Valid until 16 Oct 2026)' },
          ],
          highlightText: 'Draft status allows you to work privately before publishing to the client.',
          buttonAction: 'Select Customer',
        },
      },
      {
        title: 'Step 2: Pick or Add Customer with Phone/Email',
        durationSec: 50,
        narration: 'Select an existing customer from the dropdown or click "+ Add Customer". Enter their Company Name, Contact Person, Billing Email, and Mobile Phone number with country code (+91). The mobile or email is essential because it is used for client portal authentication.',
        actionSummary: 'Select Customer from list or click "+ Add Customer" → Enter Name, Mobile & Email',
        mockup: {
          screenTitle: 'Quotation Editor → Customer Details',
          screenBadge: 'Customer Linked',
          fields: [
            { label: 'Customer Name', value: 'Acme Digital Media Inc.', highlight: true },
            { label: 'Billing Email', value: 'accounts@acmedigital.com' },
            { label: 'Mobile Number', value: '+91 98765 12340', highlight: true },
            { label: 'Tax ID / GSTIN', value: '29XYZAB5678C1Z9' },
          ],
          highlightText: 'Client will use this mobile number (+91 98765 12340) to access their private portal.',
          buttonAction: 'Confirm Customer',
        },
      },
      {
        title: 'Step 3: Add Itemized Line Items & Tax Slabs',
        durationSec: 55,
        narration: 'Add deliverables or services. You can select pre-saved items from your Products library or type custom descriptions. Specify Quantity, Unit Price, and Tax Slab (e.g., 18% GST). QuoteFlow calculates row totals and tax splits in real time.',
        actionSummary: 'Add Line Items → Set Quantities, Rates & Tax % → Auto-Calculate Totals',
        mockup: {
          screenTitle: 'Quotation Editor → Deliverables & Line Items',
          screenBadge: 'Real-Time Totals',
          fields: [
            { label: 'Item 1', value: 'Brand Identity & Design System (1 Unit @ ₹45,000, 18% GST)' },
            { label: 'Item 2', value: 'Next.js Web Application Development (1 Unit @ ₹85,000, 18% GST)', highlight: true },
            { label: 'Item 3', value: 'Cloud Infrastructure & CI/CD Setup (1 Unit @ ₹20,000, 18% GST)' },
          ],
          highlightText: 'Subtotal: ₹1,50,000 | 18% GST: ₹27,000 | Grand Total: ₹1,77,000',
          buttonAction: '+ Add Another Item',
        },
      },
      {
        title: 'Step 4: Configure Advance Deposit & Discounts',
        durationSec: 50,
        narration: 'Optionally apply a fixed or percentage discount. Then specify the required advance payment percentage, such as 50%. QuoteFlow highlights the exact deposit amount (₹88,500) required to initiate work.',
        actionSummary: 'Set Discount (if applicable) → Set Advance Deposit % (e.g. 50%)',
        mockup: {
          screenTitle: 'Quotation Editor → Payment & Deposit Schedule',
          screenBadge: 'Terms Configured',
          fields: [
            { label: 'Grand Total', value: '₹1,77,000 (Incl. 18% GST)' },
            { label: 'Required Advance', value: '50% (₹88,500.00)', highlight: true },
            { label: 'Balance Due', value: '50% (₹88,500.00) upon project completion' },
            { label: 'Bank & UPI Options', value: 'HDFC Bank Remittance + UPI QR Code Enabled' },
          ],
          highlightText: 'Clear deposit milestones build trust and speed up invoice conversion.',
          buttonAction: 'Save & Review',
        },
      },
      {
        title: 'Step 5: Send Quotation & Share Secure Client Link',
        durationSec: 60,
        narration: 'Click "Send Quotation" to activate the quote. QuoteFlow sends an automated branded email to the client and generates a private web link: quoteflow.com/q/[token]. Click "Copy Client Link" to send it via WhatsApp, SMS, or Slack.',
        actionSummary: 'Click "Send Quotation" → Click "Copy Client Link" → Share via WhatsApp / Email',
        mockup: {
          screenTitle: 'Quotation Overview → QT-2026-0042',
          screenBadge: 'SENT / ACTIVE',
          fields: [
            { label: 'Status', value: 'SENT (Valid for 14 days)', highlight: true },
            { label: 'Client Link', value: 'https://www.blendandbold.com/q/7d89a2bc-e94...', highlight: true },
            { label: 'Actions Available', value: 'Copy Link • Download PDF • Send Email • View Client Portal' },
          ],
          highlightText: 'The client link is live! Your customer can now review and approve it digitally.',
          buttonAction: 'Copy Client Link',
          resultPreview: 'Link Copied to Clipboard! Ready to send on WhatsApp.',
        },
      },
    ],
  },
  {
    id: 3,
    title: '3. Invoicing, Sequential Numbering & Payments',
    category: 'Billing & Accounting',
    duration: '3:45',
    durationSec: 225,
    description: 'Convert approved quotes into commercial tax invoices with 1 click, maintain unbroken sequential numbering, record client payments, and issue verified receipts.',
    cta: 'View Invoices',
    ctaHref: '/invoices',
    icon: Receipt,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-100 dark:border-sky-900/50',
    steps: [
      {
        title: 'Step 1: 1-Click Convert Approved Quotation to Invoice',
        durationSec: 45,
        narration: 'When a customer clicks "Approve Quotation" on their portal, your dashboard instantly updates to APPROVED. Open the quotation and click "Generate Invoice". All line items, customer details, and tax rates are instantly transferred.',
        actionSummary: 'Open Approved Quotation → Click "Generate Invoice" → Auto-Transfer All Data',
        mockup: {
          screenTitle: 'Quotation QT-2026-0042 → Approved',
          screenBadge: 'Client Approved',
          fields: [
            { label: 'Client Status', value: 'APPROVED digitally on 02 Oct 2026', highlight: true },
            { label: 'Customer', value: 'Acme Digital Media Inc.' },
            { label: 'Grand Total', value: '₹1,77,000.00' },
          ],
          highlightText: 'No retyping or duplicate entry needed — 1 click creates the official invoice.',
          buttonAction: 'Generate Commercial Invoice',
        },
      },
      {
        title: 'Step 2: Sequential Numbering (INV-000001) & Due Date',
        durationSec: 45,
        narration: 'Every invoice is assigned an immutable, unbroken sequential number like INV-000014 for tax compliance and audit safety. Set the Payment Due Date (e.g. Net 15 or Net 30).',
        actionSummary: 'Review Sequential Invoice Number → Set Payment Due Date → Save Invoice',
        mockup: {
          screenTitle: 'Invoices → Create Commercial Invoice',
          screenBadge: 'Sequential Numbering',
          fields: [
            { label: 'Invoice Number', value: 'INV-000014 (Audit-Locked)', highlight: true },
            { label: 'Issue Date', value: '02 Oct 2026' },
            { label: 'Payment Due Date', value: '17 Oct 2026 (Net 15 Days)', highlight: true },
            { label: 'Tax Breakdown', value: 'CGST 9% (₹13,500) + SGST 9% (₹13,500)' },
          ],
          highlightText: 'Unbroken sequential numbering guarantees 100% compliance with accounting standards.',
          buttonAction: 'Save Commercial Invoice',
        },
      },
      {
        title: 'Step 3: Bank Remittance Details on Invoice',
        durationSec: 40,
        narration: 'The invoice automatically displays your Bank Account remittance details and UPI scan-to-pay QR code. Clients have crystal-clear wire instructions right on the document.',
        actionSummary: 'Automatic Remittance Instructions on PDF and Digital Invoice',
        mockup: {
          screenTitle: 'Invoice INV-000014 → Remittance Details',
          screenBadge: 'Bank & UPI Attached',
          fields: [
            { label: 'Beneficiary', value: 'Blend & Bold Tech Studio Pvt Ltd' },
            { label: 'Bank Details', value: 'HDFC Bank • A/C: 50200084729104 • IFSC: HDFC0000240' },
            { label: 'Scan to Pay', value: 'UPI QR Code Graphic with boldcraft@hdfcbank', highlight: true },
          ],
          highlightText: 'Reduces payment delays by providing instant mobile and wire payment paths.',
          buttonAction: 'View PDF Preview',
        },
      },
      {
        title: 'Step 4: Record Advance or Full Payments',
        durationSec: 50,
        narration: 'When the client transfers funds, open the invoice and click "Record Payment". Enter the amount received (e.g. ₹88,500 advance), select the payment method (UPI, Bank Wire, Cheque), and record the bank transaction reference UTR.',
        actionSummary: 'Click "Record Payment" → Enter Amount, Method & UTR Reference → Submit',
        mockup: {
          screenTitle: 'Invoices → Record Incoming Payment',
          screenBadge: 'Payment Modal',
          fields: [
            { label: 'Payment Amount', value: '₹88,500.00 (50% Advance)', highlight: true },
            { label: 'Payment Method', value: 'UPI / IMPS Bank Transfer' },
            { label: 'Transaction UTR', value: 'UTR-948271039482', highlight: true },
            { label: 'Received Date', value: '02 Oct 2026' },
          ],
          highlightText: 'Invoice status updates to PARTIALLY PAID with remaining balance tracked automatically.',
          buttonAction: 'Save Payment & Generate Receipt',
        },
      },
      {
        title: 'Step 5: Verified Payment Receipts & Commercial Tax PDF',
        durationSec: 45,
        narration: 'QuoteFlow automatically generates a verified, numbered Payment Receipt PDF (e.g. RCP-INV-000014-1) with tax breakdown and transaction reference. Once fully settled, download the final Commercial Tax Invoice PDF for your records.',
        actionSummary: 'Download Official PDF Receipt & Final Tax Invoice for Client & Tax Filing',
        mockup: {
          screenTitle: 'Invoice INV-000014 → Payment History',
          screenBadge: 'Receipts Generated',
          fields: [
            { label: 'Payment 1', value: '₹88,500.00 (UPI) • Receipt #RCP-INV-000014-1', highlight: true },
            { label: 'Status', value: 'PAID IN FULL (Green Badge)' },
            { label: 'Available Downloads', value: 'Commercial Tax Invoice PDF • Official Payment Receipts' },
          ],
          highlightText: 'Official PDFs include company stamp, signature line, and unbroken audit logs.',
          buttonAction: 'Download Tax Invoice PDF',
          resultPreview: 'PDF Generated • Compliant with accounting and tax regulations.',
        },
      },
    ],
  },
  {
    id: 4,
    title: '4. Client Portal & 6-Digit PIN Security',
    category: 'Client Experience',
    duration: '4:30',
    durationSec: 270,
    description: 'Understand the client experience, 6-digit PIN creation, trusted device recognition, real-time interactive quote view, 1-click approvals, and customer live chat.',
    cta: 'View Quotations',
    ctaHref: '/quotations',
    icon: Globe,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-100 dark:border-purple-900/50',
    steps: [
      {
        title: 'Step 1: Opening the Private Client Link',
        durationSec: 50,
        narration: 'When a customer opens the link on their mobile or computer, they arrive at the secure client portal. QuoteFlow protects confidential business quotes with a multi-layered security gate.',
        actionSummary: 'Client opens https://www.blendandbold.com/q/[secure-token]',
        mockup: {
          screenTitle: 'Client Portal Gate → /q/7d89a2bc',
          screenBadge: 'Security Gate',
          fields: [
            { label: 'Quotation Number', value: 'QT-2026-0042' },
            { label: 'Issuing Company', value: 'Blend & Bold Tech Studio Pvt Ltd' },
            { label: 'Security Status', value: 'Protected by Client Access PIN', highlight: true },
          ],
          highlightText: 'No client username or account setup is required — fast and friction-free.',
          buttonAction: 'Verify Credential',
        },
      },
      {
        title: 'Step 2: 6-Digit PIN Setup & Verification',
        durationSec: 55,
        narration: 'On first visit, the client enters their registered mobile number or email to verify their identity and creates a private 6-digit PIN. On return visits, they simply enter their 6-digit PIN. An Eye toggle icon lets them preview digits as they type.',
        actionSummary: 'Verify Mobile (+91 98*** **340) → Create 6-Digit Access PIN → Submit',
        mockup: {
          screenTitle: 'Client Portal → Security Verification',
          screenBadge: 'PIN Entry',
          fields: [
            { label: 'Registered Mobile', value: '+91 98*** **340 (Masked for privacy)' },
            { label: '6-Digit Access PIN', value: '•••••• (Eye toggle to view)', highlight: true },
            { label: 'Autofill Protection', value: 'Enabled (Prevents browser password overwrites)' },
          ],
          highlightText: 'Entering the correct 6-digit PIN instantly grants access to the full proposal.',
          buttonAction: 'Unlock Client Portal',
        },
      },
      {
        title: 'Step 3: Trusted Device Remembering (No PIN on Same Phone/PC)',
        durationSec: 55,
        narration: 'QuoteFlow recognizes trusted devices. Once a client enters their PIN on their phone or laptop, that browser is securely remembered for 1 year. They will NOT be asked for a PIN again on that device. If they open the link on a different computer, the PIN is required.',
        actionSummary: '1-Year Device Token Saved → Direct Access on Same Phone/PC → PIN on New Devices',
        mockup: {
          screenTitle: 'Client Portal → Device Persistence',
          screenBadge: 'Trusted Device',
          fields: [
            { label: 'Current Device', value: 'Recognized as Trusted Phone / Browser', highlight: true },
            { label: 'PIN Prompt', value: 'Bypassed automatically on recognized device' },
            { label: 'Different Phone/PC', value: 'Strictly requires 6-digit PIN for access', highlight: true },
          ],
          highlightText: 'Seamless convenience on client\'s everyday phone, zero compromise on security.',
          buttonAction: 'Continue to Proposal',
        },
      },
      {
        title: 'Step 4: Interactive Proposal, Totals & 1-Click Digital Approval',
        durationSec: 55,
        narration: 'The client reviews your interactive proposal with line item descriptions, tax calculations, and payment schedule. With one tap, they can click "Approve Quotation" to digitally sign, or click "Decline" with written feedback.',
        actionSummary: 'Client Reviews Proposal → Clicks "Approve Quotation" or "Decline with Notes"',
        mockup: {
          screenTitle: 'Client Portal → Interactive Proposal View',
          screenBadge: 'Ready for Approval',
          fields: [
            { label: 'Deliverables', value: '3 Items • Subtotal ₹1,50,000 + 18% GST (₹27,000)' },
            { label: 'Advance Deposit', value: '₹88,500.00 required upon approval', highlight: true },
            { label: 'Approval Buttons', value: '[Approve Quotation (Green)] [Decline / Request Revision]', highlight: true },
          ],
          highlightText: 'Approval triggers instant real-time notification on your QuoteFlow dashboard.',
          buttonAction: 'Approve Quotation',
        },
      },
      {
        title: 'Step 5: Live Chat & Payment Proof Attachment',
        durationSec: 55,
        narration: 'Clients can ask questions directly through the embedded chat box at the bottom of the proposal. They can also attach photos or screenshots of their bank transfer or UPI payment receipt, enabling immediate staff confirmation.',
        actionSummary: 'Client uses Live Chat → Attaches Bank Wire / UPI Screenshot → Staff Reviews',
        mockup: {
          screenTitle: 'Client Portal → Live Chat & Attachments',
          screenBadge: 'Live Communication',
          fields: [
            { label: 'Client Message', value: '"We have transferred 50% advance via UPI. Screenshot attached!"', highlight: true },
            { label: 'Attachment', value: 'payment_screenshot_hdfc.jpg (1.2 MB)', highlight: true },
            { label: 'Staff Notification', value: 'Unread badge displayed on QuoteFlow dashboard' },
          ],
          highlightText: 'Keeps all proposal discussions and payment proofs in one centralized place.',
          buttonAction: 'Send Message',
          resultPreview: 'Payment Proof Received • Ready for Verification',
        },
      },
    ],
  },
  {
    id: 5,
    title: '5. Staff & Team Member Management',
    category: 'Team Collaboration',
    duration: '2:45',
    durationSec: 165,
    description: 'Invite team members by email, assign granular roles (Admin, Manager, Sales, Member), manage permissions, and track individual sales performance.',
    cta: 'Manage Team',
    ctaHref: '/settings',
    icon: Users,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-100 dark:border-amber-900/50',
    steps: [
      {
        title: 'Step 1: Accessing Team Settings',
        durationSec: 35,
        narration: 'Go to Settings and select the "Team & Staff" tab. You will see a list of all current staff members, their assigned email addresses, roles, and status.',
        actionSummary: 'Navigate to Settings → Click "Team & Staff" Tab',
        mockup: {
          screenTitle: 'Settings → Team & Staff Management',
          screenBadge: 'Team Directory',
          fields: [
            { label: 'Organization', value: 'Blend & Bold Tech Studio' },
            { label: 'Active Members', value: '3 Active Staff Members', highlight: true },
            { label: 'Pending Invites', value: '1 Invitation Awaiting Acceptance' },
          ],
          highlightText: 'Centralized directory for all employees and contractors.',
          buttonAction: '+ Invite Team Member',
        },
      },
      {
        title: 'Step 2: Inviting a New Team Member by Email',
        durationSec: 40,
        narration: 'Click the "+ Invite Team Member" button. Enter their official company email address and select their designated role from the dropdown menu.',
        actionSummary: 'Click "+ Invite Team Member" → Enter Colleague Email → Choose Role → Send',
        mockup: {
          screenTitle: 'Team Management → Send Member Invitation',
          screenBadge: 'Invite Modal',
          fields: [
            { label: 'Member Email', value: 'rahul.sales@blendandbold.com', highlight: true },
            { label: 'Assigned Role', value: 'SALES (Create & Send Proposals)', highlight: true },
            { label: 'Invite Expiration', value: 'Valid for 7 days' },
          ],
          highlightText: 'An automated invite link is sent directly to their inbox with easy 1-click onboarding.',
          buttonAction: 'Send Invitation Email',
        },
      },
      {
        title: 'Step 3: Understanding Role Permissions Matrix',
        durationSec: 45,
        narration: 'QuoteFlow provides 4 built-in roles: ADMIN has full access to settings, bank details, and all financials. MANAGER can manage quotes, invoices, and run reports. SALES can create, edit, and send quotes and invoices. MEMBER has view-only access.',
        actionSummary: 'Assign ADMIN (Full), MANAGER (Operations), SALES (Proposals), or MEMBER (View-Only)',
        mockup: {
          screenTitle: 'Team Management → Role Permissions Matrix',
          screenBadge: 'Security & Access',
          fields: [
            { label: 'ADMIN Role', value: 'Full control over company settings, bank info & team' },
            { label: 'MANAGER Role', value: 'Manage all quotes, invoices, payments, and financial reports', highlight: true },
            { label: 'SALES Role', value: 'Create and issue quotes & invoices; chat with clients', highlight: true },
            { label: 'MEMBER Role', value: 'Read-only access to customer files and proposals' },
          ],
          highlightText: 'Prevents unauthorized changes to critical banking and tax information.',
          buttonAction: 'Save Role Policy',
        },
      },
      {
        title: 'Step 4: Tracking Sales Performance by Staff Member',
        durationSec: 45,
        narration: 'When a staff member creates a quotation, their name is linked as the proposal author. In the Report Center, you can filter revenue and quote conversion rates by individual staff members to track commissions and targets.',
        actionSummary: 'Open Reports → Filter Sales by Staff Member → Review Closed Deals',
        mockup: {
          screenTitle: 'Reports → Sales Performance by Staff',
          screenBadge: 'Staff Attribution',
          fields: [
            { label: 'Staff Member', value: 'Rahul Verma (Sales Specialist)', highlight: true },
            { label: 'Quotes Issued', value: '14 Proposals (Total ₹12,40,000)' },
            { label: 'Deals Closed / Won', value: '11 Quotes Converted (78.6% Win Rate)', highlight: true },
            { label: 'Revenue Collected', value: '₹9,80,000.00' },
          ],
          highlightText: 'Empowers transparent sales attribution and team accountability.',
          buttonAction: 'Export Staff Report',
          resultPreview: 'Staff Performance Verified • Seamless Multi-User Collaboration',
        },
      },
    ],
  },
  {
    id: 6,
    title: '6. Generating & Exporting Reports',
    category: 'Analytics & Financials',
    duration: '3:15',
    durationSec: 195,
    description: 'Explore the dedicated Report Center, review Sales Summaries, track conversion rates, inspect customer balances, and export formatted Excel, CSV, and PDF files.',
    cta: 'Open Report Center',
    ctaHref: '/reports',
    icon: BarChart3,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-100 dark:border-indigo-900/50',
    steps: [
      {
        title: 'Step 1: Navigating the Report Center',
        durationSec: 40,
        narration: 'Click on "Reports" in the dashboard sidebar. The Report Center provides dedicated accounting sections for Sales, Quotations, Invoices, Customers, and Tax Breakdown.',
        actionSummary: 'Click "Reports" in Sidebar → Select Report Category',
        mockup: {
          screenTitle: 'Report Center → Executive Overview',
          screenBadge: 'Analytics Hub',
          fields: [
            { label: 'Available Reports', value: 'Sales Summary • Quotes by Status • Customer Balances', highlight: true },
            { label: 'Tax Reports', value: 'GST / Tax Breakdown (CGST, SGST, IGST)' },
            { label: 'Date Filters', value: 'Today • This Month • This Quarter • Financial Year • Custom' },
          ],
          highlightText: 'Original QuoteFlow design offering enterprise accounting depth and clarity.',
          buttonAction: 'Select Sales Summary',
        },
      },
      {
        title: 'Step 2: Sales Summary & Revenue Analytics',
        durationSec: 40,
        narration: 'The Sales Summary report aggregates your Total Invoiced Revenue, Total Cash Collected, Outstanding Receivables, and Average Order Value, complete with visual progress metrics.',
        actionSummary: 'Inspect Total Invoiced, Cash Collected, Receivables & Average Deal Size',
        mockup: {
          screenTitle: 'Reports → Sales Summary',
          screenBadge: 'Q3 Financials',
          fields: [
            { label: 'Total Invoiced', value: '₹18,45,000.00 (15 Invoices)', highlight: true },
            { label: 'Cash Collected', value: '₹14,20,000.00 (77.0% Collection Rate)' },
            { label: 'Outstanding Receivables', value: '₹4,25,000.00 (Pending Payment)', highlight: true },
            { label: 'Average Deal Size', value: '₹1,23,000.00' },
          ],
          highlightText: 'Instantly identifies your current cashflow position and collection efficiency.',
          buttonAction: 'Filter by Date Range',
        },
      },
      {
        title: 'Step 3: Quotation Funnel & Conversion Rates',
        durationSec: 35,
        narration: 'Under the Quotations section, view your Quote Conversion Funnel. See how many proposals are in Draft, Sent, Approved, Expired, or Rejected, along with your organization-wide win rate percentage.',
        actionSummary: 'Open Quotes by Status → Analyze Conversion Funnel & Win Rate %',
        mockup: {
          screenTitle: 'Reports → Quotation Funnel & Win Rates',
          screenBadge: 'Sales Velocity',
          fields: [
            { label: 'Total Proposals', value: '28 Quotes Issued (₹32,60,000 value)' },
            { label: 'Approved & Won', value: '21 Quotes (75.0% Win Rate)', highlight: true },
            { label: 'Pending Review', value: '5 Quotes (₹5,40,000 in pipeline)' },
            { label: 'Declined / Expired', value: '2 Quotes' },
          ],
          highlightText: 'Helps sales leadership optimize proposal turnaround and follow-ups.',
          buttonAction: 'Inspect Customers',
        },
      },
      {
        title: 'Step 4: Customer Outstanding Balances & Tax Breakdown',
        durationSec: 40,
        narration: 'Review Customer Balances to identify overdue accounts and payment aging. The Tax Breakdown report itemizes taxable revenue, CGST, and SGST for effortless monthly tax filing with your CA or accountant.',
        actionSummary: 'Inspect Aging Receivables → View GST Breakdown for Tax Filing',
        mockup: {
          screenTitle: 'Reports → Customer Balances & GST Breakdown',
          screenBadge: 'Tax & Compliance',
          fields: [
            { label: 'Taxable Turnover', value: '₹15,63,559.32' },
            { label: 'CGST 9% Total', value: '₹1,40,720.34', highlight: true },
            { label: 'SGST 9% Total', value: '₹1,40,720.34', highlight: true },
            { label: 'Total GST Collected', value: '₹2,81,440.68' },
          ],
          highlightText: 'Simplifies GST-1 and financial returns — zero manual calculation needed.',
          buttonAction: 'Export Options',
        },
      },
      {
        title: 'Step 5: 1-Click Export to Excel, CSV & PDF',
        durationSec: 40,
        narration: 'Export any report with a single click. Download formatted Excel spreadsheets with auto-sum formulas, CSV files for import into Tally or QuickBooks, or print-ready PDF summaries.',
        actionSummary: 'Click "Export to Excel (.xlsx)" or "Export CSV" → Instant Download',
        mockup: {
          screenTitle: 'Report Center → Data Export',
          screenBadge: 'Export Ready',
          fields: [
            { label: 'Excel (.xlsx)', value: 'Formatted with headers, currency formatting & formulas', highlight: true },
            { label: 'CSV File', value: 'Clean comma-separated values for Tally & QuickBooks' },
            { label: 'PDF Summary', value: 'Executive print-ready PDF with charts and tables' },
          ],
          highlightText: 'Full data portability with 1 click.',
          buttonAction: 'Export to Excel (.xlsx)',
          resultPreview: 'Report Exported Successfully • File saved to Downloads',
        },
      },
    ],
  },
];

export function TrainingView() {
  const [selectedChapterId, setSelectedChapterId] = useState<number>(1);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [stepProgress, setStepProgress] = useState<number>(0);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [showFullScriptModal, setShowFullScriptModal] = useState<boolean>(false);
  const [expandedAccordionId, setExpandedAccordionId] = useState<number | null>(1);

  const activeChapter = chapters.find((c) => c.id === selectedChapterId) || chapters[0];
  const activeStep = activeChapter.steps[currentStepIndex] || activeChapter.steps[0];

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop speech when component unmounts or step changes
  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const speakCurrentNarration = (text: string) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = playbackSpeed;
      utterance.pitch = 1.0;
      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  // Handle Play / Pause timer
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      stopSpeech();
      return;
    }

    speakCurrentNarration(activeStep.narration);

    const stepDurationMs = (activeStep.durationSec * 1000) / playbackSpeed;
    const intervalMs = 100;
    const increment = (intervalMs / stepDurationMs) * 100;

    timerRef.current = setInterval(() => {
      setStepProgress((prev) => {
        if (prev >= 100) {
          // Advance to next step
          if (currentStepIndex < activeChapter.steps.length - 1) {
            setCurrentStepIndex((idx) => idx + 1);
            return 0;
          } else {
            // End of chapter
            setIsPlaying(false);
            stopSpeech();
            return 100;
          }
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentStepIndex, selectedChapterId, playbackSpeed, isMuted]);

  const handleSelectChapter = (chapterId: number) => {
    stopSpeech();
    setSelectedChapterId(chapterId);
    setCurrentStepIndex(0);
    setStepProgress(0);
    setIsPlaying(false);
    setExpandedAccordionId(chapterId);
  };

  const handleNextStep = () => {
    stopSpeech();
    if (currentStepIndex < activeChapter.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setStepProgress(0);
    } else if (selectedChapterId < chapters.length) {
      handleSelectChapter(selectedChapterId + 1);
    }
  };

  const handlePrevStep = () => {
    stopSpeech();
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      setStepProgress(0);
    }
  };

  const handleTogglePlay = () => {
    if (stepProgress >= 100 && currentStepIndex === activeChapter.steps.length - 1) {
      setCurrentStepIndex(0);
      setStepProgress(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    stopSpeech();
    setCurrentStepIndex(0);
    setStepProgress(0);
    setIsPlaying(true);
  };

  const handleCopyCurrentScript = () => {
    navigator.clipboard?.writeText(activeStep.narration);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Calculate elapsed seconds within current chapter
  const elapsedChapterSeconds = (() => {
    let sum = 0;
    for (let i = 0; i < currentStepIndex; i++) {
      sum += activeChapter.steps[i].durationSec;
    }
    sum += (activeStep.durationSec * stepProgress) / 100;
    return Math.min(Math.round(sum), activeChapter.durationSec);
  })();

  const ActiveIcon = activeChapter.icon;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shadow-xs">
            <Video className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                QuoteFlow Training Video & Interactive Simulator
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Interactive Player
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Watch animated workflow walkthroughs, listen to voiceover guidance, and learn how to run QuoteFlow like a pro.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFullScriptModal(true)}
            className="gap-2 text-xs font-bold"
          >
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <span>Full Video Script</span>
          </Button>
          <Link href={activeChapter.ctaHref}>
            <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs">
              <span>{activeChapter.cta}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Chapter Selection Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {chapters.map((ch) => {
          const isSelected = ch.id === selectedChapterId;
          const Icon = ch.icon;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => handleSelectChapter(ch.id)}
              className={`flex flex-col p-3 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20 dark:bg-slate-800'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-indigo-600 text-white' : `${ch.bg} ${ch.color}`}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`}>
                  {ch.duration}
                </span>
              </div>
              <p className={`text-xs font-bold line-clamp-2 leading-tight ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                {ch.title}
              </p>
              <span className={`text-[9px] uppercase tracking-wider font-semibold mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                {ch.category}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Video Player Container */}
      <div className="rounded-3xl bg-slate-950 border border-slate-800 text-white shadow-2xl overflow-hidden">
        {/* Player Top Navigation Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-amber-500/80" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-xs font-mono text-slate-400">
              QuoteFlow Masterclass • Chapter {activeChapter.id} of 6
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {activeChapter.category}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {formatTime(elapsedChapterSeconds)} / {activeChapter.duration}
            </span>
          </div>
        </div>

        {/* Video Simulation Canvas */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative min-h-[380px] flex flex-col justify-between">
          {/* Step Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Step {currentStepIndex + 1} of {activeChapter.steps.length}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400">
                  Duration: ~{activeStep.durationSec}s
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white mt-0.5">
                {activeStep.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-semibold">
                {activeStep.actionSummary}
              </span>
            </div>
          </div>

          {/* Animated Product Screen Simulation Card */}
          <div className="rounded-2xl bg-slate-900 border border-slate-700/80 p-5 sm:p-6 shadow-inner space-y-4 my-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="font-mono text-xs sm:text-sm font-bold text-slate-200">
                  {activeStep.mockup.screenTitle}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {activeStep.mockup.screenBadge}
              </span>
            </div>

            {/* Simulated Data Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {activeStep.mockup.fields.map((f, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    f.highlight
                      ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/30'
                      : 'bg-slate-850/60 border-slate-800'
                  }`}
                >
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                    {f.label}
                  </p>
                  <p className={`text-xs sm:text-sm font-medium ${f.highlight ? 'text-indigo-200 font-bold' : 'text-slate-200'}`}>
                    {f.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Highlighted Insight / Tip */}
            {activeStep.mockup.highlightText && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>{activeStep.mockup.highlightText}</span>
              </div>
            )}

            {/* Action Bar inside Mockup */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-slate-400">
                {activeStep.mockup.resultPreview || 'System Status: Active & Synced'}
              </span>
              {activeStep.mockup.buttonAction && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <span>{activeStep.mockup.buttonAction}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Voiceover Teleprompter Box */}
          <div className="mt-4 p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/40 backdrop-blur-md">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-indigo-400" />
                <span>Voiceover Narration (Spoken Caption)</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCurrentScript}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                {copiedScript ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedScript ? 'Copied' : 'Copy Audio Script'}</span>
              </button>
            </div>
            <p className="text-xs sm:text-sm text-indigo-100 italic leading-relaxed">
              &ldquo;{activeStep.narration}&rdquo;
            </p>
          </div>
        </div>

        {/* Video Scrubber & Playback Controls */}
        <div className="bg-slate-900 px-5 py-4 border-t border-slate-800 space-y-3">
          {/* Step Scrubber / Progress Bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex gap-1 h-2 rounded-full overflow-hidden bg-slate-800">
              {activeChapter.steps.map((st, idx) => {
                const isPast = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      stopSpeech();
                      setCurrentStepIndex(idx);
                      setStepProgress(0);
                    }}
                    title={st.title}
                    className="flex-1 h-full bg-slate-800 relative overflow-hidden transition-all hover:opacity-80"
                  >
                    <div
                      className={`h-full transition-all duration-100 ${
                        isPast ? 'bg-indigo-500 w-full' : isCurrent ? 'bg-indigo-400' : 'w-0'
                      }`}
                      style={isCurrent ? { width: `${stepProgress}%` } : undefined}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-mono text-slate-400 shrink-0">
              Step {currentStepIndex + 1}/{activeChapter.steps.length}
            </span>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0 && selectedChapterId === 1}
                className="text-slate-300 hover:text-white p-2"
                title="Previous Step"
              >
                <Rewind className="h-4 w-4" />
              </Button>

              <button
                type="button"
                onClick={handleTogglePlay}
                className="h-10 w-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextStep}
                disabled={currentStepIndex === activeChapter.steps.length - 1 && selectedChapterId === chapters.length}
                className="text-slate-300 hover:text-white p-2"
                title="Next Step"
              >
                <FastForward className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestart}
                className="text-slate-300 hover:text-white p-2"
                title="Restart Chapter"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              <button
                type="button"
                onClick={() => {
                  stopSpeech();
                  setIsMuted(!isMuted);
                }}
                className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                  isMuted ? 'text-red-400 bg-red-950/40' : 'text-slate-300 hover:text-white'
                }`}
                title={isMuted ? 'Unmute Audio Narration' : 'Mute Audio Narration'}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Speed Controller */}
              <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1 text-xs">
                {[1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                      playbackSpeed === speed
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              {/* Direct CTA */}
              <Link href={activeChapter.ctaHref}>
                <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                  <span>{activeChapter.cta}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter Breakdown Accordion */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span>Complete Course Curriculum & Written Guide</span>
          </h3>
          <span className="text-xs text-slate-500">
            6 Chapters • 22 Minutes Total Runtime
          </span>
        </div>

        <div className="space-y-3">
          {chapters.map((ch) => {
            const isExpanded = expandedAccordionId === ch.id;
            const Icon = ch.icon;
            const isCurrent = ch.id === selectedChapterId;

            return (
              <div
                key={ch.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isCurrent
                    ? 'border-indigo-500/60 dark:border-indigo-500/50 bg-white dark:bg-slate-900 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
                }`}
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => setExpandedAccordionId(isExpanded ? null : ch.id)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors"
                >
                  <div className={`p-3 rounded-2xl ${ch.bg} border ${ch.border} shrink-0`}>
                    <Icon className={`h-5 w-5 ${ch.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {ch.category}
                      </span>
                      <span className="text-xs font-mono text-slate-400">⏱️ {ch.duration}</span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          Active in Player
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 mt-1">
                      {ch.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {ch.description}
                    </p>
                  </div>

                  <div className="shrink-0 p-2 text-slate-400">
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </button>

                {/* Expanded Steps List */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-850/30 space-y-5">
                    <div className="space-y-4">
                      {ch.steps.map((st, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-black shadow-xs mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                                {st.title}
                              </h5>
                              <span className="text-[11px] font-mono text-slate-400">
                                ~{st.durationSec}s
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                              {st.narration}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-900/50">
                                Action: {st.actionSummary}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleSelectChapter(ch.id);
                          window.scrollTo({ top: 100, behavior: 'smooth' });
                        }}
                        className="gap-2 text-xs font-bold"
                      >
                        <Play className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Play Video in Simulator</span>
                      </Button>

                      <Link href={ch.ctaHref}>
                        <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                          <span>{ch.cta}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Video Production Script Modal */}
      {showFullScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100">
                    QuoteFlow Video Production & Recording Guide
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Word-for-word screencast script, visual action cues, and timestamped walkthroughs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFullScriptModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body with Full Script */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200">
                <p className="font-bold text-sm mb-1">🎬 Screencast Recording Instructions</p>
                <p className="leading-relaxed">
                  Use this script to record a professional video (using Loom, OBS Studio, QuickTime, or YouTube).
                  Read the spoken voiceover lines while performing the visual actions on your live QuoteFlow screen.
                </p>
              </div>

              {chapters.map((ch) => (
                <div key={ch.id} className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>{ch.title}</span>
                      <span className="text-xs font-mono text-slate-400 font-normal">({ch.duration})</span>
                    </h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {ch.category}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {ch.steps.map((st, sIdx) => (
                      <div key={sIdx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                            {st.title} (~{st.durationSec}s)
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 font-semibold">
                            CUE: {st.actionSummary}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                          <strong>Narration:</strong> &ldquo;{st.narration}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/50">
              <span className="text-xs text-slate-500">
                Tip: You can also use the live interactive player on the previous screen with speech narration!
              </span>
              <Button
                size="sm"
                onClick={() => setShowFullScriptModal(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Close Script
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
