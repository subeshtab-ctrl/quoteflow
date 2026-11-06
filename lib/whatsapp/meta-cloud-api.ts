import crypto from 'crypto';
import { decryptToken, encryptToken } from '@/lib/whatsapp/encryption';
import { buildTemplateParameters, QUOTEFLOW_STANDARD_TEMPLATES } from '@/lib/whatsapp/meta-templates-library';

export const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0';
const BASE_GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

export interface MetaOAuthTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface MetaPhoneNumberDetails {
  id: string;
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
  code_verification_status?: string;
  messaging_limit_tier?: string;
}

export interface SendTemplateMessageParams {
  phoneNumberId: string;
  accessToken: string;
  recipientPhone: string;
  templateName: string;
  templateLanguage?: string;
  variables: Record<string, string>;
  headerDocumentUrl?: string;
  headerDocumentFilename?: string;
}

/**
 * Validates HMAC SHA-256 signature for incoming Meta webhooks
 */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string = process.env.META_APP_SECRET || ''
): boolean {
  if (!signatureHeader) return false;
  if (!appSecret) {
    // If running in development without app secret, allow with warning
    if (process.env.NODE_ENV !== 'production') return true;
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  const incomingHash = signatureHeader.replace(/^sha256=/i, '');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(incomingHash, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Exchange Meta Embedded Signup authorization code for an access token
 */
export async function exchangeEmbeddedSignupCode(code: string): Promise<MetaOAuthTokenResponse> {
  const appId = process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    // Return sandbox mock token in development if credentials are not configured yet
    if (process.env.NODE_ENV !== 'production' || process.env.MOCK_META_API === 'true') {
      return {
        access_token: `mock_meta_access_token_${Date.now()}`,
        expires_in: 5184000, // 60 days
      };
    }
    throw new Error('Meta App ID or App Secret is not configured in server environment.');
  }

  const tokenUrl = new URL(`${BASE_GRAPH_URL}/oauth/access_token`);
  tokenUrl.searchParams.set('client_id', appId);
  tokenUrl.searchParams.set('client_secret', appSecret);
  tokenUrl.searchParams.set('code', code);

  const res = await fetch(tokenUrl.toString(), { method: 'GET' });
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to exchange Meta authorization code');
  }

  return {
    access_token: data.access_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
  };
}

/**
 * Fetch phone number details from Meta Graph API
 */
export async function fetchPhoneNumberDetails(
  phoneNumberId: string,
  accessToken: string
): Promise<MetaPhoneNumberDetails> {
  if (accessToken.startsWith('mock_')) {
    return {
      id: phoneNumberId,
      display_phone_number: '+91 98765 43210',
      verified_name: 'Verified Business Account',
      quality_rating: 'GREEN',
      code_verification_status: 'VERIFIED',
    };
  }

  const url = `${BASE_GRAPH_URL}/${encodeURIComponent(phoneNumberId)}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,messaging_limit_tier`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to fetch phone number details from Meta');
  }

  return {
    id: data.id,
    display_phone_number: data.display_phone_number || '',
    verified_name: data.verified_name || '',
    quality_rating: data.quality_rating || 'UNKNOWN',
    code_verification_status: data.code_verification_status || 'UNKNOWN',
    messaging_limit_tier: data.messaging_limit_tier,
  };
}

/**
 * Register phone number with WhatsApp Cloud API
 */
export async function registerPhoneNumber(
  phoneNumberId: string,
  accessToken: string,
  pin: string = '123456'
): Promise<boolean> {
  if (accessToken.startsWith('mock_')) return true;

  const url = `${BASE_GRAPH_URL}/${encodeURIComponent(phoneNumberId)}/register`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      pin,
    }),
  });

  const data = await res.json();
  return Boolean(res.ok && data.success);
}

/**
 * Subscribe WABA to QuoteFlow Webhooks
 */
export async function subscribeWabaToWebhooks(
  wabaId: string,
  accessToken: string
): Promise<boolean> {
  if (accessToken.startsWith('mock_')) return true;

  const url = `${BASE_GRAPH_URL}/${encodeURIComponent(wabaId)}/subscribed_apps`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  return Boolean(res.ok && data.success);
}

/**
 * Fetch approved message templates from Meta WABA
 */
