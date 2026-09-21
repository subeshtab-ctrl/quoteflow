import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Sign out error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to sign out' },
      { status: 500 }
    );
  }
}
