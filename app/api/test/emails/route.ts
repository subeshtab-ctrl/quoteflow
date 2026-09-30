import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export const dynamic = 'force-dynamic';

/**
 * GET /api/test/emails - Returns simulated test emails for this org
 * DELETE /api/test/emails - Clear all simulated emails for this org
 */

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const emails = await store.getTestEmails(orgId, limit);
    return NextResponse.json({ success: true, emails });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role === 'STAFF') {
      return NextResponse.json({ error: 'Only owners and admins can clear simulated emails.' }, { status: 403 });
    }
    const orgId = auth.orgId || 'a0000000-0000-0000-0000-000000000001';
    await store.clearTestEmails(orgId);
    return NextResponse.json({ success: true, message: 'Simulated emails cleared.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
