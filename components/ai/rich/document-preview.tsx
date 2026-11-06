'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ArrowRight, ExternalLink, Download, MessageSquare } from 'lucide-react';
import { DocumentPreviewBlock } from '@/types/rich-ai';

interface DocumentPreviewProps {
  block: DocumentPreviewBlock;
  onActionClick?: (action: string, docNumber: string) => void;
}

export function DocumentPreview({ block, onActionClick }: DocumentPreviewProps) {
  const currencySymbol = block.currency === 'USD' ? '$' : block.currency === 'EUR' ? '€' : block.currency === 'GBP' ? '£' : '₹';

  const formatMoney = (val: number) => {
    return `${currencySymbol}${val.toLocaleString('en-US')}`;
  };

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] p-5 sm:p-6 shadow-sm dark:shadow-xl transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-[#263653]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#2388FF]/15 border border-[#2388FF]/30 flex items-center justify-center text-[#2388FF]">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-[#F5F7FF] tracking-wide">
            {block.title || (block.docType === 'invoice' ? 'Sample invoice preview' : 'Sample quotation preview')}
          </h3>
        </div>

        {block.viewUrl && (
          <Link
            href={block.viewUrl}
            className="text-xs font-semibold text-[#2388FF] hover:text-[#5638F5] inline-flex items-center gap-1 transition-colors"
          >
            <span>{block.actionLabel || 'View full quote'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Realistic Mini Document Sheet */}
      <div className="rounded-xl bg-white dark:bg-[#0d1627] text-slate-900 dark:text-slate-100 p-4 sm:p-5 border border-slate-200 dark:border-[#263653] shadow-sm">
        {/* Document Header */}
        <div className="flex items-start justify-between pb-3 mb-3 border-b border-slate-200 dark:border-[#263653]/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#5638F5] flex items-center justify-center text-white font-black text-xs">
              Q
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-[#F5F7FF]">QuoteFlow</span>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-slate-700 dark:text-[#A8B4CA]">{block.docNumber}</span>
          </div>
        </div>

        {/* Client & Date Info */}
        <div className="flex items-center justify-between text-xs mb-3 text-slate-600 dark:text-[#A8B4CA]">
          <div>
            <span className="text-slate-400 dark:text-slate-500 mr-1">To:</span>
            <strong className="text-slate-800 dark:text-[#F5F7FF] font-semibold">{block.recipientName}</strong>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 mr-1">Date:</span>
            <span>{block.date}</span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#263653]/60 text-slate-400 dark:text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-1.5 pl-0 font-medium">Item</th>
                <th className="py-1.5 text-center font-medium">Qty</th>
                <th className="py-1.5 text-right font-medium">Rate</th>
                <th className="py-1.5 text-right pr-0 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#263653]/40">
              {block.items.map((item, idx) => (
                <tr key={idx} className="text-slate-700 dark:text-[#F5F7FF]">
                  <td className="py-2 pl-0 font-medium text-xs truncate max-w-[140px]">{item.description}</td>
                  <td className="py-2 text-center text-slate-500 dark:text-[#A8B4CA]">{item.quantity}</td>
                  <td className="py-2 text-right text-slate-500 dark:text-[#A8B4CA]">{formatMoney(item.rate)}</td>
                  <td className="py-2 text-right pr-0 font-semibold">{formatMoney(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary */}
        <div className="pt-2 border-t border-slate-200 dark:border-[#263653]/60 space-y-1 text-xs">
          <div className="flex justify-between text-slate-500 dark:text-[#A8B4CA]">
            <span>Subtotal</span>
            <span>{formatMoney(block.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-[#A8B4CA]">
            <span>{block.taxLabel || 'Tax / GST'}</span>
            <span>{formatMoney(block.taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-[#F5F7FF] pt-1.5 border-t border-slate-100 dark:border-[#263653]/40">
            <span>Total</span>
            <span className="text-[#11C995] font-black">{formatMoney(block.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
