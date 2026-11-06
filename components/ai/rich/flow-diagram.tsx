'use client';

import React from 'react';
import {
  FileText,
  Cpu,
  CheckCircle2,
  Share2,
  Clock,
  CreditCard,
  Mail,
  MessageSquare,
  Users,
  ArrowRight,
  GitBranch,
} from 'lucide-react';
import { WorkflowBlock, WorkflowStep } from '@/types/rich-ai';

interface FlowDiagramProps {
  block: WorkflowBlock;
}

export function FlowDiagram({ block }: FlowDiagramProps) {
  const steps = block.steps || [];

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] p-5 sm:p-6 shadow-sm dark:shadow-xl transition-all">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-200 dark:border-[#263653]/60">
        <div className="w-7 h-7 rounded-lg bg-[#2388FF]/15 border border-[#2388FF]/30 flex items-center justify-center text-[#2388FF]">
          <GitBranch className="w-4 h-4" />
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-[#F5F7FF] tracking-wide">
          {block.title || 'Quotation workflow'}
        </h3>
      </div>

      {/* Steps Flow Container */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-2 items-stretch">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const theme = getStepTheme(step.step, step.icon);

          return (
            <React.Fragment key={step.step || idx}>
              <div className="relative flex flex-col justify-between p-4 rounded-xl bg-slate-50 dark:bg-[#101A2D] border border-slate-200 dark:border-[#263653] hover:border-[#5638F5]/50 transition-all duration-200 group">
                <div>
                  {/* Step Icon & Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${theme.iconBg} ${theme.iconColor} border ${theme.borderColor} shadow-xs group-hover:scale-105 transition-transform`}
                    >
                      {renderStepIcon(step.icon, step.step)}
                    </div>
                    {step.badge && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-[#17243B] border border-slate-300 dark:border-[#263653] text-slate-700 dark:text-[#A8B4CA]">
                        {step.badge}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FF] mb-1.5 leading-snug">
                    {step.step ? `${step.step}. ` : ''}
                    {step.title}
                  </h4>

                  {/* Description */}
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-[#A8B4CA]">{step.description}</p>
                </div>
              </div>

              {/* Connecting arrow (hidden on mobile, shown between items on md+) */}
              {!isLast && (
                <div className="hidden md:flex items-center justify-center -mx-1 text-slate-300 dark:text-[#263653]">
                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-[#A8B4CA]/40 animate-pulse" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function getStepTheme(stepNumber: number, iconKey?: string) {
  // Step 1: Blue
  // Step 2: Purple
  // Step 3: Green
  // Step 4: Teal
  if (iconKey === 'ai' || stepNumber === 2) {
    return {
      iconBg: 'bg-[#5638F5]/15',
      iconColor: 'text-[#5638F5]',
      borderColor: 'border-[#5638F5]/30',
    };
  }
  if (iconKey === 'approve' || iconKey === 'check' || stepNumber === 3) {
    return {
      iconBg: 'bg-[#11C995]/15',
      iconColor: 'text-[#11C995]',
      borderColor: 'border-[#11C995]/30',
    };
  }
  if (iconKey === 'whatsapp' || iconKey === 'send' || stepNumber === 4) {
    return {
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
    };
  }

  // Default Step 1: Blue
  return {
    iconBg: 'bg-[#2388FF]/15',
    iconColor: 'text-[#2388FF]',
    borderColor: 'border-[#2388FF]/30',
  };
}

function renderStepIcon(iconKey?: string, stepNumber?: number) {
  switch (iconKey) {
    case 'ai':
      return <Cpu className="w-4 h-4" />;
    case 'approve':
    case 'check':
      return <CheckCircle2 className="w-4 h-4" />;
    case 'whatsapp':
    case 'send':
      return <MessageSquare className="w-4 h-4" />;
    case 'payment':
      return <CreditCard className="w-4 h-4" />;
    case 'email':
      return <Mail className="w-4 h-4" />;
    case 'users':
      return <Users className="w-4 h-4" />;
    case 'clock':
      return <Clock className="w-4 h-4" />;
    case 'document':
    default:
      if (stepNumber === 2) return <Cpu className="w-4 h-4" />;
      if (stepNumber === 3) return <CheckCircle2 className="w-4 h-4" />;
      if (stepNumber === 4) return <Share2 className="w-4 h-4" />;
      return <FileText className="w-4 h-4" />;
  }
}
