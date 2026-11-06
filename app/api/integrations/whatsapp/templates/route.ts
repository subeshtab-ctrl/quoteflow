import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';
import { fetchWabaTemplates, submitTemplateToMeta } from '@/lib/whatsapp/meta-cloud-api';
import { decryptToken } from '@/lib/whatsapp/encryption';
import { QUOTEFLOW_STANDARD_TEMPLATES } from '@/lib/whatsapp/meta-templates-library';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let templates = await store.getWhatsAppTemplates(auth.orgId);

    // If no templates currently exist, seed standard QuoteFlow templates
    if (!templates || templates.length === 0) {
      for (const [key, def] of Object.entries(QUOTEFLOW_STANDARD_TEMPLATES)) {
        await store.saveWhatsAppTemplate({
          organization_id: auth.orgId,
          name: def.name,
          language: def.language,
          category: def.category,
          status: 'APPROVED',
          header_type: def.headerType,
          body_text: def.bodyText,
          components: def.components,
        });
      }
      templates = await store.getWhatsAppTemplates(auth.orgId);
    }

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error('[WhatsApp Templates API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch WhatsApp templates' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'sync';

    const connection = await store.getWhatsAppConnection(auth.orgId);
    if (!connection || connection.connection_status !== 'connected') {
      return NextResponse.json(
        { error: 'WhatsApp is not connected for this organization' },
        { status: 400 }
      );
    }

    const accessToken = decryptToken(connection.encrypted_access_token || '');

    if (action === 'setup_standard') {
      // Submit any missing standard templates to Meta WABA
      const results: Record<string, any> = {};
      for (const key of Object.keys(QUOTEFLOW_STANDARD_TEMPLATES)) {
        try {
          const res = await submitTemplateToMeta(connection.waba_id, accessToken, key);
          results[key] = res;
        } catch (err: any) {
          results[key] = { error: err.message };
        }
      }

      // Re-fetch templates
      const updated = await store.getWhatsAppTemplates(auth.orgId);
      return NextResponse.json({ success: true, results, templates: updated });
    }

    // Default action: Live sync from Meta
    if (connection.waba_id && accessToken) {
      try {
        const metaTemplates = await fetchWabaTemplates(connection.waba_id, accessToken);
        for (const mt of metaTemplates) {
          const bodyComponent = mt.components?.find((c: any) => c.type === 'BODY');
          const headerComponent = mt.components?.find((c: any) => c.type === 'HEADER');
          await store.saveWhatsAppTemplate({
            organization_id: auth.orgId,
            meta_template_id: mt.id,
            name: mt.name,
            language: mt.language,
            category: mt.category,
            status: mt.status,
            components: mt.components || [],
            header_type: headerComponent ? headerComponent.format || 'TEXT' : 'NONE',
            body_text: bodyComponent?.text || '',
            rejection_reason: mt.rejected_reason || null,
          });
        }
      } catch (syncErr: any) {
        console.warn('[WhatsApp Templates Live Sync] Notice:', syncErr.message);
      }
    }

    const templates = await store.getWhatsAppTemplates(auth.orgId);
    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error('[WhatsApp Templates Action API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process WhatsApp templates' },
      { status: 500 }
    );
  }
}
