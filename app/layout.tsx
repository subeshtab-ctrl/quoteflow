import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme/theme-provider';

export const metadata: Metadata = {
  title: 'QuoteFlow - Modern Quotation Management & Customer Approval SaaS',
  description:
    'Generate professional quotations, share secure customer approval links, capture verifiable digital signatures, and track views in real-time.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full font-sans antialiased text-slate-900 bg-slate-50/50 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-150">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

