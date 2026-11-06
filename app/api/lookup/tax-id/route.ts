import { NextRequest, NextResponse } from 'next/server';
import { lookupTaxId } from '@/lib/tax/tax-id-lookup';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taxNumber = searchParams.get('taxNumber') || searchParams.get('query') || searchParams.get('gstin');
    const country = searchParams.get('country') || undefined;

    if (!taxNumber || !taxNumber.trim()) {
      return NextResponse.json({ error: 'taxNumber query parameter is required' }, { status: 400 });
    }

    const result = await lookupTaxId({
      taxNumber: taxNumber.trim(),
      countryCode: country,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Tax ID lookup failed' },
      { status: 500 }
    );
  }
}
