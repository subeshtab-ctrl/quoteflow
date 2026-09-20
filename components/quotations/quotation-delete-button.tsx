'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';

interface QuotationDeleteButtonProps {
  quotationId: string;
  quotationNumber: string;
}

export function QuotationDeleteButton({
  quotationId,
  quotationNumber,
}: QuotationDeleteButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !confirm(
        `Are you sure you want to permanently delete quotation ${quotationNumber}? This action cannot be undone.`
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

      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting quotation');
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
      title="Delete Quotation"
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
