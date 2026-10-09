import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import crypto from 'crypto';

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days session for authenticated quote

function generateAuthSecret(quotationId: string, pinHash: string): string {
  return crypto
    .createHash('sha256')
    .update(`${quotationId}:${pinHash}:quoteflow_quote_pin_salt_2026`)
    .digest('hex');
}

// In-memory rate limiting map: max 5 failed attempts per 15 minutes
interface RateLimitEntry {
  attempts: number;
  lockedUntil?: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

function getRateLimitKey(req: NextRequest, quotationId: string): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('x-real-ip') ||
             '127.0.0.1';
  return `${ip}:${quotationId}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawToken = searchParams.get('token');
    const token = rawToken ? decodeURIComponent(rawToken).trim() : null;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const quotation = await store.getQuotationByPublicToken(token);
    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    // If PIN protection is disabled, quotation is directly accessible without any login
    if (!quotation.pin_protection_enabled) {
      return NextResponse.json({
        success: true,
        pinProtectionEnabled: false,
        hasPin: false,
        authenticated: true,
        quotationNumber: quotation.quotation_number,
        title: quotation.title,
      });
    }

    // PIN protection is enabled: check if device has already unlocked this quotation
    const targetPinHash = quotation.pin_hash || (quotation.pin ? store.hashPin(quotation.pin) : '');
    const expectedSecret = generateAuthSecret(quotation.id, targetPinHash);

    const quoteCookie = request.cookies.get(`portal_auth_${quotation.id}`)?.value;
    const headerSecret = request.headers.get('x-portal-auth-secret') || searchParams.get('authSecret');

    const authenticated = Boolean(
      (quoteCookie && quoteCookie === expectedSecret) ||
      (headerSecret && headerSecret === expectedSecret)
    );

    const response = NextResponse.json({
      success: true,
      pinProtectionEnabled: true,
      hasPin: true,
      authenticated,
      quotationNumber: quotation.quotation_number,
      title: quotation.title,
    });

    if (authenticated) {
      response.cookies.set(`portal_auth_${quotation.id}`, expectedSecret, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
      });
    }

    return response;
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
    const { token: rawToken, pin } = body;
    const token = rawToken ? decodeURIComponent(rawToken).trim() : '';

    if (!token) {
      return NextResponse.json({ error: 'Quotation token is required' }, { status: 400 });
    }

    const quotation = await store.getQuotationByPublicToken(token);
    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    // If quotation is not PIN-protected, grant access immediately
    if (!quotation.pin_protection_enabled) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        message: 'Quotation is public and accessible.',
      });
    }

    // Rate Limiting Check
    const rateLimitKey = getRateLimitKey(request, quotation.id);
    const now = Date.now();
    const entry = rateLimitMap.get(rateLimitKey);

    if (entry && entry.lockedUntil && entry.lockedUntil > now) {
      const minsRemaining = Math.ceil((entry.lockedUntil - now) / 60000);
      return NextResponse.json(
        {
          error: `Too many incorrect attempts. Please try again after ${minsRemaining} minute${minsRemaining === 1 ? '' : 's'}.`,
          isLocked: true,
          lockedUntil: entry.lockedUntil,
        },
        { status: 429 }
      );
    }

    const cleanPin = (pin || '').toString().trim();
    if (!cleanPin) {
      return NextResponse.json({ error: 'Please enter the 4-digit access PIN.' }, { status: 400 });
    }

    // Verify PIN
    const isValid = await store.verifyQuotationPin(quotation.id, cleanPin);

    if (!isValid) {
      const attempts = (entry?.attempts || 0) + 1;
      if (attempts >= 5) {
        const lockedUntil = now + 15 * 60 * 1000; // Lock for 15 minutes
        rateLimitMap.set(rateLimitKey, { attempts, lockedUntil });
        return NextResponse.json(
          {
            error: 'Too many incorrect attempts. This quotation is locked for 15 minutes.',
            isLocked: true,
            lockedUntil,
          },
          { status: 429 }
        );
      } else {
        rateLimitMap.set(rateLimitKey, { attempts });
        const remaining = 5 - attempts;
        return NextResponse.json(
          {
            error: `Incorrect PIN. Please try again (${remaining} attempt${remaining === 1 ? '' : 's'} remaining).`,
            remainingAttempts: remaining,
          },
          { status: 401 }
        );
      }
    }

    // PIN is valid: clear rate limit
    rateLimitMap.delete(rateLimitKey);

    const targetPinHash = quotation.pin_hash || (quotation.pin ? store.hashPin(quotation.pin) : '');
    const authSecret = generateAuthSecret(quotation.id, targetPinHash);

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      secret: authSecret,
      message: 'Access granted!',
    });

    response.cookies.set(`portal_auth_${quotation.id}`, authSecret, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (err: any) {
    console.error('Error in POST /api/public/portal-auth:', err);
    return NextResponse.json(
      { error: err.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
