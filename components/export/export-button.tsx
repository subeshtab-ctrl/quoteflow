'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ExportModal } from '@/components/export/export-modal';

interface ExportButtonProps {
  variant?: 'primary' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  defaultDateFilter?: string;
  label?: string;
}

export function ExportButton({
  variant = 'outline',
  size = 'md',
  className = '',
  defaultDateFilter = 'THIS_MONTH',
  label = 'Export',
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={`gap-2 shadow-sm font-semibold ${className}`}
      >
        <Download className="h-4 w-4" />
        <span>{label}</span>
      </Button>

      <ExportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        defaultDateFilter={defaultDateFilter}
      />
    </>
  );
}
