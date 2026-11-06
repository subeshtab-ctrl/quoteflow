import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role === 'STAFF') {
      return NextResponse.json(
        { error: 'Only Organization Owners or Admins can disconnect WhatsApp' },
        { status: 403 }
      );
    }

    await store.disconnectWhatsApp(auth.orgId);

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Business account disconnected successfully',
    });
  } catch (error: any) {
    console.error('[WhatsApp Disconnect API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect WhatsApp' },
      { status: 500 }
    );
  }
}
