'use client';

import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Laptop,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  Palette,
  Maximize2,
  CheckCircle2,
  ArrowRight,
  Receipt,
  FileText,
} from 'lucide-react';
import {
  useThemeCustomization,
  ACCENT_COLOR_MAP,
  ThemeMode,
  AccentColor,
  SidebarStyle,
  CardStyle,
  BorderRadius,
  Density,
} from '@/lib/theme/theme-customization-context';
import { Button } from '@/components/ui/button';

export function AppearanceSettingsView() {
  const {
    theme,
    resolvedTheme,
    accentColor,
    sidebarStyle,
    cardStyle,
    borderRadius,
    density,
    setTheme,
    setAccentColor,
    setSidebarStyle,
    setCardStyle,
    setBorderRadius,
    setDensity,
    resetToDefaults,
  } = useThemeCustomization();

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const selectedAccent = ACCENT_COLOR_MAP[accentColor] || ACCENT_COLOR_MAP.purple;
      if (typeof window !== 'undefined') {
        const root = document.documentElement;
        root.setAttribute('data-accent', accentColor);
        root.style.setProperty('--brand-color', selectedAccent.hex);
        root.style.setProperty('--brand-rgb', selectedAccent.rgb);
        try {
          localStorage.setItem('quoteflow_brand_color', selectedAccent.hex);
          localStorage.setItem(
            'quoteflow-customization-v2',
            JSON.stringify({
              theme,
              accentColor,
              sidebarStyle,
              cardStyle,
              borderRadius,
              density,
            })
          );
        } catch {}
      }
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_color: selectedAccent.hex,
        }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.warn('Could not sync brand color:', e);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const accentOptions: { key: AccentColor; label: string; hex: string }[] = [
    { key: 'purple', label: 'QuoteFlow Purple', hex: '#6366f1' },
    { key: 'blue', label: 'Ocean Blue', hex: '#2563eb' },
    { key: 'emerald', label: 'Emerald Green', hex: '#059669' },
    { key: 'orange', label: 'Sunset Orange', hex: '#ea580c' },
    { key: 'rose', label: 'Rose Red', hex: '#e11d48' },
  ];

  const radiusOptions: { key: BorderRadius; label: string; desc: string }[] = [
    { key: 'small', label: 'Small (8px)', desc: 'Clean, modern, crisp' },
    { key: 'medium', label: 'Medium (14px)', desc: 'Balanced SaaS standard' },
    { key: 'large', label: 'Large (20px)', desc: 'Soft, rounded, tactile' },
  ];

  const sidebarOptions: { key: SidebarStyle; label: string; desc: string }[] = [
    { key: 'default', label: 'Default', desc: 'Docked border sidebar' },
    { key: 'compact', label: 'Compact', desc: 'Dense navigation items' },
    { key: 'floating', label: 'Floating', desc: 'Elevated floating pill' },
  ];

  const cardOptions: { key: CardStyle; label: string; desc: string }[] = [
    { key: 'soft', label: 'Soft Shadow', desc: 'Subtle border and gentle shadow' },
    { key: 'sharp', label: 'Crisp Border', desc: 'Defined outline with zero blur' },
    { key: 'glass', label: 'Frosted Glass', desc: 'Semi-transparent backdrop blur' },
  ];

  const densityOptions: { key: Density; label: string; desc: string }[] = [
    { key: 'compact', label: 'Compact', desc: 'Tight margins for power users' },
    { key: 'comfortable', label: 'Comfortable', desc: 'Standard readable spacing' },
    { key: 'spacious', label: 'Spacious', desc: 'Generous breathing room' },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Appearance &amp; Theme Customization
            </h2>
            <span className="rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Live Preview
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Personalize your QuoteFlow dashboard interface, accent palette, corner rounding, and display density.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Saved ✓</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Save Preferences</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Live Preview Card on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Color Scheme (Theme) */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Interface Mode
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'light', label: 'Light Mode', icon: Sun },
                { id: 'dark', label: 'Dark Mode', icon: Moon },
                { id: 'system', label: 'System Auto', icon: Laptop },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = theme === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTheme(item.id as ThemeMode)}
                    className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Accent Color */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Primary Brand Accent
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {accentOptions.map((opt) => {
                const isSelected = accentColor === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setAccentColor(opt.key)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-slate-900 dark:border-white ring-2 ring-slate-900/10 dark:ring-white/20 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full shadow-xs shrink-0"
                      style={{ backgroundColor: opt.hex }}
                    />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Corner Radius */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Corner Radius
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {radiusOptions.map((opt) => {
                const isSelected = borderRadius === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setBorderRadius(opt.key)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <p
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Card & Container Style */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Card &amp; Panel Style
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {cardOptions.map((opt) => {
                const isSelected = cardStyle === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setCardStyle(opt.key)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <p
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Density */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Interface Density
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {densityOptions.map((opt) => {
                const isSelected = density === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setDensity(opt.key)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <p
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Preview Card (5 cols) */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Real-time Component Preview
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {resolvedTheme.toUpperCase()} • {accentColor.toUpperCase()}
            </span>
          </div>

          {/* Live Preview Container */}
          <div
            className={`p-5 space-y-5 transition-all shadow-md ${
              resolvedTheme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
            }`}
            style={{
              borderRadius:
                borderRadius === 'small' ? '8px' : borderRadius === 'large' ? '20px' : '14px',
              border:
                cardStyle === 'sharp'
                  ? '2px solid #64748b'
                  : '1px solid rgba(148, 163, 184, 0.25)',
              backdropFilter: cardStyle === 'glass' ? 'blur(16px)' : undefined,
            }}
          >
            {/* Header in Preview */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white font-extrabold text-xs shadow-sm"
                  style={{ backgroundColor: ACCENT_COLOR_MAP[accentColor].hex }}
                >
                  Q
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Acme Corporation</p>
                  <p className="text-[10px] text-slate-400">QuoteFlow Workspace</p>
                </div>
              </div>

              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-2xs"
                style={{ backgroundColor: ACCENT_COLOR_MAP[accentColor].hex }}
              >
                PRO
              </span>
            </div>

            {/* KPI Metric Preview */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Approved Pipeline
                </span>
                <span className="text-emerald-500 font-bold text-[10px]">↑ +14.2%</span>
              </div>
              <p className="text-2xl font-black tracking-tight">₹4,85,000</p>
              <p className="text-[10px] text-slate-400">18 quotations verified</p>
            </div>

            {/* Sample Table Row Preview */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Recent Document
              </span>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">Q-2026-00042</p>
                    <p className="text-[10px] text-slate-400">Tata Tech Sol.</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">₹1,24,000</p>
                  <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                    Approved
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons with Dynamic Accent & Radius */}
            <div className="flex items-center gap-2 pt-2">
              <button
                className="flex-1 py-2 px-3 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: ACCENT_COLOR_MAP[accentColor].hex,
                  borderRadius:
                    borderRadius === 'small' ? '6px' : borderRadius === 'large' ? '16px' : '10px',
                }}
              >
                <span>Create Quote</span>
                <ArrowRight className="h-3 w-3" />
              </button>

              <button
                className="py-2 px-3 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                style={{
                  borderRadius:
                    borderRadius === 'small' ? '6px' : borderRadius === 'large' ? '16px' : '10px',
                }}
              >
                Preview
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
