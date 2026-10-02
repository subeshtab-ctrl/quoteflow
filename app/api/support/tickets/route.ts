import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { store } from '@/lib/supabase/data-store';
import { SupportTicketCategory, SupportTicketPriority } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const search = searchParams.get('search') || undefined;

    const tickets = await store.getSupportTickets({
      businessId: auth.orgId,
      status,
      category,
      priority,
      search,
    });

    return NextResponse.json({ success: true, tickets });
  } catch (err: any) {
    console.error('Error fetching support tickets:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { subject, category, priority, description, attachments } = body;

    if (!subject?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: 'Subject and description are required' },
        { status: 400 }
      );
    }

    const validCategories: SupportTicketCategory[] = [
      'Billing',
      'Subscription',
      'Quote',
      'Invoice',
      'Customer Portal',
      'Payment',
      'WhatsApp',
      'Technical Issue',
      'Bug Report',
      'Feature Request',
      'Other',
    ];

    const validPriorities: SupportTicketPriority[] = ['Low', 'Normal', 'High', 'Urgent'];

    const cat = validCategories.includes(category) ? category : 'Other';
    const prio = validPriorities.includes(priority) ? priority : 'Normal';

    const ticket = await subscriptionService.createSupportTicket({
      businessId: auth.orgId,
      userId: auth.userId,
      creatorEmail: auth.email,
      creatorName: auth.fullName,
      subject: subject.trim(),
      category: cat,
      priority: prio,
      description: description.trim(),
      attachments: attachments || [],
    });

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    console.error('Error creating support ticket:', err);
    return NextResponse.json({ error: err.message || 'Failed to create support ticket' }, { status: 500 });
  }
}
