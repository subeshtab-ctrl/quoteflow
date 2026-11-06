'use client';

import React, { useState } from 'react';
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { ChartBlock } from '@/types/rich-ai';

interface ChartRendererProps {
  block: ChartBlock;
}

export function ChartRenderer({ block }: ChartRendererProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const categories = block.categories || [];
  const series = block.series || [];
  const chartType = block.chartType || 'bar';

  // Compute maximum value for scaling
  let maxVal = 0;
  for (const s of series) {
    for (const v of s.data) {
      if (v > maxVal) maxVal = v;
    }
  }
  if (maxVal === 0) maxVal = 100;
  const niceMax = Math.ceil(maxVal * 1.15);

  const defaultColors = ['#5638F5', '#2388FF', '#11C995', '#F59E0B'];

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] p-5 sm:p-6 shadow-sm dark:shadow-xl transition-all">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-slate-200 dark:border-[#263653]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#5638F5]/15 border border-[#5638F5]/30 flex items-center justify-center text-[#5638F5]">
            {chartType === 'line' ? <LineChartIcon className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-[#F5F7FF] tracking-wide">{block.title || 'Analytics'}</h3>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {series.map((s, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#A8B4CA]">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: s.color || defaultColors[idx % defaultColors.length] }}
              />
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Responsive Chart Viewport */}
      <div className="w-full h-52 sm:h-60 relative flex flex-col justify-end pt-4 pb-6">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
          {[1, 0.66, 0.33, 0].map((ratio, idx) => (
            <div key={idx} className="border-b border-[#263653]/30 w-full flex items-center justify-between">
              <span className="text-[10px] text-[#A8B4CA]/50 font-mono -mt-3.5">
                {Math.round(niceMax * ratio).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Bar Chart Mode */}
        {chartType === 'bar' && (
          <div className="relative z-10 grid grid-flow-col auto-cols-fr gap-2 sm:gap-4 h-full items-end pl-8">
            {categories.map((cat, cIdx) => {
              const isHovered = hoveredIdx === cIdx;
              return (
                <div
                  key={cIdx}
                  onMouseEnter={() => setHoveredIdx(cIdx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="flex flex-col items-center h-full justify-end group cursor-pointer"
                >
                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div className="absolute -top-7 bg-[#080F20] border border-[#263653] text-[#F5F7FF] px-2 py-0.5 rounded text-[11px] shadow-lg whitespace-nowrap z-20">
                      <span className="font-bold">{cat}: </span>
                      {series.map((s) => `${s.name}: ${s.data[cIdx] || 0}`).join(' | ')}
                    </div>
                  )}

                  {/* Bars */}
                  <div className="flex items-end gap-1 w-full max-w-[48px] justify-center h-full pb-1">
                    {series.map((s, sIdx) => {
                      const val = s.data[cIdx] || 0;
                      const heightPct = Math.max(4, Math.round((val / niceMax) * 100));
                      const color = s.color || defaultColors[sIdx % defaultColors.length];

                      return (
                        <div
                          key={sIdx}
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: color,
                          }}
                          className="w-full rounded-t-sm transition-all duration-300 group-hover:brightness-110 shadow-xs"
                        />
                      );
                    })}
                  </div>

                  {/* Category Label */}
                  <span className="text-[10px] sm:text-xs text-[#A8B4CA] mt-2 truncate max-w-full text-center">
                    {cat}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Line Chart Mode */}
        {chartType === 'line' && (
          <div className="relative z-10 w-full h-full pl-8 flex flex-col justify-between">
            <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${categories.length * 80} 180`} preserveAspectRatio="none">
              {series.map((s, sIdx) => {
                const color = s.color || defaultColors[sIdx % defaultColors.length];
                const points = s.data
                  .map((val, idx) => {
                    const x = idx * 80 + 40;
                    const y = 180 - (val / niceMax) * 160 - 10;
                    return `${x},${y}`;
                  })
                  .join(' ');

                return (
                  <g key={sIdx}>
                    <polyline
                      fill="none"
                      stroke={color}
                      strokeWidth="2.5"
                      points={points}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {s.data.map((val, idx) => {
                      const x = idx * 80 + 40;
                      const y = 180 - (val / niceMax) * 160 - 10;
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#080F20"
                          stroke={color}
                          strokeWidth="2"
                          className="hover:r-6 transition-all cursor-pointer"
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>

            {/* X-axis category labels */}
            <div className="flex justify-between items-center w-full pt-2">
              {categories.map((cat, idx) => (
                <span key={idx} className="text-[10px] sm:text-xs text-[#A8B4CA] truncate text-center flex-1">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
