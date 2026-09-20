'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Download,
  Share2,
  Copy,
  Check,
  RotateCcw,
  Edit,
  ExternalLink,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { QuotationStatus } from '@/types/database';

interface QuotationActionButtonsProps {
  quotationId: string;
  quotationNumber: string;
  status: QuotationStatus;
  publicToken: string;
  grandTotalFormatted: string;
  customerName?: string;
}

export function QuotationActionButtons({
  quotationId,
  quotationNumber,
  status,
  publicToken,
  grandTotalFormatted,
  customerName = 'Valued Customer',
}: QuotationActionButtonsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/q/${publicToken}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Link copied to clipboard!');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const res = await fetch(`/api/public/pdf?id=${quotationId}`);
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quotation-${quotationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Could not download PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCreateRevision = async () => {
    if (
      !confirm(
        'Create a new revision for this quotation? The current quotation will be preserved as immutable history.'
      )
    ) {
      return;
    }

    try {
      setIsRevising(true);
      const res = await fetch(`/api/quotations/${quotationId}/revision`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create revision');

      router.push(`/quotations/${data.quotation.id}/edit`);
    } catch (err: any) {
      alert(err.message || 'Error creating revision');
    } finally {
      setIsRevising(false);
    }
  };

  const handleDeleteQuotation = async () => {
    if (
      !confirm(
        `Are you sure you want to permanently delete quotation ${quotationNumber}? This will remove all associated items, history, and signatures.`
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete quotation');

      router.push('/quotations');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting quotation');
      setIsDeleting(false);
    }
  };

  const whatsappMsg = encodeURIComponent(
    `Hello ${customerName}, please review quotation ${quotationNumber} (${grandTotalFormatted}). View and digitally sign online here: ${publicUrl}`
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Copy Public Link */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyLink}
        className="gap-1.5 text-xs shadow-sm"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-emerald-700 font-semibold">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5 text-slate-500" />
            <span>Copy Link</span>
          </>
        )}
      </Button>

      {/* WhatsApp Share */}
      <a
        href={`https://wa.me/?text=${whatsappMsg}`}
        target="_blank"
        rel="noreferrer"
      >
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 shadow-sm"
        >
          <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
          <span>WhatsApp</span>
        </Button>
      </a>

      {/* Download PDF */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadPdf}
        isLoading={isDownloadingPdf}
        className="gap-1.5 text-xs shadow-sm"
      >
        <Download className="h-3.5 w-3.5 text-slate-500" />
        <span>PDF</span>
      </Button>

      {/* Edit (Locked if approved) */}
      {status !== 'APPROVED' ? (
        <Link href={`/quotations/${quotationId}/edit`}>
          <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
            <Edit className="h-3.5 w-3.5" />
            <span>Edit</span>
          </Button>
        </Link>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCreateRevision}
          isLoading={isRevising}
          className="gap-1.5 text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Create Revision</span>
        </Button>
      )}

      {/* Open Public Portal View in New Tab */}
      <Link href={`/q/${publicToken}`} target="_blank">
        <Button variant="primary" size="sm" className="gap-1.5 text-xs shadow-sm">
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Client View</span>
        </Button>
      </Link>

      {/* Delete Quotation */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDeleteQuotation}
        isLoading={isDeleting}
        className="gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 shadow-sm"
        title="Permanently Delete Quotation"
      >
        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
        <span>Delete</span>
      </Button>
    </div>
  );
}
