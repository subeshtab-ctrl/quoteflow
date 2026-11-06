'use client';

import React from 'react';
import {
  Sparkles,
  MessageSquare,
  Cpu,
  Bell,
  Users,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  FileText,
} from 'lucide-react';
import { FeatureCardsBlock, FeatureCardItem } from '@/types/rich-ai';

interface FeatureCardsProps {
  block: FeatureCardsBlock;
}

export function FeatureCards({ block }: FeatureCardsProps) {
  const cards = block.cards || [];

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] p-5 sm:p-6 shadow-sm dark:shadow-xl transition-all">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-200 dark:border-[#263653]/60">
        <div className="w-7 h-7 rounded-lg bg-[#5638F5]/15 border border-[#5638F5]/30 flex items-center justify-center text-[#5638F5]">
          <Sparkles className="w-4 h-4" />
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-[#F5F7FF] tracking-wide">
          {block.title || 'Key features'}
        </h3>
      </div>

      {/* 4-column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {cards.map((card, idx) => {
          const theme = getFeatureTheme(card.icon, idx);

          return (
            <div
              key={idx}
              className="flex flex-col p-4 rounded-xl bg-slate-50 dark:bg-[#101A2D] border border-slate-200 dark:border-[#263653] hover:border-[#5638F5]/50 transition-all duration-200 group"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center mb-3 ${theme.bg} ${theme.color} border ${theme.border} group-hover:scale-105 transition-transform`}
              >
                {renderFeatureIcon(card.icon, idx)}
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FF] mb-1 leading-snug">{card.title}</h4>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-[#A8B4CA]">{card.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getFeatureTheme(iconKey?: string, idx: number = 0) {
  if (iconKey === 'whatsapp' || idx === 0) {
    return {
      bg: 'bg-emerald-500/15',
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
    };
  }
  if (iconKey === 'ai' || idx === 1) {
    return {
      bg: 'bg-[#5638F5]/15',
      color: 'text-[#5638F5]',
      border: 'border-[#5638F5]/30',
    };
  }
  if (iconKey === 'bell' || idx === 2) {
    return {
      bg: 'bg-[#2388FF]/15',
      color: 'text-[#2388FF]',
      border: 'border-[#2388FF]/30',
    };
  }
  // Orange / Amber for multi-tenant / users
  return {
    bg: 'bg-amber-500/15',
    color: 'text-amber-400',
    border: 'border-amber-500/30',
  };
}

function renderFeatureIcon(iconKey?: string, idx: number = 0) {
  switch (iconKey) {
    case 'whatsapp':
      return <MessageSquare className="w-4 h-4" />;
    case 'ai':
      return <Cpu className="w-4 h-4" />;
    case 'bell':
      return <Bell className="w-4 h-4" />;
    case 'users':
      return <Users className="w-4 h-4" />;
    case 'shield':
      return <ShieldCheck className="w-4 h-4" />;
    case 'trending':
      return <TrendingUp className="w-4 h-4" />;
    case 'credit_card':
      return <CreditCard className="w-4 h-4" />;
    case 'document':
      return <FileText className="w-4 h-4" />;
    default:
      if (idx === 0) return <MessageSquare className="w-4 h-4" />;
      if (idx === 1) return <Cpu className="w-4 h-4" />;
      if (idx === 2) return <Bell className="w-4 h-4" />;
      return <Users className="w-4 h-4" />;
  }
}
