import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/service-role';
import { decryptToken } from '@/lib/whatsapp/encryption';
import {
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
  fetchPhoneNumberDetails,
  MetaPhoneNumberDetails,
} from '@/lib/whatsapp/meta-cloud-api';
import { store } from '@/lib/supabase/data-store';
import { WhatsAppMessage } from '@/types/database';

export interface AdminWhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
  wabaId?: string;
  displayPhone?: string;
  verifiedName?: string;
  source: 'env' | 'gateway_config' | 'database' | 'mock';
}

function getCampaignStorePath(): string {
  return path.join(process.cwd(), 'data', 'marketing-campaigns.json');
}

/**
 * Resolves the active Meta WhatsApp credentials for Developer Admin
 */
export async function getAdminWhatsAppCredentials(): Promise<AdminWhatsAppCredentials | null> {
  // 1. Check environment variables
  const envPhoneId = process.env.META_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const envToken = process.env.META_SYSTEM_USER_TOKEN || process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  const envWabaId = process.env.META_WABA_ID || process.env.WHATSAPP_WABA_ID;

  if (envPhoneId && envToken) {
    return {
      phoneNumberId: envPhoneId,
      accessToken: envToken,
      wabaId: envWabaId,
      displayPhone: process.env.META_DISPLAY_PHONE || '+91 98765 43210',
      verifiedName: 'QuoteFlow Official',
      source: 'env',
    };
  }

  // 2. Check Gateway Config store in data/marketing-campaigns.json
  try {
    const filePath = getCampaignStorePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      const gw = parsed.gatewayConfig;
      if (gw && gw.metaPhoneNumberId && gw.metaAccessToken) {
        return {
          phoneNumberId: gw.metaPhoneNumberId,
          accessToken: gw.metaAccessToken,
          wabaId: gw.wabaId,
          displayPhone: gw.displayPhone || '+91 98765 43210',
          verifiedName: gw.verifiedName || 'QuoteFlow Admin',
          source: 'gateway_config',
        };
      }
    }
  } catch (err) {
    console.warn('[AdminWhatsApp] Error reading gateway config store:', err);
  }

  // 3. Check Database for any active WABA connection
  try {
    const admin = createAdminClient();
    if (admin) {
      const { data: conn } = await admin
        .from('whatsapp_connections')
        .select('*')
        .eq('connection_status', 'connected')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (conn && conn.phone_number_id && conn.encrypted_access_token) {
        const decryptedToken = decryptToken(conn.encrypted_access_token);
        return {
          phoneNumberId: conn.phone_number_id,
          accessToken: decryptedToken,
          wabaId: conn.waba_id,
          displayPhone: conn.display_phone_number,
          verifiedName: conn.verified_name,
          source: 'database',
        };
      }
    }
  } catch (err) {
    console.warn('[AdminWhatsApp] Error checking database for active WhatsApp connection:', err);
  }

  // 4. In test / dev / non-prod environments, provide mock fallback
  if (process.env.NODE_ENV !== 'production' || process.env.MOCK_META_API === 'true' || process.env.VITEST === 'true') {
    return {
      phoneNumberId: 'mock_admin_phone_1029384756',
      accessToken: 'mock_meta_admin_token_abcdef123456',
      wabaId: 'mock_admin_waba_99887766',
      displayPhone: '+91 98765 43210',
      verifiedName: 'QuoteFlow Platform Verified',
      source: 'mock',
    };
  }

  return null;
}

export interface AdminMarketingSendParams {
  recipientPhone: string;
  recipientName: string;
  companyName?: string;
  messageText?: string;
  promoCode?: string;
  promoLink?: string;
  useTemplate?: boolean;
}

/**
 * Sends a marketing broadcast message to a single recipient via Meta Cloud API
 */
