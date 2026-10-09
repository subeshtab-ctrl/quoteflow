import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { OrganizationSettingsSchema } from '@/lib/validations/quotation';
import { Organization } from '@/types/database';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
  const org = await store.getOrganization(orgId);
  const hasLiveDocuments = await store.hasLiveDocuments(orgId);
  return NextResponse.json({ success: true, organization: org, has_live_documents: hasLiveDocuments });
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

    if (auth && auth.role === 'STAFF') {
      return NextResponse.json(
        { error: 'Staff members cannot modify organization settings.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = OrganizationSettingsSchema.parse(body);
    const updated = await store.updateOrganization(orgId, validated as Partial<Organization>);

    if (auth?.userId && validated.name) {
      try {
        const { createAdminClient } = await import('@/lib/supabase/service-role');
        const admin = createAdminClient();
        if (admin) {
          await admin.auth.admin.updateUserById(auth.userId, {
            user_metadata: {
              company_name: validated.name,
            },
          });
        }
      } catch (metaErr) {
        console.warn('Could not sync company_name into user metadata:', metaErr);
      }
    }

    return NextResponse.json({ success: true, organization: updated });
  } catch (err: any) {
    console.error('Error updating settings:', err);
    let errorMsg = err.message || 'Failed to update organization settings';
    if (err.errors && Array.isArray(err.errors)) {
      errorMsg = err.errors.map((e: any) => `${e.path?.join('.') || 'field'}: ${e.message}`).join('; ');
    }
    return NextResponse.json(
      { error: errorMsg },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

    if (auth && auth.role === 'STAFF') {
      return NextResponse.json(
        { error: 'Staff members cannot modify organization settings.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updated = await store.updateOrganization(orgId, body as Partial<Organization>);

    return NextResponse.json({ success: true, organization: updated });
  } catch (err: any) {
    console.error('Error in settings PATCH:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update settings' },
      { status: 400 }
    );
  }
}
