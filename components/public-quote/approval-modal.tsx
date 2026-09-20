'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SignaturePad } from '@/components/signature/signature-pad';
import { CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationNumber: string;
  grandTotalFormatted: string;
  token: string;
  customerName?: string;
  customerEmail?: string;
  customerCompany?: string;
  onApproved: () => void;
}

export function ApprovalModal({
  isOpen,
  onClose,
  quotationNumber,
  grandTotalFormatted,
  token,
  customerName = '',
  customerEmail = '',
  customerCompany = '',
  onApproved,
}: ApprovalModalProps) {
  const [signerName, setSignerName] = useState(customerName);
  const [signerEmail, setSignerEmail] = useState(customerEmail);
  const [signerCompany, setSignerCompany] = useState(customerCompany);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureType, setSignatureType] = useState<'DRAWN' | 'TYPED'>('DRAWN');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signerName.trim()) {
      setError('Please enter your full legal name.');
      return;
    }
    if (!signerEmail.trim() || !signerEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!signatureData) {
      setError('Please provide your digital signature (draw or type).');
      return;
    }
    if (!agreedToTerms) {
      setError('You must check the agreement box to accept terms.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/public/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signer_name: signerName,
          signer_email: signerEmail,
          signer_company: signerCompany,
          signature_data_url: signatureData,
          signature_type: signatureType,
          agree_terms: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve quotation');
      }

      // Celebratory Confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore in environments without canvas
      }

      onApproved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review & Approve Quotation"
      description={`You are approving ${quotationNumber} for a total of ${grandTotalFormatted}.`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Your Full Name *"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="John Doe"
            required
          />
          <Input
            label="Email Address *"
            type="email"
            value={signerEmail}
            onChange={(e) => setSignerEmail(e.target.value)}
            placeholder="john@example.com"
            required
          />
        </div>

        <Input
          label="Company Name (Optional)"
          value={signerCompany}
          onChange={(e) => setSignerCompany(e.target.value)}
          placeholder="Acme Corp"
        />

        {/* Signature Pad */}
        <div className="space-y-1 pt-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            Digital Signature *
          </label>
          <SignaturePad
            signerName={signerName}
            onSignatureChange={(dataUrl, type) => {
              setSignatureData(dataUrl);
              setSignatureType(type);
            }}
          />
        </div>

        {/* Legal Consent & Checkbox */}
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2">
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id="terms-check"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="terms-check" className="text-xs text-slate-700 leading-relaxed cursor-pointer select-none">
              <strong>Legal Confirmation:</strong> I confirm that I have reviewed quotation{' '}
              <strong>{quotationNumber}</strong> and agree to the quoted scope of work, pricing (
              <strong>{grandTotalFormatted}</strong>), deliverables, and stated terms & conditions.
            </label>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1 border-t border-slate-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Legally binding electronic signature audit log recorded.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="success"
            isLoading={isLoading}
            className="gap-1.5 shadow-md hover:shadow-lg"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirm & Digitally Approve
          </Button>
        </div>
      </form>
    </Modal>
  );
}
