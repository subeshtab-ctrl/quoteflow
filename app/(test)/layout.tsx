import React from 'react';
import { TestLayout } from '@/components/test/test-layout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <TestLayout>{children}</TestLayout>;
}
