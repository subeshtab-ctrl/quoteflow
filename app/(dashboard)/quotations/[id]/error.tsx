'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QuotationDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Quotation detail view error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4 shadow-xs">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-black text-slate-900 mb-1">
        Unable to Load Quotation
      </h2>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        An error occurred while loading this quotation. Please try refreshing the page or return to your quotation list.
      </p>

      {error?.digest && (
        <p className="text-xs font-mono bg-slate-100 text-slate-600 px-3 py-1 rounded mb-6">
          Reference Code: {error.digest}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => reset()}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </Button>
        <Link href="/quotations">
          <Button variant="outline" className="gap-2 border-slate-300 text-slate-700">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Quotations</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
