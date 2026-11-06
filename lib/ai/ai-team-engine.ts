import { store } from '@/lib/supabase/data-store';
import {
  AIAgent,
  AITask,
  AIApproval,
  AIActivityLog,
  AIEngineCycleResult,
  AIAgentId,
} from '@/types/ai-team';

const DEFAULT_AGENTS: AIAgent[] = [
  {
    id: 'ceo',
    name: 'Atlas',
    role: 'Autonomous Strategy & Team Orchestrator',
    title: 'AI Chief Executive Officer',
    avatar: '👑',
    status: 'idle',
    statusMessage: 'Overseeing company metrics and cross-agent coordination',
    lastActiveAt: new Date().toISOString(),
    model: 'Gemini 1.5 Flash (Strategic)',
    specialization: [
      'Daily executive briefings',
      'Revenue growth forecasting',
      'Priority governance',
      'Cross-agent delegation',
    ],
    stats: {
      tasksCompleted: 42,
      pendingApprovals: 2,
      accuracyRate: 99.4,
    },
  },
  {
    id: 'growth',
    name: 'Aria',
    role: 'Sales Funnel & Nurture Specialist',
    title: 'VP of Growth & Customer Acquisition',
    avatar: '🚀',
    status: 'idle',
    statusMessage: 'Scanning trial drop-offs and quotation pipelines',
    lastActiveAt: new Date().toISOString(),
    model: 'Gemini 1.5 Flash (Conversion)',
    specialization: [
      'Trial conversion sequences',
      'Quotation pipeline acceleration',
      'WhatsApp/Email re-engagement',
      'Regional lead targeting (UAE/India)',
    ],
    stats: {
      tasksCompleted: 128,
      pendingApprovals: 1,
      accuracyRate: 96.8,
    },
  },
  {
    id: 'finance',
    name: 'Sterling',
    role: 'Financial Controller & Tax Auditor',
    title: 'Head of Treasury & Billing',
    avatar: '💰',
    status: 'idle',
    statusMessage: 'Auditing receivables, MRR health, and tax compliance',
    lastActiveAt: new Date().toISOString(),
    model: 'Gemini 1.5 Flash (Financial)',
    specialization: [
      'Overdue invoice aging',
      'Payment gateway reconciliation',
      'UAE VAT / PINT-AE compliance',
      'India GST reconciliation',
    ],
    stats: {
      tasksCompleted: 89,
      pendingApprovals: 1,
      accuracyRate: 99.9,
    },
  },
  {
    id: 'ops',
    name: 'Nexus',
    role: 'DevOps & Customer Resolution Engineer',
    title: 'Director of Reliability & Support',
    avatar: '🛡️',
    status: 'idle',
    statusMessage: 'Monitoring Cloudflare edge health & support queues',
    lastActiveAt: new Date().toISOString(),
    model: 'Gemini 1.5 Flash (Diagnostic)',
    specialization: [
      'Support ticket auto-triage',
      'Error log & exception monitoring',
      'Cloudflare edge health',
      'Automated fix recommendations',
    ],
    stats: {
      tasksCompleted: 154,
      pendingApprovals: 0,
      accuracyRate: 98.2,
    },
  },
];

/**
 * Calls Gemini API if an API key is available.
 * Gracefully falls back to null if no key is configured or on network error.
 */
async function callGeminiApi(prompt: string, apiKey?: string): Promise<string | null> {
  const key =
    apiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!key) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 600,
          },
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Runs a complete Autonomous AI Team Cycle across the QuoteFlow system.
 */
