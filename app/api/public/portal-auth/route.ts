import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import crypto from 'crypto';
import { cleanPhoneNumber, maskPhone, splitPhoneNumber } from '@/lib/country-codes';

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.com';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function generateAuthSecret(quotationId: string, pinHash: string): string {
  return crypto
    .createHash('sha256')
    .update(`${quotationId}:${pinHash}:quoteflow_portal_salt_2026`)
    .digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const quotation = await store.getQuotationByPublicToken(token);
    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const pinReg = await store.getPortalPin(quotation.id);
    const hasPin = Boolean(pinReg && pinReg.pin_hash);

    let authenticated = false;
    const cookieName = `portal_auth_${quotation.id}`;
    const authCookie = request.cookies.get(cookieName)?.value;

    if (hasPin && authCookie && pinReg) {
      const expectedSecret = generateAuthSecret(quotation.id, pinReg.pin_hash);
      if (authCookie === expectedSecret) {
        authenticated = true;
      }
    }

    const customer = quotation.customer;
    const phoneCountryCode = customer?.phone_country_code || (customer?.phone ? splitPhoneNumber(customer.phone).countryCode : '+91');
    const customerPhoneClean = customer?.phone ? cleanPhoneNumber(customer.phone, phoneCountryCode) : '';
    const rawEmail = customer?.email || '';
    const hasDummyEmail = rawEmail.endsWith('@mobile.client') || rawEmail.endsWith('@customer.local');
    const customerEmail = hasDummyEmail ? '' : rawEmail;

    const hasPhone = Boolean(customerPhoneClean && customerPhoneClean.length >= 5);
    const hasEmail = Boolean(customerEmail && customerEmail.length > 0);

    let authMethod: 'MOBILE' | 'EMAIL' | 'BOTH' = 'MOBILE';
    if (hasPhone && hasEmail) {
      authMethod = 'BOTH';
    } else if (hasPhone) {
      authMethod = 'MOBILE';
    } else {
      authMethod = 'EMAIL';
    }

    return NextResponse.json({
      success: true,
      hasPin,
      authenticated,
      authMethod,
      phoneCountryCode,
      customerPhoneMasked: customerPhoneClean ? maskPhone(customerPhoneClean, phoneCountryCode) : '',
      customerEmailMasked: customerEmail ? maskEmail(customerEmail) : '',
      quotationNumber: quotation.quotation_number,
      title: quotation.title,
    });
  } catch (err: any) {
    console.error('Error in GET /api/public/portal-auth:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to check portal auth status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, action, email, phone, credential, pin } = body;

    if (!token) {
      return NextResponse.json({ error: 'Quotation token is required' }, { status: 400 });
    }

    const quotation = await store.getQuotationByPublicToken(token);
    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const customer = quotation.customer;
    const phoneCountryCode = customer?.phone_country_code || (customer?.phone ? splitPhoneNumber(customer.phone).countryCode : '+91');
    const customerPhone = customer?.phone ? cleanPhoneNumber(customer.phone, phoneCountryCode) : '';
    const rawEmail = customer?.email || '';
    const hasDummyEmail = rawEmail.endsWith('@mobile.client') || rawEmail.endsWith('@customer.local');
    const customerEmail = hasDummyEmail ? '' : rawEmail.toLowerCase().trim();

    const hasPhone = Boolean(customerPhone && customerPhone.length >= 5);
    const hasEmail = Boolean(customerEmail && customerEmail.length > 0);

    let authMethod: 'MOBILE' | 'EMAIL' | 'BOTH' = body.authMethod || customer?.auth_method;
    if (!authMethod) {
      if (hasPhone && hasEmail) authMethod = 'BOTH';
      else if (hasPhone) authMethod = 'MOBILE';
      else authMethod = 'EMAIL';
    }

    if (action === 'check_credential' || action === 'check_email' || action === 'check_phone') {
      const isEmailInput = Boolean(email || (credential && credential.includes('@')) || action === 'check_email');
      const isMobile = action === 'check_phone' || (!isEmailInput && (authMethod === 'MOBILE' || (credential && !credential.includes('@'))));

      if (isMobile) {
        const cleanInput = cleanPhoneNumber(phone || credential || '', phoneCountryCode);
        if (!cleanInput) {
          return NextResponse.json(
            { error: 'Mobile number is required (without country code)' },
            { status: 400 }
          );
        }
        if (!customerPhone) {
          return NextResponse.json(
            { error: 'No customer mobile number registered on this quotation. Please contact the company.' },
            { status: 400 }
          );
        }
        if (cleanInput !== customerPhone) {
          return NextResponse.json(
            {
              error: `Mobile number does not match the registered client mobile on quotation ${quotation.quotation_number}.`,
              matches: false,
            },
            { status: 400 }
          );
        }
        return NextResponse.json({ success: true, matches: true });
      } else {
        const cleanInput = (email || credential || '').toLowerCase().trim();
        if (!cleanInput) {
          return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
        }
        if (!customerEmail) {
          return NextResponse.json(
            { error: 'No customer email registered on this quotation. Please contact the company.' },
            { status: 400 }
          );
        }
        if (cleanInput !== customerEmail) {
          return NextResponse.json(
            {
              error: `Email does not match the registered client email on quotation ${quotation.quotation_number}.`,
              matches: false,
            },
            { status: 400 }
          );
        }
        return NextResponse.json({ success: true, matches: true });
      }
    }

    if (action === 'register') {
      const isEmailInput = Boolean(email || (credential && credential.includes('@')));
      const effectiveCredential = credential || (isEmailInput ? email : (phone || email));
      if (!effectiveCredential || !pin) {
        return NextResponse.json(
          {
            error: 'Credential and 6-digit PIN are required to register',
          },
          { status: 400 }
        );
      }

      await store.registerPortalPin(quotation.id, effectiveCredential, pin, authMethod);
      const pinReg = await store.getPortalPin(quotation.id);
      const authSecret = generateAuthSecret(quotation.id, pinReg!.pin_hash);

      const response = NextResponse.json({
        success: true,
        authenticated: true,
        message: 'Security PIN registered successfully! Access granted.',
      });

      response.cookies.set(`portal_auth_${quotation.id}`, authSecret, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return response;
    }

    if (action === 'verify') {
      if (!pin) {
        return NextResponse.json({ error: '6-digit PIN is required' }, { status: 400 });
      }

      const isValid = await store.verifyPortalPin(quotation.id, pin);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Incorrect 6-digit PIN. Please try again.' },
          { status: 401 }
        );
      }

      const pinReg = await store.getPortalPin(quotation.id);
      const authSecret = generateAuthSecret(quotation.id, pinReg!.pin_hash);

      const response = NextResponse.json({
        success: true,
        authenticated: true,
        message: 'PIN verified successfully! Access granted.',
      });

      response.cookies.set(`portal_auth_${quotation.id}`, authSecret, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return response;
    }

    if (action === 'reset') {
      const effectiveCredential = credential || (authMethod === 'MOBILE' ? phone : email);
      if (!effectiveCredential || !pin) {
        return NextResponse.json(
          {
            error: `Registered ${authMethod === 'MOBILE' ? 'mobile number' : 'email'} and new 6-digit PIN are required`,
          },
          { status: 400 }
        );
      }

      await store.resetPortalPin(quotation.id, effectiveCredential, pin, authMethod);
      const pinReg = await store.getPortalPin(quotation.id);
      const authSecret = generateAuthSecret(quotation.id, pinReg!.pin_hash);

      const response = NextResponse.json({
        success: true,
        authenticated: true,
        message: 'PIN reset successfully! Access granted.',
      });

      response.cookies.set(`portal_auth_${quotation.id}`, authSecret, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
      });

      return response;
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/public/portal-auth:', err);
    return NextResponse.json(
      { error: err.message || 'Portal authentication failed' },
      { status: 500 }
    );
  }
}
