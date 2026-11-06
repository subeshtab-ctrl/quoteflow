import React from 'react';
import type { Metadata } from 'next';
import { GuideArticleView } from '@/components/guides/guide-article-view';

export const metadata: Metadata = {
  title: 'How to Write a Professional Quotation: Step-by-Step Guide + Checklist (2026)',
  description:
    'Step-by-step masterclass on writing winning quotations that close deals fast. Includes essential fields, tax calculation rules (GST/VAT), payment terms, and a downloadable checklist.',
  keywords: [
    'how to write a quotation',
    'how to prepare a quotation',
    'quotation format',
    'professional quotation checklist',
    'quotation terms and conditions template',
    'sample quotation for client',
    'business quotation format',
  ],
  alternates: {
    canonical: 'https://blendandbold.com/guides/how-to-write-a-quotation',
  },
  openGraph: {
    title: 'How to Write a Professional Quotation (2026 Step-by-Step Guide)',
    description:
      'Learn how to draft high-converting business quotations. Essential structure, legal terms, itemization, and AI drafting techniques.',
    url: 'https://blendandbold.com/guides/how-to-write-a-quotation',
    siteName: 'QuoteFlow',
    type: 'article',
  },
};

const faqs = [
  {
    q: 'How long should a quotation be valid for?',
    a: 'Most commercial quotations have a validity window of 14, 30, or 60 days. In fast-moving supply industries with fluctuating raw material costs or volatile currency exchange rates, a 14-day validity window is recommended to protect your margins.',
  },
  {
    q: 'Should quotations include taxes or exclude taxes?',
    a: 'Both methods are common, but you must clearly specify whether prices are "Tax Inclusive" or "Tax Exclusive". In B2B transactions, quotes are often presented tax-exclusive so buyers can see the base cost and reclaim input tax credits. In B2C, consumers prefer tax-inclusive pricing so there are no surprise fees.',
  },
  {
    q: 'What happens if a client asks for a discount after receiving a quote?',
    a: 'Do not simply drop your price without adjusting scope. If you lower your fee, reduce deliverables (e.g., fewer revisions, phased delivery) so your work remains valued. In QuoteFlow, you can create a revision (v2) with 1 click while maintaining full history of the original quote.',
  },
  {
    q: 'Can I draft quotations using AI?',
    a: 'Yes! Modern quotation tools like QuoteFlow allow you to speak or type prompts like "Quote 3-page marketing website for Acme Corp with 40% advance deposit and 18% GST". The AI generates all itemized line items, math, and tax breakdowns in under 10 seconds.',
  },
  {
    q: 'How should I handle advance payments in a quotation?',
    a: 'Clearly specify the advance deposit percentage (e.g., 25% or 50% upfront before work commences). Detail the accepted payment methods and explain that work begins upon receipt of the deposit.',
  },
];

const toc = [
  { id: 'anatomy-of-quote', title: 'The Anatomy of a Professional Quotation' },
  { id: 'step-1-business-info', title: 'Step 1: Company & Client Header' },
  { id: 'step-2-scope-itemization', title: 'Step 2: Scope & Itemized Breakdown' },
  { id: 'step-3-tax-pricing', title: 'Step 3: Tax Modes & Transparent Totals' },
  { id: 'step-4-payment-terms', title: 'Step 4: Milestones & Validity Terms' },
  { id: 'step-5-digital-signing', title: 'Step 5: Digital Approvals & Next Steps' },
  { id: 'quotation-checklist', title: '10-Point Quotation Checklist' },
];

const relatedGuides = [
  {
    title: 'Quotation vs Invoice: Key Differences & When to Use Each',
    href: '/guides/quotation-vs-invoice',
    readTime: '7 min',
    desc: 'Understand the legal and operational differences between pre-sale quotes and commercial tax invoices.',
  },
  {
    title: 'The 1-Click WhatsApp Quotation Workflow',
    href: '/guides/whatsapp-quotation-workflow',
    readTime: '5 min',
    desc: 'How freelancers and businesses close proposals 3x faster via direct WhatsApp client links.',
  },
];

