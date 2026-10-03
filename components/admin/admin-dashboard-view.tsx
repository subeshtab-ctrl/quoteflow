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
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Trash2,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Percent,
  ShieldAlert,
  Sun,
  Moon,
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

  // Business Expansion & Offer / Clean-up State
  const [expandedBusinessId, setExpandedBusinessId] = useState<string | null>(null);
  const [expandedBusinessDetails, setExpandedBusinessDetails] = useState<any | null>(null);
  const [isLoadingExpanded, setIsLoadingExpanded] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Apply Offer Modal State
  const [applyOfferModalOpen, setApplyOfferModalOpen] = useState(false);
  const [offerTargetBusiness, setOfferTargetBusiness] = useState<BusinessSubscription | null>(null);
  const [offerType, setOfferType] = useState<'percentage' | 'fixed' | 'free_months' | 'special_rate'>('percentage');
  const [offerValue, setOfferValue] = useState<number>(20);
  const [offerDuration, setOfferDuration] = useState<number>(1);
  const [offerReason, setOfferReason] = useState<string>('Founder promotional incentive');
  const [isApplyingOffer, setIsApplyingOffer] = useState(false);

  // Cleanup Test Data Modal State
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [cleanupAccounts, setCleanupAccounts] = useState<any[]>([]);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isLoadingCleanupInfo, setIsLoadingCleanupInfo] = useState(false);

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

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleExpand = async (sub: BusinessSubscription) => {
    if (expandedBusinessId === sub.business_id) {
      setExpandedBusinessId(null);
      setExpandedBusinessDetails(null);
      return;
    }

    setExpandedBusinessId(sub.business_id);
    setExpandedBusinessDetails(null);
    try {
      setIsLoadingExpanded(true);
      const res = await fetch(`/api/admin/subscribers/${sub.business_id}`);
      const json = await res.json();
      if (res.ok) {
        setExpandedBusinessDetails(json);
      }
    } catch (err) {
      console.error('Failed to load business details:', err);
    } finally {
      setIsLoadingExpanded(false);
    }
  };

  const handleOpenCleanupModal = async () => {
    setCleanupModalOpen(true);
    try {
      setIsLoadingCleanupInfo(true);
      const res = await fetch('/api/admin/cleanup-test-data');
      const json = await res.json();
      if (res.ok) {
        setCleanupAccounts(json.accounts || []);
      }
    } catch (err) {
      console.error('Error fetching test accounts:', err);
    } finally {
      setIsLoadingCleanupInfo(false);
    }
  };

  const handleConfirmCleanup = async () => {
    try {
      setIsCleaningUp(true);
      const res = await fetch('/api/admin/cleanup-test-data', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        alert(`Successfully cleaned ${json.cleanedCount} synthetic test accounts. Live paying accounts (Pozone) were safely protected.`);
        setCleanupModalOpen(false);
        await fetchSubscribers();
        await fetchStats();
      } else {
        alert(json.error || 'Failed to cleanup test data');
      }
    } catch (err: any) {
      alert(err.message || 'Error executing cleanup');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleOpenApplyOffer = (sub: BusinessSubscription) => {
    setOfferTargetBusiness(sub);
    setOfferType('percentage');
    setOfferValue(20);
    setOfferDuration(1);
    setOfferReason('Developer Admin promotional incentive');
    setApplyOfferModalOpen(true);
  };

  const handleApplyOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTargetBusiness) return;
    try {
      setIsApplyingOffer(true);
      const res = await fetch(`/api/admin/subscribers/${offerTargetBusiness.business_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_offer',
          offerType,
          value: offerValue,
          durationMonths: offerDuration,
          reason: offerReason,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Offer applied successfully to future billing cycles!');
        setApplyOfferModalOpen(false);
        setOfferTargetBusiness(null);
        await fetchSubscribers();
        await fetchAuditLogs();
        if (expandedBusinessId) {
          const ref = await fetch(`/api/admin/subscribers/${expandedBusinessId}`);
          const rj = await ref.json();
          if (rj.success) setExpandedBusinessDetails(rj);
        }
      } else {
        alert(json.error || 'Failed to apply offer');
      }
    } catch (err: any) {
      alert(err.message || 'Error applying offer');
    } finally {
      setIsApplyingOffer(false);
    }
  };

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
          {/* Filters, Search & Cleanup */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={subSearch}
                onChange={(e) => {
                  setSubSearch(e.target.value);
                  setSubPage(1);
                }}
                placeholder="Search by business name, email, phone, country, or ID..."
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={subStatusFilter}
                onChange={(e) => {
                  setSubStatusFilter(e.target.value);
                  setSubPage(1);
                }}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="payment_due">Payment Due</option>
                <option value="payment_overdue">Payment Overdue</option>
                <option value="restricted">Restricted</option>
                <option value="cancelled">Cancelled</option>
                <option value="ai_test">AI / Test</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenCleanupModal}
                className="text-xs gap-1.5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clean Test Data</span>
              </Button>
            </div>
          </div>

          {/* Subscribers 11-Column Table (Requirement 24) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Business Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Country</th>
                    <th className="px-4 py-3">Registration</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Trial Status</th>
                    <th className="px-4 py-3">Sub Status</th>
                    <th className="px-4 py-3">Trial End</th>
                    <th className="px-4 py-3">Next Due</th>
                    <th className="px-4 py-3">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subscribers.map((s) => {
                    const isPozone = s.business_id === '765a894f-c3c4-4fe4-a8e2-7b240eda570a';
                    const isExpanded = expandedBusinessId === s.business_id;
                    const now = Date.now();
                    const trialEndMs = s.trial_end_at ? new Date(s.trial_end_at).getTime() : 0;
                    const isTrialActive = trialEndMs > now;
                    const daysRemaining = isTrialActive ? Math.max(0, Math.ceil((trialEndMs - now) / 86400000)) : 0;

                    // Authoritative trial status
                    const trialStatusText = s.is_trial_prepaid
                      ? `Paid (${daysRemaining}d trial left)`
                      : isTrialActive
                      ? `Active (${daysRemaining}d left)`
                      : 'Concluded';

                    // Next payment due date
                    const nextPaymentDueFormatted = s.next_charge_at
                      ? new Date(s.next_charge_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : s.trial_end_at
                      ? new Date(s.trial_end_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—';

                    return (
                      <React.Fragment key={s.id}>
                        <tr
                          onClick={() => handleToggleExpand(s)}
                          className={`cursor-pointer transition-colors ${
                            isExpanded
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {/* 1. Business Name */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-indigo-500 shrink-0" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                              )}
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 transition-colors">
                                    {s.organization?.name || 'Unnamed Business'}
                                  </span>
                                  {isPozone && (
                                    <Badge className="bg-emerald-600 text-white text-[9px] font-bold">
                                      Verified Paid
                                    </Badge>
                                  )}
                                  {s.is_test && (
                                    <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[9px]">
                                      Test
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                                  {s.business_id}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* 2. Email */}
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {s.organization?.email || '—'}
                          </td>

                          {/* 3. Phone */}
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {s.organization?.phone || '—'}
                          </td>

                          {/* 4. Country */}
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {s.organization?.country || '—'}
                          </td>

                          {/* 5. Registration Date */}
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>

                          {/* 6. Plan */}
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {s.plan?.name || (s.amount === 9900 ? 'QuoteFlow Pro' : 'Free Trial')}
                          </td>

                          {/* 7. Trial Status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                isTrialActive
                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {trialStatusText}
                            </span>
                          </td>

                          {/* 8. Subscription Status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                s.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : s.status === 'trialing'
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                  : s.status === 'grace_period'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : s.status === 'payment_overdue' || (s as any).account_access === 'restricted'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : s.status === 'payment_pending'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>

                          {/* 9. Trial End Date */}
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {s.trial_end_at
                              ? new Date(s.trial_end_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>

                          {/* 10. Next Payment Due */}
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {nextPaymentDueFormatted}
                          </td>

                          {/* 11. Payment Status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {s.last_payment_id || s.status === 'active' || isPozone ? (
                              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                                Paid (₹99)
                              </Badge>
                            ) : s.is_trial_prepaid ? (
                              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                                Prepaid
                              </Badge>
                            ) : s.status === 'grace_period' || s.status === 'payment_overdue' ? (
                              <Badge className="bg-rose-600 text-white text-[10px] font-bold">
                                Overdue
                              </Badge>
                            ) : s.status === 'trialing' ? (
                              <Badge variant="outline" className="text-slate-500 text-[10px]">
                                Trial (₹0)
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                                Pending
                              </Badge>
                            )}
                          </td>
                        </tr>

                        {/* EXPANDED ROW DETAILS (Requirements 25, 26, 27, 28, 29, 30) */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 dark:bg-slate-950 border-y border-indigo-200 dark:border-indigo-900/60">
                            <td colSpan={11} className="p-6">
                              {isLoadingExpanded ? (
                                <div className="py-8 flex items-center justify-center gap-2 text-slate-400">
                                  <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                                  <span>Loading authoritative business details...</span>
                                </div>
                              ) : (
                                <div className="space-y-6">
                                  {/* Top Actions & Header */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                          {s.organization?.name || 'Business Overview'}
                                        </h4>
                                        {isPozone && (
                                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                                            Live Paying Account (Protected)
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-500">
                                        Registered on {new Date(s.created_at).toLocaleString()} • Business ID: <span className="font-mono">{s.business_id}</span>
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenApplyOffer(s);
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-xs"
                                      >
                                        <Tag className="h-3.5 w-3.5" />
                                        <span>Apply Offer</span>
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Grid of 4 Cards */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* 1. Business Info (from Settings) */}
                                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                                      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-100 dark:border-slate-800">
                                        <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                                        <span>Settings Profile</span>
                                      </span>
                                      <div className="space-y-1.5 text-[11px] pt-1">
                                        <div><span className="text-slate-400">Email:</span> <strong className="text-slate-800 dark:text-slate-200">{s.organization?.email || '—'}</strong></div>
                                        <div><span className="text-slate-400">Phone:</span> <strong className="text-slate-800 dark:text-slate-200">{s.organization?.phone || '—'}</strong></div>
                                        <div><span className="text-slate-400">Address:</span> <strong className="text-slate-800 dark:text-slate-200">{[s.organization?.address_line1, s.organization?.city, s.organization?.state, s.organization?.postal_code, s.organization?.country].filter(Boolean).join(', ') || '—'}</strong></div>
                                        <div><span className="text-slate-400">Website:</span> <strong className="text-slate-800 dark:text-slate-200">{s.organization?.website || '—'}</strong></div>
                                        <div><span className="text-slate-400">Tax/GST/VAT:</span> <strong className="text-slate-800 dark:text-slate-200">{s.organization?.gst_vat_number || 'None'}</strong></div>
                                      </div>
                                    </div>

                                    {/* 2. Trial Details */}
                                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                                      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-100 dark:border-slate-800">
                                        <Clock className="h-3.5 w-3.5 text-indigo-500" />
                                        <span>Trial Timeline</span>
                                      </span>
                                      <div className="space-y-1.5 text-[11px] pt-1">
                                        <div><span className="text-slate-400">Trial Started:</span> <strong className="text-slate-800 dark:text-slate-200">{s.trial_start_at ? new Date(s.trial_start_at).toLocaleDateString() : 'At Registration'}</strong></div>
                                        <div><span className="text-slate-400">Trial Ends:</span> <strong className="text-slate-800 dark:text-slate-200">{s.trial_end_at ? new Date(s.trial_end_at).toLocaleDateString() : '30 days'}</strong></div>
                                        <div><span className="text-slate-400">Days Remaining:</span> <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{daysRemaining} days</strong></div>
                                        <div><span className="text-slate-400">Prepaid:</span> <strong className="text-slate-800 dark:text-slate-200">{s.is_trial_prepaid ? 'Yes (Trial Active)' : 'No'}</strong></div>
                                      </div>
                                    </div>

                                    {/* 3. Plan Details */}
                                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                                      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-100 dark:border-slate-800">
                                        <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
                                        <span>Plan & Schedule</span>
                                      </span>
                                      <div className="space-y-1.5 text-[11px] pt-1">
                                        <div><span className="text-slate-400">Plan:</span> <strong className="text-slate-800 dark:text-slate-200">{s.plan?.name || 'QuoteFlow Pro'}</strong></div>
                                        <div><span className="text-slate-400">Price:</span> <strong className="text-slate-900 dark:text-white font-bold">₹{(s.amount / 100).toFixed(2)} / month</strong></div>
                                        <div><span className="text-slate-400">Status:</span> <strong className="text-slate-800 dark:text-slate-200">{s.status}</strong></div>
                                        <div><span className="text-slate-400">Next Payment Due:</span> <strong className="text-slate-900 dark:text-white">{nextPaymentDueFormatted}</strong></div>
                                        <div><span className="text-slate-400">Billing Interval:</span> <strong className="text-slate-800 dark:text-slate-200">Monthly (₹99)</strong></div>
                                      </div>
                                    </div>

                                    {/* 4. Admin-Only Copyable Identifiers */}
                                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                                      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-100 dark:border-slate-800">
                                        <Key className="h-3.5 w-3.5 text-amber-500" />
                                        <span>Razorpay IDs (Admin Only)</span>
                                      </span>
                                      <div className="space-y-2 pt-1 font-mono text-[10px]">
                                        <div>
                                          <span className="text-slate-400 block font-sans">Payment ID:</span>
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="truncate">{s.last_payment_id || 'None'}</span>
                                            {s.last_payment_id && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleCopy(s.last_payment_id!, `pay_${s.id}`);
                                                }}
                                                className="p-1 hover:text-indigo-500 text-slate-400"
                                                title="Copy Payment ID"
                                              >
                                                {copiedKey === `pay_${s.id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        <div>
                                          <span className="text-slate-400 block font-sans">Subscription ID:</span>
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="truncate">{s.razorpay_subscription_id || 'None'}</span>
                                            {s.razorpay_subscription_id && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleCopy(s.razorpay_subscription_id!, `sub_${s.id}`);
                                                }}
                                                className="p-1 hover:text-indigo-500 text-slate-400"
                                                title="Copy Subscription ID"
                                              >
                                                {copiedKey === `sub_${s.id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        <div>
                                          <span className="text-slate-400 block font-sans">Plan ID:</span>
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="truncate">{s.razorpay_plan_id || 'plan_monthly_99'}</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopy(s.razorpay_plan_id || 'plan_monthly_99', `plan_${s.id}`);
                                              }}
                                              className="p-1 hover:text-indigo-500 text-slate-400"
                                              title="Copy Plan ID"
                                            >
                                              {copiedKey === `plan_${s.id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 5. Admin Transaction History Table */}
                                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                                    <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                      <Activity className="h-4 w-4 text-emerald-500" />
                                      <span>Admin Transaction History</span>
                                    </h5>

                                    {expandedBusinessDetails?.payments && expandedBusinessDetails.payments.length > 0 ? (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-left">
                                          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-semibold text-[10px]">
                                            <tr>
                                              <th className="px-3 py-2">Date</th>
                                              <th className="px-3 py-2">Amount</th>
                                              <th className="px-3 py-2">Status</th>
                                              <th className="px-3 py-2">Payment ID</th>
                                              <th className="px-3 py-2">Invoice ID</th>
                                              <th className="px-3 py-2">Method</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {expandedBusinessDetails.payments.map((p: any) => (
                                              <tr key={p.id}>
                                                <td className="px-3 py-2">{new Date(p.paid_at || p.created_at).toLocaleString()}</td>
                                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">₹{(p.amount / 100).toFixed(2)}</td>
                                                <td className="px-3 py-2">
                                                  <Badge className={p.status === 'captured' ? 'bg-emerald-600 text-white text-[9px]' : 'bg-rose-600 text-white text-[9px]'}>
                                                    {p.status}
                                                  </Badge>
                                                </td>
                                                <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{p.razorpay_payment_id || '—'}</td>
                                                <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{p.razorpay_invoice_id || '—'}</td>
                                                <td className="px-3 py-2 uppercase text-[10px] text-slate-500">{p.payment_method || 'card'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-400 py-3 text-center">
                                        No captured payments recorded for this account.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {subscribers.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No subscribers match the current filter criteria.
              </div>
            )}
          </div>

          {/* APPLY OFFER MODAL (Requirements 27, 28, 44) */}
          {applyOfferModalOpen && offerTargetBusiness && (
            <Modal
              isOpen={applyOfferModalOpen}
              onClose={() => setApplyOfferModalOpen(false)}
              title={`Apply Offer to ${offerTargetBusiness.organization?.name || 'Business'}`}
            >
              <form onSubmit={handleApplyOfferSubmit} className="space-y-4 p-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Offer Type</label>
                  <select
                    value={offerType}
                    onChange={(e) => setOfferType(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs font-medium"
                  >
                    <option value="percentage">Percentage Discount (e.g. 20% off)</option>
                    <option value="fixed">Fixed Amount Discount (e.g. ₹30 off)</option>
                    <option value="free_months">Free Months (100% free billing)</option>
                    <option value="special_rate">Special Monthly Rate (e.g. ₹49/month)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">
                      {offerType === 'percentage'
                        ? 'Discount Percentage (%)'
                        : offerType === 'fixed'
                        ? 'Discount Amount (₹)'
                        : offerType === 'free_months'
                        ? 'Number of Free Months'
                        : 'Special Monthly Rate (₹)'}
                    </label>
                    <Input
                      type="number"
                      value={offerValue}
                      onChange={(e) => setOfferValue(Number(e.target.value))}
                      required
                      min={1}
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Duration (Billing Cycles / Months)</label>
                    <Input
                      type="number"
                      value={offerDuration}
                      onChange={(e) => setOfferDuration(Number(e.target.value))}
                      required
                      min={1}
                      max={12}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Internal Reason / Approval Note</label>
                  <Input
                    value={offerReason}
                    onChange={(e) => setOfferReason(e.target.value)}
                    required
                    placeholder="e.g. Founder promotional incentive or partner credit"
                  />
                </div>

                {/* Live Preview Box */}
                <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 block text-xs">
                    Live Calculation Preview
                  </span>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                    <div>Original Rate: <span className="line-through text-slate-400">₹99.00 / month</span></div>
                    <div>
                      Adjusted Rate:{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        {offerType === 'percentage'
                          ? `₹${Math.round(99 * (1 - Math.min(100, offerValue) / 100))}.00 / month`
                          : offerType === 'fixed'
                          ? `₹${Math.max(0, 99 - offerValue)}.00 / month`
                          : offerType === 'free_months'
                          ? '₹0.00 / month'
                          : `₹${offerValue}.00 / month`}
                      </strong>
                    </div>
                    <div>Duration: <strong>{offerDuration} billing cycle(s)</strong></div>
                  </div>
                </div>

                {/* Safety Guarantee */}
                <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[10px] text-slate-500 space-y-0.5">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Safety Check: Future Cycles Only</span>
                  </p>
                  <p>This offer applies strictly to upcoming renewals and will never alter past captured payments. All adjustments are logged to the Admin Audit Log.</p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setApplyOfferModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isApplyingOffer}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    {isApplyingOffer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm & Apply Offer'}
                  </Button>
                </div>
              </form>
            </Modal>
          )}

          {/* CLEANUP TEST DATA CONFIRMATION MODAL (Requirement 31) */}
          {cleanupModalOpen && (
            <Modal
              isOpen={cleanupModalOpen}
              onClose={() => setCleanupModalOpen(false)}
              title="Clean Synthetic & Test Accounts"
            >
              <div className="space-y-4 p-4 text-xs">
                {isLoadingCleanupInfo ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    <span>Scanning for test accounts...</span>
                  </div>
                ) : (
                  <>
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-xs">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Ready to clean {cleanupAccounts.length} test accounts</span>
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        This action will soft-delete synthetic demo and test accounts created during quality assurance.
                      </p>
                    </div>

                    {/* Strict Live Account Protection Notice */}
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-xs">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Real Payment Accounts Strictly Protected</span>
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        Real customer accounts like <strong>Pozone</strong> and any account with verified live payment records are permanently locked and will NEVER be deleted.
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setCleanupModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isCleaningUp || cleanupAccounts.length === 0}
                        onClick={handleConfirmCleanup}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                      >
                        {isCleaningUp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Delete ${cleanupAccounts.length} Test Accounts`}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Modal>
          )}
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
                {razorpayPromoPlanId ? (
                  <span className="text-emerald-500">Plan Linked ✓</span>
                ) : (
                  <span className="text-slate-400">Pending Setup</span>
                )}
              </p>
              <p className="text-[11px] text-slate-500">QuoteFlow Pro (₹99/month)</p>
            </div>
          </div>

          {/* Test Connection Button & Live Feedback */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  <span>Test Razorpay Live Connection &amp; Plan</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sends an authorized test probe to the Razorpay API to verify your Key ID, Key Secret, and QuoteFlow Pro (₹99/mo) Plan.
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
                    <div className="grid grid-cols-1 gap-3 text-slate-300">
                      <div className={`p-3 rounded-lg border ${
                        razorpayTestResult.promoPlanDetails
                          ? 'bg-emerald-950/30 border-emerald-800'
                          : 'bg-amber-950/30 border-amber-800'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">QuoteFlow Pro Plan (₹99 / month):</span>
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
                            ? `${razorpayTestResult.promoPlanDetails.name} (₹${razorpayTestResult.promoPlanDetails.amount / 100}/mo) - ${razorpayTestResult.promoPlanDetails.id}`
                            : 'No ₹99 plan linked or found on Razorpay'}
                        </p>
                      </div>
                    </div>

                    {/* Auto-Match Quick Link Banner */}
                    {razorpayTestResult.promoPlanDetails?.isAutoDetected && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-xs text-emerald-200">
                          <strong>✨ Matching ₹99/mo plan detected in your Razorpay account!</strong> Click below to link it with 1 click.
                        </div>
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => handleAutoLinkDetectedPlans(razorpayTestResult.promoPlanDetails?.id, razorpayTestResult.promoPlanDetails?.id)}
                          disabled={isLinkingPlans}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8"
                        >
                          {isLinkingPlans ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '⚡ Link Detected Plan Now'}
                        </Button>
                      </div>
                    )}

                    {/* 1-Click Auto-Create Plans in Razorpay Button if not linked */}
                    {!razorpayTestResult.promoPlanDetails && (
                      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5 text-xs text-indigo-200">
                          <p className="font-bold flex items-center gap-1.5 text-white">
                            <Sparkles className="h-4 w-4 text-indigo-400" />
                            <span>1-Click Solution: Auto-Create QuoteFlow Pro Plan in Razorpay</span>
                          </p>
                          <p className="text-slate-300 text-[11px]">
                            We will automatically call Razorpay's API to create the official QuoteFlow Pro (₹99/month) recurring plan and link it instantly.
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
                          <span>Auto-Create ₹99 Plan</span>
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
                                  Use for QuoteFlow Pro (₹99)
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
                <span>Razorpay API Credentials &amp; Subscription Plan</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update your live credentials and QuoteFlow Pro (₹99/month) Plan ID.
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
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Linked QuoteFlow Pro Plan ID</h4>
              </div>

              {/* Pro Plan ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  QuoteFlow Pro Plan ID (₹99/month recurring)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. plan_O1a2b3c4d5e6f7"
                  value={razorpayPromoPlanId}
                  onChange={(e) => {
                    setRazorpayPromoPlanId(e.target.value);
                    setRazorpayStandardPlanId(e.target.value);
                  }}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400">
                  Monthly recurring plan created in Razorpay with amount ₹99.
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
                  <span>Save Credentials &amp; Plan</span>
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
                <div className="ml-5 mt-1 text-slate-600 dark:text-slate-400">
                  <strong>QuoteFlow Pro</strong>: Name: <code>QuoteFlow Pro</code>, Frequency: <code>Monthly</code> (Every 1 Month), Amount: <code>₹99</code>. Copy the generated Plan ID (e.g. <code>plan_...</code>).
                </div>
              </li>
              <li>
                Paste the Plan ID in the field above and click <strong>Save Credentials &amp; Plan</strong>.
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
