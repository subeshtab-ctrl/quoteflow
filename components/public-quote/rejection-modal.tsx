'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { AlertTriangle, XCircle } from 'lucide-react';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationNumber: string;
  token: string;
  onRejected: () => void;
}

export function RejectionModal({
  isOpen,
  onClose,
  quotationNumber,
  token,
  onRejected,
}: RejectionModalProps) {
  const [reason, setReason] = useState<string>('Need changes');
  const [comments, setComments] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!comments.trim()) {
      setError('Please provide brief comments or reasons for the business.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/public/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          reason,
          comments: comments.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit rejection feedback');
      }

      onRejected();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Decline / Request Revision"
      description={`Share feedback with the team regarding quotation ${quotationNumber}.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            Primary Reason *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="Need changes">Need changes / revisions to scope</option>
            <option value="Price too high">Price is too high / over budget</option>
            <option value="Selected another supplier">Selected another vendor / supplier</option>
            <option value="Project cancelled">Project postponed or cancelled</option>
            <option value="Other">Other reason</option>
          </select>
        </div>

        <Textarea
          label="Feedback or Requested Changes *"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={4}
          placeholder="Please explain what adjustments or clarification you need..."
          required
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" isLoading={isLoading} className="gap-1.5">
            <XCircle className="h-4 w-4" />
            Submit Feedback & Decline
          </Button>
        </div>
      </form>
    </Modal>
  );
}
