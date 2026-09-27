'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SignaturePad } from '@/components/signature/signature-pad';
import { CheckCircle2, ShieldCheck, AlertCircle, Smartphone } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Quotation } from '@/types/database';
import { cleanPhoneNumber } from '@/lib/country-codes';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationNumber: string;
  grandTotalFormatted: string;
  token: string;
  authMethod?: 'MOBILE' | 'EMAIL';
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  phoneCountryCode?: string;
  customerCompany?: string;
  onApproved: (updatedQuote?: Quotation) => void;
}

export function ApprovalModal({
  isOpen,
  onClose,
  quotationNumber,
  grandTotalFormatted,
  token,
  authMethod = 'EMAIL',
  customerName = '',
  customerEmail = '',
  customerPhone = '',
  phoneCountryCode = '+91',
  customerCompany = '',
  onApproved,
}: ApprovalModalProps) {
  const isMobile = authMethod === 'MOBILE';
  const [signerName, setSignerName] = useState(customerName);
  const [signerEmail, setSignerEmail] = useState(customerEmail);
  const [signerPhone, setSignerPhone] = useState(customerPhone);
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

    if (isMobile) {
      const cleanPhone = cleanPhoneNumber(signerPhone, phoneCountryCode);
      if (!cleanPhone || cleanPhone.length < 5) {
        setError('Please enter your mobile phone number without country code.');
        return;
      }
    } else {
      if (!signerEmail.trim() || !signerEmail.includes('@')) {
        setError('Please enter a valid email address.');
        return;
      }
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
      const cleanPhone = signerPhone ? cleanPhoneNumber(signerPhone, phoneCountryCode) : undefined;
      const res = await fetch('/api/public/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signer_name: signerName.trim(),
          signer_email: signerEmail.trim() || undefined,
          signer_phone: cleanPhone,
          phone_country_code: phoneCountryCode,
          signer_company: signerCompany.trim() || undefined,
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

      onApproved(data.quotation);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error processing approval. Please try again.');
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
            label="Your Full Legal Name *"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="e.g. John Doe"
            required
          />

          {isMobile ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Mobile Number *
              </label>
              <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                <span className="flex items-center gap-1 px-3 bg-slate-100 border-r border-slate-200 text-xs font-bold text-slate-700 shrink-0">
                  <Smartphone className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{phoneCountryCode}</span>
                </span>
                <input
                  type="tel"
                  value={signerPhone}
                  onChange={(e) => setSignerPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                  placeholder="98765 43210 (without country code)"
                  required
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <Input
              label="Email Address *"
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="john@example.com"
              required
            />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isMobile ? (
            <Input
              label="Email Address (Optional)"
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="client@example.com"
            />
          ) : (
            <Input
              label="Phone Number (Optional)"
              type="tel"
              value={signerPhone}
              onChange={(e) => setSignerPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          )}

          <Input
            label="Company Name (Optional)"
            value={signerCompany}
            onChange={(e) => setSignerCompany(e.target.value)}
            placeholder="Acme Corp"
          />
        </div>

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

        {/* Legal Agreement Checkbox */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              I confirm that I am authorized to approve this quotation on behalf of my organization and agree to the specified terms, scope, and pricing.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Confirm & Sign Quotation</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
