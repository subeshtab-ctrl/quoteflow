import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';
import {
  exchangeEmbeddedSignupCode,
  fetchPhoneNumberDetails,
  registerPhoneNumber,
  subscribeWabaToWebhooks,
  fetchWabaTemplates,
} from '@/lib/whatsapp/meta-cloud-api';
import { encryptToken } from '@/lib/whatsapp/encryption';
import { QUOTEFLOW_STANDARD_TEMPLATES } from '@/lib/whatsapp/meta-templates-library';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role === 'STAFF') {
      return NextResponse.json(
        { error: 'Only Organization Owners or Admins can connect WhatsApp Business' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { code, waba_id, phone_number_id, meta_business_id, manual_token, display_phone_number } = body;

    let accessToken = manual_token;
    let effectiveWabaId = waba_id;
    let effectivePhoneId = phone_number_id;

    if (code) {
      // Exchange Embedded Signup authorization code
      const tokenResp = await exchangeEmbeddedSignupCode(code);
      accessToken = tokenResp.access_token;
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Missing authorization code or access token from Meta' },
        { status: 400 }
      );
    }

    if (!effectivePhoneId) {
      return NextResponse.json(
        { error: 'No WhatsApp phone number was selected during Embedded Signup' },
        { status: 400 }
      );
    }

    // Strictly verify credentials with Meta Cloud API
    let phoneDetails: any = null;
    try {
      phoneDetails = await fetchPhoneNumberDetails(effectivePhoneId, accessToken);
    } catch (err: any) {
      console.error('[WhatsApp Embedded Signup] Meta verification failed:', err.message);
      return NextResponse.json(
        {
          error: `Meta Verification Failed: ${err.message || 'Invalid Phone Number ID or Access Token'}. Please verify your Permanent Access Token and Phone Number ID from the Meta Developer Dashboard.`,
        },
        { status: 400 }
      );
    }

    if (!phoneDetails || !phoneDetails.display_phone_number) {
      return NextResponse.json(
        {
          error: `Meta Verification Failed: Could not retrieve a valid verified phone number for Phone Number ID (${effectivePhoneId}) from Meta Graph API.`,
        },
        { status: 400 }
      );
    }

    // Register phone number and subscribe WABA to webhook notifications
    try {
      await registerPhoneNumber(effectivePhoneId, accessToken);
    } catch (err: any) {
      console.warn('[WhatsApp Embedded Signup] Register phone number notice:', err.message);
    }

    if (effectiveWabaId) {
      try {
        await subscribeWabaToWebhooks(effectiveWabaId, accessToken);
      } catch (err: any) {
        console.warn('[WhatsApp Embedded Signup] Subscribe webhooks notice:', err.message);
      }
    }

    // Encrypt sensitive access token before saving
    const encryptedToken = encryptToken(accessToken);

    const connection = await store.saveWhatsAppConnection({
      organization_id: auth.orgId,
      meta_business_id: meta_business_id || null,
      waba_id: effectiveWabaId || `waba_${Date.now()}`,
      phone_number_id: effectivePhoneId,
      display_phone_number: phoneDetails.display_phone_number || display_phone_number,
      verified_name: phoneDetails.verified_name || auth.organization.name,
      connection_status: 'connected',
      encrypted_access_token: encryptedToken,
      quality_rating: phoneDetails.quality_rating || 'GREEN',
      messaging_status: 'APPROVED',
      code_verification_status: phoneDetails.code_verification_status || 'VERIFIED',
      connected_by_user_id: auth.userId,
    });

    // Also update organization's WhatsApp display number for fast reference
    try {
      await store.updateOrganization(auth.orgId, {
        whatsapp_number: phoneDetails.display_phone_number,
      });
    } catch {}

    // Initialize standard QuoteFlow templates in DB for this organization
    try {
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
    } catch (tmplErr) {
      console.warn('[WhatsApp Setup] Template seed notice:', tmplErr);
    }

    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        organization_id: connection.organization_id,
        waba_id: connection.waba_id,
        phone_number_id: connection.phone_number_id,
        display_phone_number: connection.display_phone_number,
        verified_name: connection.verified_name,
        connection_status: connection.connection_status,
        quality_rating: connection.quality_rating,
        messaging_status: connection.messaging_status,
        connected_at: connection.connected_at,
      },
    });
  } catch (error: any) {
    console.error('[WhatsApp Embedded Signup Callback] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete WhatsApp connection' },
      { status: 500 }
    );
  }
}
