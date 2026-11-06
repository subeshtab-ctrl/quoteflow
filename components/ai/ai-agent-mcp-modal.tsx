'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Bot,
  Terminal,
  Check,
  Copy,
  Sparkles,
  Key,
  ExternalLink,
  Layers,
  FileText,
  Receipt,
  Share2,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Code2,
  Zap,
  Globe,
  Building,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AiAgentMcpModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId?: string;
  companyName?: string;
}

export function AiAgentMcpModal({
  isOpen,
  onClose,
  orgId = 'a0000000-0000-0000-0000-000000000001',
  companyName = 'SUBESH M LLC',
}: AiAgentMcpModalProps) {
  const [activeTab, setActiveTab] = useState<'prompt' | 'cursor' | 'claude' | 'keys'>('prompt');
  const [apiKey, setApiKey] = useState('qf_live_8f51e94a175e40d591d0bc2614991bf5');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        quoteflow: {
          url: 'https://www.blendandbold.com/api/mcp',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'X-Organization-ID': orgId,
          },
        },
      },
    },
    null,
    2
  );

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        quoteflow: {
          url: 'https://www.blendandbold.com/api/mcp',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'X-Organization-ID': orgId,
          },
        },
      },
    },
    null,
    2
  );

  const setupPrompt = `You are my AI sales & operations assistant. Please connect to QuoteFlow using its official Streamable HTTP Model Context Protocol (MCP) server so you can automatically create quotations, send WhatsApp approval links, check client signature status, and convert approved quotes to invoices for my business (${companyName}).

### MCP Server Connection:
- Server Name: quoteflow
- Protocol: Model Context Protocol (v2024-11-05, Streamable HTTP / SSE)
- Endpoint URL: https://www.blendandbold.com/api/mcp
- Organization: ${companyName}
- Organization ID: ${orgId}
- API Key: ${apiKey}
- Documentation: https://www.blendandbold.com/guides/ai-agent-mcp

### Configuration:
{
  "mcpServers": {
    "quoteflow": {
      "url": "https://www.blendandbold.com/api/mcp",
      "headers": {
        "Authorization": "Bearer ${apiKey}",
        "X-Organization-ID": "${orgId}"
      }
    }
  }
}

### 5 Available Tools on QuoteFlow:
1. create_quotation(customer_name, items, notes) -> creates draft quote with tax calculations
2. get_quotation_status(quotation_id) -> checks if client opened, viewed, or signed
3. convert_to_invoice(quotation_id) -> converts approved quote to sequential tax invoice
4. send_whatsapp_quote(quotation_id, pin) -> sends WhatsApp mobile approval link
5. customer_ledger_lookup(customer_name) -> checks customer accounts & outstanding balance

Please run the MCP "initialize" handshake against https://www.blendandbold.com/api/mcp and call "tools/list" to verify connection. Once connected, confirm you are ready and summarize what actions you can run for ${companyName}.`;

  const copyToClipboard = (text: string, fieldId: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2200);
    }
  };

  const handleRegenerateKey = () => {
    setIsRegeneratingKey(true);
    setTimeout(() => {
      const randomHex = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      setApiKey(`qf_live_${randomHex}`);
      setIsRegeneratingKey(false);
    }, 400);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Line */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shrink-0" />

        {/* Modal Header (Fixed, never scrolls off) */}
        <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100 tracking-tight">
                  Connect AI Agent
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  MCP Server Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Autonomous quotations, invoicing & approvals for <strong className="text-slate-700 dark:text-slate-300">{companyName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Segmented Control Tabs (Fixed) */}
        <div className="px-5 pt-3 pb-2 sm:px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('prompt')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'prompt'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Setup Prompt</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cursor')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'cursor'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Cursor / Windsurf</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('claude')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'claude'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Claude Desktop</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('keys')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'keys'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Key className="h-3.5 w-3.5" />
              <span>API Key & Tools</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body Container (Guaranteed scrolling within modal, never exceeds screen) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* TAB 1: ⚡ ONE-CLICK SETUP PROMPT */}
          {activeTab === 'prompt' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                  <strong>One-Click Prompt:</strong> Copy and paste this prompt directly into your AI chat (<strong>OpenAI Codex, ChatGPT, Claude Desktop, Cursor, or Windsurf</strong>). Your assistant will connect to QuoteFlow automatically.
                </p>
              </div>

              {/* Code Box with Clean Header */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 font-mono text-[11px] text-slate-400 font-semibold">
                      quoteflow-setup-prompt.txt
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(setupPrompt, 'prompt')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    {copiedField === 'prompt' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-300 stroke-[3]" />
                        <span>Copied Prompt!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Prompt</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 max-h-60 sm:max-h-72 overflow-y-auto">
                  <pre className="font-mono text-xs text-indigo-200/90 whitespace-pre-wrap leading-relaxed select-all">
                    {setupPrompt}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 💻 CURSOR / WINDSURF */}
          {activeTab === 'cursor' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Add this to your project&apos;s <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200">.cursor/mcp.json</code>:
              </p>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-slate-400 font-semibold">
                    .cursor/mcp.json
                  </span>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(cursorConfig, 'cursor')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    {copiedField === 'cursor' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-300 stroke-[3]" />
                        <span>Copied JSON!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Config</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 max-h-60 sm:max-h-72 overflow-y-auto">
                  <pre className="font-mono text-xs text-indigo-300 leading-relaxed select-all">
                    {cursorConfig}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 🤖 CLAUDE DESKTOP */}
          {activeTab === 'claude' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Add this block under <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200">mcpServers</code> in your <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200">claude_desktop_config.json</code>:
              </p>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-slate-400 font-semibold">
                    claude_desktop_config.json
                  </span>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(claudeConfig, 'claude')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    {copiedField === 'claude' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-300 stroke-[3]" />
                        <span>Copied JSON!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Config</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 max-h-60 sm:max-h-72 overflow-y-auto">
                  <pre className="font-mono text-xs text-indigo-300 leading-relaxed select-all">
                    {claudeConfig}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 🔑 API KEY & TOOLS */}
          {activeTab === 'keys' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* API Key Box */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-indigo-600" />
                    Live API Key for {companyName}
                  </span>
                  <button
                    type="button"
                    onClick={handleRegenerateKey}
                    disabled={isRegeneratingKey}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRegeneratingKey ? 'animate-spin' : ''}`} />
                    <span>Rotate Key</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={apiKey}
                    className="flex-1 font-mono text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 select-all focus:outline-none"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(apiKey, 'apiKey')}
                    className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold gap-1.5 shrink-0"
                  >
                    {copiedField === 'apiKey' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedField === 'apiKey' ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
              </div>

              {/* Server Endpoint URL */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-emerald-600" />
                  Streamable HTTP MCP Endpoint
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value="https://www.blendandbold.com/api/mcp"
                    className="flex-1 font-mono text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 select-all focus:outline-none"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard('https://www.blendandbold.com/api/mcp', 'endpoint')}
                    className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold gap-1.5 shrink-0"
                  >
                    {copiedField === 'endpoint' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedField === 'endpoint' ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
              </div>

              {/* 5 Included Tools */}
              <div className="space-y-2 pt-1">
                <span className="font-bold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  5 Pre-Loaded MCP Tools
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                    <div>
                      <code className="font-bold text-slate-900 dark:text-slate-100">create_quotation</code>
                      <p className="text-[10px] text-slate-500">Auto GST/VAT calculations</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <code className="font-bold text-slate-900 dark:text-slate-100">get_quotation_status</code>
                      <p className="text-[10px] text-slate-500">Live view & signed status</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <code className="font-bold text-slate-900 dark:text-slate-100">convert_to_invoice</code>
                      <p className="text-[10px] text-slate-500">Sequential tax invoices</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-blue-600 shrink-0" />
                    <div>
                      <code className="font-bold text-slate-900 dark:text-slate-100">send_whatsapp_quote</code>
                      <p className="text-[10px] text-slate-500">Private mobile approval link</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Fixed, clean) */}
        <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3 shrink-0">
          <a
            href="https://www.blendandbold.com/guides/ai-agent-mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
          >
            <span>Read MCP Integration Guide</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <Button
            type="button"
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs px-5 h-9 shadow-sm"
          >
            Done
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
