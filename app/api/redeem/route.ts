import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { subscriptionService } from '@/lib/billing/subscription-service';
import fs from 'fs';
import path from 'path';

const CODES_FILE = path.join(process.cwd(), 'data', 'appsumo-codes.json');

function loadCodes(): any[] {
  try {
    if (!fs.existsSync(CODES_FILE)) return [];
    const raw = fs.readFileSync(CODES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCodes(codes: any[]) {
  try {
    fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save AppSumo codes:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawCode = (body.code || '').trim().toUpperCase();

    if (!rawCode) {
      return NextResponse.json({ error: 'Please enter your AppSumo voucher code.' }, { status: 400 });
    }

    const codes = loadCodes();
    const entryIndex = codes.findIndex((c: any) => c.code.toUpperCase() === rawCode);

    if (entryIndex === -1) {
      return NextResponse.json(
        { error: 'Invalid voucher code. Please verify the code from your AppSumo receipt.' },
        { status: 404 }
      );
    }

    const entry = codes[entryIndex];
    if (entry.status === 'REDEEMED' || entry.redeemed_at) {
      return NextResponse.json(
        { error: 'This voucher code has already been redeemed.' },
        { status: 400 }
      );
    }

    // Check if user is authenticated
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      // Code is valid, prompt user to register or sign in to complete activation
      return NextResponse.json({
        valid: true,
        code: rawCode,
        requiresAuth: true,
        message: 'Code is valid. Please sign in or create an account to activate your lifetime plan.',
      });
    }

    // Activate 100-year Lifetime Pro for this organization
    const activation = await subscriptionService.manuallyActivateProPlan({
      businessId: auth.orgId,
      paymentReference: `APPSUMO_${rawCode}`,
      reason: 'AppSumo Lifetime Deal Redemption',
      durationDays: 36500, // Lifetime (100 years)
    });

    // Mark code as redeemed
    codes[entryIndex] = {
      ...entry,
      status: 'REDEEMED',
      redeemed_at: new Date().toISOString(),
      redeemed_by_org_id: auth.orgId,
      redeemed_by_email: auth.userEmail || null,
    };
    saveCodes(codes);

    return NextResponse.json({
      success: true,
      message: 'Congratulations! Your QuoteFlow Pro Lifetime Plan has been successfully activated.',
      subscription: activation.sub,
    });
  } catch (err: any) {
    console.error('Error redeeming AppSumo code:', err);
    return NextResponse.json({ error: err.message || 'Failed to process redemption.' }, { status: 500 });
  }
}
