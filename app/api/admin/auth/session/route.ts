import { NextRequest, NextResponse } from 'next/server';
import {
  isAuthorizedDeveloperAdmin,
  DEVELOPER_ADMIN_EMAIL,
  hasDeveloperAdminPassword,
} from '@/lib/billing/dev-admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    const hasPassword = hasDeveloperAdminPassword();

    return NextResponse.json({
      authenticated: isAuth,
      email: DEVELOPER_ADMIN_EMAIL,
      hasPassword,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
