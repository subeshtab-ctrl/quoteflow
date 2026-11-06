import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { staffService } from '@/lib/staff/staff-service';
import { isOwnerOrAdminRole } from '@/types/staff';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canView =
      isOwnerOrAdminRole(auth.role) ||
      staffService.hasPermission(auth.role, undefined, 'invoices_view');
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view invoices' }, { status: 403 });
    }
    const orgId = auth.orgId;
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
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = auth.orgId;

    const canCreate =
      isOwnerOrAdminRole(auth.role) ||
      staffService.hasPermission(auth.role, undefined, 'invoices_create');
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to create invoices' }, { status: 403 });
    }

    // Enforce subscription restriction after 3-day grace period
    const access = await subscriptionService.getBusinessSubscriptionAccess(orgId);
    if (!access.allowed || access.isRestricted) {
      return NextResponse.json(
        {
          error:
            auth.role === 'STAFF'
              ? "Your organization's QuoteFlow subscription has expired. Please contact your administrator."
              : `Your ${access.priceDisplay || 'subscription'} payment is overdue. Please complete payment to restore full QuoteFlow access.`,
          code: 'SUBSCRIPTION_RESTRICTED',
          access,
        },
        { status: 402 }
      );
    }

    const body = await request.json();

    if (!body.customer_id) {
      if (body.customer?.id) {
        body.customer_id = body.customer.id;
      } else if (body.quotation_id) {
        const quote = await store.getQuotationById(body.quotation_id, orgId);
        if (quote?.customer_id) {
          body.customer_id = quote.customer_id;
        } else if (quote?.customer?.id) {
          body.customer_id = quote.customer.id;
        }
      }
    }

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

    // Log staff activity
    await staffService.logStaffActivity({
      organization_id: orgId,
      user_id: auth.userId,
      user_name: auth.fullName || auth.email,
      user_email: auth.email,
      user_role: auth.role,
      action: 'CREATE',
      action_key: 'invoice_created',
      module: 'INVOICE',
      target_id: invoice.id,
      target_identifier: invoice.invoice_number,
      details: `Created invoice ${invoice.invoice_number} (${invoice.currency || '₹'}${Number(invoice.total_amount || 0).toLocaleString()})`,
      diff: {
        invoice_number: invoice.invoice_number,
        total_amount: invoice.total_amount,
        customer_id: invoice.customer_id,
        status: invoice.status,
      },
    }).catch((err) => console.warn('Failed to log staff activity on invoice creation:', err));

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
