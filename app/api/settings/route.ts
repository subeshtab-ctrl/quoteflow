import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { OrganizationSettingsSchema } from '@/lib/validations/quotation';
import { Organization } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const org = await store.getOrganization();
  return NextResponse.json({ success: true, organization: org });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = OrganizationSettingsSchema.parse(body);

    const orgId = body.id || 'a0000000-0000-0000-0000-000000000001';
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