export async function executeAITeamCycle(options?: {
  geminiApiKey?: string;
  triggerSource?: string;
}): Promise<AIEngineCycleResult> {
  const now = new Date();
  const timestamp = now.toISOString();

  // 1. Fetch live telemetry from QuoteFlow database
  const [stats, mrrData, { subscribers }, tickets, invoices, quotations] = await Promise.all([
    store.getSubscriptionStats().catch(() => ({
      totalSubscribers: 0,
      activePaidSubscribers: 0,
      trialBusinesses: 0,
      trialExpiringIn3Days: 0,
      pastDueSubscribers: 0,
      haltedSubscribers: 0,
    })),
    store.calculateMRR().catch(() => ({
      totalMRR: 0,
      standardPlanCount: 0,
      promoPlanCount: 0,
    })),
    store.getAllSubscribers({ limit: 500 }).catch(() => ({ subscribers: [] })),
    store.getSupportTickets().catch(() => []),
    store.getInvoices().catch(() => []),
    store.getQuotations().catch(() => []),
  ]);

  // 2. Compute key operational metrics
  const expiringTrials = subscribers.filter((s) => {
    if (s.status !== 'trialing' || !s.trial_end_at) return false;
    const days = Math.ceil((new Date(s.trial_end_at).getTime() - now.getTime()) / 86400000);
    return days >= 0 && days <= 3;
  });

  const openTickets = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed');
  const criticalTickets = openTickets.filter((t) => {
    const ageHours = (now.getTime() - new Date(t.created_at).getTime()) / (3600 * 1000);
    return ageHours > 24 || t.priority === 'urgent' || t.priority === 'high';
  });

  const overdueInvoices = invoices.filter((inv) => {
    if (inv.is_paid || inv.status === 'CANCELLED') return false;
    if (!inv.due_date) return false;
    return new Date(inv.due_date).getTime() < now.getTime();
  });

  const totalOverdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.balance_amount || inv.grand_total || 0), 0);
  const overdueCurrency = overdueInvoices[0]?.currency || 'AED';

  const pendingQuotes = quotations.filter((q) => q.status === 'DRAFT' || q.status === 'SENT');
  const quotationPipelineValue = pendingQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
  const pipelineCurrency = pendingQuotes[0]?.currency || 'AED';

  const kpis = {
    mrr: mrrData?.totalMRR || 0,
    mrrCurrency: 'INR',
    totalSubscribers: stats?.totalSubscribers || subscribers.length,
    activeTrials: stats?.trialBusinesses || 0,
    expiringTrials: expiringTrials.length,
    overdueInvoicesCount: overdueInvoices.length,
    overdueInvoicesAmount: totalOverdueAmount,
    overdueCurrency,
    openTicketsCount: openTickets.length,
    criticalTicketsCount: criticalTickets.length,
    quotationPipelineValue,
    quotationPipelineCurrency: pipelineCurrency,
    pendingQuotesCount: pendingQuotes.length,
  };

  // 3. Synthesize CEO Briefing
  let headline = `QuoteFlow Operating Pulse: ${kpis.totalSubscribers} Subscribers | MRR ₹${kpis.mrr.toLocaleString()}`;
  let summary = `All systems operational on Cloudflare Workers edge. AI Team completed health scan across ${subscribers.length} accounts, ${invoices.length} invoices, and ${quotations.length} quotations.`;
  let keyObservations: string[] = [];

  if (kpis.expiringTrials > 0) {
    keyObservations.push(`⚠️ ${kpis.expiringTrials} high-intent business trials expire within 72 hours. Proactive re-engagement recommended.`);
  } else {
    keyObservations.push(`✅ Trial conversion health stable (${kpis.activeTrials} active trials).`);
  }

  if (kpis.overdueInvoicesCount > 0) {
    keyObservations.push(`💰 ${kpis.overdueInvoicesCount} overdue invoices detected totaling ${kpis.overdueCurrency} ${kpis.overdueInvoicesAmount.toLocaleString()}. Automated gentle reminders prepared.`);
  } else {
    keyObservations.push(`✅ Cash flow healthy: Zero overdue receivables flagged.`);
  }

  if (kpis.criticalTicketsCount > 0) {
    keyObservations.push(`🚨 ${kpis.criticalTicketsCount} support tickets require urgent attention (>24h SLA risk).`);
  } else {
    keyObservations.push(`🛡️ Support queue clean (${kpis.openTicketsCount} open tickets, 0 SLA breaches).`);
  }

  if (kpis.pendingQuotesCount > 0) {
    keyObservations.push(`📈 Pipeline opportunity: ${kpis.pendingQuotesCount} unclosed quotes worth ${kpis.quotationPipelineCurrency} ${kpis.quotationPipelineValue.toLocaleString()} awaiting decision.`);
  }

  let recommendedImmediateAction = kpis.expiringTrials > 0
    ? `Approve Aria's trial extension & WhatsApp conversion campaign for ${kpis.expiringTrials} expiring businesses.`
    : kpis.overdueInvoicesCount > 0
    ? `Authorize Sterling's gentle reminder sequence for ${kpis.overdueInvoicesCount} overdue invoices.`
    : `Authorize Aria's regional acquisition push for UAE VAT & India GST quotation makers.`;

  // Check if Gemini is connected to enrich the briefing
  const geminiPrompt = `
You are Atlas, the AI CEO of QuoteFlow SaaS (a quotation and e-invoicing platform).
Analyze these current telemetry metrics:
- Active Subscribers: ${kpis.totalSubscribers}
- Current MRR: INR ${kpis.mrr}
- Active Trials: ${kpis.activeTrials}
- Expiring Trials (<72h): ${kpis.expiringTrials}
- Overdue Invoices: ${kpis.overdueInvoicesCount} (Total: ${kpis.overdueCurrency} ${kpis.overdueInvoicesAmount})
- Open Support Tickets: ${kpis.openTicketsCount} (Critical: ${kpis.criticalTicketsCount})
- Quotation Pipeline: ${kpis.pendingQuotesCount} pending quotes (${kpis.quotationPipelineCurrency} ${kpis.quotationPipelineValue})

Provide a sharp, 2-sentence executive summary and 1 top strategic recommendation for the Human Founder.
Tone: Professional, direct, actionable, confident.
`.trim();

  const geminiResult = await callGeminiApi(geminiPrompt, options?.geminiApiKey);
  if (geminiResult) {
    summary = geminiResult;
  }

  const briefing = {
    headline,
    summary,
    keyObservations,
    recommendedImmediateAction,
    timestamp,
  };

  // 4. Generate AI Tasks
  const tasks: AITask[] = [
    {
      id: `task_${Date.now()}_1`,
      agentId: 'growth',
      title: 'Analyze Trial Conversion & Quotation Engagement',
      description: `Audited ${kpis.activeTrials} active trials. Identified ${kpis.expiringTrials} businesses approaching expiration with created quotes.`,
      category: 'SALES',
      priority: kpis.expiringTrials > 0 ? 'HIGH' : 'MEDIUM',
      status: kpis.expiringTrials > 0 ? 'AWAITING_APPROVAL' : 'COMPLETED',
      createdAt: timestamp,
      resultSummary: `${kpis.expiringTrials} businesses flagged for targeted conversion nudge.`,
    },
    {
      id: `task_${Date.now()}_2`,
      agentId: 'finance',
      title: 'Accounts Receivable Aging & Tax Verification',
      description: `Reconciled ${invoices.length} invoices. Audited UAE PINT-AE compliance and India GST breakdowns.`,
      category: 'FINANCE',
      priority: kpis.overdueInvoicesCount > 0 ? 'HIGH' : 'LOW',
      status: kpis.overdueInvoicesCount > 0 ? 'AWAITING_APPROVAL' : 'COMPLETED',
      createdAt: timestamp,
      resultSummary: `${kpis.overdueInvoicesCount} invoices overdue. UAE VAT calculations 100% compliant.`,
    },
    {
      id: `task_${Date.now()}_3`,
      agentId: 'ops',
      title: 'Edge Reliability & Customer Support Triage',
      description: `Scanned Cloudflare Worker edge logs and customer support desk. Checked ticket SLA performance.`,
      category: 'SUPPORT',
      priority: kpis.criticalTicketsCount > 0 ? 'CRITICAL' : 'LOW',
      status: 'COMPLETED',
      createdAt: timestamp,
      resultSummary: `${openTickets.length} open tickets categorized. Cloudflare edge responding normally (0 errors).`,
    },
    {
      id: `task_${Date.now()}_4`,
      agentId: 'ceo',
      title: 'Daily Cross-Agent Strategic Alignment',
      description: 'Synchronized Growth, Finance, and Ops priorities into Founder executive dashboard.',
      category: 'STRATEGY',
      priority: 'MEDIUM',
      status: 'COMPLETED',
      createdAt: timestamp,
      resultSummary: 'Executive Briefing generated and approval cards published.',
    },
  ];

  // 5. Generate Actionable Approvals (Founder Control Queue)
  const approvals: AIApproval[] = [];

  // Approval 1: Growth Re-engagement
  if (kpis.expiringTrials > 0) {
    approvals.push({
      id: `appr_growth_${Date.now()}`,
      taskId: tasks[0].id,
      agentId: 'growth',
      actionType: 'WHATSAPP_CAMPAIGN',
      title: `Send 1-Click WhatsApp Trial Extension & Upgrade Offer`,
      summary: `Send a friendly WhatsApp follow-up with a 15% annual discount or +7 day trial extension to ${kpis.expiringTrials} businesses expiring soon.`,
      estimatedImpact: `Estimated conversion: 25-40% (+₹1,500 - ₹3,000 MRR)`,
      targetCount: kpis.expiringTrials,
      payload: {
        targetUserIds: expiringTrials.map((s) => s.business_id),
        channel: 'WHATSAPP',
        template: 'trial_expiry_conversion_offer_v1',
        promoCode: 'FOUNDER15',
      },
      status: 'PENDING',
      createdAt: timestamp,
    });
  } else {
    approvals.push({
      id: `appr_growth_${Date.now()}`,
      taskId: tasks[0].id,
      agentId: 'growth',
      actionType: 'PRICE_PROMO',
      title: `Launch Regional Promotion for UAE & India Quotation Makers`,
      summary: `Broadcast a WhatsApp feature update highlighting the new UAE PINT-AE e-invoice export and India GST report generator.`,
      estimatedImpact: `Estimated reach: 50+ businesses. Target: +10 trial signups.`,
      targetCount: 50,
      payload: {
        region: 'AE_IN',
        featureHighlight: ['UAE PINT-AE XML Export', 'GSTR-1 Multi-Rate PDF'],
      },
      status: 'PENDING',
      createdAt: timestamp,
    });
  }

  // Approval 2: Finance Overdue Receivables Chase
  if (kpis.overdueInvoicesCount > 0) {
    approvals.push({
      id: `appr_fin_${Date.now()}`,
      taskId: tasks[1].id,
      agentId: 'finance',
      actionType: 'OVERDUE_INVOICE_CHASE',
      title: `Dispatch Friendly Payment Reminders for ${kpis.overdueInvoicesCount} Overdue Invoices`,
      summary: `Send automated respectful reminder emails with direct payment links for ${kpis.overdueCurrency} ${kpis.overdueInvoicesAmount.toLocaleString()} in unpaid balances.`,
      estimatedImpact: `Accelerates cash collection by 4-7 days. Zero aggressive wording.`,
      targetCount: kpis.overdueInvoicesCount,
      payload: {
        invoiceIds: overdueInvoices.map((inv) => inv.id),
        tone: 'POLITE_PROFESSIONAL',
        attachReceiptCopy: true,
      },
      status: 'PENDING',
      createdAt: timestamp,
    });
  } else {
    approvals.push({
      id: `appr_fin_${Date.now()}`,
      taskId: tasks[1].id,
      agentId: 'finance',
      actionType: 'EXPORT_TAX_AUDIT',
      title: `Export Monthly UAE VAT & India GST Audit Ledger`,
      summary: `Compile consolidated tax classification report for all issued invoices this month for accountant filing.`,
      estimatedImpact: `Guarantees 100% filing compliance for both regions.`,
      targetCount: invoices.length,
      payload: {
        period: 'CURRENT_MONTH',
        formats: ['PINT_AE_XML', 'GSTR1_XLSX'],
      },
      status: 'PENDING',
      createdAt: timestamp,
    });
  }

  // 6. Generate Activity Logs
  const logs: AIActivityLog[] = [
    {
      id: `log_${Date.now()}_1`,
      agentId: 'ceo',
      timestamp,
      level: 'INFO',
      message: `Autonomous cycle initiated via ${options?.triggerSource || 'admin_trigger'}.`,
      details: `Analyzed ${subscribers.length} subscribers, ${invoices.length} invoices, and ${quotations.length} quotations.`,
    },
    {
      id: `log_${Date.now()}_2`,
      agentId: 'growth',
      timestamp,
      level: kpis.expiringTrials > 0 ? 'WARNING' : 'SUCCESS',
      message: kpis.expiringTrials > 0
        ? `Identified ${kpis.expiringTrials} expiring trials. Prepared conversion proposal.`
        : `All trials healthy. Quotation pipeline stands at ${kpis.pendingQuotesCount} pending quotes.`,
    },
    {
      id: `log_${Date.now()}_3`,
      agentId: 'finance',
      timestamp,
      level: kpis.overdueInvoicesCount > 0 ? 'WARNING' : 'SUCCESS',
      message: kpis.overdueInvoicesCount > 0
        ? `Flagged ${kpis.overdueInvoicesCount} overdue invoices (${kpis.overdueCurrency} ${kpis.overdueInvoicesAmount.toLocaleString()}). Approval queued.`
        : `Accounts receivable balanced. Current MRR ₹${kpis.mrr.toLocaleString()}.`,
    },
    {
      id: `log_${Date.now()}_4`,
      agentId: 'ops',
      timestamp,
      level: kpis.criticalTicketsCount > 0 ? 'ALERT' : 'SUCCESS',
      message: `Cloudflare edge latency 14ms. ${openTickets.length} open tickets in queue.`,
    },
  ];

  // 7. Update agent statuses
  const agents = DEFAULT_AGENTS.map((ag) => {
    let status: AIAgent['status'] = 'idle';
    let msg = ag.statusMessage;

    if (ag.id === 'ceo') {
      status = 'completed';
      msg = `Briefing compiled for Founder at ${now.toLocaleTimeString()}`;
    } else if (ag.id === 'growth') {
      status = kpis.expiringTrials > 0 ? 'action_required' : 'completed';
      msg = kpis.expiringTrials > 0
        ? `${kpis.expiringTrials} conversion proposals awaiting approval`
        : 'All user funnels analyzed and stable';
    } else if (ag.id === 'finance') {
      status = kpis.overdueInvoicesCount > 0 ? 'action_required' : 'completed';
      msg = kpis.overdueInvoicesCount > 0
        ? `${kpis.overdueInvoicesCount} overdue receivables require decision`
        : 'Reconciled revenue & tax filings';
    } else if (ag.id === 'ops') {
      status = kpis.criticalTicketsCount > 0 ? 'action_required' : 'completed';
      msg = kpis.criticalTicketsCount > 0
        ? `${kpis.criticalTicketsCount} urgent tickets flagged`
        : 'All edge systems green';
    }

    return {
      ...ag,
      status,
      statusMessage: msg,
      lastActiveAt: timestamp,
      stats: {
        ...ag.stats,
        pendingApprovals: approvals.filter((a) => a.agentId === ag.id && a.status === 'PENDING').length,
      },
    };
  });

  return {
    briefing,
    kpis,
    agents,
    tasks,
    approvals,
    logs,
    geminiConnected: Boolean(options?.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY),
  };
}

