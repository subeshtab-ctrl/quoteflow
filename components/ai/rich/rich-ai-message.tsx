'use client';

import React, { useState } from 'react';
import { Sparkles, Copy, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { RichAiResponsePayload, RichBlock } from '@/types/rich-ai';
import { MarkdownRenderer } from './markdown-renderer';
import { FlowDiagram } from './flow-diagram';
import { ArchitectureDiagram } from './architecture-diagram';
import { FeatureCards } from './feature-cards';
import { MetricCard } from './metric-card';
import { DocumentPreview } from './document-preview';
import { DataTable } from './data-table';
import { ChartRenderer } from './chart-renderer';
import { SuggestedQuestions } from './suggested-questions';

interface RichAIMessageProps {
  payload: RichAiResponsePayload;
  timestamp?: string;
  onSelectQuestion?: (question: string) => void;
  onRetry?: () => void;
  onActionClick?: (action: string, docNumber: string) => void;
}

export function RichAIMessage({
  payload,
  timestamp,
  onSelectQuestion,
  onRetry,
  onActionClick,
}: RichAIMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let fullText = payload.leadingText || '';
    for (const b of payload.blocks) {
      if (b.type === 'markdown') {
        fullText += `\n\n${b.content}`;
      } else if (b.type === 'workflow') {
        fullText += `\n\nWorkflow: ${b.title || 'Steps'}\n` + b.steps.map((s) => `${s.step}. ${s.title}: ${s.description}`).join('\n');
      }
    }
    navigator.clipboard.writeText(fullText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasBlocks = payload.blocks && payload.blocks.length > 0;
  // Only show "Visual response" badge when rich charts/tables/KPIs are explicitly active, not on ordinary answers
  const isVisual =
    payload.isVisualResponse &&
    hasBlocks &&
    payload.blocks.some((b) => b.type === 'chart' || b.type === 'table' || b.type === 'kpi_grid');

  // Only show copy button for reusable generated text (emails, messages, terms, long answers)
  const isReusableContent = Boolean(
    payload.leadingText &&
      (payload.leadingText.length > 250 ||
        /subject:|dear |hi |hello |terms and conditions|whatsapp message/i.test(payload.leadingText))
  );

  // Group side-by-side blocks if document_preview and kpi_grid are adjacent (matches the mockup!)
  const renderedElements: React.ReactNode[] = [];
  const blocks = payload.blocks || [];

  for (let i = 0; i < blocks.length; i++) {
    const current = blocks[i];
    const next = blocks[i + 1];

    // Detect side-by-side pair: document_preview + kpi_grid (or vice versa)
    if (
      (current.type === 'document_preview' && next && next.type === 'kpi_grid') ||
      (current.type === 'kpi_grid' && next && next.type === 'document_preview')
    ) {
      const docBlock = current.type === 'document_preview' ? current : next;
      const kpiBlock = current.type === 'kpi_grid' ? current : next;

      renderedElements.push(
        <div key={`pair-${i}`} className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <DocumentPreview block={docBlock} onActionClick={onActionClick} />
          <MetricCard block={kpiBlock} />
        </div>
      );
      i++; // Skip next block since we paired it
      continue;
    }

    // Render individual blocks safely
    renderedElements.push(
      <React.Fragment key={`block-${i}`}>{renderSingleBlock(current, onActionClick)}</React.Fragment>
    );
  }

  return (
    <div className="w-full text-slate-900 dark:text-slate-100 flex flex-col space-y-3.5 transition-all animate-in fade-in-50 duration-300">
      {/* AI Message Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* QuoteFlow AI Avatar */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#5638F5] to-[#2388FF] flex items-center justify-center text-white font-black text-xs shadow-md shadow-[#5638F5]/20">
            Q
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-[#F5F7FF] tracking-tight">QuoteFlow AI</span>

          {/* Visual Response Badge (matches mockup) */}
          {isVisual && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#5638F5]/15 text-[#5638F5] dark:text-[#a5b4fc] border border-[#5638F5]/30 shadow-xs">
              <Sparkles className="w-3 h-3 text-[#2388FF]" />
              <span>Visual response</span>
            </span>
          )}
        </div>

        {/* Timestamp */}
        {timestamp && <span className="text-[11px] text-slate-400 dark:text-[#A8B4CA]/60 font-mono">{timestamp}</span>}
      </div>

      {/* Leading Text / Narrative */}
      {payload.leadingText && (
        <div className="text-sm leading-relaxed text-slate-800 dark:text-[#F5F7FF]/90 font-normal">
          <MarkdownRenderer content={payload.leadingText} />
        </div>
      )}

      {/* Structured Visual Blocks */}
      {renderedElements.length > 0 && <div className="space-y-4 pt-1">{renderedElements}</div>}

      {/* Suggested Follow-up Questions */}
      {payload.suggestedQuestions && payload.suggestedQuestions.length > 0 && onSelectQuestion && (
        <div className="pt-2">
          <SuggestedQuestions questions={payload.suggestedQuestions} onSelectQuestion={onSelectQuestion} />
        </div>
      )}

      {/* Action Footer (Copy only for reusable content, Retry) */}
      {(isReusableContent || onRetry) && (
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200 dark:border-[#263653]/40 text-xs text-slate-500 dark:text-[#A8B4CA]">
          {isReusableContent && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#17243B] hover:text-slate-900 dark:hover:text-[#F5F7FF] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#11C995]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#17243B] hover:text-slate-900 dark:hover:text-[#F5F7FF] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function renderSingleBlock(
  block: RichBlock,
  onActionClick?: (action: string, docNumber: string) => void
): React.ReactNode {
  try {
    switch (block.type) {
      case 'workflow':
        return <FlowDiagram block={block} />;
      case 'architecture':
        return <ArchitectureDiagram block={block} />;
      case 'feature_cards':
        return <FeatureCards block={block} />;
      case 'kpi_grid':
        return <MetricCard block={block} />;
      case 'document_preview':
        return <DocumentPreview block={block} onActionClick={onActionClick} />;
      case 'table':
        return <DataTable block={block} />;
      case 'chart':
        return <ChartRenderer block={block} />;
      case 'markdown':
        return (
          <div className="p-4 rounded-xl bg-[#17243B] border border-[#263653] text-sm text-[#A8B4CA]">
            <MarkdownRenderer content={block.content} />
          </div>
        );
      default:
        return null;
    }
  } catch (err) {
    console.error('Error rendering rich AI block:', err);
    return (
      <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
        <span>Could not render visual block. Falling back to text mode.</span>
      </div>
    );
  }
}
