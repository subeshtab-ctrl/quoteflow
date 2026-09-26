import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { generatePaymentReceiptPdf } from '@/lib/pdf/receipt-pdf-generator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const quoteId = searchParams.get('id');

    let quote = null;
    if (token) {
      quote = await store.getQuotationByPublicToken(token);
    } else if (quoteId) {
      quote = await store.getQuotationById(quoteId);
    }

    if (!quote) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    // Only allow receipt download if payment was confirmed by company or is_paid
    const isPaid = Boolean(quote.is_paid);
    const hasAdvance = Boolean(quote.paid_amount && quote.paid_amount > 0);
    const isConfirmed = Boolean(quote.payment_confirmed_by_company ?? isPaid);

    if ((!isPaid && !hasAdvance) || !isConfirmed) {
      return NextResponse.json(
        {
          error:
            'Payment receipt is only available once payment has been officially confirmed by company finance.',
        },
        { status: 403 }
      );
    }

    const pdfBytes = await generatePaymentReceiptPdf(quote);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Receipt-${quote.quotation_number}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Receipt PDF generation error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate receipt PDF' },
      { status: 500 }
    );
  }
}
