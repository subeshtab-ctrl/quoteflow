import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { store } from '@/lib/supabase/data-store';
import { getWelcomeConfig, getBusinessSetupStatus } from '@/lib/welcome/welcome-service';

export const dynamic = 'force-dynamic';

async function getAuthContext() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, orgId: null, role: null };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, orgId: null, role: null };

  const member = await store.getOrganizationMemberByUser(user.id);
  const orgId =
    member?.organization_id ||
    user.user_metadata?.organization_id ||
    user.app_metadata?.organization_id ||
    null;
  const role = member?.role || user.user_metadata?.role || 'OWNER';

  return { user, orgId, role };
}

export async function GET(req: NextRequest) {
  try {
    const { user, orgId, role } = await getAuthContext();
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized or no workspace found' }, { status: 401 });
    }

    const org = await store.getOrganization(orgId);
    const config = getWelcomeConfig();
    const setupStatus = await getBusinessSetupStatus(orgId);

    // Retrieve quotations & customers to evaluate checklist progress
    const quotes = (await store.getQuotations(orgId)) || [];
    const customers = (await store.getCustomers(orgId)) || [];

    const hasCreatedQuote = quotes.length > 0;
    const hasSentQuote = quotes.some((q) => q.status === 'SENT' || q.status === 'APPROVED' || q.status === 'COMPLETED');
    const hasApprovedQuote = quotes.some((q) => q.status === 'APPROVED' || q.status === 'COMPLETED');
    const hasCustomer = customers.length > 0;
    const isProfileComplete = setupStatus.overallPercent >= 70;

    const checklist = [
      { id: 'account_created', label: 'Create Account', completed: true, required: true },
      { id: 'business_profile', label: 'Complete Business Profile', completed: isProfileComplete, required: true },
      { id: 'add_customer', label: 'Add First Customer', completed: hasCustomer, required: true },
      { id: 'create_quote', label: 'Create First Quote', completed: hasCreatedQuote, required: true },
      { id: 'send_quote', label: 'Send Quote to Client', completed: hasSentQuote, required: false },
    ];

    const completedStepsCount = checklist.filter((c) => c.completed).length;
    const allCompleted = completedStepsCount === checklist.length;

    const aiWelcomeSeen = Boolean((org as any)?.ai_welcome_seen);
    const checklistDismissed = Boolean((org as any)?.onboarding_checklist_dismissed);

    return NextResponse.json({
      success: true,
      aiWelcomeConfig: config.aiWelcome,
      aiWelcomeSeen,
      checklistDismissed,
      setupStatus,
      checklist,
      checklistStats: {
        completed: completedStepsCount,
        total: checklist.length,
        allCompleted,
        hasApprovedQuote,
      },
      ownerName:
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        (user?.email ? user.email.split('@')[0] : 'Business Owner'),
      businessName: org?.name || 'Your Company',
      role,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, orgId } = await getAuthContext();
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized or no workspace found' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'mark_ai_welcome_seen') {
      await store.updateOrganization(orgId, {
        ai_welcome_seen: true,
        ai_welcome_seen_at: new Date().toISOString(),
      } as any);

      return NextResponse.json({ success: true, ai_welcome_seen: true });
    }

    if (action === 'dismiss_checklist') {
      await store.updateOrganization(orgId, {
        onboarding_checklist_dismissed: true,
      } as any);

      return NextResponse.json({ success: true, onboarding_checklist_dismissed: true });
    }

    if (action === 'get_setup_advice') {
      const setup = await getBusinessSetupStatus(orgId);
      return NextResponse.json({ success: true, setup });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
