import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { RejectionSchema } from '@/lib/validations/quotation';
import { generateQuotationRejectedEmail, sendEmail } from '@/lib/email/service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RejectionSchema.parse(body);

    const rejectedQuote = await store.rejectQuotation({
      token: validated.token,
      reason: validated.reason,
      comments: validated.comments,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const publicUrl = `${appUrl}/q/${validated.token}`;

    if (rejectedQuote.organization?.email) {
      const emailPayload = generateQuotationRejectedEmail({
        customerName: rejectedQuote.customer?.name || 'Customer',
        companyName: rejectedQuote.organization.name,
        quotationNumber: rejectedQuote.quotation_number,
        reason: validated.reason,
        comments: validated.comments,
        publicUrl,
      });
      emailPayload.to = rejectedQuote.organization.email;
      sendEmail(emailPayload).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      quotation: rejectedQuote,
      message: 'Rejection feedback received.',
    });
  } catch (err: any) {
    console.error('Rejection Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to submit rejection' },
      { status: 400 }
    );
  }
}
