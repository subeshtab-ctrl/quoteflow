import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { businessMemoryService } from '@/lib/ai/business-operator/memory-service';
import { isOwnerOrAdminRole } from '@/types/staff';
import { staffService } from '@/lib/staff/staff-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = auth.orgId;
    const entitlement = await subscriptionService.getOrganizationEntitlement(orgId);
    if (!entitlement.hasAccess) {
      return NextResponse.json({ error: 'Active subscription required' }, { status: 402 });
    }

    const [profile, memories] = await Promise.all([
      businessMemoryService.getProfile(orgId),
      businessMemoryService.getMemories(orgId),
    ]);

    return NextResponse.json({
      success: true,
      profile,
      memories,
      canEdit: isOwnerOrAdminRole(auth.role) || staffService.hasPermission(auth.role, undefined, 'settings_edit'),
    });
  } catch (err: any) {
    console.error('Error fetching business memory:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch business memory' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canEdit =
      isOwnerOrAdminRole(auth.role) ||
      staffService.hasPermission(auth.role, undefined, 'settings_edit');

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Forbidden: Only Business Owner or Admin can modify AI Business Memory' },
        { status: 403 }
      );
    }

    const orgId = auth.orgId;
    const body = await req.json().catch(() => ({}));
    const { action, profileUpdates, memoryEntry, memoryId } = body;

    if (action === 'update_profile' && profileUpdates) {
      const updatedProfile = await businessMemoryService.upsertProfile(orgId, profileUpdates);
      return NextResponse.json({ success: true, profile: updatedProfile });
    }

    if (action === 'add_memory' && memoryEntry) {
      const created = await businessMemoryService.addMemory(orgId, {
        ...memoryEntry,
        created_by: auth.userId,
      });
      return NextResponse.json({ success: true, memory: created });
    }

    if (action === 'confirm_memory' && memoryId) {
      const confirmed = await businessMemoryService.confirmMemory(orgId, memoryId, auth.userId);
      return NextResponse.json({ success: true, memory: confirmed });
    }

    if (action === 'disable_memory' && memoryId) {
      const disabled = await businessMemoryService.disableMemory(orgId, memoryId);
      return NextResponse.json({ success: true, memory: disabled });
    }

    if (action === 'delete_memory' && memoryId) {
      await businessMemoryService.deleteMemory(orgId, memoryId);
      return NextResponse.json({ success: true, deleted: true });
    }

    return NextResponse.json({ error: 'Invalid memory action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error modifying business memory:', err);
    return NextResponse.json({ error: err?.message || 'Failed to modify business memory' }, { status: 500 });
  }
}
