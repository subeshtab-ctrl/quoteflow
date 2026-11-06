import React from 'react';
import type { Metadata } from 'next';
import { GuideArticleView } from '@/components/guides/guide-article-view';
import Link from 'next/link';
import {
  Cpu,
  Bot,
  Terminal,
  Layers,
  Sparkles,
  Key,
  CheckCircle2,
  FileText,
  Receipt,
  Share2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'QuoteFlow AI Agent MCP Server Documentation | Connect Claude, Cursor & Codex',
  description:
    'Official Model Context Protocol (MCP) server guide for QuoteFlow. Learn how to connect OpenAI Codex, Claude Desktop, Cursor, and Windsurf to create quotations and invoices automatically.',
  keywords: [
    'quoteflow mcp server',
    'model context protocol quotation',
    'claude desktop mcp server',
    'cursor mcp json',
    'openai codex mcp',
    'ai quotation agent',
    'streamable http mcp server',
  ],
  alternates: {
    canonical: 'https://blendandbold.com/guides/ai-agent-mcp',
  },
  openGraph: {
    title: 'QuoteFlow MCP Server Documentation (2026)',
    description:
      'Control QuoteFlow quotations, approvals, and invoices directly from your AI agent using the Model Context Protocol.',
    url: 'https://blendandbold.com/guides/ai-agent-mcp',
    siteName: 'QuoteFlow',
    type: 'article',
  },
};

const faqs = [
  {
    q: 'What is the QuoteFlow MCP Server?',
    a: 'QuoteFlow provides an official Model Context Protocol (MCP) server that lets autonomous AI assistants (like OpenAI Codex, Claude Desktop, Cursor, and Windsurf) interact directly with your QuoteFlow account. Your AI can generate draft quotes, check customer approval signatures, convert quotes to invoices, and send WhatsApp links.',
  },
  {
    q: 'What protocol and transport does QuoteFlow support?',
    a: 'QuoteFlow supports the official Model Context Protocol (v2024-11-05) via Streamable HTTP (JSON-RPC 2.0 over HTTPS) and Server-Sent Events (SSE). It requires no local npx daemon or custom binary—simply point your MCP client to https://www.blendandbold.com/api/mcp.',
  },
  {
    q: 'How is authentication handled?',
    a: 'Requests are authenticated using a standard Bearer Token (Authorization: Bearer qf_live_...) and scoped to your verified Organization ID. You can find or rotate your live API key inside your QuoteFlow dashboard header.',
  },
  {
    q: 'Does it support multi-tenant isolation?',
    a: 'Yes! Every quotation, customer record, and invoice created by your AI assistant is strictly bound to your Organization ID (e.g. SUBESH M LLC), ensuring zero cross-tenant contamination.',
  },
  {
    q: 'Can my agent convert approved quotes to invoices automatically?',
    a: 'Yes. The convert_to_invoice tool enables your AI to convert an approved quotation into an official sequential tax invoice with bank details and UPI QR codes.',
  },
];

const toc = [
  { id: 'overview', title: '1. Overview & Endpoint' },
  { id: 'tools', title: '2. Supported MCP Tools' },
  { id: 'codex-setup', title: '3. Connecting OpenAI / Codex' },
  { id: 'cursor-setup', title: '4. Connecting Cursor & Windsurf' },
  { id: 'claude-setup', title: '5. Connecting Claude Desktop' },
  { id: 'rest-api', title: '6. Direct REST & cURL Examples' },
];

