'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Building2,
  MapPin,
  ExternalLink,
  UserPlus,
  Mail,
  FilePlus,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Award,
} from 'lucide-react';
import { AiProspectLead } from '@/types/growth-assistant';

interface LeadDiscoveryViewProps {
  onDraftIntroEmail: (lead: AiProspectLead) => void;
  onCreateQuote: (lead: AiProspectLead) => void;
}

export function LeadDiscoveryView({
  onDraftIntroEmail,
  onCreateQuote,
}: LeadDiscoveryViewProps) {
  const [prospects, setProspects] = useState<AiProspectLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCity, setSearchCity] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [addedLeadIds, setAddedLeadIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProspects = async (city?: string, cat?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (cat) params.set('category', cat);
      params.set('count', '12');

      const res = await fetch(`/api/ai/growth/prospects?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to search business directories');
      }
      const data = await res.json();
      setProspects(data.prospects || []);
    } catch (err: any) {
      setError(err?.message || 'Error loading targeted prospects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProspects();
  }, []);

  const handleAddLead = async (lead: AiProspectLead) => {
    setAddingId(lead.id);
    try {
      const res = await fetch('/api/ai/growth/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_to_leads',
          prospect: lead,
        }),
      });
      if (res.ok) {
        setAddedLeadIds((prev) => new Set([...prev, lead.id]));
      }
    } catch (err) {
      console.error('Failed to add lead:', err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-3.5 p-1">
      {/* Header & Filter Bar */}
      <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Find New Commercial Customers
            </h3>
          </div>
          <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/50">
            Powered by Google &amp; Gemini AI Grounding • Real Companies Only
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-5 relative">
            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by city (e.g. Manchester, Mumbai)..."
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchProspects(searchCity, searchCategory)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-5 relative">
            <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Industry / category..."
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchProspects(searchCity, searchCategory)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => fetchProspects(searchCity, searchCategory)}
              disabled={loading}
              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              Search
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 dark:text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium">Scanning verified B2B public sources for matching prospects...</p>
        </div>
      ) : prospects.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
          No matching prospects found for the specified location or category. Try clearing filters or searching another city.
        </div>
      ) : (
        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
          {prospects.map((lead) => {
            const isAdded = addedLeadIds.has(lead.id);

            return (
              <div
                key={lead.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {lead.businessName}
                      </h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {lead.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {lead.city}, {lead.country}
                      </span>
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <span>{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                      💡 <strong className="text-slate-800 dark:text-slate-200">Why this is a strong prospect:</strong> {lead.fitReason}
                    </p>
                  </div>

                  {/* Explainable Lead Score Badge */}
                  <div className="shrink-0 text-right">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60">
                      <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <div className="text-left">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lead Score</div>
                        <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                          {lead.leadScore}<span className="text-[10px] font-normal text-slate-400">/100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Explainable Score Reasons Breakdown */}
                {lead.scoreReasons && lead.scoreReasons.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Score factors:</span>
                    {lead.scoreReasons.map((r, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                )}

                {/* Directory & Verification footnote */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    Source: <span className="font-medium text-slate-600 dark:text-slate-300">{lead.leadSource}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddLead(lead)}
                      disabled={isAdded || addingId === lead.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isAdded
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Added to Leads
                        </>
                      ) : addingId === lead.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          Add to Leads
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDraftIntroEmail(lead)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 transition-colors"
                    >
                      <Mail className="w-3 h-3" />
                      Create Intro Email
                    </button>

                    <button
                      type="button"
                      onClick={() => onCreateQuote(lead)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors"
                    >
                      <FilePlus className="w-3 h-3" />
                      Create Quote
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
