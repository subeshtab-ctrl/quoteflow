import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardNotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-xs">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-1">
        Document Not Found
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
        The quotation, invoice, or document you are looking for does not exist or has been removed.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/invoices">
          <Button variant="outline" className="gap-2 border-slate-300 text-slate-700">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Invoices</span>
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
            <Home className="h-4 w-4" />
            <span>Go to Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
