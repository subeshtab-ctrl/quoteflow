import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { QuotationFormSchema } from '@/lib/validations/quotation';
import { generateQuotationSentEmail, sendEmail } from '@/lib/email/service';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const quotations = await store.getQuotations(orgId, { status, search });
    return NextResponse.json({ success: true, quotations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const body = await req.json();
    const validated = QuotationFormSchema.parse(body);

    const quotation = await store.createQuotation({
      ...validated,
      organization_id: orgId,
    });

    // If quotation status was set to SENT, send email if customer has email
    if (quotation.status === 'SENT' && quotation.customer?.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com';
      const org = quotation.organization || (await store.getOrganization(orgId));
      const emailPayload = generateQuotationSentEmail({
        customerName: quotation.customer.name,
        companyName: org?.name || 'QuoteFlow',
        replyTo: org?.email,
        quotationNumber: quotation.quotation_number,
        amount: quotation.grand_total,
        currency: quotation.currency,
        validUntil: quotation.valid_until,
        publicUrl: `${appUrl}/q/${quotation.public_token}`,
      });
      emailPayload.to = quotation.customer.email;
      sendEmail(emailPayload).catch(console.error);
    }

    return NextResponse.json({ success: true, quotation });
  } catch (err: any) {
    console.error('Error creating quotation:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create quotation' },
      { status: 400 }
    );
  }
}
