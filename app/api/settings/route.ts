import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { OrganizationSettingsSchema } from '@/lib/validations/quotation';

export async function GET() {
  const org = await store.getOrganization();
  return NextResponse.json({ success: true, organization: org });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = OrganizationSettingsSchema.parse(body);

    const updated = await store.updateOrganization(
      'a0000000-0000-0000-0000-000000000001',
      validated
    );
    return NextResponse.json({ success: true, organization: updated });
  } catch (err: any) {
    console.error('Error updating settings:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update organization settings' },
      { status: 400 }
    );
  }
}
