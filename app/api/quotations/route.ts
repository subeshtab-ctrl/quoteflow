import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { QuotationFormSchema } from '@/lib/validations/quotation';
import { sendQuotationEmail } from '@/lib/email/service';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { staffService } from '@/lib/staff/staff-service';
import { isOwnerOrAdminRole } from '@/types/staff';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canView =
      isOwnerOrAdminRole(auth.role) ||
      staffService.hasPermission(auth.role, undefined, 'quotes_view');
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view quotations' }, { status: 403 });
    }

    const orgId = auth.orgId;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const org = await store.getOrganization(orgId);
    const activeEnv = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';

    const quotations = await store.getQuotations(orgId, { status, search, environment: activeEnv });
    return NextResponse.json({ success: true, quotations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = auth.orgId;

    const canCreate =
      isOwnerOrAdminRole(auth.role) ||
      staffService.hasPermission(auth.role, undefined, 'quotes_create');
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to create quotations' }, { status: 403 });
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

    const body = await req.json();
    const validated = QuotationFormSchema.parse(body);

    // Determine if this will be a test quotation (only if explicitly in test mode)
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

    const quotation = await store.createQuotation({
      ...validated,
      organization_id: orgId,
    });

    // Email handling
    if (quotation.status === 'SENT') {
      let customer = quotation.customer;
      if (!customer && quotation.customer_id) {
        customer = await store.getCustomerById(quotation.customer_id, orgId);
      }
      const quotOrg = quotation.organization || (await store.getOrganization(orgId));
      if (customer?.email) {
        const mailRes = await sendQuotationEmail(quotation, { customer, organization: quotOrg });
        if (mailRes.success) {
          try {
            await store.logEvent(orgId, quotation.id, 'SYSTEM', 'EMAIL_SENT', {
              to: customer.email,
              recipient_name: customer.name,
              resend_id: mailRes.id,
              sent_at: new Date().toISOString(),
            });
          } catch (logErr) {
            console.error('[Quotation POST] Failed to log email event:', logErr);
          }
        } else {
          console.error(`[Quotation POST] Email delivery issue for ${quotation.quotation_number}:`, mailRes.error);
        }
      }
    }

    // Log staff activity
    await staffService.logStaffActivity({
      organization_id: orgId,
      user_id: auth.userId,
      user_name: auth.fullName || auth.email,
      user_email: auth.email,
      user_role: auth.role,
      action: quotation.status === 'SENT' ? 'CREATE_AND_SEND' : 'CREATE',
      action_key: quotation.status === 'SENT' ? 'quote_created_and_sent' : 'quote_created',
      module: 'QUOTATION',
      target_id: quotation.id,
      target_identifier: quotation.quotation_number,
      details: `Created quotation ${quotation.quotation_number} (${quotation.currency || '₹'}${Number(quotation.total_amount || 0).toLocaleString()})`,
      diff: {
        quotation_number: quotation.quotation_number,
        total_amount: quotation.total_amount,
        currency: quotation.currency,
        status: quotation.status,
      },
    }).catch((err) => console.warn('Failed to log staff activity on quote creation:', err));

    return NextResponse.json({ success: true, quotation });
  } catch (err: any) {
    console.error('Error creating quotation:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create quotation' },
      { status: 400 }
    );
  }
}
