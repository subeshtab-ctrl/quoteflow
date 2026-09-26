'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4 shadow-xs">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-black text-slate-900 mb-1">
        Something Went Wrong
      </h2>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        An unexpected error occurred while loading this page. You can try reloading or navigate back to the dashboard.
      </p>

      {error?.digest && (
        <p className="text-xs font-mono bg-slate-100 text-slate-600 px-3 py-1 rounded mb-6">
          Digest: {error.digest}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => reset()}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Reload Page</span>
        </Button>
        <Link href="/dashboard">
          <Button variant="outline" className="gap-2 border-slate-300 text-slate-700">
            <Home className="h-4 w-4" />
            <span>Go to Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
