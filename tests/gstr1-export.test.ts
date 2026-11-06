import { describe, it, expect } from 'vitest';
import { exportGstr1Excel, exportGstr1Json } from '@/lib/reports/gstr1-export-builder';
import { ReportResponseData } from '@/lib/reports/report-types';

describe('GSTR-1 CA Summary Builder & India Isolation', () => {
  const indiaReportData: ReportResponseData = {
    category: 'tax',
    reportType: 'india-gst-summary',
    filters: {
      category: 'tax',
      reportType: 'india-gst-summary',
      preset: 'this_month',
    },
    metrics: {
      totalSales: 250000,
      totalInvoiced: 250000,
      totalPaid: 200000,
      totalOutstanding: 50000,
      totalOverdue: 0,
      totalTax: 45000,
      totalDiscount: 0,
      quoteCount: 10,
      invoiceCount: 2,
      conversionRate: 80,
      currency: 'INR',
    },
    aging: {
      current: 50000,
      days1_30: 0,
      days31_60: 0,
      days61_90: 0,
      days90Plus: 0,
      totalOverdue: 0,
    },
    taxSummary: {
      taxSystem: 'GST',
      taxLabel: 'GSTIN',
      isIndiaGst: true,
      isUaeVat: false,
      taxableSales: 250000,
      totalTaxCollected: 45000,
      cgstTotal: 22500,
      sgstTotal: 22500,
      igstTotal: 0,
      hsnSummary: [
        {
          code: '998311',
          description: 'IT Consulting and Software Development',
          itemType: 'SERVICE',
          taxableAmount: 250000,
          taxRate: 18,
          cgstAmount: 22500,
          sgstAmount: 22500,
          igstAmount: 0,
          totalTax: 45000,
          totalAmount: 295000,
        },
      ],
    },
    trendChart: [],
    paymentMethodsChart: [],
    organization: {
      id: 'org-1',
      name: 'QuoteFlow India Private Limited',
      taxNumber: '32AABCB1234A1Z5',
      address: 'Infopark, Kochi, Kerala, India',
    },
    rows: [
      {
        id: 'inv-1',
        date: '2026-04-10',
        documentNumber: 'INV-101',
        documentType: 'INVOICE',
        linkHref: '/invoices/inv-1',
        customerId: 'cust-1',
        customerName: 'Tech Solutions India',
        customerCompany: 'Tech Solutions Pvt Ltd',
        customerTaxNumber: '32AABCT9999P1Z2', // Valid B2B GSTIN
        status: 'ISSUED',
        statusVariant: 'success',
        paymentStatus: 'PAID',
        currency: 'INR',
        subtotal: 150000,
        discountAmount: 0,
        taxRate: 18,
        taxAmount: 27000,
        grandTotal: 177000,
        paidAmount: 177000,
        balanceAmount: 0,
        itemsSummary: 'Software Design',
        cgstAmount: 13500,
        sgstAmount: 13500,
        igstAmount: 0,
      },
      {
        id: 'inv-2',
        date: '2026-04-12',
        documentNumber: 'INV-102',
        documentType: 'INVOICE',
        linkHref: '/invoices/inv-2',
        customerId: 'cust-2',
        customerName: 'Rahul Varma',
        customerCompany: '',
        customerTaxNumber: '', // Unregistered B2C
        status: 'ISSUED',
        statusVariant: 'success',
        paymentStatus: 'UNPAID',
        currency: 'INR',
        subtotal: 100000,
        discountAmount: 0,
        taxRate: 18,
        taxAmount: 18000,
        grandTotal: 118000,
        paidAmount: 0,
        balanceAmount: 118000,
        itemsSummary: 'IT Maintenance',
        cgstAmount: 9000,
        sgstAmount: 9000,
        igstAmount: 0,
      },
    ],
  };

  const usReportData: ReportResponseData = {
    ...indiaReportData,
    taxSummary: {
      taxSystem: 'SALES_TAX',
      taxLabel: 'EIN',
      isIndiaGst: false,
      isUaeVat: false,
      taxableSales: 10000,
      totalTaxCollected: 0,
    },
    organization: {
      id: 'org-us',
      name: 'QuoteFlow USA Inc',
      taxNumber: '12-3456789',
      address: '100 Broadway, New York, NY, USA',
    },
  };

  it('strictly prohibits GSTR-1 export for non-Indian organizations', () => {
    expect(() => exportGstr1Excel(usReportData)).toThrowError(
      /GSTR-1 Excel export is strictly available for Indian GST-registered organizations only/
    );

    expect(() => exportGstr1Json(usReportData)).toThrowError(
      /GSTR-1 JSON export is strictly available for Indian GST-registered organizations only/
    );
  });

  it('allows GSTR-1 Excel and JSON generation for Indian GST organizations', () => {
    // In node test environment, writeFile won't execute client download but validation succeeds
    expect(() => exportGstr1Excel(indiaReportData)).not.toThrow();
    expect(() => exportGstr1Json(indiaReportData)).not.toThrow();
  });
});
