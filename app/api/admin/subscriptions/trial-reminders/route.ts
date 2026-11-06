import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedDeveloperAdmin } from '@/lib/billing/dev-admin-auth';
import { subscriptionService } from '@/lib/billing/subscription-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const isCron = authHeader && process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isAdmin = await isAuthorizedDeveloperAdmin(req);

    if (!isCron && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Requires authorized developer admin or valid cron trigger.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const simulate = searchParams.get('simulate') === 'true';
    const milestoneParam = searchParams.get('milestones');
    const forceMilestoneDays = milestoneParam
      ? milestoneParam.split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n))
      : undefined;

    const result = await subscriptionService.processAllAutomatedTrialReminders({
      simulateOnly: simulate,
      forceMilestoneDays,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error('[Trial Reminder Automation Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to process trial reminders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const isCron = authHeader && process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isAdmin = await isAuthorizedDeveloperAdmin(req);

    if (!isCron && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Requires authorized developer admin or valid cron trigger.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const simulate = Boolean(body.simulateOnly);
    const forceMilestoneDays = Array.isArray(body.milestones)
      ? body.milestones.map((n: any) => Number(n)).filter((n: number) => !isNaN(n))
      : undefined;

    const result = await subscriptionService.processAllAutomatedTrialReminders({
      simulateOnly: simulate,
      forceMilestoneDays,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error('[Trial Reminder Automation Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to process trial reminders' }, { status: 500 });
  }
}
