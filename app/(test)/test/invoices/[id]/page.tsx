import { redirect } from 'next/navigation';

// Test invoice detail — redirect to the standard invoice detail view
// The invoice detail view already shows the environment correctly (test watermark, delete button etc.)
export default async function TestInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/invoices/${id}`);
}
