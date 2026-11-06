'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ALL_COUNTRIES, CountryListItem } from '@/lib/billing/country-rules';
import { ChevronDown, Search, Check, Globe } from 'lucide-react';

interface CountrySelectProps {
  value: string; // ISO country code e.g. 'IN', 'AE'
  onChange: (countryCode: string) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
  required?: boolean;
}

export function CountrySelect({
  value,
  onChange,
  disabled = false,
  label = 'Business location',
  description = 'Select the country where your business is registered. This determines your billing currency, subscription price and available payment methods.',
  className = '',
  required = false,
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = useMemo(() => {
    const code = (value || 'IN').toUpperCase();
    return ALL_COUNTRIES.find((c) => c.code === code) || ALL_COUNTRIES[0];
  }, [value]);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return ALL_COUNTRIES;
    const q = search.toLowerCase().trim();
    return ALL_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q)
    );
  }, [search]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            {selectedCountry.code}
          </span>
        </div>
      )}

      {description && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
          {description}
        </p>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
            disabled
              ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800'
              : isOpen
              ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 text-slate-900 dark:text-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0 leading-none" role="img" aria-label={selectedCountry.name}>
              {selectedCountry.flag}
            </span>
            <div className="truncate">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {selectedCountry.name}
              </span>
              <span className="ml-2 text-xs text-slate-400 font-mono">
                ({selectedCountry.code})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${
                isOpen ? 'rotate-180 text-indigo-600' : ''
              }`}
            />
          </div>
        </button>

        {/* Dropdown popup */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 max-h-72 flex flex-col">
            {/* Search bar inside dropdown */}
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country name or code..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Countries list */}
            <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No countries match &quot;{search}&quot;
                </div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = c.code === selectedCountry.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        onChange(c.code);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0 leading-none">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({c.code})</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
