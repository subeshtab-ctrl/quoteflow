import React from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

export default function TemplatesPage() {
  const templates = [
    {
      name: 'Modern Executive (Active Default)',
      desc: 'Clean, high-contrast layout tailored for software, consulting, and modern agencies.',
      accent: '#4f46e5',
      isDefault: true,
      features: ['Bold indigo headers', 'Itemized tax breakdown', 'Touch signature seal'],
    },
    {
      name: 'Minimal Clean',
      desc: 'Minimalist monochrome design with generous whitespace and lightweight typography.',
      accent: '#0f172a',
      isDefault: false,
      features: ['Slate monochrome palette', 'Compact totals block', 'Understated legal notes'],
    },
    {
      name: 'Professional Enterprise',
      desc: 'Traditional formal quotation style suited for corporate procurement and tenders.',
      accent: '#0369a1',
      isDefault: false,
      features: ['Detailed line item grid', 'Expanded bank & tax info', 'Dual signature lines'],
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Quotation Templates
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Select the visual presentation theme for your client-facing quotation portal and PDF exports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {templates.map((tpl) => (
            <Card
              key={tpl.name}
              className={`rounded-2xl relative overflow-hidden transition-all ${
                tpl.isDefault ? 'border-2 border-indigo-600 shadow-md' : 'hover:shadow-md'
              }`}
            >
              {tpl.isDefault && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Active Default
                </div>
              )}

              <CardHeader>
                <div
                  className="h-4 w-12 rounded-full mb-2"
                  style={{ backgroundColor: tpl.accent }}
                />
                <CardTitle className="text-base font-bold">{tpl.name}</CardTitle>
                <CardDescription className="text-xs">{tpl.desc}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {tpl.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={tpl.isDefault ? 'secondary' : 'outline'}
                  size="sm"
                  className="w-full text-xs"
                  disabled={tpl.isDefault}
                >
                  {tpl.isDefault ? 'Currently Enabled' : 'Select Template'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
