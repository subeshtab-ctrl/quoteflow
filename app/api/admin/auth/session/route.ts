import { NextRequest, NextResponse } from 'next/server';
import {
  syncCloudAdminConfig,
  getAdminActorContext,
  DEVELOPER_ADMIN_EMAIL,
  hasDeveloperAdminPassword,
} from '@/lib/billing/dev-admin-auth';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await syncCloudAdminConfig();
    const actor = await getAdminActorContext(req);
    const hasPassword = hasDeveloperAdminPassword();

    let customerEmail: string | null = null;
    if (!actor.authorized) {
      try {
        const auth = await getAuthenticatedUserContext();
        if (auth?.email) {
          customerEmail = auth.email;
        }
      } catch {}
    }

    return NextResponse.json({
      authenticated: actor.authorized,
      email: actor.authorized ? actor.email : DEVELOPER_ADMIN_EMAIL,
      actor: actor.authorized ? actor : null,
      hasPassword,
      customerSessionConflict: Boolean(!actor.authorized && customerEmail),
      customerEmail,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
