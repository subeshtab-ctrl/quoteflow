'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  ShieldCheck,
  Clock,
  ArrowRight,
  RefreshCw,
  Loader2,
  Send,
  Bot,
  FileText,
  BadgeCheck,
  MessageCircle,
  ChevronRight,
  Flame,
  Check,
  X,
  ExternalLink,
  Share2,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import {
  AIEngineCycleResult,
  AIAgent,
  AITask,
  AIApproval,
  AIActivityLog,
  AIAgentId,
} from '@/types/ai-team';

interface Props {
  theme?: 'light' | 'dark';
}

export function AITeamDashboardView({ theme = 'light' }: Props) {
  const [data, setData] = useState<AIEngineCycleResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCycling, setIsCycling] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  // Agent Chat Modal State
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [activeChatAgent, setActiveChatAgent] = useState<AIAgent | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: 'user' | 'agent'; text: string; timestamp: string }>
  >([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingApprovalId, setRejectingApprovalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Execution Results Modal State
  const [executionModalOpen, setExecutionModalOpen] = useState(false);
  const [currentExecutionResult, setCurrentExecutionResult] = useState<any>(null);
  const [currentExecutionTitle, setCurrentExecutionTitle] = useState<string>('');

  // Initial Load
  const fetchTeamData = async (refresh = false) => {
    try {
      if (refresh) setIsCycling(true);
      else setIsLoading(true);

      const res = await fetch(`/api/admin/ai-team?refresh=${refresh}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load AI team data:', err);
    } finally {
      setIsLoading(false);
      setIsCycling(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  // Trigger Full AI Cycle
  const handleTriggerCycle = async () => {
    try {
      setIsCycling(true);
      const res = await fetch('/api/admin/ai-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerSource: 'founder_dashboard_button' }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to trigger AI cycle:', err);
    } finally {
      setIsCycling(false);
    }
  };

  // Approve an item & immediately show live execution modal
  const handleApprove = async (approvalId: string) => {
    try {
      setActionLoadingId(approvalId);
      const res = await fetch('/api/admin/ai-team/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId }),
      });
      const json = await res.json();
      if (json.success) {
        if (json.executionResult) {
          setCurrentExecutionResult(json.executionResult);
          setCurrentExecutionTitle(json.executionResult.title || 'Action Executed Live');
          setExecutionModalOpen(true);
        }
        await fetchTeamData(false);
      }
    } catch (err) {
      console.error('Failed to approve item:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject prompt & submit
  const openRejectModal = (approvalId: string) => {
    setRejectingApprovalId(approvalId);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingApprovalId) return;
    try {
      setActionLoadingId(rejectingApprovalId);
      const res = await fetch('/api/admin/ai-team/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: rejectingApprovalId,
          reason: rejectReason || 'Declined by Founder',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRejectModalOpen(false);
        await fetchTeamData(false);
      }
    } catch (err) {
      console.error('Failed to reject item:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Chat with Agent
  const openAgentChat = (agent: AIAgent) => {
    setActiveChatAgent(agent);
    setChatMessages([
      {
        sender: 'agent',
        text: `Hello Founder! I'm ${agent.name}, ${agent.title}. How can I assist you with ${agent.specialization[0]} today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setChatInput('');
    setChatModalOpen(true);
  };

  // Send Chat message
  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim() || !activeChatAgent || isChatLoading) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetText) setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/admin/ai-team/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: activeChatAgent.id,
          message: textToSend,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'agent',
            text: json.data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to chat with agent:', err);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Initializing Autonomous AI Executive Team...
        </p>
        <p className="text-xs text-slate-400">Loading Cloudflare edge telemetry & AI agents</p>
      </div>
    );
  }

  const kpis = data?.kpis;
  const briefing = data?.briefing;
  const approvals = data?.approvals || [];
  const agents = data?.agents || [];
  const logs = data?.logs || [];

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;
  const filteredApprovals = approvals.filter((a) => {
    if (filterStatus === 'ALL') return true;
    return a.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* HERO COMMAND HEADER                                           */}
      {/* ------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg border border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] uppercase font-bold tracking-wider">
                Autonomous AI Executive Team
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                Cloudflare Workers Edge
              </Badge>
              {data?.geminiConnected ? (
                <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold">
                  Gemini 1.5 Flash Connected
                </Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                  Heuristic AI Engine Active
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">QuoteFlow AI Command Center</h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Autonomous agents analyzing your sales funnels, financial cash flow, tax compliance (UAE VAT PINT-AE & India GST), and edge reliability 24/7 with human-in-the-loop approvals.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleTriggerCycle}
              disabled={isCycling}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 border border-indigo-400/30 transition-all active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 ${isCycling ? 'animate-spin' : ''}`} />
              <span>{isCycling ? 'Running Full AI Cycle...' : 'Run AI Team Cycle Now'}</span>
            </Button>
          </div>
        </div>

        {/* Background glow styling */}
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* AI CEO EXECUTIVE BRIEFING                                     */}
      {/* ------------------------------------------------------------- */}
      {briefing && (
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900 p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-xl shadow-sm text-white">
                👑
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Atlas (AI CEO) Executive Briefing
                  </h2>
                  <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 text-[10px]">
                    Live Strategic Pulse
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Compiled at {new Date(briefing.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Edge Verified
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openAgentChat(agents.find((a) => a.id === 'ceo') || agents[0])}
              className="text-xs h-8 rounded-lg flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>Ask Atlas</span>
            </Button>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs leading-relaxed font-medium">
            {briefing.summary}
          </div>

          {/* Key Observations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {briefing.keyObservations.map((obs, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300"
              >
                <div className="mt-0.5">{obs.includes('⚠️') ? '⚠️' : obs.includes('🚨') ? '🚨' : '✅'}</div>
                <div className="flex-1">{obs.replace(/^[⚠️🚨✅]\s*/, '')}</div>
              </div>
            ))}
          </div>

          {/* Recommended Action Callout */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                <strong className="font-bold">Founder Priority:</strong> {briefing.recommendedImmediateAction}
              </span>
            </div>
            {pendingApprovalsCount > 0 && (
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
                {pendingApprovalsCount} Action{pendingApprovalsCount > 1 ? 's' : ''} Awaiting
              </span>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TELEMETRY STRIP (KPIS)                                        */}
      {/* ------------------------------------------------------------- */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>Monthly Recurring</span>
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">
              ₹{kpis.mrr.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400">Total MRR active</div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>Active Trials</span>
              <Users className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">
              {kpis.activeTrials}
            </div>
            <div className="text-[10px] text-slate-400">
              {kpis.expiringTrials > 0 ? (
                <span className="text-amber-600 font-bold">{kpis.expiringTrials} expiring &lt;72h</span>
              ) : (
                '0 expiring soon'
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>Overdue Invoices</span>
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">
              {kpis.overdueInvoicesCount}
            </div>
            <div className="text-[10px] text-slate-400">
              {kpis.overdueCurrency} {kpis.overdueInvoicesAmount.toLocaleString()} unpaid
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>Quote Pipeline</span>
              <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">
              {kpis.quotationPipelineCurrency} {kpis.quotationPipelineValue.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400">{kpis.pendingQuotesCount} pending quotes</div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-1 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>Support Queue</span>
              <Activity className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">
              {kpis.openTicketsCount} Open
            </div>
            <div className="text-[10px] text-slate-400">
              {kpis.criticalTicketsCount > 0 ? (
                <span className="text-rose-600 font-bold">{kpis.criticalTicketsCount} critical SLA</span>
              ) : (
                'All SLAs within 24h'
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* THE 4 AI AGENTS TEAM ROSTER                                   */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-600" />
              <span>AI Executive Team Roster</span>
            </h2>
            <p className="text-[11px] text-slate-500">Autonomous roles running QuoteFlow operations.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {agents.map((agent) => {
            const hasPending = agent.stats.pendingApprovals > 0;
            return (
              <div
                key={agent.id}
                className={`rounded-2xl border p-4 space-y-3 transition-all hover:shadow-md ${
                  hasPending
                    ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shadow-xs">
                      {agent.avatar}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">{agent.name}</h3>
                      <p className="text-[10px] text-slate-500 font-medium">{agent.title}</p>
                    </div>
                  </div>
                  <Badge
                    className={`text-[9px] uppercase font-bold ${
                      agent.status === 'action_required'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                    }`}
                  >
                    {agent.status === 'action_required' ? 'Action' : 'Active'}
                  </Badge>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                  {agent.statusMessage}
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Specializations:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agent.specialization.slice(0, 2).map((s, i) => (
                      <span
                        key={i}
                        className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[10px] text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{agent.stats.tasksCompleted}</span> tasks done
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openAgentChat(agent)}
                    className="text-[11px] h-7 px-2 font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg flex items-center gap-1"
                  >
                    <span>Chat</span>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* HUMAN FOUNDER APPROVAL QUEUE                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Human Founder Approval Queue
              </h2>
              {pendingApprovalsCount > 0 && (
                <Badge className="bg-indigo-600 text-white text-[10px] font-bold px-2">
                  {pendingApprovalsCount} Action{pendingApprovalsCount > 1 ? 's' : ''} Pending
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              The AI proposes high-impact customer acquisition & financial actions. You hold 100% control.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                  filterStatus === st
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {filteredApprovals.length === 0 ? (
          <div className="text-center py-10 space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Queue Clean — Zero {filterStatus === 'ALL' ? '' : filterStatus.toLowerCase()} approvals
            </p>
            <p className="text-[11px] text-slate-400">
              Click &quot;Run AI Team Cycle Now&quot; to generate fresh action proposals based on current data.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredApprovals.map((appr) => {
              const agent = agents.find((a) => a.id === appr.agentId);
              const isActionLoading = actionLoadingId === appr.id;

              return (
                <div
                  key={appr.id}
                  className={`rounded-xl border p-4 transition-all ${
                    appr.status === 'PENDING'
                      ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/10 dark:bg-indigo-950/10'
                      : appr.status === 'APPROVED'
                      ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/10'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 opacity-75'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base">{agent?.avatar || '🤖'}</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {agent?.name} ({agent?.title})
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                          {appr.actionType.replace(/_/g, ' ')}
                        </Badge>
                        {appr.targetCount && (
                          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px]">
                            {appr.targetCount} Targets
                          </Badge>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            appr.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : appr.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {appr.status}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{appr.title}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {appr.summary}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                        <span>{appr.estimatedImpact}</span>
                      </div>

                      {appr.founderNotes && (
                        <div className="text-[11px] text-slate-500 italic pt-1">
                          Founder note: &quot;{appr.founderNotes}&quot;
                        </div>
                      )}
                    </div>

                    {/* Action Buttons for Pending Approvals */}
                    {appr.status === 'PENDING' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          disabled={isActionLoading}
                          onClick={() => handleApprove(appr.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-lg flex items-center gap-1 shadow-xs"
                        >
                          {isActionLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          <span>Approve &amp; Dispatch</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isActionLoading}
                          onClick={() => openRejectModal(appr.id)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs h-8 px-2.5 rounded-lg border-slate-200"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Decline</span>
                        </Button>
                      </div>
                    )}

                    {/* View Results for Approved Actions */}
                    {appr.status === 'APPROVED' && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Dispatched Live
                        </span>
                        {appr.executionResult && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCurrentExecutionResult(appr.executionResult);
                              setCurrentExecutionTitle(appr.executionResult.title || appr.title);
                              setExecutionModalOpen(true);
                            }}
                            className="text-xs h-8 px-3 rounded-lg border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 font-semibold flex items-center gap-1.5"
                          >
                            <span>View Links &amp; WhatsApp</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* AGENT ACTIVITY AUDIT LOG                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-600" />
            <span>Autonomous Activity Stream</span>
          </h2>
          <span className="text-[11px] text-slate-400">Chronological telemetry</span>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {logs.slice(0, 8).map((log) => {
            const agent = agents.find((a) => a.id === log.agentId);
            return (
              <div
                key={log.id}
                className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-sm">{agent?.avatar || '🤖'}</span>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {log.message}
                    </div>
                    {log.details && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{log.details}</div>
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CHAT WITH AGENT                                        */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={chatModalOpen}
        onClose={() => setChatModalOpen(false)}
        title={
          activeChatAgent
            ? `Direct Dialogue: ${activeChatAgent.name} (${activeChatAgent.title})`
            : 'Agent Chat'
        }
      >
        <div className="space-y-4">
          {activeChatAgent && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-xs text-indigo-800 dark:text-indigo-200">
              <span className="text-xl">{activeChatAgent.avatar}</span>
              <div className="flex-1">
                <div className="font-bold">{activeChatAgent.role}</div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400">
                  Model: {activeChatAgent.model} • Ready to advise
                </div>
              </div>
            </div>
          )}

          {/* Quick Questions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeChatAgent?.id === 'growth' && (
              <>
                <button
                  type="button"
                  onClick={() => handleSendChatMessage('How do we convert the next 10 trial users into paid customers?')}
                  className="text-[10px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Convert 10 trials &rarr;
                </button>
                <button
                  type="button"
                  onClick={() => handleSendChatMessage('What WhatsApp campaign should we run for UAE clients?')}
                  className="text-[10px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  UAE WhatsApp push &rarr;
                </button>
              </>
            )}
            {activeChatAgent?.id === 'finance' && (
              <>
                <button
                  type="button"
                  onClick={() => handleSendChatMessage('What is our current overdue invoice aging and risk?')}
                  className="text-[10px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Overdue aging &rarr;
                </button>
                <button
                  type="button"
                  onClick={() => handleSendChatMessage('Are our invoices 100% compliant with UAE PINT-AE and India GST?')}
                  className="text-[10px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Tax compliance check &rarr;
                </button>
              </>
            )}
            {activeChatAgent?.id === 'ceo' && (
              <>
                <button
                  type="button"
                  onClick={() => handleSendChatMessage('What are our top 3 growth levers this quarter?')}
                  className="text-[10px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Top 3 growth levers &rarr;
                </button>
              </>
            )}
          </div>

          {/* Conversation history */}
          <div className="space-y-3 max-h-72 overflow-y-auto p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl max-w-md ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white ml-auto'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>
                <div
                  className={`text-[9px] mt-1 ${
                    msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span>Agent is formulating strategic response...</span>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChatMessage();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Ask ${activeChatAgent?.name || 'Agent'} a direct question...`}
              className="text-xs"
            />
            <Button
              type="submit"
              disabled={isChatLoading || !chatInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              Send
            </Button>
          </form>
        </div>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: LIVE ACTION EXECUTION RESULTS                          */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={executionModalOpen}
        onClose={() => setExecutionModalOpen(false)}
        title={currentExecutionTitle || 'Action Execution Details'}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            <div>
              <div className="text-xs font-bold">Action Executed Live in Production</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                {currentExecutionResult?.title || 'Your instruction has been processed across QuoteFlow.'}
              </div>
            </div>
          </div>

          {/* Case 1: Campaign Dispatched */}
          {currentExecutionResult?.type === 'CAMPAIGN_DISPATCHED' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {currentExecutionResult.campaignName}
                  </span>
                  <Badge className="bg-indigo-600 text-white text-[10px]">
                    {currentExecutionResult.totalRecipients} Targets
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 italic p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  &quot;{currentExecutionResult.messagePreview}&quot;
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                  <span>1-Tap WhatsApp Direct Dispatch:</span>
                  <span className="text-[10px] text-slate-400">Click to open chat with prefilled pitch</span>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {currentExecutionResult.whatsappLinks?.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</div>
                        <div className="text-[10px] text-slate-400">{item.phone}</div>
                      </div>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                      >
                        <Send className="h-3 w-3" />
                        <span>Send WhatsApp</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Case 2: Trials Extended */}
          {currentExecutionResult?.type === 'TRIALS_EXTENDED' && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Extended Businesses ({currentExecutionResult.extendedCount}):
              </div>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {currentExecutionResult.businesses?.map((b: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{b.name}</div>
                      <div className="text-[10px] text-slate-400">Database subscription updated</div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px]">
                      New End: {b.newEnd}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Case 3: Payment Reminders Generated */}
          {currentExecutionResult?.type === 'PAYMENT_REMINDERS_GENERATED' && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Overdue Invoices ({currentExecutionResult.totalReminders}):
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {currentExecutionResult.reminders?.map((rem: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {rem.invoiceNumber} — {rem.customerName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Amount: {rem.currency} {rem.amount}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={rem.whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs"
                      >
                        <Send className="h-3 w-3" />
                        <span>WhatsApp Reminder</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Case 4: Tax Audit Ready */}
          {currentExecutionResult?.type === 'TAX_AUDIT_READY' && (
            <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Audit Summary: {currentExecutionResult.invoicesCount} Invoices
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300">
                Total Invoiced: AED/INR {currentExecutionResult.totalAmount?.toLocaleString()}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Badge className="bg-emerald-600 text-white text-[10px]">
                  {currentExecutionResult.uaeStatus}
                </Badge>
                <Badge className="bg-blue-600 text-white text-[10px]">
                  {currentExecutionResult.indiaStatus}
                </Badge>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setExecutionModalOpen(false)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              Done &amp; Close
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Decline AI Proposal"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Please provide a brief reason for declining this proposal. The AI agent will learn from your feedback for future cycles.
          </p>

          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Price discount is too high, or timing is not right"
            className="text-xs"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReject}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              Confirm Decline
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
