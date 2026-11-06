import { NextRequest, NextResponse } from 'next/server';
import { store, DEFAULT_ORG_ID } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = auth.orgId;

    const nextInvoiceNumber = await store.peekNextInvoiceNumber(orgId);

    return NextResponse.json({
      success: true,
      nextInvoiceNumber,
    });
  } catch (err: any) {
    console.error('Error getting next invoice number:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to get next invoice number' },
      { status: 500 }
    );
  }
}
