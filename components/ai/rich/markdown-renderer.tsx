'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Safe, zero-DOM-injection markdown renderer.
 * Converts markdown text into sanitized React elements without using dangerouslySetInnerHTML.
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-2 space-y-1.5 list-disc list-inside text-sm text-slate-700 dark:text-[#A8B4CA]">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInlineMarkdown(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-2 space-y-1.5 list-decimal list-inside text-sm text-slate-700 dark:text-[#A8B4CA]">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInlineMarkdown(item)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code blocks ```
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushList();
        elements.push(
          <pre
            key={`code-${elements.length}`}
            className="my-3 p-3.5 rounded-xl bg-slate-100 dark:bg-[#101A2D] border border-slate-200 dark:border-[#263653] font-mono text-xs text-emerald-600 dark:text-[#11C995] overflow-x-auto"
          >
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        inCodeBlock = false;
        codeBlockLines = [];
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Empty lines
    if (!trimmed) {
      flushList();
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h4-${elements.length}`} className="text-base font-semibold text-slate-900 dark:text-[#F5F7FF] mt-4 mb-1.5">
          {renderInlineMarkdown(trimmed.replace(/^###\s+/, ''))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-lg font-bold text-slate-900 dark:text-[#F5F7FF] mt-5 mb-2">
          {renderInlineMarkdown(trimmed.replace(/^##\s+/, ''))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-xl font-black text-slate-900 dark:text-[#F5F7FF] mt-6 mb-2.5 tracking-tight">
          {renderInlineMarkdown(trimmed.replace(/^#\s+/, ''))}
        </h2>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          className="my-2.5 pl-3.5 border-l-2 border-[#5638F5] text-sm italic text-slate-600 dark:text-[#A8B4CA] bg-slate-100/60 dark:bg-[#101A2D]/50 py-1.5 rounded-r-lg"
        >
          {renderInlineMarkdown(trimmed.replace(/^>\s+/, ''))}
        </blockquote>
      );
      continue;
    }

    // Unordered List (- or *)
    const ulMatch = trimmed.match(/^[\*\-•]\s+(.*)$/);
    if (ulMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(ulMatch[1]);
      continue;
    }

    // Ordered List (1. or 2.)
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(olMatch[2]);
      continue;
    }

    // Normal paragraph
    flushList();
    elements.push(
      <p key={`p-${elements.length}`} className="text-sm leading-relaxed text-slate-700 dark:text-[#A8B4CA] my-1.5">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  }

  flushList();
  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <pre
        key={`code-end-${elements.length}`}
        className="my-3 p-3.5 rounded-xl bg-slate-100 dark:bg-[#101A2D] border border-slate-200 dark:border-[#263653] font-mono text-xs text-emerald-600 dark:text-[#11C995] overflow-x-auto"
      >
        <code>{codeBlockLines.join('\n')}</code>
      </pre>
    );
  }

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}

/**
 * Safely parses inline markdown (bold, italic, code, links) without innerHTML.
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Split tokens by inline formatting
  // Matches `code`, **bold**, *italic*, [label](url)
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline code `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 dark:bg-[#101A2D] border border-slate-200 dark:border-[#263653] font-mono text-xs text-[#2388FF]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-slate-900 dark:text-[#F5F7FF]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-slate-800 dark:text-[#F5F7FF]/90">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Link [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const label = linkMatch[1];
      const url = linkMatch[2];
      // Only allow safe HTTP/HTTPS or internal relative URLs
      const isSafe = /^https?:\/\//i.test(url) || url.startsWith('/') || url.startsWith('#');
      if (isSafe) {
        return (
          <a
            key={index}
            href={url}
            target={url.startsWith('http') ? '_blank' : undefined}
            rel={url.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="text-[#2388FF] hover:underline hover:text-[#5638F5] transition-colors"
          >
            {label}
          </a>
        );
      }
      return <span key={index}>{label}</span>;
    }

    return <span key={index}>{part}</span>;
  });
}
