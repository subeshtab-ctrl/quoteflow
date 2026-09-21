import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { store } from '@/lib/supabase/data-store';

export async function POST(req: NextRequest) {
  try {
    const { userId, email, fullName, companyName } = await req.json();

    const supabase = createAdminClient();
    let targetUserId = userId;

    if (supabase) {
      // If userId wasn't provided, try looking up user by email
      if (!targetUserId && email) {
        try {
          const { data: userList } = await supabase.auth.admin.listUsers();
          const matched = (userList?.users || []).find(
            (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
          );
          if (matched) {
            targetUserId = matched.id;
          }
        } catch (lookupErr) {
          console.warn('User lookup by email note:', lookupErr);
        }
      }

      // 1. Upsert user profile
      if (targetUserId) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: targetUserId,
          email: (email || '').trim(),
          full_name: (fullName || '').trim() || 'System User',
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error('Error saving profile in Supabase:', profileError);
        }

        // Also update auth user metadata
        try {
          const updateData: Record<string, any> = {};
          if (fullName && fullName.trim()) updateData.full_name = fullName.trim();
          if (companyName && companyName.trim()) updateData.company_name = companyName.trim();
          if (Object.keys(updateData).length > 0) {
            await supabase.auth.admin.updateUserById(targetUserId, {
              user_metadata: updateData,
            });
          }
        } catch (metaErr) {
          console.warn('Error syncing auth user_metadata:', metaErr);
        }
      }
    }

    // 2. Update company / organization name for target user's specific organization
    if (targetUserId && companyName && companyName.trim() && supabase) {
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (member?.organization_id) {
        await store.updateOrganization(member.organization_id, {
          name: companyName.trim(),
          email: (email || '').trim(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User and organization details saved successfully',
    });
  } catch (err: any) {
    console.error('Failed to save user details:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save user details' },
      { status: 400 }
    );
  }
}
