'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export function InvoiceDeleteButton({
  invoiceId,
  invoiceNumber,
}: {
  invoiceId: string;
  invoiceNumber: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete invoice ${invoiceNumber}?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete invoice');

      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting invoice');
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors disabled:opacity-50"
      title="Delete Invoice"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
