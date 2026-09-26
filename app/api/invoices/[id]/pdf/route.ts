import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { generateInvoicePdf } from '@/lib/pdf/invoice-pdf-generator';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

    // 1. Try finding invoice by direct invoice ID
    let invoice = await store.getInvoiceById(id, orgId);

    // 2. If not found by invoice ID, check if id is a quotation ID
    if (!invoice) {
      const allInvoices = await store.getInvoices(orgId);
      const matched = allInvoices.find((inv) => inv.quotation_id === id);
      if (matched) {
        invoice = await store.getInvoiceById(matched.id, orgId);
      }
    }

    // 3. Fallback: if quotation exists, ensure invoice
    if (!invoice) {
      const quote = await store.getQuotationById(id);
      if (quote) {
        invoice = await store.ensureInvoiceForQuotation(quote);
      }
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
    console.error('Invoice PDF generation error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate invoice PDF' },
      { status: 500 }
    );
  }
}