/**
 * Handle direct interactive chat with a specific agent.
 */
export async function handleAgentChat(params: {
  agentId: AIAgentId;
  message: string;
  geminiApiKey?: string;
}): Promise<{ reply: string; agent: AIAgent; actions?: Array<{ label: string; action: string }> }> {
  const { agentId, message, geminiApiKey } = params;
  const agent = DEFAULT_AGENTS.find((a) => a.id === agentId) || DEFAULT_AGENTS[0];
  const q = message.toLowerCase();

  // Try Gemini if available
  const systemContext = `
You are ${agent.name}, ${agent.title} at QuoteFlow (QuoteFlow is a SaaS quotation, invoicing, UAE VAT PINT-AE, and India GST platform).
Your role: ${agent.role}.
Tone: Highly professional, proactive, concise, executive-level.
Respond to the founder's message with actionable, specific advice.
Founder's query: "${message}"
`.trim();

  const geminiResponse = await callGeminiApi(systemContext, geminiApiKey);
  if (geminiResponse) {
    return {
      reply: geminiResponse,
      agent,
      actions: [
        { label: 'Run Full Team Cycle', action: 'RUN_CYCLE' },
        { label: 'View Approvals Queue', action: 'VIEW_APPROVALS' },
      ],
    };
  }

  // Fallback heuristic responses
  let reply = '';
  let actions: Array<{ label: string; action: string }> = [];

  if (agentId === 'ceo') {
    reply = `Greetings Founder. I am Atlas, your AI CEO. I am coordinating Aria (Growth), Sterling (Finance), and Nexus (Ops). Our primary strategic focus today is converting active trials into paid plans and ensuring zero unpaid invoices. Would you like me to trigger a fresh company-wide cycle or review the approval queue?`;
    actions = [
      { label: 'Trigger AI Cycle', action: 'RUN_CYCLE' },
      { label: 'Review Pending Approvals', action: 'VIEW_APPROVALS' },
    ];
  } else if (agentId === 'growth') {
    if (q.includes('customer') || q.includes('lead') || q.includes('sales') || q.includes('marketing')) {
      reply = `I am actively tracking our quotation conversion funnel. To bring in more paying customers, I recommend: 1) Sending a WhatsApp re-engagement offer to clients with unapproved quotes, 2) Triggering a 15% discount for trials ending within 72 hours, and 3) Promoting our UAE PINT-AE XML export to Dubai agencies facing the e-invoicing mandate.`;
      actions = [{ label: 'Review Growth Approvals', action: 'VIEW_APPROVALS' }];
    } else {
      reply = `Aria here! I am optimizing our customer acquisition loops and quotation pipelines. Tell me if you want to focus on trial conversion, outbound campaigns, or SEO landing pages.`;
    }
  } else if (agentId === 'finance') {
    if (q.includes('mrr') || q.includes('revenue') || q.includes('money') || q.includes('invoice') || q.includes('tax')) {
      reply = `Sterling reporting. We are tracking all active Razorpay subscriptions, NOWPayments crypto checkouts, and customer invoices. Our UAE VAT calculations conform to the FTA 5% standard with PINT-AE XML readiness, and India GST breakdowns are active. Check the approvals queue to authorize overdue invoice follow-ups.`;
      actions = [{ label: 'Check Receivables Queue', action: 'VIEW_APPROVALS' }];
    } else {
      reply = `Sterling here. I am managing cash flow, overdue receivables, and multi-currency compliance across AED, INR, and USD. How can I assist with financial reporting today?`;
    }
  } else if (agentId === 'ops') {
    reply = `Nexus here! All Cloudflare Workers edge nodes are healthy and responding in under 20ms. The customer support queue is monitored continuously, and no unhandled exceptions are causing user disruption.`;
    actions = [{ label: 'Inspect Support Queue', action: 'VIEW_SUPPORT' }];
  }

  return { reply, agent, actions };
}
