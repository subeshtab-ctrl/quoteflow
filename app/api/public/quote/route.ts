import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getTimezoneFromIp } from '@/lib/utils/ip-timezone';

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

  if (searchParams.get('recordView') === 'true') {
    const userAgent = req.headers.get('user-agent') || 'Unknown device';
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'Unknown IP';
    // Resolve viewer's timezone from their IP for accurate view timestamp display
    const viewerTimezone = await getTimezoneFromIp(ip);
    await store.recordQuotationView(quote.id, { ip, userAgent, viewer_timezone: viewerTimezone });
  }

  return NextResponse.json({ success: true, quotation: quote });
}