export default function AiAgentMcpGuidePage() {
  return (
    <GuideArticleView
      title="QuoteFlow Model Context Protocol (MCP) Server"
      subtitle="Connect OpenAI Codex, Claude Desktop, Cursor, or Windsurf to QuoteFlow for autonomous quotation generation, signature tracking, and invoicing."
      category="AI & Developer API"
      readTime="5 min read"
      publishedAt="2026-10-27"
      updatedAt="2026-10-27"
      slug="ai-agent-mcp"
      toc={toc}
      faqs={faqs}
      relatedGuides={[
        {
          title: 'How to Write a Professional Quotation: Step-by-Step Guide',
          href: '/guides/how-to-write-a-quotation',
          readTime: '8 min read',
          desc: 'Essential quotation structure, GST/VAT rules, and closing techniques.',
        },
        {
          title: 'Quotation vs Invoice: Key Differences & Legal Rules',
          href: '/guides/quotation-vs-invoice',
          readTime: '6 min read',
          desc: 'When to issue an estimate, pro-forma, quotation, or final sequential invoice.',
        },
        {
          title: 'WhatsApp Quotation Workflow: From Estimate to Payment',
          href: '/guides/whatsapp-quotation-workflow',
          readTime: '7 min read',
          desc: 'How to share private quotation links on WhatsApp with 4-digit PIN security.',
        },
      ]}
    >
      {/* 1. Overview */}
      <section id="overview" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          1. Overview & Endpoint
        </h2>
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
          QuoteFlow exposes a production-ready <strong>Model Context Protocol (MCP)</strong> server compliant with specification <code>v2024-11-05</code>. It operates over <strong>Streamable HTTP</strong> and <strong>Server-Sent Events (SSE)</strong>, allowing modern AI assistants and agents to manage your sales pipeline without installing external local daemons.
        </p>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 font-bold uppercase tracking-wider">MCP Server Metadata</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
              Ready & Verified
            </span>
          </div>
          <div>
            <strong className="text-slate-700 dark:text-slate-300">Endpoint URL:</strong>{' '}
            <code className="text-indigo-600 dark:text-indigo-400">https://www.blendandbold.com/api/mcp</code>
          </div>
          <div>
            <strong className="text-slate-700 dark:text-slate-300">Transports:</strong>{' '}
            <span>Streamable HTTP, Server-Sent Events (SSE), JSON-RPC 2.0</span>
          </div>
          <div>
            <strong className="text-slate-700 dark:text-slate-300">Protocol Version:</strong>{' '}
            <span>2024-11-05</span>
          </div>
          <div>
            <strong className="text-slate-700 dark:text-slate-300">Authentication:</strong>{' '}
            <span>HTTP Header: <code>Authorization: Bearer &lt;qf_live_...&gt;</code></span>
          </div>
        </div>
      </section>

      {/* 2. Supported Tools */}
      <section id="tools" className="scroll-mt-24 space-y-4 pt-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          2. Supported MCP Tools
        </h2>
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
          The QuoteFlow MCP server automatically advertises 5 core actions during <code>tools/list</code> negotiation:
        </p>

        <div className="grid grid-cols-1 gap-3.5 pt-2">
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3.5 shadow-2xs">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <code className="font-bold text-sm text-indigo-600 dark:text-indigo-400">create_quotation</code>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Generates a complete quotation with line items, quantity, tax breakdowns, and payment terms. Returns a shareable approval link.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3.5 shadow-2xs">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <code className="font-bold text-sm text-emerald-600 dark:text-emerald-400">get_quotation_status</code>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Fetches real-time quotation status: DRAFT, SENT, VIEWED, APPROVED, INVOICED, or REJECTED with client view count.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3.5 shadow-2xs">
            <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <code className="font-bold text-sm text-amber-600 dark:text-amber-400">convert_to_invoice</code>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Instantly converts an approved quote into an official sequential tax invoice with bank transfer details and QR code.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3.5 shadow-2xs">
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <code className="font-bold text-sm text-blue-600 dark:text-blue-400">send_whatsapp_quote</code>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Dispatches a private quotation link directly to customer WhatsApp, with optional 4-digit PIN protection.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3.5 shadow-2xs">
            <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <code className="font-bold text-sm text-purple-600 dark:text-purple-400">customer_ledger_lookup</code>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Looks up customer accounts, total revenue, outstanding balances, and open quotation count.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. OpenAI / Codex Setup */}
      <section id="codex-setup" className="scroll-mt-24 space-y-4 pt-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          3. Connecting OpenAI / Codex
        </h2>
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
          OpenAI Codex and ChatGPT connect directly via Streamable HTTP MCP. Provide the endpoint and token to your agent:
        </p>

        <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-emerald-300">
          <pre className="whitespace-pre-wrap leading-relaxed">
{`### QuoteFlow MCP Connection for OpenAI / Codex:
- Server Type: Streamable HTTP MCP
- Endpoint URL: https://www.blendandbold.com/api/mcp
- Header: Authorization: Bearer qf_live_YOUR_API_KEY
- Header: X-Organization-ID: YOUR_ORGANIZATION_ID`}
          </pre>
        </div>
      </section>

      {/* 4. Cursor Setup */}
      <section id="cursor-setup" className="scroll-mt-24 space-y-4 pt-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          4. Connecting Cursor & Windsurf
        </h2>
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
          In your project root, create or edit <code>.cursor/mcp.json</code>:
        </p>

        <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-indigo-300">
          <pre className="whitespace-pre-wrap leading-relaxed">
{`{
  "mcpServers": {
    "quoteflow": {
      "url": "https://www.blendandbold.com/api/mcp",
      "headers": {
        "Authorization": "Bearer qf_live_YOUR_API_KEY",
        "X-Organization-ID": "YOUR_ORGANIZATION_ID"
      }
    }
  }
}`}
          </pre>
        </div>
      </section>

      {/* 5. Claude Desktop Setup */}
      <section id="claude-setup" className="scroll-mt-24 space-y-4 pt-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          5. Connecting Claude Desktop
        </h2>
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
          In <code>claude_desktop_config.json</code>:
        </p>

        <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-indigo-300">
          <pre className="whitespace-pre-wrap leading-relaxed">
{`{
  "mcpServers": {
    "quoteflow": {
      "url": "https://www.blendandbold.com/api/mcp",
      "headers": {
        "Authorization": "Bearer qf_live_YOUR_API_KEY",
        "X-Organization-ID": "YOUR_ORGANIZATION_ID"
      }
    }
  }
}`}
          </pre>
        </div>
      </section>

      {/* 6. Direct REST & cURL Examples */}
      <section id="rest-api" className="scroll-mt-24 space-y-4 pt-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          6. Direct REST & cURL Examples
        </h2>
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
          You can test the endpoint or trigger actions programmatically via simple HTTP POST:
        </p>

        <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-indigo-200">
          <pre className="whitespace-pre-wrap leading-relaxed">
{`curl -X POST https://www.blendandbold.com/api/mcp \\
  -H "Authorization: Bearer qf_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "create_quotation",
    "customer_name": "ABC Corp",
    "items": [
      { "description": "Glass Panels", "quantity": 10, "unit_price": 500 },
      { "description": "Batteries", "quantity": 5, "unit_price": 600 }
    ]
  }'`}
          </pre>
        </div>
      </section>
    </GuideArticleView>
  );
}
