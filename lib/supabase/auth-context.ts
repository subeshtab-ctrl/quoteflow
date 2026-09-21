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

  const admin = createAdminClient();
  let orgId = (user.user_metadata?.organization_id as string) || '';
  let role: UserRole = (user.user_metadata?.role as UserRole) || 'OWNER';

  // If orgId not in metadata, lookup from organization_members table
  if (!orgId && admin) {
    try {
      const { data: member } = await admin
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (member?.organization_id) {
        orgId = member.organization_id;
        if (member.role) role = member.role as UserRole;

        // Cache on user_metadata so future checks are instant
        try {
          await admin.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              organization_id: orgId,
              role,
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

  // Fallback if legacy user has no org assigned
  if (!orgId) {
    orgId = 'a0000000-0000-0000-0000-000000000001';
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
