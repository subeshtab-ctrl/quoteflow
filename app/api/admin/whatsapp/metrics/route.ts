import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();

    let connectedCount = 0;
    let totalMessages = 0;
    let deliveredCount = 0;
    let readCount = 0;
    let failedCount = 0;
    let recentFailures: any[] = [];

    if (admin) {
      // 1. Count active connections
      const { count: activeConnCount } = await admin
        .from('whatsapp_connections')
        .select('*', { count: 'exact', head: true })
        .eq('connection_status', 'connected');
      connectedCount = activeConnCount || 0;

      // 2. Count messages
      const { data: messages } = await admin
        .from('whatsapp_messages')
        .select('id, status, error_code, error_message, recipient_phone, template_name, document_number, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (messages) {
        totalMessages = messages.length;
        for (const m of messages) {
          if (m.status === 'DELIVERED') deliveredCount++;
          else if (m.status === 'READ') readCount++;
          else if (m.status === 'FAILED') {
            failedCount++;
            if (recentFailures.length < 5) recentFailures.push(m);
          }
        }
      }
    }

    const successfulDeliveries = deliveredCount + readCount;
    const deliveryRate =
      totalMessages > 0
        ? Math.round((successfulDeliveries / Math.max(totalMessages, 1)) * 100)
        : 100;

    const webhookHealth = {
      status: 'HEALTHY',
      verifyTokenConfigured: Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN),
      appSecretConfigured: Boolean(process.env.META_APP_SECRET),
      graphApiVersion: process.env.META_GRAPH_API_VERSION || 'v21.0',
    };

    return NextResponse.json({
      connectedWabas: connectedCount,
      messagesSent: totalMessages,
      deliveryRatePercent: deliveryRate,
      webhookHealth,
      recentFailures,
    });
  } catch (error: any) {
    console.error('[Admin WhatsApp Metrics API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch WhatsApp admin metrics' },
      { status: 500 }
    );
  }
}
