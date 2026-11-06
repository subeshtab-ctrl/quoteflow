import { cache } from 'react';
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
  isStaff: boolean;
  isOwner: boolean;
}

// 30-second in-memory cache for resolved user membership to eliminate redundant DB roundtrips
// across rapid API/page requests and reduce Vercel Fluid Active CPU usage.
const membershipCache = new Map<
  string,
  { orgId: string; role: UserRole; isStaff: boolean; isOwner: boolean; expiresAt: number }
>();
const MEMBERSHIP_CACHE_TTL_MS = 30_000;

export function invalidateAuthContextCache(userId?: string) {
  if (userId) {
    membershipCache.delete(userId);
  } else {
    membershipCache.clear();
  }
}

async function resolveAuthenticatedUserContext(): Promise<UserAuthContext | null> {
  let supabase = null;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return null;
  }
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

  const now = Date.now();
  const cachedMember = membershipCache.get(user.id);
  if (cachedMember && cachedMember.expiresAt > now) {
    const organization = await store.getOrganization(cachedMember.orgId);
    if (organization) {
      const fullName =
        (user.user_metadata?.full_name as string) ||
        (user.email ? user.email.split('@')[0] : 'User');
      return {
        userId: user.id,
        email: user.email || '',
        fullName,
        orgId: cachedMember.orgId,
        role: cachedMember.role,
        organization,
        isStaff: cachedMember.isStaff,
        isOwner: cachedMember.isOwner,
      };
    }
  }

  const admin = createAdminClient();
  let orgId = (user.user_metadata?.organization_id as string) || '';
  const isExplicitStaff = Boolean(
    user.user_metadata?.role === 'STAFF' ||
    user.user_metadata?.is_staff === true ||
    user.user_metadata?.is_staff_invite === true ||
    user.user_metadata?.invited_by
  );
  // Account owners default to OWNER; only explicit staff accounts default to STAFF
  let role: UserRole = isExplicitStaff
    ? ((user.user_metadata?.role as UserRole) || 'STAFF')
    : ((user.user_metadata?.role as UserRole) || 'OWNER');

  // 1. If user has a designated organization_id in user_metadata, verify it's valid & get DB role
  if (orgId && admin) {
    try {
      const { data: member } = await admin
        .from('organization_members')
        .select('organization_id, role, is_active')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (member) {
        if (member.is_active === false) {
          // User has been deactivated by company administrator - strictly block access
          return null;
        }
        if (member.role) {
          role = member.role as UserRole; // DB role is authoritative
        }
      } else if (!isExplicitStaff && role === 'OWNER') {
        // Backfill missing owner membership in DB
        await admin.from('organization_members').upsert({
          organization_id: orgId,
          user_id: user.id,
          role: 'OWNER',
          is_active: true,
        }).catch(() => {});
      } else {
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
        .select('organization_id, role, is_active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // If user only has deactivated memberships, block access immediately
      const allDeactivated = (members || []).length > 0 && (members || []).every((m) => m.is_active === false);
      if (allDeactivated) {
        return null;
      }

      const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() || '';
      const isAdminUser = Boolean(adminEmail && user.email?.toLowerCase() === adminEmail);

      // Prefer non-default org if multiple memberships exist
      const DEFAULT_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
      const activeMember =
        (members || []).find((m) => m.is_active !== false && m.organization_id !== DEFAULT_ORG_ID) ||
        (isAdminUser ? members?.[0] : null);

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

  // 3. Link designated admin account to primary org if not yet associated
  const DEFAULT_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() || '';
  if (adminEmail && user.email?.toLowerCase() === adminEmail) {
    if (!orgId) orgId = DEFAULT_ORG_ID;
    role = 'OWNER';
  }

  // 4. For any other user without an organization, auto-provision an isolated workspace
  // IMPORTANT: Staff accounts must NEVER auto-provision their own workspace or trial.
  if (!orgId && admin && !isExplicitStaff) {
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
          default_currency: 'INR',
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

  // Absolute fallback: Ensure tenant isolation by assigning a distinct isolated workspace UUID
  if (!orgId) {
    orgId = crypto.randomUUID();
  }

  let organization = await store.getOrganization(orgId);

  // Only non-invited primary account holders can be OWNER
  if (
    !isExplicitStaff &&
    organization &&
    organization.email &&
    user.email &&
    organization.email.toLowerCase() === user.email.toLowerCase()
  ) {
    role = 'OWNER';
  }

  // Strict role boundaries:
  // An owner is the primary workspace creator who is NOT an invited staff member.
  const isOwner =
    !isExplicitStaff &&
    (role === 'OWNER' ||
      Boolean(
        organization?.email &&
          user.email &&
          organization.email.toLowerCase() === user.email.toLowerCase()
      ));

  // Any invited user, or non-owner, is staff
  const isStaff = !isOwner || isExplicitStaff;

  // Cache resolved membership for 30s
  membershipCache.set(user.id, {
    orgId,
    role,
    isStaff,
    isOwner,
    expiresAt: Date.now() + MEMBERSHIP_CACHE_TTL_MS,
  });

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
      default_currency: 'INR',
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
    isStaff,
    isOwner,
  };
}

export const getAuthenticatedUserContext = cache(resolveAuthenticatedUserContext);

