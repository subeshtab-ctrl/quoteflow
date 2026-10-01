import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { generateQuotationPdf } from '@/lib/pdf/generator';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const quoteId = searchParams.get('id');

    let quote = null;
    if (token) {
      quote = await store.getQuotationByPublicToken(token);
    }
    if (!quote && quoteId) {
      quote = await store.getQuotationById(quoteId);
    }

    if (!quote) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    if (!token && quoteId) {
      const auth = await getAuthenticatedUserContext();
      if (auth) {
        if (quote.organization_id && auth.orgId && quote.organization_id !== auth.orgId) {
          return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
        }
      }
    }

    const pdfBytes = await generateQuotationPdf(quote);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Quotation-${quote.quotation_number}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('PDF generation error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
