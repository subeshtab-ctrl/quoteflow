import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const quote = await store.getQuotationByPublicToken(token);
  if (!quote) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, quotation: quote });
}
