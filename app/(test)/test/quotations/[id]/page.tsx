import { redirect } from 'next/navigation';

// Test quotation detail — redirect to the standard quotation detail view
// The quotation detail view already shows the environment correctly
export default async function TestQuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/quotations/${id}`);
}
