'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Printer, Download, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InvoiceRowActionsProps {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  environment?: string;
  canManage?: boolean;
}

export function InvoiceRowActions({
  invoiceId,
  invoiceNumber,
  status,
  environment = 'live',
  canManage = true,
}: InvoiceRowActionsProps) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isIssueConfirmOpen, setIsIssueConfirmOpen] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDraft = status === 'DRAFT';
  const isTest = environment === 'test';
  const canDelete = isDraft || (isTest && canManage);

  const handleIssueInvoice = async () => {
    setIsIssuing(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ISSUED' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to issue invoice');
      }
      setIsIssueConfirmOpen(false);
      router.push('/invoices');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error issuing invoice');
      setIsIssuing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete invoice');
      }
      setIsConfirmOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error deleting invoice');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {isDraft && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsIssueConfirmOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
            title="Issue this Draft Invoice and move it to Invoices"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Issue Invoice</span>
          </button>
        )}

        <Link href={`/invoices/${invoiceId}`}>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
            title="View Invoice"
          >
            <Eye className="h-4 w-4" />
          </button>
        </Link>

        <Link href={`/invoices/${invoiceId}?print=1`}>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
            title={isDraft ? 'Print Draft Invoice (with DRAFT watermark)' : 'Print Invoice'}
          >
            <Printer className="h-4 w-4" />
          </button>
        </Link>

        <a
          href={`/api/invoices/${invoiceId}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
          title={isDraft ? 'Download Draft PDF (with DRAFT watermark)' : 'Download Invoice PDF'}
        >
          <Download className="h-4 w-4" />
        </a>

        {canDelete && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsConfirmOpen(true);
            }}
            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors cursor-pointer"
            title={isDraft ? 'Delete Draft Invoice' : 'Delete Test Invoice'}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {isIssueConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm text-left animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-200 dark:border-emerald-900/40 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Issue Official Invoice?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Convert this draft into an official issued tax invoice.
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3 text-xs text-emerald-900 dark:text-emerald-200 font-normal">
              Draft invoice <span className="font-mono font-bold">{invoiceNumber}</span> will be officially issued, its <strong>DRAFT</strong> watermark will be removed, and it will move from <strong>Drafts</strong> into your main <strong>Invoices</strong> list.
            </div>

            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/40">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsIssueConfirmOpen(false)}
                disabled={isIssuing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleIssueInvoice}
                disabled={isIssuing}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isIssuing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Issue Invoice
              </Button>
            </div>
          </div>
        </div>
      )}

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm text-left animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/40 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isDraft ? 'Delete Draft Invoice?' : 'Delete Test Invoice?'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isDraft
                    ? 'This draft invoice has not been issued yet and will be permanently removed.'
                    : 'This test invoice will be permanently removed.'}
                </p>
              </div>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3 text-xs text-rose-800 dark:text-rose-300 font-normal">
              {isDraft ? (
                <>
                  You are deleting draft invoice <span className="font-mono font-bold">{invoiceNumber}</span>. Because it is still in Draft status, removing it will not affect issued accounting records.
                </>
              ) : (
                <>
                  You are deleting test invoice <span className="font-mono font-bold">{invoiceNumber}</span>. This action is irreversible.
                </>
              )}
            </div>

            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/40">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-1.5"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isDraft ? 'Delete Draft' : 'Permanently Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
