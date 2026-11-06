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

    // Only Owner or Admin should see staff overview KPI card
    if (!isOwnerOrAdminRole(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required for staff overview' },
        { status: 403 }
      );
    }

    const stats = await staffService.getStaffOverviewStats(auth.orgId);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (err: any) {
    console.error('Failed to get staff overview stats:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to get staff overview stats' },
      { status: 500 }
    );
  }
}
