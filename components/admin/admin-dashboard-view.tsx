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
  EyeOff,
  Key,
  Lock,
  FileText,
  UserCheck,
  Activity,
  PhoneCall,
  Paperclip,
  Sparkles,
} from 'lucide-react';

export function AdminDashboardView({ theme = 'dark' }: { theme?: 'light' | 'dark' } = {}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscribers' | 'offers' | 'tickets' | 'razorpay' | 'audit'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Razorpay Configuration State
  const [razorpayConfig, setRazorpayConfig] = useState<any>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [razorpayPromoPlanId, setRazorpayPromoPlanId] = useState('');
  const [razorpayStandardPlanId, setRazorpayStandardPlanId] = useState('');
  const [isSavingRazorpayPlans, setIsSavingRazorpayPlans] = useState(false);
  const [isTestingRazorpayConnection, setIsTestingRazorpayConnection] = useState(false);
  const [isAutoCreatingPlans, setIsAutoCreatingPlans] = useState(false);
  const [isLinkingPlans, setIsLinkingPlans] = useState(false);
  const [razorpayTestResult, setRazorpayTestResult] = useState<any>(null);
  const [razorpayFeedback, setRazorpayFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const fetchRazorpayConfig = async () => {
    try {
      const res = await fetch('/api/admin/razorpay');
      const json = await res.json();
      if (res.ok && json.razorpay) {
        setRazorpayConfig(json.razorpay);
        setRazorpayKeyId(json.razorpay.keyId || '');
        setRazorpayPromoPlanId(json.razorpay.promoPlanId || '');
        setRazorpayStandardPlanId(json.razorpay.standardPlanId || '');
      }
    } catch {}
  };

  const handleSaveRazorpayPlans = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingRazorpayPlans(true);
      setRazorpayFeedback(null);
      const res = await fetch('/api/admin/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_credentials',
          key_id: razorpayKeyId.trim(),
          key_secret: razorpayKeySecret.trim() || undefined,
          promo_plan_id: razorpayPromoPlanId.trim(),
          standard_plan_id: razorpayStandardPlanId.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setRazorpayFeedback({ type: 'success', text: 'Razorpay API credentials and Plan IDs updated successfully! Ready for live payments.' });
        setRazorpayKeySecret('');
        await fetchRazorpayConfig();
      } else {
        setRazorpayFeedback({ type: 'error', text: json.error || 'Failed to save Razorpay configuration' });
      }
    } catch (err: any) {
      setRazorpayFeedback({ type: 'error', text: err.message || 'Error saving Razorpay configuration' });
    } finally {
      setIsSavingRazorpayPlans(false);
    }
  };

  const handleTestRazorpayConnection = async () => {
    try {
      setIsTestingRazorpayConnection(true);
      setRazorpayFeedback(null);
      setRazorpayTestResult(null);
      const res = await fetch('/api/admin/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          key_id: razorpayKeyId.trim() || undefined,
          key_secret: razorpayKeySecret.trim() || undefined,
          promo_plan_id: razorpayPromoPlanId.trim(),
          standard_plan_id: razorpayStandardPlanId.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.testResult) {
        setRazorpayTestResult(json.testResult);
        if (json.testResult.apiSuccess) {
          await fetchRazorpayConfig();
        }
      } else {
        setRazorpayFeedback({ type: 'error', text: json.error || 'Failed to execute connection test' });
      }
    } catch (err: any) {
      setRazorpayFeedback({ type: 'error', text: err.message || 'Error connecting to Razorpay' });
    } finally {
      setIsTestingRazorpayConnection(false);
    }
  };

  const handleAutoCreatePlans = async () => {
    try {
      setIsAutoCreatingPlans(true);
      setRazorpayFeedback(null);
      const res = await fetch('/api/admin/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_create_plans',
          key_id: razorpayKeyId.trim() || undefined,
          key_secret: razorpayKeySecret.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setRazorpayFeedback({
          type: 'success',
          text: json.message || '✓ Successfully created and linked ₹99 (Promo) and ₹199 (Standard) plans in your Razorpay account!',
        });
        if (json.promoPlanId) setRazorpayPromoPlanId(json.promoPlanId);
        if (json.standardPlanId) setRazorpayStandardPlanId(json.standardPlanId);
        if (json.testResult) setRazorpayTestResult(json.testResult);
        await fetchRazorpayConfig();
      } else {
        setRazorpayFeedback({
          type: 'error',
          text: json.error || 'Failed to auto-create plans in Razorpay',
        });
      }
    } catch (err: any) {
      setRazorpayFeedback({
        type: 'error',
        text: err.message || 'Error auto-creating plans in Razorpay',
      });
    } finally {
      setIsAutoCreatingPlans(false);
    }
  };

  const handleAutoLinkDetectedPlans = async (promoId?: string, standardId?: string) => {
    try {
      setIsLinkingPlans(true);
      setRazorpayFeedback(null);
      const res = await fetch('/api/admin/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_link_plans',
          promo_plan_id: promoId || razorpayPromoPlanId,
          standard_plan_id: standardId || razorpayStandardPlanId,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setRazorpayFeedback({
          type: 'success',
          text: '✓ Selected plans linked successfully!',
        });
        if (json.promoPlanId) setRazorpayPromoPlanId(json.promoPlanId);
        if (json.standardPlanId) setRazorpayStandardPlanId(json.standardPlanId);
        if (json.testResult) setRazorpayTestResult(json.testResult);
        await fetchRazorpayConfig();
      } else {
        setRazorpayFeedback({
          type: 'error',
          text: json.error || 'Failed to link plans',
        });
      }
    } catch (err: any) {
      setRazorpayFeedback({
        type: 'error',
        text: err.message || 'Error linking plans',
      });
    } finally {
      setIsLinkingPlans(false);
    }
  };

  const handleApplyDetectedPlan = (planId: string, target: 'promo' | 'standard') => {
    if (target === 'promo') {
      setRazorpayPromoPlanId(planId);
    } else {
      setRazorpayStandardPlanId(planId);
    }
    setRazorpayFeedback({
      type: 'success',
      text: `Selected ${planId} for ${target === 'promo' ? '₹99 Promotional' : '₹199 Standard'} plan. Click "Save Credentials & Plans" to apply.`,
    });
  };

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchStats(),
      fetchSubscribers(),
      fetchPromotions(),
      fetchTickets(),
      fetchAuditLogs(),
      fetchRazorpayConfig(),
    ]);
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
          { id: 'razorpay', label: 'Razorpay & Plans', icon: CreditCard },
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-indigo-600">{t.ticket_number}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">{t.category}</Badge>
                    <span className="text-[10px] font-bold text-amber-700">{t.priority}</span>
                    {t.callback_requested && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold">
                        <PhoneCall className="h-3 w-3" />
                        <span>Call Back: {t.callback_phone}</span>
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.subject}</h4>
                  <p className="text-xs text-slate-400">Business: {t.business_id}</p>
                </div>
                <div>
                  {t.status === 'resolved' ? (
                    <Badge className="bg-emerald-600 text-white text-[10px] uppercase font-bold gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Solved</span>
                    </Badge>
                  ) : (
                    <Badge className="text-[10px] uppercase font-bold self-start md:self-center">{t.status}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Admin Ticket Inspection & Conversation Modal */}
          {activeAdminTicket && (
            <Modal isOpen={Boolean(activeAdminTicket)} onClose={() => setActiveAdminTicket(null)} title={`Developer Support: ${activeAdminTicket.ticket_number}`}>
              <div className="space-y-4 p-4 text-xs max-h-[85vh] flex flex-col">
                {/* Call Back Banner if requested */}
                {activeAdminTicket.callback_requested && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 shrink-0 text-amber-400" />
                      <span>
                        Customer requested call back: <strong className="text-white font-mono">{activeAdminTicket.callback_phone}</strong>
                      </span>
                    </div>
                    {activeAdminTicket.callback_phone && (
                      <a
                        href={`tel:${activeAdminTicket.callback_phone}`}
                        className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] shrink-0"
                      >
                        Call Number
                      </a>
                    )}
                  </div>
                )}

                {/* Solved Status Banner */}
                {activeAdminTicket.status === 'resolved' && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>
                      <strong>Issue Solved:</strong> This ticket is marked as solved and visible as solved to the customer.
                    </span>
                  </div>
                )}

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

                <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{activeAdminTicket.subject}</span>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleUpdateTicketStatus('in_progress')}>In Progress</Button>
                    <Button
                      size="sm"
                      className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1"
                      onClick={() => handleUpdateTicketStatus('resolved')}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{activeAdminTicket.status === 'resolved' ? 'Solved ✓' : 'Mark as Solved'}</span>
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px] text-slate-600" onClick={() => handleUpdateTicketStatus('closed')}>Close</Button>
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

      {/* TAB: RAZORPAY CONFIGURATION & PLANS */}
      {activeTab === 'razorpay' && (
        <div className="space-y-6">
          {razorpayFeedback && (
            <div
              className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 ${
                razorpayFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
              }`}
            >
              <span>{razorpayFeedback.text}</span>
              <button
                type="button"
                onClick={() => setRazorpayFeedback(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                &times;
              </button>
            </div>
          )}

          {/* Gateway Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Razorpay Status</span>
              <div className="flex items-center gap-2 pt-1">
                {razorpayConfig?.isConfigured ? (
                  <Badge className="bg-emerald-600 text-white text-[11px] gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Configured ({razorpayConfig?.mode?.toUpperCase()})</span>
                  </Badge>
                ) : (
                  <Badge className="bg-amber-600 text-white text-[11px] gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Mock / Test Mode</span>
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                {razorpayConfig?.isConfigured ? 'Live credentials detected' : 'Placeholder keys in effect'}
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Public Key ID</span>
              <p className="text-lg font-mono font-bold text-slate-900 dark:text-white pt-1">
                {razorpayConfig?.keyId || 'Not Set'}
              </p>
              <p className="text-[11px] text-slate-500">Exposed safely to browser for modal</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Key Secret</span>
              <div className="pt-1">
                {razorpayConfig?.hasSecret ? (
                  <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[11px]">
                    Verified in Environment
                  </Badge>
                ) : (
                  <Badge className="bg-rose-600/20 text-rose-400 border border-rose-500/30 text-[11px]">
                    Missing in Vercel
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-500 pt-1">Kept strictly server-side</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Plan Linkage</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white pt-1">
                {razorpayPromoPlanId && razorpayStandardPlanId ? (
                  <span className="text-emerald-500">2 Plans Linked ✓</span>
                ) : razorpayPromoPlanId || razorpayStandardPlanId ? (
                  <span className="text-amber-500">1 Plan Linked</span>
                ) : (
                  <span className="text-slate-400">Pending Setup</span>
                )}
              </p>
              <p className="text-[11px] text-slate-500">Promo (₹99) & Standard (₹199)</p>
            </div>
          </div>

          {/* Test Connection Button & Live Feedback */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  <span>Test Razorpay Live Connection & Plans</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sends an authorized test probe to the Razorpay API to verify your Key ID, Key Secret, and Plan existence.
                </p>
              </div>
              <Button
                onClick={handleTestRazorpayConnection}
                disabled={isTestingRazorpayConnection}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shrink-0 flex items-center gap-2"
              >
                {isTestingRazorpayConnection ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Activity className="h-3.5 w-3.5" />
                )}
                <span>Test Razorpay Connection</span>
              </Button>
            </div>

            {razorpayTestResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-3 ${
                  razorpayTestResult.apiSuccess
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {razorpayTestResult.apiSuccess ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  )}
                  <span>{razorpayTestResult.apiMessage}</span>
                </div>

                {!razorpayTestResult.apiSuccess && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-200 text-xs space-y-1">
                    <p className="font-semibold text-rose-100 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      <span>Razorpay Authentication Failed or Key Expired</span>
                    </p>
                    <p className="text-[11px] text-rose-300/90 leading-relaxed">
                      If you recently regenerated your Razorpay keys in the Razorpay Dashboard, the old keys are expired.
                      Please paste your newly generated <strong>Key ID</strong> and <strong>Key Secret</strong> below and click <strong>Save Credentials &amp; Plans</strong>.
                    </p>
                  </div>
                )}

                {razorpayTestResult.apiSuccess && (
                  <div className="space-y-3 pt-2 border-t border-emerald-500/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                      <div className={`p-3 rounded-lg border ${
                        razorpayTestResult.promoPlanDetails
                          ? 'bg-emerald-950/30 border-emerald-800'
                          : 'bg-amber-950/30 border-amber-800'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Promo Plan (₹99):</span>
                          {razorpayTestResult.promoPlanDetails ? (
                            <Badge className="bg-emerald-600/30 text-emerald-300 border-emerald-700 text-[10px]">
                              {razorpayTestResult.promoPlanDetails.isAutoDetected ? 'Auto-Detected' : 'Linked ✓'}
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-600/30 text-amber-300 border-amber-700 text-[10px]">
                              Not Linked
                            </Badge>
                          )}
                        </div>
                        <p className="font-mono text-white text-xs mt-1">
                          {razorpayTestResult.promoPlanDetails
                            ? `${razorpayTestResult.promoPlanDetails.name} (₹${razorpayTestResult.promoPlanDetails.amount / 100}) - ${razorpayTestResult.promoPlanDetails.id}`
                            : 'No ₹99 plan linked or found on Razorpay'}
                        </p>
                      </div>

                      <div className={`p-3 rounded-lg border ${
                        razorpayTestResult.standardPlanDetails
                          ? 'bg-emerald-950/30 border-emerald-800'
                          : 'bg-amber-950/30 border-amber-800'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Standard Plan (₹199):</span>
                          {razorpayTestResult.standardPlanDetails ? (
                            <Badge className="bg-emerald-600/30 text-emerald-300 border-emerald-700 text-[10px]">
                              {razorpayTestResult.standardPlanDetails.isAutoDetected ? 'Auto-Detected' : 'Linked ✓'}
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-600/30 text-amber-300 border-amber-700 text-[10px]">
                              Not Linked
                            </Badge>
                          )}
                        </div>
                        <p className="font-mono text-white text-xs mt-1">
                          {razorpayTestResult.standardPlanDetails
                            ? `${razorpayTestResult.standardPlanDetails.name} (₹${razorpayTestResult.standardPlanDetails.amount / 100}) - ${razorpayTestResult.standardPlanDetails.id}`
                            : 'No ₹199 plan linked or found on Razorpay'}
                        </p>
                      </div>
                    </div>

                    {/* Auto-Match Quick Link Banner */}
                    {(razorpayTestResult.promoPlanDetails?.isAutoDetected || razorpayTestResult.standardPlanDetails?.isAutoDetected) && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-xs text-emerald-200">
                          <strong>✨ Matching plans detected in your Razorpay account!</strong> Click below to link them with 1 click.
                        </div>
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => handleAutoLinkDetectedPlans(razorpayTestResult.promoPlanDetails?.id, razorpayTestResult.standardPlanDetails?.id)}
                          disabled={isLinkingPlans}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8"
                        >
                          {isLinkingPlans ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '⚡ Link Detected Plans Now'}
                        </Button>
                      </div>
                    )}

                    {/* 1-Click Auto-Create Plans in Razorpay Button if not linked */}
                    {(!razorpayTestResult.promoPlanDetails || !razorpayTestResult.standardPlanDetails) && (
                      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5 text-xs text-indigo-200">
                          <p className="font-bold flex items-center gap-1.5 text-white">
                            <Sparkles className="h-4 w-4 text-indigo-400" />
                            <span>1-Click Solution: Auto-Create QuoteFlow Plans in Razorpay</span>
                          </p>
                          <p className="text-slate-300 text-[11px]">
                            We will automatically call Razorpay's API to create the official ₹99/mo Promotional and ₹199/mo Standard recurring plans and link them instantly.
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={handleAutoCreatePlans}
                          disabled={isAutoCreatingPlans}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 h-9 gap-1.5 shadow-sm"
                        >
                          {isAutoCreatingPlans ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          <span>Auto-Create Plans in Razorpay</span>
                        </Button>
                      </div>
                    )}

                    {/* Available Plans list in Razorpay Account */}
                    {razorpayTestResult.availablePlans && razorpayTestResult.availablePlans.length > 0 && (
                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          All Plans Detected in Your Razorpay Account ({razorpayTestResult.availablePlans.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {razorpayTestResult.availablePlans.map((p: any) => (
                            <div key={p.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs flex flex-col justify-between gap-2">
                              <div>
                                <div className="flex items-center justify-between font-bold text-white">
                                  <span>{p.name}</span>
                                  <span className="text-emerald-400">₹{p.amount / 100}/{p.period || 'month'}</span>
                                </div>
                                <p className="font-mono text-[11px] text-slate-400 mt-0.5">{p.id}</p>
                              </div>
                              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                                <Button
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleApplyDetectedPlan(p.id, 'promo')}
                                  className="h-6 text-[10px] px-2"
                                >
                                  Use for ₹99 Promo
                                </Button>
                                <Button
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleApplyDetectedPlan(p.id, 'standard')}
                                  className="h-6 text-[10px] px-2"
                                >
                                  Use for ₹199 Standard
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form to configure Razorpay API Keys & Plan IDs */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="h-4 w-4 text-indigo-500" />
                <span>Razorpay API Credentials &amp; Subscription Plans</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update your live or test credentials and linked plans. Changes are applied dynamically to checkout sessions.
              </p>
            </div>

            <form onSubmit={handleSaveRazorpayPlans} className="space-y-4 max-w-2xl">
              {/* Key ID Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Razorpay Key ID</span>
                  <span className="text-[10px] font-normal text-slate-400">Public (used in checkout modal)</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="rzp_test_... or rzp_live_..."
                    value={razorpayKeyId}
                    onChange={(e) => setRazorpayKeyId(e.target.value)}
                    className="pl-9 font-mono text-xs"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  From Razorpay Dashboard &rarr; Account &amp; Settings &rarr; API Keys.
                </p>
              </div>

              {/* Key Secret Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Razorpay Key Secret</span>
                  {razorpayConfig?.hasSecret && (
                    <span className="text-[10px] font-semibold text-emerald-500">✓ Secret already saved on server</span>
                  )}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type={showKeySecret ? 'text' : 'password'}
                    placeholder={razorpayConfig?.hasSecret ? '•••••••••••••••••••••••••••• (leave blank to keep unchanged)' : 'Enter Razorpay Key Secret'}
                    value={razorpayKeySecret}
                    onChange={(e) => setRazorpayKeySecret(e.target.value)}
                    className="pl-9 pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeySecret(!showKeySecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    aria-label={showKeySecret ? 'Hide key secret' : 'Show key secret'}
                  >
                    {showKeySecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Kept strictly on your server. Only enter a value if you wish to set or update the secret.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Linked Recurring Plan IDs</h4>
              </div>

              {/* Promo Plan ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Promotional Plan ID (₹99/mo for first 3 cycles)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. plan_O1a2b3c4d5e6f7"
                  value={razorpayPromoPlanId}
                  onChange={(e) => setRazorpayPromoPlanId(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400">
                  Monthly recurring plan created in Razorpay with amount ₹99.
                </p>
              </div>

              {/* Standard Plan ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Standard Plan ID (₹199/mo recurring)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. plan_P1a2b3c4d5e6f7"
                  value={razorpayStandardPlanId}
                  onChange={(e) => setRazorpayStandardPlanId(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400">
                  Monthly recurring plan created in Razorpay with amount ₹199.
                </p>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={isSavingRazorpayPlans}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2"
                >
                  {isSavingRazorpayPlans ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>Save Credentials &amp; Plans</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestRazorpayConnection}
                  disabled={isTestingRazorpayConnection}
                  className="text-xs flex items-center gap-2"
                >
                  {isTestingRazorpayConnection ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Activity className="h-3.5 w-3.5 text-indigo-500" />
                  )}
                  <span>Test Live Connection</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Setup Guide Box */}
          <div className="p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs space-y-3">
            <h4 className="font-bold text-sm text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
              <span>📋 How to set up Razorpay Subscriptions (Step-by-Step)</span>
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed">
              <li>
                Log in to your <strong>Razorpay Dashboard</strong> (<a href="https://dashboard.razorpay.com" target="_blank" rel="noreferrer" className="text-indigo-500 underline font-mono">dashboard.razorpay.com</a>).
              </li>
              <li>
                In the left sidebar, navigate to <strong>Subscriptions &rarr; Plans</strong> (if Subscriptions is not visible, activate Subscriptions under Account &amp; Settings).
              </li>
              <li>
                Click <strong>+ Create Plan</strong>:
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1 text-slate-600 dark:text-slate-400">
                  <li><strong>Plan 1 (Promo)</strong>: Name: <code>QuoteFlow Special Offer</code>, Frequency: <code>Monthly</code> (Every 1 Month), Amount: <code>₹99</code>. Copy the generated Plan ID (e.g. <code>plan_...</code>).</li>
                  <li><strong>Plan 2 (Standard)</strong>: Name: <code>QuoteFlow Standard</code>, Frequency: <code>Monthly</code> (Every 1 Month), Amount: <code>₹199</code>. Copy the generated Plan ID (e.g. <code>plan_...</code>).</li>
                </ul>
              </li>
              <li>
                Paste both Plan IDs in the fields above and click <strong>Save Plan IDs</strong>.
              </li>
              <li>
                In your <strong>Vercel Project Settings &rarr; Environment Variables</strong>, ensure you have set:
                <div className="p-2.5 mt-1 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] space-y-1">
                  <div>RAZORPAY_KEY_ID=rzp_live_... (or rzp_test_...)</div>
                  <div>RAZORPAY_KEY_SECRET=...</div>
                  <div>NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_... (matching key ID)</div>
                  <div>RAZORPAY_MODE=live (or test)</div>
                </div>
              </li>
              <li>
                Click <strong>Test Razorpay Connection</strong> above to verify that everything is connected and ready for customer payments!
              </li>
            </ol>
          </div>
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
