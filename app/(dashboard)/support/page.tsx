import React from 'react';
import { SupportView } from '@/components/support/support-view';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function SupportPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <SupportView />
    </div>
  );
}
