import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { calculateReportData } from '@/lib/reports/report-calculator';
import { generateQuoteFlowPdfReport } from '@/lib/reports/pdf-report-builder';
import { generateQuoteFlowCsvReport } from '@/lib/reports/csv-report-builder';
import { ReportFilterState, ReportCategory, ReportType, DateRangePreset } from '@/lib/reports/report-types';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized: Please log in.' }, { status: 401 });
    }

    const orgId = auth.orgId;
    const organization = (await store.getOrganization(orgId)) || auth.organization;
    const activeEnv = (organization.mode === 'test' ? 'test' : 'live') as 'live' | 'test';

    const { searchParams } = new URL(request.url);

    const category = (searchParams.get('category') as ReportCategory) || 'sales';
    const reportType = (searchParams.get('reportType') as ReportType) || 'sales-summary';
    const preset = (searchParams.get('preset') as DateRangePreset) || 'this_month';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const customerId = searchParams.get('customerId') || undefined;
    const productId = searchParams.get('productId') || undefined;
    const staffId = searchParams.get('staffId') || undefined;
    const status = searchParams.get('status') || undefined;
    const paymentStatus = (searchParams.get('paymentStatus') as any) || 'ALL';
    const paymentMethod = searchParams.get('paymentMethod') || undefined;
    const search = searchParams.get('search') || undefined;
    const exportFormat = searchParams.get('format')?.toLowerCase();

    // Role-based restrictions check
    const userRole = auth.role || 'STAFF';
    if (userRole === 'STAFF') {
      if (category === 'payments' || reportType === 'revenue-by-customer' || category === 'tax') {
        return NextResponse.json(
          { error: 'Forbidden: Staff members do not have permission to view sensitive financial/tax statements.' },
          { status: 403 }
        );
      }
    }

    const filters: ReportFilterState = {
      category,
      reportType,
      preset,
      startDate,
      endDate,
      customerId,
      productId,
      staffId,
      status,
      paymentStatus,
      paymentMethod,
      search,
      environment: activeEnv,
    };

    // Fetch tenant-scoped dataset
    const [quotations, invoices, customers, products] = await Promise.all([
      store.getQuotations(orgId, { environment: activeEnv }),
      store.getInvoices(orgId, { environment: activeEnv }),
      store.getCustomers(orgId, { environment: activeEnv }),
      store.getProducts(orgId),
    ]);

    const reportData = calculateReportData({
      filters,
      quotations,
      invoices,
      customers,
      products,
      organization,
      userRole,
    });

    const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
    const slug = organization.slug || 'quoteflow';

    // 1. PDF Export
    if (exportFormat === 'pdf') {
      const pdfBuffer = await generateQuoteFlowPdfReport(reportData);
      const filename = `${slug}_${category}_report_${timestamp}.pdf`;
      return new NextResponse(Buffer.from(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // 2. CSV Export
    if (exportFormat === 'csv') {
      const csvString = generateQuoteFlowCsvReport(reportData);
      const filename = `${slug}_${category}_report_${timestamp}.csv`;
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // 3. JSON Data
    return NextResponse.json({
      success: true,
      data: reportData,
    });
  } catch (err: any) {
    console.error('Reports API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
