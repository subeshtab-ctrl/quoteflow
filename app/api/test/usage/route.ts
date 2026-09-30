import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export const dynamic = 'force-dynamic';

/**
 * GET /api/test/usage - Returns today's test usage stats
 * DELETE /api/test/usage - (Admin only) Reset today's test usage counter
 */

export async function GET() {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

    const usage = await store.getTestUsageToday(orgId);
    return NextResponse.json({ success: true, usage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
