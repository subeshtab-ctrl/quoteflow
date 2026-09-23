import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { store } from '@/lib/supabase/data-store';
import { Organization, UserRole } from '@/types/database';

export interface UserAuthContext {
  userId: string;
  email: string;
  fullName: string;
  orgId: string;
  role: UserRole;
  organization: Organization;
}

export async function getAuthenticatedUserContext(): Promise<UserAuthContext | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // STRICT: Do not grant authenticated application context to unverified users
  const isEmailConfirmed = Boolean(user.email_confirmed_at || user.confirmed_at);
  if (!isEmailConfirmed) {
    return null;
  }


  const admin = createAdminClient();
  let orgId = (user.user_metadata?.organization_id as string) || '';
  // IMPORTANT: role is ALWAYS read from the organization_members table, never from user_metadata.
  // user_metadata.role is untrusted and may be stale or wrong (e.g. staff showing as OWNER).
  let role: UserRole = 'STAFF'; // safest default — escalated only when DB confirms a higher role

  // 1. If user has a designated organization_id in user_metadata, verify it's valid & get DB role
  if (orgId && admin) {
    try {
      const { data: member } = await admin
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .maybeSingle();

      if (member?.role) {
        role = member.role as UserRole; // DB role is authoritative
      }
      // If no member record found for this orgId, fall through to lookup below
      if (!member) {
        orgId = ''; // force re-lookup
      }
    } catch {
      // Keep existing metadata orgId
    }
  }

  // 2. If orgId not in metadata, lookup active membership from organization_members table
  if (!orgId && admin) {
    try {
      const { data: members } = await admin
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Prefer non-default org if multiple memberships exist
      const DEFAULT_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
      const activeMember =
        (members || []).find((m) => m.organization_id !== DEFAULT_ORG_ID) ||
        (user.email?.toLowerCase() === 'subeshtab@gmail.com' ? members?.[0] : null);

      if (activeMember?.organization_id) {
        orgId = activeMember.organization_id;
        if (activeMember.role) role = activeMember.role as UserRole;

        // Cache organization_id on user_metadata so future lookups are fast
        // NOTE: do NOT cache role — role is always read from organization_members table
        try {
          await admin.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              organization_id: orgId,
            },
          });
        } catch {
          // Non-critical
        }
      }
    } catch (err) {
      console.warn('Lookup member org error:', err);
    }
  }

  // 3. If user is Subesh M, link to primary org
  const DEFAULT_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
  if (!orgId && user.email?.toLowerCase() === 'subeshtab@gmail.com') {
    orgId = DEFAULT_ORG_ID;
  }

  // 4. For any other user without an organization, auto-provision an isolated workspace
  if (!orgId && admin) {
    try {
      const newOrgId = crypto.randomUUID();
      const compName =
        (user.user_metadata?.company_name as string) ||
        (user.user_metadata?.full_name ? `${user.user_metadata.full_name}'s Company` : 'My Company');
      const orgSlug =
        compName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);

      const { data: createdOrg } = await admin
        .from('organizations')
        .insert({
          id: newOrgId,
          name: compName,
          slug: orgSlug,
          email: user.email || '',
          default_currency: 'USD',
          default_tax_rate: 0,
          default_validity_days: 30,
          quotation_prefix: 'Q-',
          quotation_start_number: 1,
          current_quotation_counter: 0,
          default_terms: '1. Quotation valid for 30 days.\n2. Payment terms as agreed.',
          invoice_footer: `Thank you for partnering with ${compName}!`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      await admin.from('organization_members').insert({
        organization_id: newOrgId,
        user_id: user.id,
        role: 'OWNER',
        is_active: true,
      });

      // Purge any rogue default org membership
      await admin
        .from('organization_members')
        .delete()
        .eq('organization_id', DEFAULT_ORG_ID)
        .eq('user_id', user.id);

      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          organization_id: newOrgId,
          role: 'OWNER',
          company_name: compName,
        },
      });

      orgId = newOrgId;
      role = 'OWNER';
    } catch (createOrgErr) {
      console.error('Failed to auto-provision user organization:', createOrgErr);
    }
  }

  // Absolute fallback
  if (!orgId) {
    orgId = DEFAULT_ORG_ID;
  }

  let organization = await store.getOrganization(orgId);

  // If organization record doesn't exist in cache/db, initialize safe defaults
  if (!organization) {
    const compName =
      (user.user_metadata?.company_name as string) ||
      'My Workspace';
    organization = {
      id: orgId,
      name: compName,
      slug: compName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      email: user.email || '',
      default_currency: 'USD',
      default_tax_rate: 0,
      default_validity_days: 30,
      quotation_prefix: 'Q-',
      quotation_start_number: 1,
      current_quotation_counter: 0,
      default_terms: '1. Quotation valid for 30 days.\n2. Payment terms as agreed.',
      invoice_footer: 'Thank you for your business!',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const fullName =
    (user.user_metadata?.full_name as string) ||
    (user.email ? user.email.split('@')[0] : 'User');

  return {
    userId: user.id,
    email: user.email || '',
    fullName,
    orgId,
    role,
    organization,
  };
}
