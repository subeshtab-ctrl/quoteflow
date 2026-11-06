import { NextRequest, NextResponse } from 'next/server';
import { getAdminActorContext } from '@/lib/billing/dev-admin-auth';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const actor = await getAdminActorContext(req);
    if (!actor.authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    if (!q || q.length < 2) {
      return NextResponse.json({
        success: true,
        results: { businesses: [], tickets: [], payments: [], documents: [] },
      });
    }

    const [{ subscribers }, tickets] = await Promise.all([
      store.getAllSubscribers({ search: q, limit: 15 }),
      store.getSupportTickets({ search: q }),
    ]);

    const businesses = subscribers.map((s) => ({
      id: s.business_id,
      name: s.organization?.name || s.business_id,
      email: s.organization?.email || '',
      phone: s.organization?.phone || '',
      country: s.organization?.country || 'India',
      status: s.status,
      plan: s.plan?.name || (s.status === 'active' ? 'QuoteFlow Pro' : 'Free Trial'),
    }));

    const matchedTickets = tickets.slice(0, 10).map((t) => ({
      id: t.id,
      ticket_number: t.ticket_number,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      business_id: t.business_id,
      business_name: (t as any).business_name || t.business_id,
    }));

    // Also search across recent payments and quote/invoice numbers if query looks like pay_, sub_, Q-, INV-
    const payments: Array<any> = [];
    const documents: Array<any> = [];

    const allSubs = (await store.getAllSubscribers({ limit: 100 })).subscribers;
    for (const sub of allSubs.slice(0, 30)) {
      if (
        (sub.razorpay_subscription_id || '').toLowerCase().includes(q) ||
        (sub.last_payment_id || '').toLowerCase().includes(q)
      ) {
        payments.push({
          id: sub.last_payment_id || sub.id,
          razorpay_payment_id: sub.last_payment_id,
          razorpay_subscription_id: sub.razorpay_subscription_id,
          business_id: sub.business_id,
          business_name: sub.organization?.name || sub.business_id,
          amount: (sub.amount || 9900) / 100,
          status: sub.status,
        });
      }

      if (q.startsWith('q-') || q.startsWith('inv-') || q.length >= 3) {
        try {
          const [quotes, invoices] = await Promise.all([
            store.getQuotations(sub.business_id),
            store.getInvoices(sub.business_id),
          ]);
          for (const quote of quotes) {
            if (quote.quotation_number.toLowerCase().includes(q)) {
              documents.push({
                id: quote.id,
                type: 'Quotation',
                number: quote.quotation_number,
                amount: quote.grand_total,
                currency: quote.currency,
                status: quote.status,
                business_id: sub.business_id,
                business_name: sub.organization?.name || sub.business_id,
              });
            }
          }
          for (const inv of invoices) {
            if (inv.invoice_number.toLowerCase().includes(q)) {
              documents.push({
                id: inv.id,
                type: 'Invoice',
                number: inv.invoice_number,
                amount: inv.grand_total,
                currency: inv.currency,
                status: inv.status,
                business_id: sub.business_id,
                business_name: sub.organization?.name || sub.business_id,
              });
            }
          }
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        businesses,
        tickets: matchedTickets,
        payments: payments.slice(0, 10),
        documents: documents.slice(0, 10),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
