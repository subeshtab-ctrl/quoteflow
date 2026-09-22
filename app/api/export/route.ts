import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { generateFinancialCsv } from '@/lib/export/csv-generator';
import { generateFinancialReportPdf } from '@/lib/export/report-pdf-generator';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

interface ExportParams {
  format?: 'CSV' | 'PDF';
  dateFilter?: 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30_DAYS' | 'THIS_QUARTER' | 'THIS_YEAR' | 'ALL' | 'CUSTOM';
  startDate?: string;
  endDate?: string;
  approvalStatus?: 'ALL' | 'APPROVED' | 'NOT_APPROVED';
  paymentStatus?: 'ALL' | 'PAID' | 'UNPAID';
  documentType?: 'ALL' | 'QUOTATIONS' | 'INVOICES';
}

function computeDateRange(params: ExportParams): {
  start: Date | null;
  end: Date | null;
  label: string;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (params.dateFilter) {
    case 'THIS_MONTH': {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end, label: format(start, 'MMMM yyyy') };
    }
    case 'LAST_MONTH': {
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      return { start, end, label: format(start, 'MMMM yyyy') };
    }
    case 'LAST_30_DAYS': {
      const start = new Date(now.getTime() - 30 * 86400000);
      return { start, end: now, label: 'Last 30 Days' };
    }
    case 'THIS_QUARTER': {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      const start = new Date(year, quarterStartMonth, 1, 0, 0, 0, 0);
      const end = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59, 999);
      return { start, end, label: `Q${Math.floor(month / 3) + 1} ${year}` };
    }
    case 'THIS_YEAR': {
      const start = new Date(year, 0, 1, 0, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      return { start, end, label: `Year ${year}` };
    }
    case 'CUSTOM': {
      if (params.startDate && params.endDate) {
        const start = new Date(`${params.startDate}T00:00:00`);
        const end = new Date(`${params.endDate}T23:59:59`);
        return {
          start,
          end,
          label: `${format(start, 'dd MMM yyyy')} to ${format(end, 'dd MMM yyyy')}`,
        };
      }
      return { start: null, end: null, label: 'Custom Range' };
    }
    case 'ALL':
    default:
      return { start: null, end: null, label: 'All Records (All Time)' };
  }
}

async function handleExport(params: ExportParams) {
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

  const [allQuotations, organization] = await Promise.all([
    store.getQuotations(orgId),
    store.getOrganization(orgId),
  ]);

  const { start, end, label: dateRangeLabel } = computeDateRange(params);

  // Filter quotations
  const filtered = allQuotations.filter((q) => {
    // 1. Date filter
    if (start && end) {
      const qDateStr = q.issue_date || q.created_at;
      const qDate = new Date(qDateStr);
      if (qDate.getTime() < start.getTime() || qDate.getTime() > end.getTime()) {
        return false;
      }
    }

    // 2. Approval status filter
    if (params.approvalStatus === 'APPROVED' && q.status !== 'APPROVED') {
      return false;
    }
    if (params.approvalStatus === 'NOT_APPROVED' && q.status === 'APPROVED') {
      return false;
    }

    // 3. Payment status filter
    if (params.paymentStatus === 'PAID') {
      if (q.status !== 'APPROVED' || !q.is_paid) return false;
    }
    if (params.paymentStatus === 'UNPAID') {
      if (q.status !== 'APPROVED' || q.is_paid) return false;
    }

    // 4. Document type filter (strictly invoices: only approved AND paid quotes apply)
    if (params.documentType === 'INVOICES' && (q.status !== 'APPROVED' || !q.is_paid)) {
      return false;
    }

    return true;
  });

  const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
  const orgSlug = organization?.slug || 'quoteflow';

  // Format labels for PDF metadata
  const statusLabel =
    params.approvalStatus === 'APPROVED'
      ? 'Approved Deals Only'
      : params.approvalStatus === 'NOT_APPROVED'
      ? 'Unapproved / In Progress'
      : 'All Approval Statuses';

  const paymentLabel =
    params.paymentStatus === 'PAID'
      ? 'Paid Only'
      : params.paymentStatus === 'UNPAID'
      ? 'Unpaid Only'
      : 'All Payment Statuses';

  const documentTypeLabel =
    params.documentType === 'INVOICES'
      ? 'Commercial Tax Invoices'
      : params.documentType === 'QUOTATIONS'
      ? 'Quotations Only'
      : 'Quotations & Invoices';

  if (params.format === 'PDF') {
    const pdfBuffer = await generateFinancialReportPdf({
      quotations: filtered,
      organization,
      dateRangeLabel,
      statusLabel,
      paymentLabel,
      documentTypeLabel,
    });

    const filename = `${orgSlug}_financial_statement_${timestamp}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  // Default: CSV export
  const csvContent = generateFinancialCsv({
    quotations: filtered,
    documentType: params.documentType || 'ALL',
    organization,
  });

  const filename = `${orgSlug}_export_${timestamp}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportParams = await request.json();
    return await handleExport(body);
  } catch (err: any) {
    console.error('Export POST error:', err);
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params: ExportParams = {
      format: (searchParams.get('format') as any) || 'CSV',
      dateFilter: (searchParams.get('dateFilter') as any) || 'ALL',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      approvalStatus: (searchParams.get('approvalStatus') as any) || 'ALL',
      paymentStatus: (searchParams.get('paymentStatus') as any) || 'ALL',
      documentType: (searchParams.get('documentType') as any) || 'ALL',
    };
    return await handleExport(params);
  } catch (err: any) {
    console.error('Export GET error:', err);
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}
