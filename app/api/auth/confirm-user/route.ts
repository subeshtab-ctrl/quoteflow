import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // STRICT: Direct unauthenticated confirmation is disabled to enforce email verification
  return NextResponse.json(
    { error: 'Direct email confirmation is disabled. Users must verify their email via the link sent to their inbox.' },
    { status: 403 }
  );
}

