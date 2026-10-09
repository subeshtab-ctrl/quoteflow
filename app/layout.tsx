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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var raw = localStorage.getItem('quoteflow-customization-v2');
                  var savedBrand = localStorage.getItem('quoteflow_brand_color');
                  var accent = 'purple';
                  if (raw) {
                    var parsed = JSON.parse(raw);
                    if (parsed.accentColor) accent = parsed.accentColor;
                  }
                  if (savedBrand) {
                    if (savedBrand === '#059669' || savedBrand.indexOf('059669') !== -1 || savedBrand.indexOf('10b981') !== -1) accent = 'emerald';
                    else if (savedBrand === '#2563eb' || savedBrand.indexOf('2563eb') !== -1) accent = 'blue';
                    else if (savedBrand === '#ea580c' || savedBrand.indexOf('ea580c') !== -1) accent = 'orange';
                    else if (savedBrand === '#e11d48' || savedBrand.indexOf('e11d48') !== -1) accent = 'rose';
                  }
                  document.documentElement.setAttribute('data-accent', accent);
                  var map = {
                    purple: { hex: '#6366f1', rgb: '99, 102, 241' },
                    blue: { hex: '#2563eb', rgb: '37, 99, 235' },
                    emerald: { hex: '#059669', rgb: '5, 150, 105' },
                    orange: { hex: '#ea580c', rgb: '234, 88, 12' },
                    rose: { hex: '#e11d48', rgb: '225, 29, 72' }
                  };
                  var col = map[accent] || map.purple;
                  document.documentElement.style.setProperty('--brand-color', col.hex);
                  document.documentElement.style.setProperty('--brand-rgb', col.rgb);
                  if (raw) {
                    var p = JSON.parse(raw);
                    if (p.theme === 'dark' || (p.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                      document.documentElement.classList.add('dark');
                    } else if (p.theme === 'light') {
                      document.documentElement.classList.remove('dark');
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full font-sans antialiased text-slate-900 bg-slate-50/50 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-150">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

