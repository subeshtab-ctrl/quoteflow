import { createAdminClient } from '@/lib/supabase/service-role';
import { store } from '@/lib/supabase/data-store';

export interface SyncUserData {
  userId?: string;
  email?: string;
  fullName?: string;
  companyName?: string;
}

export async function syncUserAndOrganization({
  userId,
  email,
  fullName,
  companyName,
}: SyncUserData) {
  try {
    const supabase = createAdminClient();
    let targetUserId = userId;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (supabase) {
      // 1. If userId wasn't provided, look up by email
      if (!targetUserId && cleanEmail) {
        try {
          const { data: userList } = await supabase.auth.admin.listUsers();
          const matched = (userList?.users || []).find(
            (u) => u.email?.toLowerCase() === cleanEmail
          );
          if (matched) {
            targetUserId = matched.id;
          }
        } catch (lookupErr) {
          console.warn('User lookup by email note:', lookupErr);
        }
      }

      // 2. Upsert user profile in `profiles` table
      if (targetUserId) {
        const resolvedName =
          (fullName || '').trim() ||
          (cleanEmail ? cleanEmail.split('@')[0] : 'Workspace Member');

        const { error: profileError } = await supabase.from('profiles').upsert({
          id: targetUserId,
          email: cleanEmail,
          full_name: resolvedName,
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error('Error saving profile in Supabase:', profileError);
        }

        // Update auth user metadata
        try {
          const updateData: Record<string, any> = {};
          if (resolvedName) updateData.full_name = resolvedName;
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

      // 3. Ensure user has a private organization workspace (for OAuth and new signups)
      if (targetUserId) {
        let authUser: any = null;
        try {
          const { data } = await supabase.auth.admin.getUserById(targetUserId);
          authUser = data?.user;
        } catch {}

        const userMeta = authUser?.user_metadata || {};
        const isInvitedStaff = Boolean(
          userMeta.invited_by ||
          userMeta.is_staff === true ||
          userMeta.is_staff_invite === true ||
          userMeta.role === 'STAFF'
        );

        const { data: member } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', targetUserId)
          .limit(1)
          .maybeSingle();

        // Staff members must NEVER auto-provision their own workspace, never be promoted to OWNER,
        // and never overwrite the organization's business email or name.
        if (isInvitedStaff || (member && member.role !== 'OWNER')) {
          const designatedOrgId = (userMeta.organization_id as string) || member?.organization_id;
          if (designatedOrgId && !member) {
            const staffRole = userMeta.role === 'ADMIN' ? 'ADMIN' : 'STAFF';
            await supabase.from('organization_members').upsert({
              organization_id: designatedOrgId,
              user_id: targetUserId,
              role: staffRole,
              is_active: true,
            }).catch(() => {});
          }
          return { success: true };
        }

        const DEFAULT_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
        const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
        const isRogueDefaultMember =
          member?.organization_id === DEFAULT_ORG_ID &&
          (!adminEmail || cleanEmail !== adminEmail);

        if (!member?.organization_id || isRogueDefaultMember) {
          if (isRogueDefaultMember) {
            await supabase
              .from('organization_members')
              .delete()
              .eq('organization_id', DEFAULT_ORG_ID)
              .eq('user_id', targetUserId);
          }

          const newOrgId = crypto.randomUUID();
          const effectiveCompanyName =
            (companyName || '').trim() ||
            (fullName && fullName.trim()
              ? `${fullName.trim()}'s Workspace`
              : cleanEmail
              ? `${cleanEmail.split('@')[0]}'s Workspace`
              : 'My Company');

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
              default_currency: 'INR',
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

          // Assign user as OWNER
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

          // Trigger Welcome Email (Idempotent: strictly once per new business, ignores staff & existing orgs)
          try {
            const { sendWelcomeEmailIfEligible } = await import('@/lib/welcome/welcome-service');
            sendWelcomeEmailIfEligible({
              organizationId: newOrgId,
              userId: targetUserId,
              ownerName: resolvedName,
              email: cleanEmail,
              businessName: effectiveCompanyName,
              userRole: 'OWNER',
            }).catch((err) => console.warn('Welcome email trigger note:', err));
          } catch (welErr) {
            console.warn('Welcome service import note:', welErr);
          }
        } else if (companyName && companyName.trim() && member.role === 'OWNER') {
          const existingOrg = await store.getOrganization(member.organization_id);
          const updatePayload: Record<string, any> = {
            name: companyName.trim(),
          };
          if (!existingOrg?.email) {
            updatePayload.email = cleanEmail;
          }
          await store.updateOrganization(member.organization_id, updatePayload);

          // Check if this owner has received welcome email
          try {
            const { sendWelcomeEmailIfEligible } = await import('@/lib/welcome/welcome-service');
            sendWelcomeEmailIfEligible({
              organizationId: member.organization_id,
              userId: targetUserId,
              ownerName: resolvedName,
              email: cleanEmail,
              businessName: companyName.trim(),
              userRole: 'OWNER',
            }).catch((err) => console.warn('Welcome email trigger note:', err));
          } catch {}
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in syncUserAndOrganization:', err);
    return { success: false, error: err.message || 'Sync failed' };
  }
}
