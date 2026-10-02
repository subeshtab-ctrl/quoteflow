import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { store } from '@/lib/supabase/data-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ticket = await store.getSupportTicket(id);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Tenant isolation check
    const isOwnerOrAdmin = auth.role === 'OWNER' || auth.role === 'ADMIN';
    const isDeveloper = auth.email?.toLowerCase() === 'subeshtab@gmail.com';
    if (ticket.business_id !== auth.orgId && !isDeveloper) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Hydrate subscription context for Billing/Subscription/Payment tickets
    if (['Billing', 'Subscription', 'Payment'].includes(ticket.category)) {
      const sub = await store.getBusinessSubscription(ticket.business_id);
      if (sub) {
        ticket.subscription_context = {
          plan_name: sub.plan?.name || (sub.amount === 9900 ? 'QuoteFlow Special Offer' : 'QuoteFlow Standard'),
          subscription_status: sub.status,
          current_period_end: sub.current_period_end,
          last_payment_at: sub.last_payment_at,
          last_payment_status: sub.status === 'active' ? 'PAID' : sub.status,
          payment_failure_count: sub.payment_failure_count || 0,
          grace_period_end_at: sub.grace_period_end_at,
        };
      }
    }

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    console.error('Error fetching ticket:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ticket = await store.getSupportTicket(id);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const isDeveloper = auth.email?.toLowerCase() === 'subeshtab@gmail.com';
    if (ticket.business_id !== auth.orgId && !isDeveloper) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { message, attachments } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const senderType = isDeveloper ? 'developer' : 'business';
    const senderName = isDeveloper ? 'QuoteFlow Support Engineer' : auth.fullName;

    const newMsg = await subscriptionService.addTicketMessage({
      ticketId: id,
      senderUserId: auth.userId,
      senderType,
      senderName,
      message: message.trim(),
      attachments: attachments || [],
    });

    return NextResponse.json({ success: true, message: newMsg });
  } catch (err: any) {
    console.error('Error replying to ticket:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ticket = await store.getSupportTicket(id);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const isDeveloper = auth.email?.toLowerCase() === 'subeshtab@gmail.com';
    if (ticket.business_id !== auth.orgId && !isDeveloper) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { status, priority, assigned_to } = body;

    if (status) {
      ticket.status = status;
      if (status === 'resolved') ticket.resolved_at = new Date().toISOString();
      if (status === 'closed') ticket.closed_at = new Date().toISOString();
    }
    if (priority) ticket.priority = priority;
    if (assigned_to !== undefined) ticket.assigned_to = assigned_to;
    ticket.updated_at = new Date().toISOString();

    await store.saveSupportTicket(ticket);

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    console.error('Error updating ticket:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
