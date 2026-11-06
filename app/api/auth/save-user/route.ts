import { NextRequest, NextResponse } from 'next/server';
import { syncUserAndOrganization } from '@/lib/supabase/auth-sync';

export async function POST(req: NextRequest) {
  try {
    const { userId, email, fullName, companyName } = await req.json();

    const result = await syncUserAndOrganization({
      userId,
      email,
      fullName,
      companyName,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to save user details' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User and organization details saved successfully',
    });
  } catch (err: any) {
    console.error('Failed to save user details:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save user details' },
      { status: 400 }
    );
  }
}
