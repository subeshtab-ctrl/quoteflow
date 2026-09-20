import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en" className="h-full">
      <body className="min-h-full font-sans antialiased text-slate-900 bg-slate-50/50">
        {children}
      </body>
    </html>
  );
}
