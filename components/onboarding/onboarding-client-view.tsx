'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Organization, CurrencyCode } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Building2,
  Upload,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
  Palette,
  Loader2,
  Image as ImageIcon,
  Check,
  Zap,
} from 'lucide-react';
import { extractDominantColor } from '@/lib/utils/color-extractor';
import {
  parseLogoUrl,
  formatLogoUrl,
  getLogoShapeClass,
  getLogoFitClass,
  getCompanyInitials,
} from '@/lib/utils/logo';

export function OnboardingClientView({
  initialOrg,
}: {
  initialOrg: Organization;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [org, setOrg] = useState<Organization>(initialOrg);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colorPresets = [
    { name: 'Indigo', hex: '#4f46e5' },
    { name: 'Violet', hex: '#7c3aed' },
    { name: 'Blue', hex: '#2563eb' },
    { name: 'Sky', hex: '#0284c7' },
    { name: 'Emerald', hex: '#059669' },
    { name: 'Amber', hex: '#d97706' },
    { name: 'Rose', hex: '#e11d48' },
    { name: 'Dark Slate', hex: '#334155' },
  ];

  const handleLogoFile = async (file: File) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 5MB.');
      return;
    }

    try {
      setIsUploadingLogo(true);
      setErrorMsg(null);

      // 1. Auto-extract dominant vibrant color from logo
      let extractedThemeColor: string | null = null;
      try {
        extractedThemeColor = await extractDominantColor(file);
      } catch (err) {
        console.warn('Could not extract color:', err);
      }

      // 2. Upload file
      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload logo');

      const rawLogoUrl = data.logo_url;
      const newLogoUrl = formatLogoUrl(rawLogoUrl, 'circle', 'cover');
      const updatedColor = extractedThemeColor || org.brand_color || '#4f46e5';

      setOrg((prev) => ({
        ...prev,
        logo_url: newLogoUrl,
        brand_color: updatedColor,
      }));

      document.documentElement.style.setProperty('--brand-color', updatedColor);
      setSuccessNote(
        extractedThemeColor
          ? `Logo uploaded! Button & workspace theme automatically matched to ${extractedThemeColor}.`
          : 'Logo uploaded successfully!'
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveStep = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(org),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save setup details');

      setOrg(data.organization);
      if (step === 1) setStep(2);
      else if (step === 2) setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-10 space-y-8">
      {/* Header & Steps Progress */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          <Zap className="h-3.5 w-3.5" />
          <span>Quick Company Workspace Setup</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Welcome to Your New Workspace
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Let&apos;s personalize your company profile, brand logo, and quotation defaults in 3 easy steps.
        </p>

        {/* Stepper indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 pt-4">
          {[
            { num: 1, label: 'Company Info' },
            { num: 2, label: 'Logo & Colors' },
            { num: 3, label: 'Ready to Quote' },
          ].map((s) => {
            const isDone = step > s.num;
            const isCurrent = step === s.num;

            return (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-[var(--brand-color,#4f46e5)] text-white ring-4 ring-indigo-100 dark:ring-indigo-950/80 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : s.num}
                </div>
                <span
                  className={`text-xs hidden sm:inline font-semibold ${
                    isCurrent
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {s.label}
                </span>
                {s.num < 3 && (
                  <div className="w-8 sm:w-12 h-0.5 bg-slate-200 dark:bg-slate-800 mx-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Step 1: Company Profile */}
      {step === 1 && (
        <Card className="rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Step 1: Company Information</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verify your registered company name and currency for client quotations.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Company Name *"
              value={org.name}
              onChange={(e) => setOrg({ ...org, name: e.target.value })}
              placeholder="e.g. Blend & Bold Inc."
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Official Email *"
                type="email"
                value={org.email}
                onChange={(e) => setOrg({ ...org, email: e.target.value })}
                placeholder="contact@company.com"
                required
              />
              <Input
                label="Phone Number"
                value={org.phone || ''}
                onChange={(e) => setOrg({ ...org, phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Default Currency
                </label>
                <select
                  value={org.default_currency}
                  onChange={(e) =>
                    setOrg({ ...org, default_currency: e.target.value as CurrencyCode })
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="AED">AED (AED) - UAE Dirham</option>
                </select>
              </div>

              <Input
                label="Quotation Number Prefix"
                value={org.quotation_prefix}
                onChange={(e) => setOrg({ ...org, quotation_prefix: e.target.value })}
                placeholder="Q-"
              />
            </div>

            <Input
              label="City & Country"
              value={org.city ? `${org.city}, ${org.country || ''}` : org.address_line1 || ''}
              onChange={(e) => setOrg({ ...org, city: e.target.value })}
              placeholder="e.g. San Francisco, USA"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveStep}
              isLoading={isLoading}
              className="gap-2 shadow-md"
            >
              <span>Next: Logo & Theme</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Brand Logo & Color Extraction */}
      {step === 2 && (
        <Card className="rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-500" />
              <span>Step 2: Brand Logo & Auto Color Match</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upload your company logo. The workspace will automatically extract the vibrant brand color and theme all buttons to match!
            </p>
          </div>

          {successNote && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successNote}</span>
            </div>
          )}

          {/* Logo Upload Box */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 overflow-hidden shadow-sm ring-4 ring-indigo-500/10 shrink-0">
              {org.logo_url ? (
                <img
                  src={parseLogoUrl(org.logo_url).cleanUrl}
                  alt="Company Logo"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white font-black text-2xl tracking-wider select-none">
                  {getCompanyInitials(org.name)}
                </div>
              )}
              {isUploadingLogo && (
                <div className="absolute inset-0 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoFile(f);
                }}
                className="hidden"
                id="onboarding-logo-file"
              />
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="gap-2 shadow-sm"
                >
                  <Upload className="h-4 w-4" />
                  <span>{org.logo_url ? 'Change Logo' : 'Upload Company Logo'}</span>
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Supports PNG, JPG, WebP, SVG. When uploaded, dominant color is auto-applied!
              </p>
            </div>
          </div>

          {/* Color Palette and Customizer */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Brand Theme Color (With Change Option)
              </label>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Preview:</span>
                <span
                  style={{ backgroundColor: org.brand_color || '#4f46e5' }}
                  className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600 inline-block shadow-xs"
                />
                <span className="font-mono text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300">
                  {org.brand_color || '#4f46e5'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {colorPresets.map((p) => {
                  const isSelected = org.brand_color?.toLowerCase() === p.hex.toLowerCase();
                  return (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => {
                        setOrg({ ...org, brand_color: p.hex });
                        document.documentElement.style.setProperty('--brand-color', p.hex);
                      }}
                      style={{ backgroundColor: p.hex }}
                      title={p.name}
                      className={`h-7 w-7 rounded-full border-2 transition-transform shadow-xs ${
                        isSelected
                          ? 'border-white dark:border-slate-900 ring-2 ring-indigo-500 scale-110'
                          : 'border-slate-200 dark:border-slate-700 hover:scale-105'
                      }`}
                    />
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                <input
                  type="color"
                  value={org.brand_color || '#4f46e5'}
                  onChange={(e) => {
                    setOrg({ ...org, brand_color: e.target.value });
                    document.documentElement.style.setProperty('--brand-color', e.target.value);
                  }}
                  className="h-8 w-10 cursor-pointer rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={org.brand_color || '#4f46e5'}
                  onChange={(e) => {
                    setOrg({ ...org, brand_color: e.target.value });
                    document.documentElement.style.setProperty('--brand-color', e.target.value);
                  }}
                  className="h-8 w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-mono font-bold uppercase text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveStep}
              isLoading={isLoading}
              className="gap-2 shadow-md"
            >
              <span>Save & Complete Setup</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Success & Next Actions */}
      {step === 3 && (
        <Card className="rounded-2xl p-8 text-center space-y-6 shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 animate-in fade-in zoom-in-95">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-inner">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              Your Workspace is All Set!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Your company profile and custom branding are configured. You are ready to create and share your first quotation.
            </p>
          </div>

          {/* Quick Summary Card */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200/80 dark:border-slate-700/80 text-left max-w-md mx-auto space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-medium">Company Name:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{org.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-medium">Currency & Prefix:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {org.default_currency} ({org.quotation_prefix}XXXX)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-medium">Theme Color:</span>
              <div className="flex items-center gap-1.5">
                <span
                  style={{ backgroundColor: org.brand_color || '#4f46e5' }}
                  className="h-3.5 w-3.5 rounded-full inline-block"
                />
                <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  {org.brand_color || '#4f46e5'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/quotations/new" className="w-full sm:w-auto">
              <Button
                type="button"
                variant="primary"
                className="w-full sm:w-auto gap-2 shadow-md py-3 px-6 text-sm"
              >
                <FileText className="h-4 w-4" />
                <span>Create Your First Quotation</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto py-3 px-6 text-sm"
              >
                <span>Go to Dashboard</span>
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
