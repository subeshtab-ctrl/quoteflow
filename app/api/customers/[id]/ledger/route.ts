import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { calculateCustomerLedger } from '@/lib/reports/party-ledger-calculator';
import { CurrencyCode } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = auth.orgId;
    const { id } = await params;

    const organization = await store.getOrganization(orgId);
    const env = (organization?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';

    const customer = await store.getCustomerById(id, orgId);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const [invoices, quotations] = await Promise.all([
      store.getInvoices(orgId, { customerId: id, environment: env }),
      store.getQuotations(orgId, { environment: env }),
    ]);

    const customerQuotes = quotations.filter(
      (q) => q.customer_id === id || (q as any).customer?.id === id
    );

    const currency = (organization?.default_currency || 'INR') as CurrencyCode;
    const statement = calculateCustomerLedger(customer, invoices, customerQuotes, currency);

    return NextResponse.json({ success: true, statement });
  } catch (err: any) {
    console.error('Error calculating customer ledger:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to calculate ledger' },
      { status: 500 }
    );
  }
}
