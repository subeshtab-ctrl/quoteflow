import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await store.getWhatsAppConnection(auth.orgId);

    const isConnected =
      Boolean(connection) &&
      connection?.connection_status === 'connected' &&
      Boolean(connection?.phone_number_id);

    const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID || '';
    const metaConfigId = process.env.NEXT_PUBLIC_META_CONFIG_ID || process.env.META_CONFIG_ID || '';

    // Sanitize response: NEVER expose access token or secret credentials to the client
    const sanitizedConnection = connection
      ? {
          id: connection.id,
          organization_id: connection.organization_id,
          meta_business_id: connection.meta_business_id,
          waba_id: connection.waba_id,
          phone_number_id: connection.phone_number_id,
          display_phone_number: connection.display_phone_number,
          verified_name: connection.verified_name,
          connection_status: connection.connection_status,
          quality_rating: connection.quality_rating,
          messaging_status: connection.messaging_status,
          connected_at: connection.connected_at,
          updated_at: connection.updated_at,
          disconnected_at: connection.disconnected_at,
        }
      : null;

    return NextResponse.json({
      isConnected,
      connection: sanitizedConnection,
      config: {
        appId: metaAppId,
        configId: metaConfigId,
        isConfigured: Boolean(metaAppId && metaConfigId),
      },
    });
  } catch (error: any) {
    console.error('[WhatsApp Connection API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch WhatsApp connection' },
      { status: 500 }
    );
  }
}
