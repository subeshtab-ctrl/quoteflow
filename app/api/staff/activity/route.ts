import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { staffService } from '@/lib/staff/staff-service';
import { isOwnerOrAdminRole } from '@/types/staff';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Requirement 4: Visible only to authorized Owner/Admin users.
    // Regular staff must NOT see this menu or access its API endpoint.
    // Enforce authorization server-side with 403 Forbidden.
    if (!isOwnerOrAdminRole(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required for activity log' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staff_id') || undefined;
    const role = searchParams.get('role') || undefined;
    const action = searchParams.get('action') || undefined;
    const mod = searchParams.get('module') || undefined;
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { logs, total } = await staffService.getStaffActivityLogs(auth.orgId, {
      staffId,
      role,
      action,
      module: mod,
      startDate,
      endDate,
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      logs,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    });
  } catch (err: any) {
    console.error('Failed to get activity logs:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to get activity logs' },
      { status: 500 }
    );
  }
}
