'use client';

import React from 'react';
import { Table as TableIcon } from 'lucide-react';
import { DataTableBlock } from '@/types/rich-ai';

interface DataTableProps {
  block: DataTableBlock;
}

export function DataTable({ block }: DataTableProps) {
  const headers = block.headers || [];
  const rows = block.rows || [];

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] p-5 sm:p-6 shadow-sm dark:shadow-xl transition-all">
      {/* Header */}
      {block.title && (
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-200 dark:border-[#263653]/60">
          <div className="w-7 h-7 rounded-lg bg-[#2388FF]/15 border border-[#2388FF]/30 flex items-center justify-center text-[#2388FF]">
            <TableIcon className="w-4 h-4" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-[#F5F7FF] tracking-wide">{block.title}</h3>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#263653] bg-slate-50 dark:bg-[#101A2D]">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-100 dark:bg-[#17243B]/80 text-slate-900 dark:text-[#F5F7FF] font-semibold border-b border-slate-200 dark:border-[#263653]">
            <tr>
              {headers.map((h, idx) => (
                <th key={idx} className="py-2.5 px-4 font-semibold text-xs tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-[#263653]/60 text-slate-600 dark:text-[#A8B4CA]">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-100/60 dark:hover:bg-[#17243B]/50 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="py-2.5 px-4">
                    {typeof cell === 'number' ? (
                      <span className="font-mono text-slate-900 dark:text-[#F5F7FF]">{cell.toLocaleString()}</span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {block.footer && <p className="text-[11px] text-slate-500 dark:text-[#A8B4CA]/70 mt-2.5 pl-1 italic">{block.footer}</p>}
    </div>
  );
}
