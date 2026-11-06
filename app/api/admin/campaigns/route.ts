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
      campaigns: store.campaigns || [],
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
    const { name, channel, totalRecipients, messagePreview, stats } = body;

    if (!name) {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 });
    }

    const store = readCampaignStore();
    const newCampaign = {
      id: `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: String(name).trim(),
      channel: channel || 'whatsapp_queue',
      totalRecipients: Number(totalRecipients) || 0,
      messagePreview: String(messagePreview || '').slice(0, 300),
      stats: stats || { sent: totalRecipients || 0, failed: 0 },
      createdBy: actor.email || 'Developer Admin',
      createdAt: new Date().toISOString(),
    };

    store.campaigns = [newCampaign, ...(store.campaigns || [])].slice(0, 50);
    writeCampaignStore(store);

    recordAdminSecurityEvent({
      action: 'campaign_created',
      actor: actor.email || 'developer_admin',
      target: newCampaign.id,
      details: {
        campaignName: newCampaign.name,
        channel: newCampaign.channel,
        recipients: newCampaign.totalRecipients,
      },
    });

    return NextResponse.json({
      success: true,
      campaign: newCampaign,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
