import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedDeveloperAdmin } from '@/lib/billing/dev-admin-auth';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { subscribers } = await store.getAllSubscribers({ limit: 10000 });
    const POZONE_ID = '765a894f-c3c4-4fe4-a8e2-7b240eda570a';

    const testAccounts = subscribers.filter((s) => {
      if (s.business_id === POZONE_ID) return false;
      if (s.last_payment_id && !s.last_payment_id.startsWith('pay_mock_')) return false;
      return s.is_test === true;
    });

    return NextResponse.json({
      success: true,
      count: testAccounts.length,
      accounts: testAccounts.map((a) => ({
        id: a.business_id,
        name: a.organization?.name || 'Test Business',
        email: a.organization?.email || '',
        created_at: a.created_at,
      })),
    });
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

    const { subscribers } = await store.getAllSubscribers({ limit: 10000 });
    const POZONE_ID = '765a894f-c3c4-4fe4-a8e2-7b240eda570a';

    const testAccounts = subscribers.filter((s) => {
      if (s.business_id === POZONE_ID) return false;
      if (s.last_payment_id && !s.last_payment_id.startsWith('pay_mock_')) return false;
      return s.is_test === true;
    });

    let cleanedCount = 0;
    const errors: string[] = [];

    for (const acc of testAccounts) {
      try {
        await store.softDeleteTestBusiness(
          acc.business_id,
          'developer-admin',
          'Automated AI/Test account cleanup'
        );
        cleanedCount++;
      } catch (err: any) {
        errors.push(`Failed to clean ${acc.business_id}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      cleanedCount,
      totalDetected: testAccounts.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
