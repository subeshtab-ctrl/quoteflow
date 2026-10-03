import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const customerId = searchParams.get('customerId') || undefined;
    const org = await store.getOrganization(orgId);
    const activeEnv = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';

    const invoices = await store.getInvoices(orgId, { status, search, customerId, environment: activeEnv });

    return NextResponse.json({ success: true, invoices });
  } catch (err: any) {
    console.error('Error fetching invoices:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

    // Enforce subscription restriction after 3-day grace period
    const access = await subscriptionService.getBusinessSubscriptionAccess(orgId);
    if (!access.allowed || access.isRestricted) {
      return NextResponse.json(
        {
          error: 'Your ₹99 subscription payment is overdue. Please complete payment to restore full QuoteFlow access.',
          code: 'SUBSCRIPTION_RESTRICTED',
          access,
        },
        { status: 402 }
      );
    }

    const body = await request.json();

    if (!body.customer_id) {
      return NextResponse.json(
        { error: 'Customer is required to generate an invoice' },
        { status: 400 }
      );
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'At least one line item is required' },
        { status: 400 }
      );
    }

    // Determine if this will be a test invoice (only if explicitly in test mode)
    const org = await store.getOrganization(orgId);
    const isTest = org?.mode === 'test';

    if (isTest) {
      // Enforce 20 test orders/day quota
      const usage = await store.checkAndIncrementTestUsage(orgId);
      if (!usage.allowed) {
        return NextResponse.json(
          {
            error: `Test mode daily limit reached (${usage.limit} orders/day). Limit resets at midnight. Used: ${usage.orders_created}/${usage.limit}`,
            code: 'TEST_QUOTA_EXCEEDED',
            usage,
          },
          { status: 429 }
        );
      }
    }

    const invoice = await store.createInvoice({
      ...body,
      organization_id: orgId,
    });

    return NextResponse.json({
      success: true,
      invoice,
      message: 'Invoice created successfully',
    });
  } catch (err: any) {
    console.error('Error creating invoice:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
