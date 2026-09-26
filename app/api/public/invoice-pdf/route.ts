import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { generateInvoicePdf } from '@/lib/pdf/invoice-pdf-generator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const quoteId = searchParams.get('id') || searchParams.get('quotation_id');
    const invoiceId = searchParams.get('invoice_id');

    let invoice = null;

    if (invoiceId) {
      invoice = await store.getInvoiceById(invoiceId);
    }

    if (!invoice && (token || quoteId)) {
      let quote = null;
      if (token) {
        quote = await store.getQuotationByPublicToken(token);
      } else if (quoteId) {
        quote = await store.getQuotationById(quoteId);
      }

      if (!quote) {
        return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
      }

      const org = (await store.getOrganization(quote.organization_id)) || quote.organization;
      const requireFullPayment = org?.require_full_payment_for_invoice ?? true;

      if (requireFullPayment && !quote.is_paid) {
        return NextResponse.json(
          {
            error:
              'Official Commercial Tax Invoice is only generated once the quotation is marked as fully paid.',
          },
          { status: 403 }
        );
      }

      invoice = await store.ensureInvoiceForQuotation(quote);
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const pdfBytes = await generateInvoicePdf(invoice);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Invoice-${invoice.invoice_number}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Public Invoice PDF generation error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate invoice PDF' },
      { status: 500 }
    );
  }
}
