import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { generateInvoicePdf } from '@/lib/pdf/invoice-pdf-generator';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { getSanitizedPdfFilename } from '@/lib/quotations/calculations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = auth.orgId;

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

    // 3. Fallback: if id is a quotation ID, check if an invoice was already issued for it
    if (!invoice) {
      invoice = await store.getInvoiceByQuotationId(id, orgId);
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Cross-environment guard
    const org = await store.getOrganization(orgId);
    const activeEnv = org?.mode === 'test' ? 'test' : 'live';
    if (activeEnv === 'test' && invoice.environment !== 'test') {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const pdfBytes = await generateInvoicePdf(invoice);
    const isIndia = Boolean(
      (org?.business_country || '').toUpperCase() === 'IN' ||
      (org?.country || '').toLowerCase() === 'india' ||
      invoice.currency === 'INR'
    );
    const filename = getSanitizedPdfFilename(
      invoice.document_type,
      invoice.invoice_number,
      invoice.status,
      isIndia && org?.gst_registered !== false
    );

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
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
