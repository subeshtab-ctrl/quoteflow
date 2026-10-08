'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { CurrencyCode } from '@/types/database';

interface DashboardChartsProps {
  monthlyData?: Array<{
    month: string;
    value: number;
    approved: number;
    count: number;
  }>;
  currency?: CurrencyCode;
}

const getSymbol = (c: CurrencyCode = 'INR') => {
  switch (c) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'AED': return 'AED ';
    case 'INR':
    default:
      return '₹';
  }
};

export function DashboardCharts({ monthlyData = [], currency = 'INR' }: DashboardChartsProps) {
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | '3M' | '6M' | '1Y'>('6M');
  const sym = getSymbol(currency);

  const chartData = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) {
      return [
        { month: 'Jan', value: 0, approved: 0 },
        { month: 'Feb', value: 0, approved: 0 },
        { month: 'Mar', value: 0, approved: 0 },
        { month: 'Apr', value: 0, approved: 0 },
        { month: 'May', value: 0, approved: 0 },
        { month: 'Jun', value: 0, approved: 0 },
      ];
    }

    if (timeframe === '7D') {
      return monthlyData.slice(-2);
    }
    if (timeframe === '30D') {
      return monthlyData.slice(-3);
    }
    if (timeframe === '3M') {
      return monthlyData.slice(-3);
    }
    if (timeframe === '6M') {
      return monthlyData.slice(-6);
    }
    return monthlyData;
  }, [monthlyData, timeframe]);

  const formatYAxis = (val: number) => {
    if (val >= 100000) return `${sym}${(val / 1000).toFixed(0)}k`;
    if (val >= 1000) return `${sym}${(val / 1000).toFixed(0)}k`;
    return `${sym}${val}`;
  };

  return (
    <div className="space-y-4">
      {/* Timeframe Filter Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] font-semibold">
          {(['7D', '30D', '3M', '6M', '1Y'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                timeframe === t
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
            <span className="text-slate-600 dark:text-slate-400">Total Pipeline</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-400">Approved Revenue</span>
          </div>
        </div>
      </div>

      {/* Smooth Area Chart */}
      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={formatYAxis} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(8px)',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                color: '#fff',
                fontSize: '12px',
                padding: '10px 14px',
              }}
              formatter={(value: any, name: any) => [
                `${sym}${Number(value || 0).toLocaleString()}`,
                name === 'value' ? 'Pipeline Created' : 'Approved Revenue',
              ]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorPipeline)"
              name="value"
            />
            <Area
              type="monotone"
              dataKey="approved"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorApproved)"
              name="approved"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface DonutChartProps {
  distribution: {
    approved: number;
    pending: number;
    draft: number;
    rejected: number;
  };
  totalCount: number;
  winRate: number;
}

const DONUT_COLORS = ['#10b981', '#f59e0b', '#94a3b8', '#f43f5e'];

export function DashboardDonutChart({ distribution, totalCount, winRate }: DonutChartProps) {
  const data = [
    { name: 'Approved', value: distribution.approved },
    { name: 'Pending', value: distribution.pending },
    { name: 'Drafts', value: distribution.draft },
    { name: 'Revisions', value: distribution.rejected },
  ].filter((d) => d.value > 0);

  const displayData = data.length > 0 ? data : [{ name: 'No Quotes', value: 1 }];

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-2">
      <div className="relative h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              innerRadius={52}
              outerRadius={72}
              paddingAngle={data.length > 1 ? 4 : 0}
              dataKey="value"
              stroke="transparent"
            >
              {displayData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={data.length > 0 ? DONUT_COLORS[index % DONUT_COLORS.length] : '#cbd5e1'}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {winRate}%
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Win Rate
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full grid grid-cols-2 gap-2 text-xs pt-1">
        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="truncate">Approved ({distribution.approved})</span>
        </div>
        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="truncate">Pending ({distribution.pending})</span>
        </div>
        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          <span className="truncate">Drafts ({distribution.draft})</span>
        </div>
        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          <span className="truncate">Revisions ({distribution.rejected})</span>
        </div>
      </div>
    </div>
  );
}
