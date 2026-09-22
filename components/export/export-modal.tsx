'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Filter,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDateFilter?: string;
}

type DateFilterOption =
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'LAST_30_DAYS'
  | 'THIS_QUARTER'
  | 'THIS_YEAR'
  | 'ALL'
  | 'CUSTOM';

type ApprovalStatusOption = 'ALL' | 'APPROVED' | 'NOT_APPROVED';
type PaymentStatusOption = 'ALL' | 'PAID' | 'UNPAID';
type DocumentTypeOption = 'ALL' | 'QUOTATIONS' | 'INVOICES';

export function ExportModal({
  isOpen,
  onClose,
  defaultDateFilter = 'THIS_MONTH',
}: ExportModalProps) {
  const [dateFilter, setDateFilter] = useState<DateFilterOption>(
    defaultDateFilter as DateFilterOption
  );

  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const today = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(firstDayThisMonth);
  const [endDate, setEndDate] = useState<string>(today);

  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatusOption>('ALL');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusOption>('ALL');
  const [documentType, setDocumentType] = useState<DocumentTypeOption>('ALL');

  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (format: 'CSV' | 'PDF') => {
    if (format === 'CSV') setIsExportingCsv(true);
    if (format === 'PDF') setIsExportingPdf(true);
    setError(null);

    try {
      const payload = {
        format,
        dateFilter,
        startDate: dateFilter === 'CUSTOM' ? startDate : undefined,
        endDate: dateFilter === 'CUSTOM' ? endDate : undefined,
        approvalStatus,
        paymentStatus,
        documentType,
      };

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate export');
      }

      // Extract filename from header or build default
      const contentDisposition = res.headers.get('Content-Disposition') || '';
      let filename = format === 'CSV' ? 'quoteflow_export.csv' : 'quoteflow_statement.pdf';
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err: any) {
      setError(err.message || 'Export failed. Please try again.');
    } finally {
      setIsExportingCsv(false);
      setIsExportingPdf(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Quotations & Financial Statements"
      description="Download CSV spreadsheets or executive PDF statements with custom filters"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* 1. Date Range Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <span>1. Select Date Range (Monthly or Custom)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'LAST_MONTH', label: 'Last Month' },
              { id: 'LAST_30_DAYS', label: 'Last 30 Days' },
              { id: 'THIS_QUARTER', label: 'This Quarter' },
              { id: 'THIS_YEAR', label: 'This Year' },
              { id: 'ALL', label: 'All Records' },
              { id: 'CUSTOM', label: 'Custom Date Range' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDateFilter(option.id as DateFilterOption)}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all text-center ${
                  dateFilter === option.id
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-sm ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {dateFilter === 'CUSTOM' && (
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Start Date *"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <Input
                label="End Date *"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        {/* 2. Approval Status Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>2. Approval Status</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'ALL', label: 'All Statuses' },
              { id: 'APPROVED', label: 'Approved Only (Ready for Invoice)' },
              { id: 'NOT_APPROVED', label: 'Not Approved / In Progress' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setApprovalStatus(opt.id as ApprovalStatusOption)}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all text-center ${
                  approvalStatus === opt.id
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-sm ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Payment Status Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <CreditCard className="h-4 w-4 text-purple-600" />
            <span>3. Payment Status (For Approved Quotes)</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'ALL', label: 'All (Paid & Unpaid)' },
              { id: 'PAID', label: 'Paid Only' },
              { id: 'UNPAID', label: 'Unpaid / Pending Only' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPaymentStatus(opt.id as PaymentStatusOption)}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all text-center ${
                  paymentStatus === opt.id
                    ? 'border-purple-600 bg-purple-50 text-purple-800 font-bold shadow-sm ring-1 ring-purple-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Document Type Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <FileText className="h-4 w-4 text-slate-600" />
            <span>4. Document Type</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'ALL', label: 'Quotations & Invoices' },
              { id: 'QUOTATIONS', label: 'Quotations Only' },
              { id: 'INVOICES', label: 'Invoices Only' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDocumentType(opt.id as DocumentTypeOption)}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all text-center ${
                  documentType === opt.id
                    ? 'border-slate-800 bg-slate-900 text-white font-bold shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Download CSV */}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDownload('CSV')}
              isLoading={isExportingCsv}
              disabled={isExportingPdf}
              className="gap-2 text-xs border-slate-300 shadow-sm flex-1 sm:flex-initial"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Download Excel (CSV)</span>
            </Button>

            {/* Download PDF */}
            <Button
              type="button"
              variant="primary"
              onClick={() => handleDownload('PDF')}
              isLoading={isExportingPdf}
              disabled={isExportingCsv}
              className="gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex-1 sm:flex-initial"
            >
              <FileText className="h-4 w-4 text-white" />
              <span>Download PDF Statement</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