export async function fetchWabaTemplates(wabaId: string, accessToken: string): Promise<any[]> {
  if (accessToken.startsWith('mock_')) {
    return Object.values(QUOTEFLOW_STANDARD_TEMPLATES).map((tmpl) => ({
      id: `mock_tmpl_${tmpl.name}`,
      name: tmpl.name,
      language: tmpl.language,
      category: tmpl.category,
      status: 'APPROVED',
      components: tmpl.components,
    }));
  }

  const url = `${BASE_GRAPH_URL}/${encodeURIComponent(wabaId)}/message_templates?limit=100`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to fetch templates from Meta WABA');
  }

  return data.data || [];
}

/**
 * Submit standard template to Meta WABA for approval
 */
export async function submitTemplateToMeta(
  wabaId: string,
  accessToken: string,
  templateKey: string
): Promise<any> {
  const def = QUOTEFLOW_STANDARD_TEMPLATES[templateKey];
  if (!def) throw new Error(`Unknown template definition: ${templateKey}`);

  if (accessToken.startsWith('mock_')) {
    return {
      id: `mock_tmpl_${def.name}_${Date.now()}`,
      status: 'APPROVED',
      category: def.category,
    };
  }

  const url = `${BASE_GRAPH_URL}/${encodeURIComponent(wabaId)}/message_templates`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: def.name,
      category: def.category,
      language: def.language,
      components: def.components,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Failed to submit template ${templateKey} to Meta`);
  }

  return data;
}

/**
 * Send WhatsApp Template Message via Meta Cloud API
 */
export async function sendWhatsAppTemplateMessage(
  params: SendTemplateMessageParams
): Promise<{ messageId: string; status: string }> {
  const {
    phoneNumberId,
    accessToken,
    recipientPhone,
    templateName,
    templateLanguage = 'en_US',
    variables,
    headerDocumentUrl,
    headerDocumentFilename,
  } = params;

  // Clean recipient phone into pure digits (E.164 without '+')
  const cleanRecipient = recipientPhone.replace(/[^\d]/g, '');

  if (accessToken.startsWith('mock_')) {
    return {
      messageId: `wamid.mock.${Date.now()}.${cleanRecipient}`,
      status: 'SENT',
    };
  }

  const parameters = buildTemplateParameters(templateName, variables);

  const components: any[] = [
    {
      type: 'body',
      parameters,
    },
  ];

  if (headerDocumentUrl) {
    components.unshift({
      type: 'header',
      parameters: [
        {
          type: 'document',
          document: {
            link: headerDocumentUrl,
            filename: headerDocumentFilename || 'Document.pdf',
          },
        },
      ],
    });
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanRecipient,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: templateLanguage,
      },
      components,
    },
  };

  const url = `${BASE_GRAPH_URL}/${encodeURIComponent(phoneNumberId)}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    const errorMsg = data.error?.message || 'Meta Cloud API message sending failed';
    const errorCode = data.error?.code ? String(data.error.code) : undefined;
    const err = new Error(errorMsg) as any;
    err.code = errorCode;
    throw err;
  }

  const messageId = data.messages?.[0]?.id || `wamid.${Date.now()}`;
  return {
    messageId,
    status: 'SENT',
  };
}

export interface SendTextMessageParams {
  phoneNumberId: string;
  accessToken: string;
  recipientPhone: string;
  text: string;
  previewUrl?: boolean;
}

/**
 * Send WhatsApp Free-Form Text Message via Meta Cloud API (e.g. for customer support or 24h window replies)
 */
export async function sendWhatsAppTextMessage(
  params: SendTextMessageParams
): Promise<{ messageId: string; status: string }> {
  const {
    phoneNumberId,
    accessToken,
    recipientPhone,
    text,
    previewUrl = false,
  } = params;

  // Clean recipient phone into pure digits (E.164 without '+')
  const cleanRecipient = recipientPhone.replace(/[^\d]/g, '');

  if (accessToken.startsWith('mock_')) {
    return {
      messageId: `wamid.mock.text.${Date.now()}.${cleanRecipient}`,
      status: 'SENT',
    };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanRecipient,
    type: 'text',
    text: {
      preview_url: previewUrl,
      body: text,
    },
  };

  const url = `${BASE_GRAPH_URL}/${encodeURIComponent(phoneNumberId)}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    const errorMsg = data.error?.message || 'Meta Cloud API text message sending failed';
    const errorCode = data.error?.code ? String(data.error.code) : undefined;
    const err = new Error(errorMsg) as any;
    err.code = errorCode;
    throw err;
  }

  const messageId = data.messages?.[0]?.id || `wamid.${Date.now()}`;
  return {
    messageId,
    status: 'SENT',
  };
}

