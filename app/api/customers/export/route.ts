import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

    const [organization, customers, quotes] = await Promise.all([
      store.getOrganization(orgId),
      store.getCustomers(orgId),
      store.getQuotations(orgId),
    ]);

    // Group quotations by customer ID for stats
    const quoteStatsByCustomer = new Map<string, { count: number; totalValue: number; currency: string }>();
    for (const q of quotes) {
      if (!q.customer_id) continue;
      const current = quoteStatsByCustomer.get(q.customer_id) || {
        count: 0,
        totalValue: 0,
        currency: q.currency || organization?.default_currency || 'INR',
      };
      current.count += 1;
      current.totalValue += Number(q.grand_total) || 0;
      quoteStatsByCustomer.set(q.customer_id, current);
    }

    const headers = [
      'Customer ID',
      'Contact Person',
      'Company Name',
      'Email Address',
      'Country Code',
      'Mobile / Phone',
      'Tax / GST / VAT Number',
      'Billing Address',
      'Shipping Address',
      'City',
      'State',
      'Country',
      'Postal Code',
      'Total Quotations',
      'Total Quoted Value',
      'Currency',
      'Notes',
      'Created Date',
      'Last Updated',
    ];

    const rows: string[] = [];
    rows.push(headers.map(escapeCsvCell).join(','));

    for (const c of customers) {
      const stats = quoteStatsByCustomer.get(c.id) || {
        count: 0,
        totalValue: 0,
        currency: organization?.default_currency || 'INR',
      };

      const rawEmail = c.email || '';
      const isInternalEmail =
        rawEmail.endsWith('@mobile.client') ||
        rawEmail.endsWith('@customer.local') ||
        rawEmail.endsWith('@phone.portal');
      const displayEmail = isInternalEmail ? '' : rawEmail;

      const row = [
        c.id,
        c.name || '',
        c.company_name || '',
        displayEmail,
        c.phone_country_code || '',
        c.phone || '',
        c.tax_number || '',
        c.billing_address || '',
        c.shipping_address || '',
        c.city || '',
        c.state || '',
        c.country || '',
        c.postal_code || '',
        stats.count,
        stats.totalValue.toFixed(2),
        stats.currency,
        c.notes || '',
        c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : '',
        c.updated_at ? new Date(c.updated_at).toISOString().split('T')[0] : '',
      ];

      rows.push(row.map(escapeCsvCell).join(','));
    }

    // Add UTF-8 Byte Order Mark (BOM) so Microsoft Excel opens unicode text properly
    const csvContent = '\uFEFF' + rows.join('\r\n');
    const dateStr = new Date().toISOString().split('T')[0];
    const orgSlug = organization?.slug || 'customers';
    const filename = `${orgSlug}_customers_${dateStr}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    console.error('Error exporting customers:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to export customers' },
      { status: 500 }
    );
  }
}