export async function sendAdminMarketingWhatsAppMessage(
  params: AdminMarketingSendParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const creds = await getAdminWhatsAppCredentials();
  if (!creds) {
    return { success: false, error: 'No active WhatsApp Cloud API credentials configured for Developer Admin.' };
  }

  const {
    recipientPhone,
    recipientName = 'Valued Partner',
    companyName = 'QuoteFlow',
    messageText = '',
    promoCode = 'PROMO50',
    promoLink = 'https://www.blendandbold.com',
    useTemplate = true,
  } = params;

  try {
    let result: { messageId: string; status: string };

    if (useTemplate) {
      result = await sendWhatsAppTemplateMessage({
        phoneNumberId: creds.phoneNumberId,
        accessToken: creds.accessToken,
        recipientPhone,
        templateName: 'admin_marketing_broadcast',
        templateLanguage: 'en_US',
        variables: {
          recipient_name: recipientName,
          business_name: companyName,
          offer_details: messageText ? messageText.slice(0, 150) : `Special promotional offer with code ${promoCode}`,
          promo_link: promoLink,
        },
      });
    } else {
      const formattedText = (messageText || `Special update from QuoteFlow for ${recipientName}. Use code ${promoCode} at ${promoLink}`)
        .replace(/{name}/gi, recipientName)
        .replace(/{offer_code}/gi, promoCode)
        .replace(/{link}/gi, promoLink)
        .replace(/{company}/gi, companyName);

      result = await sendWhatsAppTextMessage({
        phoneNumberId: creds.phoneNumberId,
        accessToken: creds.accessToken,
        recipientPhone,
        text: formattedText,
      });
    }

    // Record in whatsapp_messages audit log
    const cleanPhone = recipientPhone.replace(/[^\d]/g, '');
    const logEntry: Partial<WhatsAppMessage> = {
      id: crypto.randomUUID(),
      organization_id: 'a0000000-0000-0000-0000-000000000001', // Platform admin root org
      recipient_phone: cleanPhone,
      recipient_name: recipientName,
      template_name: useTemplate ? 'admin_marketing_broadcast' : 'custom_marketing_text',
      status: 'SENT',
      meta_message_id: result.messageId,
      reference_type: 'MARKETING_CAMPAIGN',
      reference_id: `mkt_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await store.createWhatsAppMessage(logEntry);

    return { success: true, messageId: result.messageId };
  } catch (err: any) {
    console.error(`[AdminWhatsApp] Failed to send marketing message to ${recipientPhone}:`, err);
    return { success: false, error: err.message || 'WhatsApp Cloud API send failed' };
  }
}

export interface AdminSupportSendParams {
  recipientPhone: string;
  businessName: string;
  ticketNumber: string;
  ticketId: string;
  replyMessage: string;
  ticketUrl?: string;
  useTemplate?: boolean;
}

/**
 * Sends a Support Ticket reply notification to customer via Meta Cloud API
 */
export async function sendAdminSupportWhatsAppMessage(
  params: AdminSupportSendParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const creds = await getAdminWhatsAppCredentials();
  if (!creds) {
    return { success: false, error: 'No active WhatsApp Cloud API credentials configured for Developer Admin.' };
  }

  const {
    recipientPhone,
    businessName = 'Valued Business',
    ticketNumber,
    ticketId,
    replyMessage,
    ticketUrl = `https://www.blendandbold.com/support?ticket_id=${ticketId}`,
    useTemplate = true,
  } = params;

  try {
    let result: { messageId: string; status: string };

    if (useTemplate) {
      result = await sendWhatsAppTemplateMessage({
        phoneNumberId: creds.phoneNumberId,
        accessToken: creds.accessToken,
        recipientPhone,
        templateName: 'admin_support_reply',
        templateLanguage: 'en_US',
        variables: {
          recipient_name: businessName,
          ticket_number: ticketNumber,
          reply_summary: replyMessage.length > 120 ? `${replyMessage.slice(0, 117)}...` : replyMessage,
          ticket_url: ticketUrl,
        },
      });
    } else {
      const text = `🛠️ *[QuoteFlow Support]* Hello ${businessName},\n\nWe have posted a reply regarding ticket *#${ticketNumber}*:\n\n"${replyMessage}"\n\n🔗 View ticket and reply online:\n${ticketUrl}`;
      result = await sendWhatsAppTextMessage({
        phoneNumberId: creds.phoneNumberId,
        accessToken: creds.accessToken,
        recipientPhone,
        text,
      });
    }

    const cleanPhone = recipientPhone.replace(/[^\d]/g, '');
    const logEntry: Partial<WhatsAppMessage> = {
      id: crypto.randomUUID(),
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      recipient_phone: cleanPhone,
      recipient_name: businessName,
      template_name: useTemplate ? 'admin_support_reply' : 'custom_support_text',
      status: 'SENT',
      meta_message_id: result.messageId,
      reference_type: 'SUPPORT_TICKET',
      reference_id: ticketId,
      document_number: ticketNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await store.createWhatsAppMessage(logEntry);

    return { success: true, messageId: result.messageId };
  } catch (err: any) {
    console.error(`[AdminWhatsApp] Failed to send support message to ${recipientPhone}:`, err);
    return { success: false, error: err.message || 'WhatsApp Cloud API send failed' };
  }
}

export interface AdminOutreachSendParams {
  recipientPhone: string;
  businessName: string;
  businessId: string;
  message: string;
  portalLink?: string;
  useTemplate?: boolean;
}

/**
 * Sends a direct business outreach notification (trial extension, onboarding, billing) via Meta Cloud API
 */
export async function sendAdminOutreachWhatsAppMessage(
  params: AdminOutreachSendParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const creds = await getAdminWhatsAppCredentials();
  if (!creds) {
    return { success: false, error: 'No active WhatsApp Cloud API credentials configured for Developer Admin.' };
  }

  const {
    recipientPhone,
    businessName = 'Valued Business',
    businessId,
    message,
    portalLink = 'https://www.blendandbold.com/billing',
    useTemplate = true,
  } = params;

  try {
    let result: { messageId: string; status: string };

    if (useTemplate) {
      result = await sendWhatsAppTemplateMessage({
        phoneNumberId: creds.phoneNumberId,
        accessToken: creds.accessToken,
        recipientPhone,
        templateName: 'admin_business_outreach',
        templateLanguage: 'en_US',
        variables: {
          business_name: businessName,
          message_content: message.length > 150 ? `${message.slice(0, 147)}...` : message,
          portal_link: portalLink,
        },
      });
    } else {
      const text = `📢 *[QuoteFlow Update]* Hello ${businessName},\n\n${message}\n\n🔗 Access your account:\n${portalLink}`;
      result = await sendWhatsAppTextMessage({
        phoneNumberId: creds.phoneNumberId,
        accessToken: creds.accessToken,
        recipientPhone,
        text,
      });
    }

    const cleanPhone = recipientPhone.replace(/[^\d]/g, '');
    const logEntry: Partial<WhatsAppMessage> = {
      id: crypto.randomUUID(),
      organization_id: businessId || 'a0000000-0000-0000-0000-000000000001',
      recipient_phone: cleanPhone,
      recipient_name: businessName,
      template_name: useTemplate ? 'admin_business_outreach' : 'custom_outreach_text',
      status: 'SENT',
      meta_message_id: result.messageId,
      reference_type: 'BUSINESS_OUTREACH',
      reference_id: businessId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await store.createWhatsAppMessage(logEntry);

    return { success: true, messageId: result.messageId };
  } catch (err: any) {
    console.error(`[AdminWhatsApp] Failed to send outreach message to ${recipientPhone}:`, err);
    return { success: false, error: err.message || 'WhatsApp Cloud API send failed' };
  }
}
