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
  return NextResponse.json({ success: true, organization: org });
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role === 'STAFF') {
      return NextResponse.json(
        { error: 'Staff members cannot modify organization settings.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = OrganizationSettingsSchema.parse(body);

    const orgId = auth.orgId;
    const updated = await store.updateOrganization(orgId, validated as Partial<Organization>);

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
