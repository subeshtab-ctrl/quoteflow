'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, PenTool, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null, type: 'DRAWN' | 'TYPED') => void;
  signerName?: string;
}

export function SignaturePad({ onSignatureChange, signerName = '' }: SignaturePadProps) {
  const [mode, setMode] = useState<'DRAWN' | 'TYPED'>('DRAWN');
  const [typedName, setTypedName] = useState(signerName);
  const [selectedFont, setSelectedFont] = useState<'font-cursive' | 'font-serif' | 'font-sans'>('font-cursive');
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  // Initialize canvas
  useEffect(() => {
    if (mode === 'DRAWN') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set internal resolution for crisp high-DPI displays
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      ctx.strokeStyle = '#0f172a'; // slate-900
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [mode]);

  // Update typed signature SVG/DataURL
  useEffect(() => {
    if (mode === 'TYPED') {
      const textToUse = typedName.trim() || signerName.trim() || 'Signature';
      // Create offscreen canvas to export typed signature as PNG dataUrl
      const offscreen = document.createElement('canvas');
      offscreen.width = 400;
      offscreen.height = 100;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 100);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'italic 34px "Brush Script MT", "Caveat", "Segoe Script", cursive';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(textToUse, 200, 50);
        const dataUrl = offscreen.toDataURL('image/png');
        onSignatureChange(dataUrl, 'TYPED');
      }
    }
  }, [mode, typedName, signerName]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawing.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    e.preventDefault(); // Prevent scrolling on touch
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange(dataUrl, 'DRAWN');
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange(null, 'DRAWN');
  };

  return (
    <div className="w-full space-y-3">
      {/* Mode Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('DRAWN');
              onSignatureChange(null, 'DRAWN');
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              mode === 'DRAWN'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <PenTool className="h-3.5 w-3.5" />
            Draw Signature
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('TYPED');
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              mode === 'TYPED'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <Type className="h-3.5 w-3.5" />
            Type Signature
          </button>
        </div>

        {mode === 'DRAWN' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearCanvas}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {mode === 'DRAWN' ? (
        <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-2 hover:border-indigo-400 transition-colors">
          <canvas
            ref={canvasRef}
            className="h-36 w-full cursor-crosshair rounded-lg bg-white shadow-inner touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasDrawn && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
              Draw your digital signature here (touch, mouse, or stylus)
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type your legal full name..."
            className="h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Preview</p>
            <p
              className="text-2xl sm:text-3xl text-slate-800 italic"
              style={{ fontFamily: '"Brush Script MT", "Caveat", "Segoe Script", cursive' }}
            >
              {typedName.trim() || signerName.trim() || 'Your Signature Preview'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
