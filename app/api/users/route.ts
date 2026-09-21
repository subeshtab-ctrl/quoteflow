import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';

export async function GET() {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: true, users: [] });
    }

    const [{ data: authData, error: authError }, { data: profilesData, error: profileError }] =
      await Promise.all([
        supabase.auth.admin.listUsers(),
        supabase.from('profiles').select('*'),
      ]);

    if (authError) {
      console.error('Error fetching auth users:', authError);
    }

    const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]));

    const users = (authData?.users || []).map((user) => {
      const profile = profilesMap.get(user.id);
      return {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || 'System User',
        company_name: user.user_metadata?.company_name || null,
        email_confirmed: !!user.email_confirmed_at,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      };
    });

    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    console.error('Failed to list users:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to list users' },
      { status: 500 }
    );
  }
}
