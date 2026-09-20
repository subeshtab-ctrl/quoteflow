import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { ApprovalSchema } from '@/lib/validations/quotation';
import { generateQuotationApprovedEmail, sendEmail } from '@/lib/email/service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = ApprovalSchema.parse(body);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const approvedQuote = await store.approveQuotation({
      token: validated.token,
      signer_name: validated.signer_name,
      signer_email: validated.signer_email,
      signer_company: validated.signer_company,
      signature_data_url: validated.signature_data_url,
      signature_type: validated.signature_type,
      ip_address: ip,
      user_agent: userAgent,
    });

    // Send email notification to business and customer
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const publicUrl = `${appUrl}/q/${validated.token}`;

    if (approvedQuote.organization?.email) {
      const emailPayload = generateQuotationApprovedEmail({
        signerName: validated.signer_name,
        companyName: approvedQuote.organization.name,
        quotationNumber: approvedQuote.quotation_number,
        amount: approvedQuote.grand_total,
        currency: approvedQuote.currency,
        publicUrl,
      });
      emailPayload.to = approvedQuote.organization.email;
      // Fire and don't block
      sendEmail(emailPayload).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      quotation: approvedQuote,
      message: 'Quotation successfully approved and digitally signed.',
    });
  } catch (err: any) {
    console.error('Approval Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process quotation approval' },
      { status: 400 }
    );
  }
}
