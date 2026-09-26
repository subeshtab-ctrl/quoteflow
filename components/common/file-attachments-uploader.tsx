'use client';

import React, { useRef, useState } from 'react';
import { AttachmentItem } from '@/types/database';
import { Upload, X, FileText, Image as ImageIcon, Download, Paperclip } from 'lucide-react';

interface FileAttachmentsUploaderProps {
  attachments: AttachmentItem[];
  onChange: (attachments: AttachmentItem[]) => void;
  readOnly?: boolean;
}

export function FileAttachmentsUploader({
  attachments,
  onChange,
  readOnly = false,
}: FileAttachmentsUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setIsProcessing(true);

    try {
      const newItems: AttachmentItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Max 10MB per file
        if (file.size > 10 * 1024 * 1024) {
          setError(`File "${file.name}" exceeds 10MB limit.`);
          continue;
        }

        const dataUrl = await readFileAsDataUrl(file);
        newItems.push({
          id: `att_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: dataUrl,
          created_at: new Date().toISOString(),
        });
      }

      if (newItems.length > 0) {
        onChange([...attachments, ...newItems]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process selected file(s)');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5 text-indigo-500" />
          <span>Attachments (PDFs, Images, Specifications)</span>
        </label>
        {!readOnly && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload File</span>
          </button>
        )}
      </div>

      {!readOnly && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200">
          {error}
        </p>
      )}

      {attachments.length === 0 ? (
        <div
          onClick={() => !readOnly && fileInputRef.current?.click()}
          className={`border border-dashed rounded-xl p-4 text-center transition-colors ${
            readOnly
              ? 'border-slate-200 text-slate-400 dark:border-slate-800'
              : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 cursor-pointer bg-slate-50/40 dark:bg-slate-850/40'
          }`}
        >
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {readOnly ? 'No attachments uploaded.' : 'Attach project scopes, technical blueprints, or photos (PDF, PNG, JPG up to 10MB).'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {attachments.map((file) => {
            const isImage = file.type?.startsWith('image/') || file.name.match(/\.(png|jpe?g|webp|svg)$/i);

            return (
              <div
                key={file.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    {isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <a
                    href={file.url}
                    download={file.name}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Download attachment"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemove(file.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Remove file"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
