'use client';

import React, { useState, useEffect } from 'react';
import { Check, SlidersHorizontal, Sparkles } from 'lucide-react';
import { AiAgentMcpModal } from '@/components/ai/ai-agent-mcp-modal';

interface AgentOnboardPillProps {
  className?: string;
  companyName?: string;
  orgId?: string;
}

export function AgentOnboardPill({
  className = '',
  companyName = 'My Business',
  orgId = 'a0000000-0000-0000-0000-000000000001',
}: AgentOnboardPillProps) {
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Clean up any legacy dismissal flag from localStorage so it stays permanently visible
  useEffect(() => {
    try {
      localStorage.removeItem('quoteflow_agent_pill_dismissed');
    } catch {}
  }, []);

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.preventDefault();

    const setupPrompt = `You are my AI sales & operations assistant. Please connect to QuoteFlow using its official Streamable HTTP Model Context Protocol (MCP) server so you can automatically create quotations, send WhatsApp approval links, check client signature status, and convert approved quotes to invoices for my business (${companyName}).

### MCP Connection Details:
- **Server Name**: quoteflow
- **Protocol**: Model Context Protocol (v2024-11-05, Streamable HTTP / SSE)
- **MCP Endpoint**: https://www.blendandbold.com/api/mcp
- **Organization**: ${companyName}
- **Organization ID**: ${orgId}
- **Documentation**: https://www.blendandbold.com/guides/ai-agent-mcp

### Configuration for Cursor / Windsurf (.cursor/mcp.json):
{
  "mcpServers": {
    "quoteflow": {
      "url": "https://www.blendandbold.com/api/mcp",
      "headers": {
        "X-Organization-ID": "${orgId}",
        "X-Company-Name": "${companyName}"
      }
    }
  }
}

### Configuration for Claude Desktop / OpenAI Codex:
{
  "mcpServers": {
    "quoteflow": {
      "url": "https://www.blendandbold.com/api/mcp",
      "headers": {
        "X-Organization-ID": "${orgId}"
      }
    }
  }
}

### Available Actions on QuoteFlow:
1. create_quotation(customer_name, items, notes) -> creates draft quote with tax calculations
2. get_quotation_status(quotation_id) -> checks if client opened, viewed, or signed
3. convert_to_invoice(quotation_id) -> converts approved quote to official sequential tax invoice
4. send_whatsapp_quote(quotation_id, pin) -> sends WhatsApp mobile approval link
5. customer_ledger_lookup(customer_name) -> checks customer accounts & outstanding balance

Please run the MCP "initialize" handshake against https://www.blendandbold.com/api/mcp and call "tools/list" to verify connection. Once connected, confirm you are ready and summarize what actions you can run for ${companyName}.`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(setupPrompt);
      setShowCopiedTooltip(true);
      setTimeout(() => setShowCopiedTooltip(false), 2600);
    }

    // Open the modal so the prompt and MCP setup instructions are immediately visible on screen!
    setIsModalOpen(true);
  };

  return (
    <>
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        {/* Floating Tooltip Bubble: Positioned BELOW the pill with high z-index so it is fully visible in viewport */}
        {showCopiedTooltip && (
          <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-1 duration-200 pointer-events-none">
            {/* Tooltip Upward Arrow pointing to pill */}
            <div className="w-2 h-2 bg-slate-900 dark:bg-white rotate-45 mx-auto -mb-1 shadow-xs" />
            <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 whitespace-nowrap">
              <Check className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-600 stroke-[3]" />
              <span>Prompt copied & modal opened!</span>
            </div>
          </div>
        )}

        {/* The Cloudflare-Style Pill: Permanently visible in header */}
        <div className="inline-flex items-center rounded-full border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all group overflow-hidden">
          {/* Main Clickable Area: Copies the prompt AND opens the visible modal */}
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none"
            title="Click to view & copy one-click AI setup prompt for Claude, Cursor, or ChatGPT"
          >
            <span className="hidden xl:inline">Onboard your agent to QuoteFlow</span>
            <span className="xl:hidden">Onboard AI Agent</span>

            {/* AI Agent Logos */}
            <div className="flex items-center gap-1.5 pl-0.5">
              {/* Anthropic Claude Spark / Asterisk */}
              <span title="Claude Desktop (Anthropic)" className="inline-flex">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#D97757] fill-current" aria-label="Claude">
                  <path d="M12 2a1 1 0 0 1 .993.883L13 3v4.06l2.87-2.87a1 1 0 0 1 1.497 1.32l-.083.094L14.414 8.5H18.5a1 1 0 0 1 .993.883L19.5 9.5a1 1 0 0 1-.883.993L18.5 10.5h-4.086l2.87 2.87a1 1 0 0 1-1.32 1.497l-.094-.083L13 11.914V16a1 1 0 0 1-.883.993L12 17a1 1 0 0 1-.993-.883L11 16v-4.086l-2.87 2.87a1 1 0 0 1-1.497-1.32l.083-.094L9.586 10.5H5.5a1 1 0 0 1-.993-.883L4.5 9.5a1 1 0 0 1 .883-.993L5.5 8.5h4.086L6.716 5.63a1 1 0 0 1 1.32-1.497l.094.083L11 7.086V3a1 1 0 0 1 .883-.993L12 2z" />
                </svg>
              </span>

              {/* Cursor Icon */}
              <span title="Cursor IDE" className="inline-flex">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current text-slate-800 dark:text-slate-100" aria-label="Cursor">
                  <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.2L18.6 8 12 11.8 5.4 8 12 4.2zM4.8 9.2l6.2 3.6v6.8l-6.2-3.5V9.2zm14.4 6.9l-6.2 3.5v-6.8l6.2-3.6v6.9z" />
                </svg>
              </span>

              {/* OpenAI / ChatGPT Emblem */}
              <span title="OpenAI / Windsurf" className="inline-flex">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current text-emerald-600 dark:text-emerald-400" aria-label="OpenAI">
                  <path d="M22.28 10.13c-.15-.98-.6-1.9-1.3-2.61a5.6 5.6 0 0 0-3.66-1.57c-.24-.87-.72-1.65-1.4-2.26a5.55 5.55 0 0 0-4.07-1.25 5.5 5.5 0 0 0-3.9 1.7 5.57 5.57 0 0 0-1.87 3.82c-.88.24-1.66.72-2.27 1.4a5.55 5.55 0 0 0-1.25 4.07 5.5 5.5 0 0 0 1.7 3.9 5.58 5.58 0 0 0 3.82 1.87c.24.88.72 1.66 1.4 2.27a5.56 5.56 0 0 0 4.07 1.25 5.5 5.5 0 0 0 3.9-1.7 5.58 5.58 0 0 0 1.87-3.82c.88-.24 1.66-.72 2.27-1.4a5.55 5.55 0 0 0 1.25-4.07 5.5 5.5 0 0 0-1.7-3.9c.2-.55.28-1.14.24-1.74zm-8.8 11.1c-.8.46-1.7.67-2.62.6a3.7 3.7 0 0 1-2.6-1.2 3.7 3.7 0 0 1-.95-2.73l.08-.47 4.14 2.4c.66.38 1.4.52 2.13.4l-.18 1zm-7.07-4.1a3.68 3.68 0 0 1-.4-2.85c.23-.9.77-1.67 1.52-2.2l.4-.24v4.8c0 .76.28 1.5.78 2.06l-2.3-1.57zm-.9-7.3c.53-.73 1.3-1.22 2.17-1.4.88-.17 1.78.02 2.52.53l.42.25-4.14 2.4c-.66.38-1.18.96-1.5 1.66l.53-3.44zm11.75 3.3l-4.8-2.77 2.05-1.18a3.7 3.7 0 0 1 2.85-.4c.9.23 1.67.77 2.2 1.52.54.74.73 1.65.53 2.52a3.7 3.7 0 0 1-1.4 2.18l-1.43-.87zm1.8 4.2c-.23.9-.77 1.67-1.52 2.2l-.4.24v-4.8c0-.76-.28-1.5-.78-2.06l2.3 1.57c.33.87.47 1.83.4 2.85zm-7.6-1.15l-2.4-1.39 2.4-1.38 2.4 1.38-2.4 1.39z" />
                </svg>
              </span>

              {/* Terminal Code Icon */}
              <span title="Terminal / Custom AI" className="inline-flex">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2 text-slate-700 dark:text-slate-300" aria-label="Terminal">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 17l6-6-6-6m8 14h8" />
                </svg>
              </span>
            </div>
          </button>

          {/* Thin Divider */}
          <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Config / Instructions Modal Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            className="px-2 py-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="View MCP server details, API keys & configuration files"
          >
            <SlidersHorizontal className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Full Modal for Detailed MCP Configurations & API Keys */}
      <AiAgentMcpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        companyName={companyName}
        orgId={orgId}
      />
    </>
  );
}
