import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { syncCloudAdminConfig } from '@/lib/billing/dev-admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await syncCloudAdminConfig();
    const result = await subscriptionService.syncBusinessSubscriptionWithGateway(auth.orgId);

    return NextResponse.json({
      success: true,
      synced: result.synced,
      gatewayStatus: result.gatewayStatus,
      message: result.message,
      subscription: result.subscription,
    });
  } catch (err: any) {
    console.error('Error in subscription gateway sync:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
