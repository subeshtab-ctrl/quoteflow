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

    // 2. Ensure user has a private organization workspace (especially for Google OAuth new signups)
    if (targetUserId && supabase) {
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', targetUserId)
        .limit(1)
        .maybeSingle();

      const DEFAULT_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
      const cleanEmail = (email || '').trim().toLowerCase();

      // Check if user has an existing membership other than the rogue default org
      const isRogueDefaultMember = member?.organization_id === DEFAULT_ORG_ID && cleanEmail !== 'subeshtab@gmail.com';

      if (!member?.organization_id || isRogueDefaultMember) {
        // If rogue default org membership exists, remove it first
        if (isRogueDefaultMember) {
          await supabase
            .from('organization_members')
            .delete()
            .eq('organization_id', DEFAULT_ORG_ID)
            .eq('user_id', targetUserId);
        }

        // Automatically provision a new isolated organization workspace for this user
        const newOrgId = crypto.randomUUID();
        const effectiveCompanyName =
          (companyName || '').trim() ||
          (fullName ? `${fullName}'s Workspace` : 'My Organization');
        const orgSlug =
          effectiveCompanyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
          '-' +
          Date.now().toString().slice(-4);

        const { data: newOrg } = await supabase
          .from('organizations')
          .insert({
            id: newOrgId,
            name: effectiveCompanyName,
            slug: orgSlug,
            business_type: 'Services & Products',
            email: cleanEmail,
            default_currency: 'USD',
            default_tax_rate: 0,
            default_validity_days: 30,
            quotation_prefix: 'Q-',
            quotation_start_number: 1,
            current_quotation_counter: 0,
            default_terms: '1. Quotation valid for 30 days.\n2. Payment terms as agreed.',
            invoice_footer: `Thank you for choosing ${effectiveCompanyName}!`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        // Assign user as OWNER of their new organization
        await supabase.from('organization_members').insert({
          organization_id: newOrgId,
          user_id: targetUserId,
          role: 'OWNER',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Update auth user metadata
        await supabase.auth.admin.updateUserById(targetUserId, {
          user_metadata: {
            organization_id: newOrgId,
            role: 'OWNER',
            company_name: effectiveCompanyName,
          },
        });

        if (newOrg) {
          store.setCachedOrganization(newOrgId, newOrg);
        }
      } else if (companyName && companyName.trim()) {
        await store.updateOrganization(member.organization_id, {
          name: companyName.trim(),
          email: cleanEmail,
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
