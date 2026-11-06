'use client';

import React from 'react';
import {
  Network,
  Laptop,
  Cloud,
  Database,
  MessageSquare,
  Server,
  ArrowRight,
  ArrowLeftRight,
  ArrowUpDown,
} from 'lucide-react';
import { ArchitectureBlock, ArchitectureNode } from '@/types/rich-ai';

interface ArchitectureDiagramProps {
  block?: ArchitectureBlock;
}

export function ArchitectureDiagram({ block }: ArchitectureDiagramProps) {
  // If custom nodes are supplied in block, use them; otherwise use QuoteFlow default system architecture
  const hasCustomNodes = block && block.nodes && block.nodes.length >= 3;

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] p-5 sm:p-6 shadow-sm dark:shadow-xl transition-all overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-6 pb-3 border-b border-slate-200 dark:border-[#263653]/60">
        <div className="w-7 h-7 rounded-lg bg-[#5638F5]/15 border border-[#5638F5]/30 flex items-center justify-center text-[#5638F5]">
          <Network className="w-4 h-4" />
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-[#F5F7FF] tracking-wide">
          {block?.title || 'System architecture'}
        </h3>
      </div>

      {/* Responsive Architecture Layout */}
      <div className="space-y-4">
        {/* Horizontal Top Tier: Your Business <--> Cloudflare Workers <--> Supabase */}
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-3 items-center">
          {/* Node 1: Your Business */}
          <div className="lg:col-span-3 rounded-xl bg-slate-50 dark:bg-[#101A2D] border border-blue-500/30 p-4 shadow-sm hover:border-blue-500/60 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0">
                <Laptop className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FF] truncate">Your Business</h4>
                <p className="text-[11px] text-slate-500 dark:text-[#A8B4CA] truncate">(QuoteFlow Dashboard)</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#A8B4CA]/80 pl-1">Create · Manage · Track</p>
          </div>

          {/* Connector 1 */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center py-2 lg:py-0">
            <span className="text-[10px] font-medium text-slate-500 dark:text-[#A8B4CA] text-center hidden lg:block leading-tight">
              API calls
            </span>
            <div className="flex items-center justify-center text-[#2388FF] my-1">
              <ArrowLeftRight className="w-5 h-5 hidden lg:block" />
              <ArrowUpDown className="w-5 h-5 lg:hidden text-[#2388FF]" />
            </div>
            <span className="text-[10px] font-medium text-[#11C995] text-center hidden lg:block leading-tight">
              Secure HTTPS
            </span>
          </div>

          {/* Node 2: Cloudflare Workers */}
          <div className="lg:col-span-3 rounded-xl bg-slate-50 dark:bg-[#101A2D] border border-amber-500/30 p-4 shadow-sm hover:border-amber-500/60 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <Cloud className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FF] truncate">Cloudflare Workers</h4>
                <p className="text-[11px] text-slate-500 dark:text-[#A8B4CA] truncate">API endpoints</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#A8B4CA]/80 pl-1">& webhook handler</p>
          </div>

          {/* Connector 2 */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center py-2 lg:py-0">
            <span className="text-[10px] font-medium text-slate-500 dark:text-[#A8B4CA] text-center hidden lg:block leading-tight">
              Read / Write
            </span>
            <div className="flex items-center justify-center text-[#5638F5] my-1">
              <ArrowLeftRight className="w-5 h-5 hidden lg:block" />
              <ArrowUpDown className="w-5 h-5 lg:hidden text-[#5638F5]" />
            </div>
            <span className="text-[10px] font-medium text-indigo-500 dark:text-purple-400 text-center hidden lg:block leading-tight">
              Real-time
            </span>
          </div>

          {/* Node 3: Supabase */}
          <div className="lg:col-span-3 rounded-xl bg-slate-50 dark:bg-[#101A2D] border border-emerald-500/30 p-4 shadow-sm hover:border-emerald-500/60 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FF] truncate">Supabase</h4>
                <p className="text-[11px] text-slate-500 dark:text-[#A8B4CA] truncate">Database · Auth</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#A8B4CA]/80 pl-1">Storage · RLS Security</p>
          </div>
        </div>

        {/* Vertical Connector between Cloudflare Workers and Meta WhatsApp */}
        <div className="flex flex-col items-center justify-center -my-1">
          <div className="w-0.5 h-3 bg-slate-200 dark:bg-[#263653]" />
          <div className="flex items-center justify-center text-[#11C995] py-0.5">
            <ArrowUpDown className="w-4 h-4" />
          </div>
          <div className="w-0.5 h-3 bg-slate-200 dark:bg-[#263653]" />
        </div>

        {/* Lower Tier: Meta WhatsApp Cloud API */}
        <div className="max-w-md mx-auto rounded-xl bg-slate-50 dark:bg-[#101A2D] border border-emerald-500/30 p-4 shadow-sm hover:border-emerald-500/60 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FF] truncate">Meta WhatsApp Cloud API</h4>
              <p className="text-[11px] text-slate-500 dark:text-[#A8B4CA]">Send messages · Receive status</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
