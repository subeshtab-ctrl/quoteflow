import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';

interface RouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const revision = await store.createQuotationRevision(id);
    return NextResponse.json({
      success: true,
      quotation: revision,
      message: `Revision ${revision.quotation_number} created.`,
    });
  } catch (err: any) {
    console.error('Error creating revision:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create revision' },
      { status: 400 }
    );
  }
}
