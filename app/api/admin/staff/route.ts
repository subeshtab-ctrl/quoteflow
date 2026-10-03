import { NextRequest, NextResponse } from 'next/server';
import {
  isAuthorizedDeveloperAdmin,
  getSupportStaffMembers,
  addSupportStaffMember,
  removeSupportStaffMember,
} from '@/lib/billing/dev-admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const staff = getSupportStaffMembers();
    return NextResponse.json({ success: true, staff });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, role } = body;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'Staff name and email are required.' },
        { status: 400 }
      );
    }

    // Basic email format check
    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const newStaff = addSupportStaffMember({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      role: role || 'SUPPORT_ENGINEER',
    });

    return NextResponse.json({ success: true, staff: newStaff });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add staff member' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const id = searchParams.get('id') || body.id;

    if (!id) {
      return NextResponse.json({ error: 'Staff ID is required.' }, { status: 400 });
    }

    const removed = removeSupportStaffMember(id);
    if (!removed) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
