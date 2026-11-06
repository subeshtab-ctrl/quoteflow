import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  isAuthorizedDeveloperAdmin,
  hasAdminPermission,
  getSupportStaffMembers,
  addSupportStaffMember,
  updateSupportStaffMember,
  removeSupportStaffMember,
  recordAdminSecurityEvent,
} from '@/lib/billing/dev-admin-auth';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const staff = getSupportStaffMembers().map((s) => ({
      ...s,
      passwordHash: undefined,
      salt: undefined,
    }));
    return NextResponse.json({ success: true, staff });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { allowed, actor } = await hasAdminPermission(req, 'manage_admin_staff');
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: Super Admin permission required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, role, permissions, password } = body;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'Staff name and email are required.' },
        { status: 400 }
      );
    }

    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const newStaff = await addSupportStaffMember({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      role: role || 'SUPPORT_ADMIN',
      permissions: Array.isArray(permissions) ? permissions : undefined,
      password: password?.trim(),
    });

    await store.logAdminAudit({
      id: crypto.randomUUID(),
      admin_user_id: actor.email,
      admin_email: actor.email,
      action: 'ADD_ADMIN_STAFF',
      target_type: 'admin_staff',
      target_id: newStaff.id,
      metadata: {
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        permissions: newStaff.permissions,
      },
      created_at: new Date().toISOString(),
    });

    recordAdminSecurityEvent({
      eventType: 'Admin Staff Created',
      severity: 'low',
      actorEmail: actor.email,
      details: `Created admin staff ${newStaff.name} (${newStaff.email}) as ${newStaff.role}`,
    });

    return NextResponse.json({
      success: true,
      staff: { ...newStaff, passwordHash: undefined, salt: undefined },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add staff member' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { allowed, actor } = await hasAdminPermission(req, 'manage_admin_staff');
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: Super Admin permission required' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, phone, role, permissions, status, password } = body;
    if (!id) {
      return NextResponse.json({ error: 'Staff ID is required.' }, { status: 400 });
    }

    const updated = await updateSupportStaffMember(id, {
      name,
      phone,
      role,
      permissions,
      status,
      password,
    });
    if (!updated) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
    }

    await store.logAdminAudit({
      id: crypto.randomUUID(),
      admin_user_id: actor.email,
      admin_email: actor.email,
      action: 'UPDATE_ADMIN_STAFF',
      target_type: 'admin_staff',
      target_id: id,
      metadata: {
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status,
        permissions: updated.permissions,
      },
      created_at: new Date().toISOString(),
    });

    recordAdminSecurityEvent({
      eventType: 'Admin Staff Role/Permissions Updated',
      severity: 'medium',
      actorEmail: actor.email,
      details: `Updated ${updated.email} to role ${updated.role} (status: ${updated.status})`,
    });

    return NextResponse.json({
      success: true,
      staff: { ...updated, passwordHash: undefined, salt: undefined },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update staff member' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { allowed, actor } = await hasAdminPermission(req, 'manage_admin_staff');
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: Super Admin permission required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const id = searchParams.get('id') || body.id;

    if (!id) {
      return NextResponse.json({ error: 'Staff ID is required.' }, { status: 400 });
    }

    const removed = await removeSupportStaffMember(id);
    if (!removed) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
    }

    await store.logAdminAudit({
      id: crypto.randomUUID(),
      admin_user_id: actor.email,
      admin_email: actor.email,
      action: 'REMOVE_ADMIN_STAFF',
      target_type: 'admin_staff',
      target_id: id,
      metadata: { id },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
