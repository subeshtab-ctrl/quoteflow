'use client';

import React from 'react';
import { Lightbulb, ArrowUpRight } from 'lucide-react';

interface SuggestedQuestionsProps {
  questions: string[];
  onSelectQuestion: (question: string) => void;
}

export function SuggestedQuestions({ questions, onSelectQuestion }: SuggestedQuestionsProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="w-full pt-2">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-5 h-5 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
          <Lightbulb className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-[#A8B4CA] uppercase tracking-wider">Suggested next questions</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {questions.map((question, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectQuestion(question)}
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#101A2D] dark:hover:bg-[#17243B] border border-slate-200 dark:border-[#263653] hover:border-[#5638F5]/60 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-[#A8B4CA] dark:hover:text-[#F5F7FF] transition-all duration-150 shadow-xs active:scale-95 text-left"
          >
            <span>{question}</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-[#A8B4CA]/50 group-hover:text-[#2388FF] transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
