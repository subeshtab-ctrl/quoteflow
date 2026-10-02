'use client';

import React, { useState, useEffect } from 'react';
import {
  BusinessSubscription,
  SupportTicket,
  Promotion,
  AdminAuditLog,
} from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Tag,
  LifeBuoy,
  ShieldCheck,
  Search,
  Filter,
  Plus,
  Send,
  Loader2,
  RefreshCw,
  Eye,
  FileText,
  UserCheck,
  Activity,
} from 'lucide-react';

export function AdminDashboardView() {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscribers' | 'offers' | 'tickets' | 'audit'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Stats & MRR
  const [stats, setStats] = useState<any>(null);
  const [mrrData, setMrrData] = useState<any>(null);

  // Subscribers
  const [subscribers, setSubscribers] = useState<BusinessSubscription[]>([]);
  const [subscriberTotal, setSubscriberTotal] = useState(0);
  const [subStatusFilter, setSubStatusFilter] = useState('all');
  const [subSearch, setSubSearch] = useState('');
  const [subPage, setSubPage] = useState(1);

  // Offers
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [createOfferModalOpen, setCreateOfferModalOpen] = useState(false);
  const [assignOfferModalOpen, setAssignOfferModalOpen] = useState(false);
  const [newOfferName, setNewOfferName] = useState('');
  const [newOfferCode, setNewOfferCode] = useState('');
  const [newOfferPrice, setNewOfferPrice] = useState(99);
  const [newOfferDuration, setNewOfferDuration] = useState(3);
  const [assignPromoId, setAssignPromoId] = useState('');
  const [assignBusinessId, setAssignBusinessId] = useState('');

  // Support Tickets
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all');
  const [activeAdminTicket, setActiveAdminTicket] = useState<SupportTicket | null>(null);
  const [adminReplyMessage, setAdminReplyMessage] = useState('');
  const [isSendingAdminReply, setIsSendingAdminReply] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      if (res.ok) {
        setStats(json.stats);
        setMrrData(json.mrr);
      }
    } catch {}
  };

  const fetchSubscribers = async () => {
    try {
      const params = new URLSearchParams();
      if (subStatusFilter !== 'all') params.set('status', subStatusFilter);
      if (subSearch) params.set('search', subSearch);
      params.set('page', subPage.toString());
      params.set('limit', '20');

      const res = await fetch(`/api/admin/subscribers?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setSubscribers(json.subscribers || []);
        setSubscriberTotal(json.total || 0);
      }
    } catch {}
  };

  const fetchPromotions = async () => {
    try {
      const res = await fetch('/api/admin/promotions');
      const json = await res.json();
      if (res.ok) {
        setPromotions(json.promotions || []);
      }
    } catch {}
  };

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams();
      if (ticketStatusFilter !== 'all') params.set('status', ticketStatusFilter);

      const res = await fetch(`/api/admin/tickets?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setTickets(json.tickets || []);
      }
    } catch {}
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      const json = await res.json();
      if (res.ok) {
        setAuditLogs(json.logs || []);
      }
    } catch {}
  };

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchStats(), fetchSubscribers(), fetchPromotions(), fetchTickets(), fetchAuditLogs()]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    fetchSubscribers();
  }, [subStatusFilter, subSearch, subPage]);

  useEffect(() => {
    fetchTickets();
  }, [ticketStatusFilter]);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOfferName,
          code: newOfferCode,
          promotional_price: newOfferPrice * 100,
          duration_months: newOfferDuration,
        }),
      });
      if (res.ok) {
        setCreateOfferModalOpen(false);
        setNewOfferName('');
        setNewOfferCode('');
        await fetchPromotions();
      }
    } catch {
      alert('Error creating promotion');
    }
  };

  const handleAssignOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignPromoId || !assignBusinessId.trim()) return;
    try {
      const res = await fetch('/api/admin/promotions/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotion_id: assignPromoId,
          business_id: assignBusinessId.trim(),
        }),
      });
      if (res.ok) {
        setAssignOfferModalOpen(false);
        setAssignBusinessId('');
        alert('Promotion successfully assigned to business.');
        await fetchAuditLogs();
      }
    } catch {
      alert('Error assigning promotion');
    }
  };

  const handleSendAdminReply = async () => {
    if (!activeAdminTicket || !adminReplyMessage.trim()) return;
    try {
      setIsSendingAdminReply(true);
      const res = await fetch(`/api/support/tickets/${activeAdminTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: adminReplyMessage,
        }),
      });
      if (res.ok) {
        setAdminReplyMessage('');
        const refreshed = await fetch(`/api/support/tickets/${activeAdminTicket.id}`);
        const rJson = await refreshed.json();
        if (rJson.ticket) setActiveAdminTicket(rJson.ticket);
        await fetchTickets();
      }
    } catch {
      alert('Error sending reply');
    } finally {
      setIsSendingAdminReply(false);
    }
  };

  const handleUpdateTicketStatus = async (status: string) => {
    if (!activeAdminTicket) return;
    try {
      const res = await fetch(`/api/support/tickets/${activeAdminTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const refreshed = await fetch(`/api/support/tickets/${activeAdminTicket.id}`);
        const rJson = await refreshed.json();
        if (rJson.ticket) setActiveAdminTicket(rJson.ticket);
        await fetchTickets();
      }
    } catch {}
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Developer & Admin Dashboard
            </h1>
            <Badge className="bg-indigo-600 text-white text-[10px] uppercase font-bold tracking-wider">
              Staff Only
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time subscriber management, MRR analytics, promotion management, and developer support tickets.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} className="gap-2 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'overview', label: 'Overview & MRR', icon: TrendingUp },
          { id: 'subscribers', label: `Subscribers (${subscriberTotal})`, icon: Users },
          { id: 'offers', label: 'Offers & Promotions', icon: Tag },
          { id: 'tickets', label: `Support Tickets (${tickets.length})`, icon: LifeBuoy },
          { id: 'audit', label: 'Admin Audit Log', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & MRR */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top MRR Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total MRR</span>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                ₹{mrrData?.mrr ? mrrData.mrr.toLocaleString() : '0'}
                <span className="text-xs font-normal text-slate-400">/mo</span>
              </p>
              <p className="text-[11px] text-slate-500">Dynamically calculated from active subscriptions</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Paid Subscribers</span>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats?.activeSubscribers ?? 0}
              </p>
              <p className="text-[11px] text-slate-500">
                {stats?.promoSubscribers ?? 0} on ₹99 promo • {(stats?.activeSubscribers ?? 0) - (stats?.promoSubscribers ?? 0)} standard
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Free Trials</span>
              <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {stats?.trialBusinesses ?? 0}
              </p>
              <p className="text-[11px] text-slate-500">30-day trial in progress</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Grace Period / Past Due</span>
              <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                {(stats?.pastDue ?? 0) + (stats?.gracePeriod ?? 0)}
              </p>
              <p className="text-[11px] text-slate-500">{stats?.gracePeriod ?? 0} in active 7-day grace</p>
            </div>
          </div>

          {/* Full Lifecycle Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Businesses', val: stats?.totalBusinesses ?? 0, color: 'text-slate-900 dark:text-white' },
              { label: 'Trialing', val: stats?.trialBusinesses ?? 0, color: 'text-indigo-600' },
              { label: 'Active', val: stats?.activeSubscribers ?? 0, color: 'text-emerald-600' },
              { label: 'Grace Period', val: stats?.gracePeriod ?? 0, color: 'text-amber-600' },
              { label: 'Cancelled', val: stats?.cancelled ?? 0, color: 'text-slate-400' },
              { label: 'Expired / Halted', val: (stats?.expired ?? 0) + (stats?.halted ?? 0), color: 'text-rose-600' },
            ].map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">{item.label}</span>
                <span className={`text-xl font-bold mt-1 block ${item.color}`}>{item.val}</span>
              </div>
            ))}
          </div>

          {/* MRR Breakdown Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-indigo-600" />
              <span>Recurring Revenue Plan Breakdown</span>
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {mrrData?.breakdown?.map((b: any, i: number) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{b.plan}</p>
                    <p className="text-slate-400">{b.count} subscribers</p>
                  </div>
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    ₹{b.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBSCRIBERS */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={subSearch}
                onChange={(e) => {
                  setSubSearch(e.target.value);
                  setSubPage(1);
                }}
                placeholder="Search by company name, email, or business ID..."
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={subStatusFilter}
                onChange={(e) => {
                  setSubStatusFilter(e.target.value);
                  setSubPage(1);
                }}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="trialing">Trialing</option>
                <option value="active">Active</option>
                <option value="past_due">Past Due</option>
                <option value="grace_period">Grace Period</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
                <option value="halted">Halted</option>
              </select>
            </div>
          </div>

          {/* Subscribers Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3">Business</th>
                    <th className="px-5 py-3">Plan</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Promo Progress</th>
                    <th className="px-5 py-3">Current Period End</th>
                    <th className="px-5 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subscribers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-5 py-3">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            {s.organization?.name || 'Unnamed Business'}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">{s.business_id.substring(0, 13)}...</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300 font-medium">
                        {s.plan?.name || (s.amount === 9900 ? 'QuoteFlow Special Offer' : s.amount === 19900 ? 'QuoteFlow Standard' : 'Free Trial')}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : s.status === 'trialing'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                              : s.status === 'grace_period'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        ₹{(s.amount / 100).toFixed(2)}/mo
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {s.promotional_cycles_completed > 0 || s.promo_months_remaining > 0 ? (
                          <span className="font-medium text-violet-600 dark:text-violet-400">
                            {s.promotional_cycles_completed}/3 ({s.promo_months_remaining} left)
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                        {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {subscribers.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No subscribers match the current filter criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: OFFERS & PROMOTIONS */}
      {activeTab === 'offers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Active Offers & Welcome Discounts
            </h3>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAssignOfferModalOpen(true)}
                className="gap-1.5 text-xs font-semibold"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Assign to Business</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateOfferModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create New Offer</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {promotions.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                    {p.code}
                  </span>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">
                    Active
                  </Badge>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{p.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Price:</span>{' '}
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{(p.promotional_price / 100).toFixed(2)}/mo
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Duration:</span>{' '}
                    <span className="font-bold text-slate-900 dark:text-white">
                      {p.duration_months} billing cycles
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Create Offer Modal */}
          {createOfferModalOpen && (
            <Modal isOpen={createOfferModalOpen} onClose={() => setCreateOfferModalOpen(false)} title="Create Promotion Offer">
              <form onSubmit={handleCreateOffer} className="space-y-4 p-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Offer Name</label>
                  <Input value={newOfferName} onChange={(e) => setNewOfferName(e.target.value)} required placeholder="e.g. Founder Welcome Offer" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Promo Code</label>
                    <Input value={newOfferCode} onChange={(e) => setNewOfferCode(e.target.value)} required placeholder="e.g. WELCOME99" />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Promotional Price (₹)</label>
                    <Input type="number" value={newOfferPrice} onChange={(e) => setNewOfferPrice(Number(e.target.value))} required />
                  </div>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Duration (Cycles / Months)</label>
                  <Input type="number" value={newOfferDuration} onChange={(e) => setNewOfferDuration(Number(e.target.value))} required />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCreateOfferModalOpen(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-indigo-600 text-white font-semibold">Create Offer</Button>
                </div>
              </form>
            </Modal>
          )}

          {/* Assign Offer Modal */}
          {assignOfferModalOpen && (
            <Modal isOpen={assignOfferModalOpen} onClose={() => setAssignOfferModalOpen(false)} title="Assign Promotion to Business">
              <form onSubmit={handleAssignOffer} className="space-y-4 p-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Select Promotion</label>
                  <select
                    value={assignPromoId}
                    onChange={(e) => setAssignPromoId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs"
                  >
                    <option value="">-- Choose Promotion --</option>
                    {promotions.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Target Business ID (UUID)</label>
                  <Input value={assignBusinessId} onChange={(e) => setAssignBusinessId(e.target.value)} required placeholder="e.g. a0000000-0000-0000-0000-000000000001" />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" size="sm" onClick={() => setAssignOfferModalOpen(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-indigo-600 text-white font-semibold">Assign Promotion</Button>
                </div>
              </form>
            </Modal>
          )}
        </div>
      )}

      {/* TAB 4: SUPPORT TICKETS */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              All Business Support Tickets
            </span>
            <select
              value={ticketStatusFilter}
              onChange={(e) => setTicketStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_for_customer">Waiting for Customer</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
            {tickets.map((t) => (
              <div
                key={t.id}
                onClick={async () => {
                  const res = await fetch(`/api/support/tickets/${t.id}`);
                  const j = await res.json();
                  if (j.ticket) setActiveAdminTicket(j.ticket);
                }}
                className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600">{t.ticket_number}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">{t.category}</Badge>
                    <span className="text-[10px] font-bold text-amber-700">{t.priority}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.subject}</h4>
                  <p className="text-xs text-slate-400">Business: {t.business_id}</p>
                </div>
                <Badge className="text-[10px] uppercase font-bold self-start md:self-center">{t.status}</Badge>
              </div>
            ))}
          </div>

          {/* Admin Ticket Inspection & Conversation Modal */}
          {activeAdminTicket && (
            <Modal isOpen={Boolean(activeAdminTicket)} onClose={() => setActiveAdminTicket(null)} title={`Developer Support: ${activeAdminTicket.ticket_number}`}>
              <div className="space-y-4 p-4 text-xs max-h-[85vh] flex flex-col">
                {/* Hydrated Business Context for Billing/Subscription/Payment tickets */}
                {activeAdminTicket.subscription_context && (
                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 space-y-1">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold">
                      <CreditCard className="h-4 w-4" />
                      <span>Authorized Billing Context</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                      <div>Plan: <strong className="text-slate-900 dark:text-white">{activeAdminTicket.subscription_context.plan_name}</strong></div>
                      <div>Status: <strong className="text-slate-900 dark:text-white">{activeAdminTicket.subscription_context.subscription_status}</strong></div>
                      <div>Failures: <strong className="text-slate-900 dark:text-white">{activeAdminTicket.subscription_context.payment_failure_count}</strong></div>
                      <div>Period End: <strong className="text-slate-900 dark:text-white">{activeAdminTicket.subscription_context.current_period_end ? new Date(activeAdminTicket.subscription_context.current_period_end).toLocaleDateString() : 'N/A'}</strong></div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{activeAdminTicket.subject}</span>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleUpdateTicketStatus('in_progress')}>In Progress</Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] text-emerald-600" onClick={() => handleUpdateTicketStatus('resolved')}>Resolve</Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] text-slate-600" onClick={() => handleUpdateTicketStatus('closed')}>Close</Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[300px]">
                  {activeAdminTicket.messages?.map((m) => {
                    const isDev = m.sender_type === 'developer';
                    return (
                      <div key={m.id} className={`flex flex-col ${isDev ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-slate-400 mb-0.5">{m.sender_name || (isDev ? 'Developer' : 'Customer')}</span>
                        <div className={`p-3 rounded-xl max-w-[85%] ${isDev ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'}`}>
                          <p className="whitespace-pre-wrap">{m.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t space-y-2">
                  <Textarea rows={2} value={adminReplyMessage} onChange={(e) => setAdminReplyMessage(e.target.value)} placeholder="Type official developer reply to customer..." className="text-xs" />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleSendAdminReply} disabled={isSendingAdminReply || !adminReplyMessage.trim()} className="bg-indigo-600 text-white font-semibold">
                      {isSendingAdminReply ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send Reply to Business'}
                    </Button>
                  </div>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Admin Actions Audit Trail</h4>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900 dark:text-slate-100">{log.action}</p>
                  <p className="text-slate-400 font-mono text-[11px]">Target: {log.target_type} ({log.target_id})</p>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <p>{log.admin_email || 'Admin'}</p>
                  <p>{new Date(log.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">No admin audit events recorded yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
