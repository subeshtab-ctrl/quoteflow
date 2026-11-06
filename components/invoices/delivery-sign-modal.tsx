'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Invoice } from '@/types/database';
import { Check, RotateCcw, PenTool, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface DeliverySignModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onSuccess: (updatedInvoice: Invoice) => void;
  isPublic?: boolean;
}

export function DeliverySignModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
  isPublic = false,
}: DeliverySignModalProps) {
  const [recipientName, setRecipientName] = useState(
    invoice.customer?.name || invoice.customer?.company_name || ''
  );
  const [deliveryNotes, setDeliveryNotes] = useState(
    invoice.delivery_notes || 'Goods received in full and satisfactory condition.'
  );
  const [signatureMode, setSignatureMode] = useState<'DRAW' | 'TYPE'>('DRAW');
  const [typedSignature, setTypedSignature] = useState(
    invoice.customer?.name || invoice.customer?.company_name || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      hasDrawnRef.current = false;
      const initialName = invoice.customer?.name || invoice.customer?.company_name || '';
      setRecipientName(initialName);
      setTypedSignature(initialName);
      setTimeout(initCanvas, 50);
    }
  }, [isOpen, invoice]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    hasDrawnRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const generateTypedSignatureDataUrl = (text: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'italic 34px "Brush Script MT", "Caveat", "Segoe Script", cursive, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 200, 60);
    return canvas.toDataURL('image/png');
  };

  const handleConfirmDelivery = async () => {
    if (!recipientName.trim()) {
      setError('Please enter the name of the person receiving the delivery.');
      return;
    }

    let signatureDataUrl = '';
    if (signatureMode === 'DRAW') {
      if (!hasDrawnRef.current && canvasRef.current) {
        setError('Please draw your signature in the box provided, or switch to Type.');
        return;
      }
      signatureDataUrl = canvasRef.current?.toDataURL('image/png') || '';
    } else {
      if (!typedSignature.trim()) {
        setError('Please type your name for the digital signature verification.');
        return;
      }
      signatureDataUrl = generateTypedSignatureDataUrl(typedSignature.trim());
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        delivery_status: 'DELIVERED',
        delivery_recipient_name: recipientName.trim(),
        delivery_signature_data_url: signatureDataUrl,
        delivery_confirmed_at: new Date().toISOString(),
        delivery_notes: deliveryNotes.trim(),
      };

      const url = isPublic
        ? `/api/public/delivery-confirm`
        : `/api/invoices/${invoice.id}`;

      const res = await fetch(url, {
        method: isPublic ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isPublic ? { invoiceId: invoice.id, ...payload } : payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to confirm delivery');
      }

      const updated = data.invoice || { ...invoice, ...payload };
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error recording delivery confirmation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Delivery & Sign">
      <div className="space-y-4 p-1">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">
            Delivery Note: <span className="font-mono text-indigo-600">{invoice.invoice_number}</span>
          </p>
          <p>
            Customer: {invoice.customer?.company_name || invoice.customer?.name || 'Valued Client'}
          </p>
          <p className="text-[11px] text-slate-500">
            By signing below, you acknowledge receipt of all listed goods/items in good order.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Recipient Full Name <span className="text-rose-500">*</span>
          </label>
          <Input
            value={recipientName}
            onChange={(e) => {
              setRecipientName(e.target.value);
              if (signatureMode === 'TYPE') setTypedSignature(e.target.value);
            }}
            placeholder="e.g. John Doe / Warehouse Supervisor"
            className="text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Delivery Notes / Condition Acknowledgement
          </label>
          <Input
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            placeholder="e.g. Received 10 boxes intact with seal"
            className="text-xs"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <PenTool className="h-3.5 w-3.5 text-indigo-600" />
              <span>Digital Signature <span className="text-rose-500">*</span></span>
            </label>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSignatureMode('DRAW')}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  signatureMode === 'DRAW'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Draw
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignatureMode('TYPE');
                  if (!typedSignature) setTypedSignature(recipientName);
                }}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  signatureMode === 'TYPE'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Type
              </button>
            </div>
          </div>

          {signatureMode === 'DRAW' ? (
            <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                width={400}
                height={130}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-32 cursor-crosshair touch-none"
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              </div>
              <div className="absolute top-2 left-2 pointer-events-none text-[10px] text-slate-400 font-mono">
                Sign inside this box
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl bg-slate-50 p-4 space-y-2">
              <Input
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Type your signature"
                className="text-xs"
              />
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                <p className="text-xl font-serif italic text-slate-800">
                  {typedSignature || 'Signature Preview'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirmDelivery}
            isLoading={isSubmitting}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Confirm Delivery & Sign</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
