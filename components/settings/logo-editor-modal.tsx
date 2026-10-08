'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  X,
  Upload,
  Trash2,
  Loader2,
  Circle,
  Square,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Check,
  Building,
} from 'lucide-react';
import {
  parseLogoUrl,
  formatLogoUrl,
  getLogoShapeClass,
  getCompanyInitials,
  LogoShape,
} from '@/lib/utils/logo';

interface LogoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLogoUrl?: string | null;
  companyName: string;
  onSave: (newLogoUrl: string) => Promise<void>;
  onRemove: () => Promise<void>;
}

export function LogoEditorModal({
  isOpen,
  onClose,
  currentLogoUrl,
  companyName,
  onSave,
  onRemove,
}: LogoEditorModalProps) {
  const initial = parseLogoUrl(currentLogoUrl);
  const [shape, setShape] = useState<'circle' | 'rounded'>(
    initial.shape === 'square' ? 'rounded' : (initial.shape as 'circle' | 'rounded') || 'circle'
  );
  const [zoom, setZoom] = useState<number>(1);
  const [previewSrc, setPreviewSrc] = useState<string>(initial.cleanUrl || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const parsed = parseLogoUrl(currentLogoUrl);
      setShape(parsed.shape === 'square' ? 'rounded' : (parsed.shape as 'circle' | 'rounded') || 'circle');
      setPreviewSrc(parsed.cleanUrl || '');
      setZoom(1);
      setSelectedFile(null);
    }
  }, [isOpen, currentLogoUrl]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo image must be under 5MB.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewSrc(objectUrl);
    setZoom(1);
    e.target.value = '';
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      let finalRawUrl = previewSrc;

      // If user uploaded a new file, or zoomed an image, process upload
      if (selectedFile) {
        // Try to crop with canvas
        try {
          const croppedBlob = await generateCroppedBlob(previewSrc, zoom);
          const uploadFile = croppedBlob
            ? new File([croppedBlob], selectedFile.name, { type: 'image/png' })
            : selectedFile;

          const formData = new FormData();
          formData.append('logo', uploadFile);

          const res = await fetch('/api/upload/logo', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to upload logo');
          finalRawUrl = data.logo_url;
        } catch {
          // Fallback to uploading original selected file
          const formData = new FormData();
          formData.append('logo', selectedFile);

          const res = await fetch('/api/upload/logo', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to upload logo');
          finalRawUrl = data.logo_url;
        }
      }

      // Format URL with chosen shape parameter
      const formattedUrl = formatLogoUrl(finalRawUrl, shape as LogoShape, 'cover');
      await onSave(formattedUrl);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error saving logo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this logo?')) return;
    try {
      setIsRemoving(true);
      await onRemove();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error removing logo');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Customize Company Logo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose crop shape, adjust zoom, and preview how your logo appears across QuoteFlow.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Crop Shape Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Crop Shape
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShape('circle')}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                  shape === 'circle'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-xs ring-2 ring-indigo-500/10'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="h-4 w-4 rounded-full border-2 border-current flex items-center justify-center">
                  {shape === 'circle' && <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                </div>
                <span>Circle (○)</span>
              </button>

              <button
                type="button"
                onClick={() => setShape('rounded')}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                  shape === 'rounded'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-xs ring-2 ring-indigo-500/10'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="h-4 w-4 rounded-sm border-2 border-current flex items-center justify-center">
                  {shape === 'rounded' && <div className="h-1.5 w-1.5 rounded-xs bg-current" />}
                </div>
                <span>Rounded Square (▢)</span>
              </button>
            </div>
          </div>

          {/* Interactive Crop & Live Preview Container */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Crop & Scale Preview
            </span>

            <div className="relative flex items-center justify-center w-48 h-48 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden shadow-inner">
              {/* Mask overlay container */}
              <div
                className={`relative w-40 h-40 overflow-hidden bg-white dark:bg-slate-900 shadow-md ring-4 ring-indigo-500/20 flex items-center justify-center transition-all ${
                  shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
                }`}
              >
                {previewSrc ? (
                  <div className="w-full h-full overflow-hidden flex items-center justify-center">
                    <img
                      src={previewSrc}
                      alt="Logo preview"
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.1s ease-out',
                      }}
                      className="max-w-full max-h-full object-contain pointer-events-none select-none"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-3 text-slate-400">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white font-black text-xl flex items-center justify-center shadow-xs">
                      {getCompanyInitials(companyName)}
                    </div>
                    <span className="text-[11px] mt-2 font-medium">No logo uploaded</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Upload Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 text-xs font-semibold shadow-xs"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{previewSrc ? 'Choose Different Image' : 'Upload Image File'}</span>
            </Button>
          </div>

          {/* Zoom Slider (1x to 3x) */}
          {previewSrc && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <ZoomIn className="h-4 w-4 text-indigo-500" />
                  <span>Zoom / Scale</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-[11px]">
                  {zoom.toFixed(1)}x
                </span>
              </div>
              <div className="flex items-center gap-3">
                <ZoomOut className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <ZoomIn className="h-4 w-4 text-slate-400 shrink-0" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
                <span>1.0x (Standard)</span>
                <span>2.0x</span>
                <span>3.0x (Max)</span>
              </div>
            </div>
          )}

          {/* Sidebar Fit Mini Preview */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Live Preview in Sidebar
            </span>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs ring-2 ring-indigo-500/10 overflow-hidden ${
                  shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
                }`}
              >
                {previewSrc ? (
                  <img
                    src={previewSrc}
                    alt={companyName}
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: 'center center',
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white font-bold text-xs">
                    {getCompanyInitials(companyName)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {companyName || 'Company Name'}
                </h4>
                <p className="text-[10px] text-slate-400 truncate">Workspace</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            {previewSrc && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={isRemoving || isSaving}
                className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                {isRemoving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>Remove Logo</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isRemoving || !previewSrc}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Logo</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Off-screen canvas crop helper for zoom scaling
 */
async function generateCroppedBlob(imageSrc: string, zoom: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.clearRect(0, 0, size, size);

        // Calculate scaled dimensions centered
        const baseScale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
        const finalScale = baseScale * zoom;
        const drawWidth = img.naturalWidth * finalScale;
        const drawHeight = img.naturalHeight * finalScale;
        const drawX = (size - drawWidth) / 2;
        const drawY = (size - drawHeight) / 2;

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}
