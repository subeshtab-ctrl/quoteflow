import { NextRequest, NextResponse } from 'next/server';
import { getAdminActorContext, getAdminOpsStore } from '@/lib/billing/dev-admin-auth';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const actor = await getAdminActorContext(req);
    if (!actor.authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const prompt = (body.prompt || '').trim();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const q = prompt.toLowerCase();
    const [stats, mrrData, { subscribers }, tickets] = await Promise.all([
      store.getSubscriptionStats(),
      store.calculateMRR(),
      store.getAllSubscribers({ limit: 500 }),
      store.getSupportTickets(),
    ]);
    const ops = getAdminOpsStore();
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const openTickets = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed');
    const overdueTickets = openTickets.filter((t) => now - new Date(t.created_at).getTime() > 24 * 3600 * 1000);
    const expiringTrials = subscribers.filter((s) => {
      if (s.status !== 'trialing' || !s.trial_end_at) return false;
      const days = Math.ceil((new Date(s.trial_end_at).getTime() - now) / 86400000);
      return days >= 0 && days <= 3;
    });
    const failedSubList = subscribers.filter(
      (s) => s.status === 'past_due' || s.status === 'grace_period' || s.status === 'halted'
    );
    const todaySignups = subscribers.filter(
      (s) => new Date(s.organization?.created_at || s.created_at).getTime() >= startOfToday.getTime()
    );
    const activePaidSubs = subscribers.filter((s) => s.status === 'active' || s.is_trial_prepaid);

    let reply = '';
    let suggestedActions: Array<{
      label: string;
      section: string;
      subTab?: string;
      businessId?: string;
    }> = [];

    if (q.includes('trial') && (q.includes('expir') || q.includes('end') || q.includes('soon') || q.includes('3 day'))) {
      reply =
        expiringTrials.length > 0
          ? `Found **${expiringTrials.length} trial business(es)** expiring within 3 days:\n\n` +
            expiringTrials
              .slice(0, 8)
              .map(
                (s) =>
                  `• **${s.organization?.name || s.business_id}** (${s.organization?.email || 'No email'}) — Ends ${new Date(
                    s.trial_end_at!
                  ).toLocaleDateString()}`
              )
              .join('\n') +
            `\n\nYou can extend their trial (+3, +7, or +14 days) or apply a conversion promotion from Business 360.`
          : `There are currently **0 trials** expiring within the next 3 days across **${stats.trialBusinesses} active free trials**.`;
      suggestedActions = [
        { label: 'Open Trials Queue', section: 'businesses', subTab: 'trials' },
        { label: 'View Trial Conversion Funnel', section: 'growth', subTab: 'trials' },
      ];
    } else if (q.includes('fail') || q.includes('past due') || q.includes('overdue payment')) {
      reply =
        failedSubList.length > 0
          ? `There are **${failedSubList.length} business(es)** with payment failures or grace period status:\n\n` +
            failedSubList
              .slice(0, 8)
              .map(
                (s) =>
                  `• **${s.organization?.name || s.business_id}** — Status: \`${s.status}\` (Failures: ${
                    s.payment_failure_count || 1
                  })`
              )
              .join('\n')
          : `All recurring subscriptions are healthy! There are **0 failed or past-due payments** right now. Active MRR is **₹${mrrData.mrr.toLocaleString('en-IN')}**.`;
      suggestedActions = [
        { label: 'Open Payment Failures', section: 'revenue', subTab: 'failures' },
        { label: 'Inspect Razorpay Webhooks', section: 'operations', subTab: 'webhooks' },
      ];
    } else if (q.includes('ticket') || q.includes('support') || q.includes('sla')) {
      reply =
        `### Support Queue Snapshot\n` +
        `• **Open Tickets:** ${openTickets.length}\n` +
        `• **Tickets > 24 Hours:** ${overdueTickets.length}\n` +
        `• **Total Tickets Logged:** ${tickets.length}\n\n` +
        (openTickets.length > 0
          ? `Most recent open tickets:\n` +
            openTickets
              .slice(0, 5)
              .map(
                (t) =>
                  `• **${t.ticket_number}** — *${t.subject}* (${(t as any).business_name || t.business_id}) [${t.priority.toUpperCase()}]`
              )
              .join('\n')
          : `All customer support tickets are currently resolved.`);
      suggestedActions = [
        { label: 'Open Support Tickets', section: 'support', subTab: 'tickets' },
        { label: 'Check Support SLA', section: 'support', subTab: 'sla' },
      ];
    } else if (q.includes('mrr') || q.includes('revenue') || q.includes('arr') || q.includes('paid')) {
      const arr = (mrrData.mrr || 0) * 12;
      reply =
        `### QuoteFlow Revenue & MRR Summary\n` +
        `• **Current MRR:** ₹${(mrrData.mrr || 0).toLocaleString('en-IN')}\n` +
        `• **Annualized Run Rate (ARR):** ₹${arr.toLocaleString('en-IN')}\n` +
        `• **Active Paid Subscribers:** ${stats.activeSubscribers} (${activePaidSubs.map((s) => s.organization?.name || s.business_id).slice(0, 5).join(', ') || 'None'})\n` +
        `• **Active Free Trials:** ${stats.trialBusinesses}\n` +
        `• **Refunds Processed:** ${ops.refunds.length}`;
      suggestedActions = [
        { label: 'View MRR / ARR Breakdown', section: 'revenue', subTab: 'mrr' },
        { label: 'View Transactions', section: 'revenue', subTab: 'transactions' },
      ];
    } else if (q.includes('today') || q.includes('signup') || q.includes('new business')) {
      reply =
        `• **New Signups Today:** ${todaySignups.length}\n` +
        `• **Total Businesses on Platform:** ${stats.totalBusinesses}\n\n` +
        `Most recent registered businesses:\n` +
        subscribers
          .slice(0, 6)
          .map(
            (s) =>
              `• **${s.organization?.name || s.business_id}** (${s.organization?.country || 'India'}) — \`${s.status}\``
          )
          .join('\n');
      suggestedActions = [{ label: 'View All Businesses', section: 'businesses', subTab: 'all' }];
    } else if (q.includes('announcement') || q.includes('draft')) {
      reply =
        `### Draft In-App Announcement Ready\n` +
        `**Title:** Upgrade to QuoteFlow Pro — Lock in ₹149/month\n` +
        `**Audience:** Expiring Free Trials\n` +
        `**Message:** Your 14-day QuoteFlow trial is concluding soon. Upgrade in 1 click to keep unlimited GST quotations, invoices, PDF exports, and AI Copilot active.\n` +
        `**CTA:** Upgrade Now → \`/billing\`\n\n` +
        `Click below to review and publish this in Growth → Announcements.`;
      suggestedActions = [{ label: 'Open Announcements', section: 'growth', subTab: 'announcements' }];
    } else {
      reply =
        `### QuoteFlow Admin Copilot Live Intelligence\n` +
        `Here is the live operational snapshot across **${stats.totalBusinesses} businesses**:\n\n` +
        `• **MRR / ARR:** ₹${(mrrData.mrr || 0).toLocaleString('en-IN')} MRR / ₹${((mrrData.mrr || 0) * 12).toLocaleString('en-IN')} ARR\n` +
        `• **Active Paid Subscribers:** ${stats.activeSubscribers}\n` +
        `• **Active Free Trials:** ${stats.trialBusinesses} (${expiringTrials.length} ending within 3 days)\n` +
        `• **Open Support Tickets:** ${openTickets.length} (${overdueTickets.length} > 24h)\n` +
        `• **System & Webhook Health:** ${
          ops.webhookEvents.some((w) => w.status === 'failed') ? 'Attention Needed' : 'All 11 Services Healthy'
        }\n\n` +
        `Ask me about *expiring trials, failed payments, MRR changes, overdue tickets, inactive businesses,* or *drafting announcements*.`;
      suggestedActions = [
        { label: 'Attention Required', section: 'overview', subTab: 'attention' },
        { label: 'Explore Customer 360', section: 'businesses', subTab: 'all' },
        { label: 'System Health', section: 'operations', subTab: 'health' },
      ];
    }

    return NextResponse.json({
      success: true,
      reply,
      suggestedActions,
      actor: { name: actor.name, roleLabel: actor.roleLabel },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
