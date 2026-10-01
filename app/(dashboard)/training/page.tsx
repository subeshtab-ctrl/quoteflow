import React from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { TrainingView } from '@/components/training/training-view';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function TrainingPage() {
  return (
    <DashboardLayout>
      <TrainingView />
    </DashboardLayout>
  );
}