export default function HowToWriteAQuotationPage() {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How to Write a Professional Quotation: Step-by-Step Guide + Checklist (2026)',
    description:
      'Step-by-step masterclass on writing winning quotations that close deals fast. Includes essential fields, tax calculation rules (GST/VAT), payment terms, and a downloadable checklist.',
    author: {
      '@type': 'Organization',
      name: 'QuoteFlow Editorial Team',
      url: 'https://blendandbold.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'QuoteFlow',
      logo: {
        '@type': 'ImageObject',
        url: 'https://blendandbold.com/quoteflow-logo.png',
      },
    },
    datePublished: '2026-10-18T10:00:00Z',
    dateModified: '2026-10-18T10:00:00Z',
    mainEntityOfPage: 'https://blendandbold.com/guides/how-to-write-a-quotation',
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <GuideArticleView
        title="How to Write a Professional Quotation: Step-by-Step Guide + Checklist"
        subtitle="Master the art of drafting high-converting, crystal-clear business quotations that set expectations, protect your margins, and get approved with zero back-and-forth friction."
        category="Sales & Strategy"
        readTime="6 min"
        publishedAt="Oct 18, 2026"
        updatedAt="Oct 18, 2026"
        slug="how-to-write-a-quotation"
        toc={toc}
        faqs={faqs}
        relatedGuides={relatedGuides}
      >
        <section id="anatomy-of-quote">
          <h2>The Anatomy of a High-Converting Quotation</h2>
          <p>
            A quotation is not just an itemized price tag—it is often the final pitch document that decides whether a prospective client hires you or goes with your competitor.
          </p>
          <p>
            Winning quotations share three qualities: <strong>transparency</strong> (no hidden fees or vague line items), <strong>professionalism</strong> (branded logo, clean layout, correct taxes), and <strong>low-friction approval</strong> (easy to review and sign on a phone).
          </p>
        </section>

        <section id="step-1-business-info">
          <h2>Step 1: Company &amp; Client Header</h2>
          <p>
            Begin your quotation with a clear, authoritative header that establishes credibility. Make sure to include:
          </p>
          <ul>
            <li><strong>Your Business Identity:</strong> Official company logo, registered business name, registered address, telephone, email, and tax ID (GSTIN in India, VAT/UID in Europe/UAE, or EIN/TIN in the US).</li>
            <li><strong>Client Information:</strong> Client&apos;s legal company name, point of contact name, email, billing address, and client tax ID if applicable.</li>
            <li><strong>Quotation Metadata:</strong> A unique tracking number (e.g., <code>QT-2026-0105</code>), issuance date, and explicit expiry date (valid until).</li>
          </ul>
        </section>

        <section id="step-2-scope-itemization">
          <h2>Step 2: Scope &amp; Itemized Breakdown</h2>
          <p>
            Vague quotes like <em>&ldquo;Website Development: $4,000&rdquo;</em> invite scope creep, client anxiety, and payment disputes. Break your scope into understandable milestones or deliverables:
          </p>
          <ul>
            <li><strong>Detailed Descriptions:</strong> Detail what is included (e.g., &ldquo;Custom responsive frontend development with 5 pages, mobile testing, and Tailwind CSS&rdquo;).</li>
            <li><strong>Quantities &amp; Units:</strong> Specify whether billing is per hour, per page, per day, per license, or fixed-fee.</li>
            <li><strong>Statutory Classification Codes:</strong> For compliant tax accounting, include HSN codes for physical products or SAC codes for professional services.</li>
          </ul>
        </section>

        <section id="step-3-tax-pricing">
          <h2>Step 3: Tax Modes &amp; Transparent Totals</h2>
          <p>
            Always make your tax calculation explicitly clear. Confusion over tax liability is the #1 reason clients delay quote approval.
          </p>
          <ul>
            <li>
              <strong>Tax Exclusive:</strong> Line items show base rates. Tax (e.g., 18% GST or 20% VAT) is calculated and added at the bottom. This is standard for B2B transactions.
            </li>
            <li>
              <strong>Tax Inclusive:</strong> The unit price includes all statutory taxes. The tax portion is calculated in reverse and displayed as an informative breakdown.
            </li>
            <li>
              <strong>Discounts:</strong> If offering a promotional or volume discount, display it explicitly as a negative deduction so the client sees the exact value saved.
            </li>
          </ul>
        </section>

        <section id="step-4-payment-terms">
          <h2>Step 4: Milestones &amp; Validity Terms</h2>
          <p>
            Clear terms and conditions protect both parties. Include clauses covering:
          </p>
          <ul>
            <li><strong>Advance Deposit:</strong> Specify if an advance (e.g., 30% or 50%) is required before work commences.</li>
            <li><strong>Validity Period:</strong> State clearly: <em>&ldquo;This quotation is valid for 30 days from issuance. After this date, pricing may be subject to review.&rdquo;</em></li>
            <li><strong>Out-of-Scope Work:</strong> Clarify how extra change requests will be billed (e.g., &ldquo;Additional features outside this specification will be quoted separately at our standard hourly rate&rdquo;).</li>
            <li><strong>Payment Methods:</strong> List accepted options such as Bank Transfer (NEFT/RTGS/SWIFT), UPI QR code, Credit Card, or PayPal.</li>
          </ul>
        </section>

        <section id="step-5-digital-signing">
          <h2>Step 5: Digital Approvals &amp; Next Steps</h2>
          <p>
            Never force clients to print, sign by pen, scan, and email back a PDF quote. Studies show that requiring physical print-and-scan increases proposal cycle times by 4 to 7 days and increases lost deals by 35%.
          </p>
          <p>
            Modern quotation platforms like <strong>QuoteFlow</strong> allow clients to click a link on their smartphone, review line items, type or draw their digital signature, and submit instant approval in under 60 seconds.
          </p>
        </section>

        <section id="quotation-checklist">
          <h2>10-Point Quotation Checklist</h2>
          <p>Before hitting &ldquo;Send&rdquo;, run through this verification checklist:</p>
          <div className="not-prose my-6 space-y-2 rounded-2xl bg-white border border-slate-200 p-5 shadow-sm text-xs sm:text-sm">
            {[
              'Unique quotation number and revision version (e.g., QT-2026-001 v1)',
              'Accurate seller contact info, business address, and tax registration ID',
              'Correct customer company name and designated billing contact',
              'Clearly itemized deliverables with quantities, unit prices, and line totals',
              'Explicit tax calculation mode (Tax Inclusive vs Tax Exclusive)',
              'Applicable HSN or SAC classification codes for tax compliance',
              'Advance deposit percentage and payment milestone schedule',
              'Specific validity expiration date (e.g., valid for 30 days)',
              'Scope boundary clause for unexpected revisions or changes',
              'Interactive digital signature link or WhatsApp approval routing',
            ].map((check, idx) => (
              <div key={idx} className="flex items-start gap-2.5 py-1">
                <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  ✓
                </span>
                <span className="text-slate-700 font-medium">{check}</span>
              </div>
            ))}
          </div>
          <p>
            With QuoteFlow&apos;s AI Copilot, all 10 of these checklist points are verified and assembled automatically every time you draft a proposal.
          </p>
        </section>
      </GuideArticleView>
    </>
  );
}
