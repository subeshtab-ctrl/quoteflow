import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminActorContext, recordAdminSecurityEvent } from '@/lib/billing/dev-admin-auth';

export const dynamic = 'force-dynamic';

function getCampaignStorePath(): string {
  return path.join(process.cwd(), 'data', 'marketing-campaigns.json');
}

function readCampaignStore() {
  const filePath = getCampaignStorePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not read marketing campaigns store:', err);
  }
  return {
    campaigns: [],
    gatewayConfig: {
      provider: 'queue',
      metaPhoneNumberId: '',
      metaAccessToken: '',
      ultraMsgInstanceId: '',
      ultraMsgToken: '',
    },
  };
}

function writeCampaignStore(data: any) {
  const filePath = getCampaignStorePath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to write marketing campaigns store:', err);
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const actor = await getAdminActorContext(req);
    if (!actor.authorized) {
      return NextResponse.json({ error: 'Unauthorized developer admin' }, { status: 403 });
    }

    const store = readCampaignStore();
    return NextResponse.json({
      success: true,
      gatewayConfig: store.gatewayConfig || { provider: 'queue' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getAdminActorContext(req);
    if (!actor.authorized) {
      return NextResponse.json({ error: 'Unauthorized developer admin' }, { status: 403 });
    }

    const body = await req.json();
    const store = readCampaignStore();

    store.gatewayConfig = {
      provider: body.provider || 'queue',
      metaPhoneNumberId: String(body.metaPhoneNumberId || '').trim(),
      metaAccessToken: String(body.metaAccessToken || '').trim(),
      ultraMsgInstanceId: String(body.ultraMsgInstanceId || '').trim(),
      ultraMsgToken: String(body.ultraMsgToken || '').trim(),
      updatedAt: new Date().toISOString(),
    };

    writeCampaignStore(store);

    recordAdminSecurityEvent({
      action: 'marketing_gateway_updated',
      actor: actor.email || 'developer_admin',
      target: store.gatewayConfig.provider,
      details: {
        provider: store.gatewayConfig.provider,
      },
    });

    return NextResponse.json({
      success: true,
      gatewayConfig: store.gatewayConfig,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
