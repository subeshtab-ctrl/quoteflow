'use client';

import React, { useState, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Power,
  RotateCcw,
  Check,
  X,
  Building2,
  Sliders,
  Layers,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import {
  OrganizationAiProfile,
  OrganizationAiMemory,
  MemoryType,
} from '@/types/business-operator';

export function BusinessMemorySettingsView() {
  const [profile, setProfile] = useState<OrganizationAiProfile | null>(null);
  const [memories, setMemories] = useState<OrganizationAiMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | MemoryType>('ALL');

  // Add Rule Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newType, setNewType] = useState<MemoryType>('EXPLICIT_RULE');

  // Edit Profile State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editTone, setEditTone] = useState<'PROFESSIONAL' | 'FRIENDLY' | 'CONCISE'>('PROFESSIONAL');
  const [editIndustry, setEditIndustry] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editValidity, setEditValidity] = useState(30);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchMemoryData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/memory');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setMemories(data.memories || []);
        if (data.profile) {
          setEditTone(data.profile.preferred_tone || 'PROFESSIONAL');
          setEditIndustry(data.profile.industry || '');
          setEditSummary(data.profile.business_summary || '');
          setEditValidity(data.profile.default_quote_validity_days || 30);
        }
      }
    } catch (err) {
      console.error('Failed to load business memory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemoryData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/ai/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          profileUpdates: {
            preferred_tone: editTone,
            industry: editIndustry,
            business_summary: editSummary,
            default_quote_validity_days: Number(editValidity) || 30,
          },
        }),
      });
      if (res.ok) {
        setMessage('Business Profile updated successfully!');
        setIsEditProfileOpen(false);
        fetchMemoryData();
      }
    } catch {
      setMessage('Failed to update profile.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ai/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_memory',
          memoryEntry: {
            memory_type: newType,
            subject_type: 'BUSINESS',
            key: newKey.trim(),
            value: newValue.trim(),
            source: 'MANUAL_SETTING',
            confidence: 100,
            confirmed: true,
            status: 'ACTIVE',
          },
        }),
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewKey('');
        setNewValue('');
        fetchMemoryData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmMemory = async (id: string) => {
    try {
      await fetch('/api/ai/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_memory', memoryId: id }),
      });
      fetchMemoryData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisableMemory = async (id: string) => {
    try {
      await fetch('/api/ai/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable_memory', memoryId: id }),
      });
      fetchMemoryData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm('Are you sure you want to remove this memory rule?')) return;
    try {
      await fetch('/api/ai/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_memory', memoryId: id }),
      });
      fetchMemoryData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMemories = memories.filter((m) => {
    if (selectedFilter === 'ALL') return true;
    return m.memory_type === selectedFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-slate-100 dark:to-slate-800/40 border border-indigo-200 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              QuoteFlow AI — Business Memory
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
            Configure confirmed operational policies, pricing thresholds, and customer rules. QuoteFlow AI remembers confirmed policies across all team recommendations while strictly isolating tenant data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditProfileOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Edit Profile
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Business Rule
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-medium">
          {message}
        </div>
      )}

      {/* Business Profile Overview */}
      {profile && (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Operational Business Profile
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Industry</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.industry}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Tone</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.preferred_tone}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Standard Validity</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.default_quote_validity_days} Days</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Currency</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.default_currency}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        {[
          { label: 'All Memories', key: 'ALL' },
          { label: 'Explicit Business Rules', key: 'EXPLICIT_RULE' },
          { label: 'Customer Rules', key: 'CUSTOMER_RULE' },
          { label: 'Learned Patterns', key: 'LEARNED_PATTERN' },
          { label: 'AI Observations', key: 'AI_OBSERVATION' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSelectedFilter(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedFilter === tab.key
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Memories List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading business memories...
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 border border-dashed rounded-xl border-slate-300 dark:border-slate-700">
          No memory entries found in this category. Click "Add Business Rule" to record a confirmed policy.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredMemories.map((mem) => {
            const isConfirmed = mem.confirmed;
            const isObservation = mem.memory_type === 'AI_OBSERVATION';

            return (
              <div
                key={mem.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  mem.status === 'DISABLED'
                    ? 'opacity-60 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                    : isObservation
                    ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-200/80 dark:border-amber-900/40'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {mem.memory_type.replace('_', ' ')}
                      </span>
                      {isConfirmed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/40">
                          <CheckCircle2 className="w-3 h-3" /> Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/40">
                          <AlertCircle className="w-3 h-3" /> Unconfirmed Observation
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-slate-400">
                        Confidence: {mem.confidence}%
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                      {mem.key.replace(/_/g, ' ')}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {mem.value}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isConfirmed && (
                      <button
                        type="button"
                        onClick={() => handleConfirmMemory(mem.id)}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                        title="Confirm as Business Rule"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {mem.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={() => handleDisableMemory(mem.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Disable Rule"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteMemory(mem.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Rule Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Explicit Business Rule</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMemory} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Rule Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as MemoryType)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="EXPLICIT_RULE">Explicit Business Rule (General)</option>
                  <option value="CUSTOMER_RULE">Customer-Specific Policy</option>
                  <option value="LEARNED_PATTERN">Operational Pattern</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Rule Name / Key
                </label>
                <input
                  type="text"
                  placeholder="e.g. max_sales_discount or special_client_terms"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Rule Description / Exact Policy
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Quotes for ABC Construction always receive 5% discount and 45-day validity."
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newKey.trim() || !newValue.trim()}
                  className="px-4 py-1.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Edit AI Business Profile</h3>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Industry / Category
                </label>
                <input
                  type="text"
                  value={editIndustry}
                  onChange={(e) => setEditIndustry(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Communication Tone
                </label>
                <select
                  value={editTone}
                  onChange={(e) => setEditTone(e.target.value as any)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="PROFESSIONAL">Professional & Courteous</option>
                  <option value="FRIENDLY">Friendly & Approachable</option>
                  <option value="CONCISE">Concise & Direct</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Default Quote Validity (Days)
                </label>
                <input
                  type="number"
                  value={editValidity}
                  onChange={(e) => setEditValidity(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Business Scope Summary
                </label>
                <textarea
                  rows={3}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
