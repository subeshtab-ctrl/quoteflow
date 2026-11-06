import { ReportResponseData, ReportRow } from '@/lib/reports/report-types';

export interface Gstr1ExportOptions {
  returnPeriod?: string; // e.g. "042026" (MMYYYY)
}

/**
 * Builds and downloads the official GSTR-1 CA Summary Excel workbook (.xlsx).
 * STRICTLY GATED TO INDIA: Only executes if data.taxSummary.isIndiaGst is true.
 * Uses dynamic import so that xlsx is NEVER loaded on Cloudflare Workers / server runtimes.
 */
export function exportGstr1Excel(data: ReportResponseData, filename?: string): boolean | Promise<boolean> {
  if (!data.taxSummary.isIndiaGst) {
    throw new Error('GSTR-1 Excel export is strictly available for Indian GST-registered organizations only.');
  }

  if (typeof window === 'undefined') {
    return true;
  }

  return import('xlsx').then((XLSX) => {

  const invoiceRows = data.rows.filter(
    (r) => r.documentType === 'INVOICE' && r.status !== 'CANCELLED' && r.status !== 'VOIDED'
  );

  const orgGstin = data.organization.taxNumber || '';
  const defaultPlaceOfSupply = data.organization.address?.includes('Kerala') ? '32-Kerala' : '32-Kerala';

  // 1. Table 4: B2B Invoices (Registered Customers with GSTIN)
  const b2bRows = invoiceRows
    .filter((r) => Boolean(r.customerTaxNumber && r.customerTaxNumber.trim().length >= 10))
    .map((r) => ({
      'GSTIN/UIN of Recipient': r.customerTaxNumber?.trim().toUpperCase(),
      'Receiver Name': r.customerCompany || r.customerName,
      'Invoice Number': r.documentNumber,
      'Invoice Date': r.date,
      'Invoice Value': Number(r.grandTotal.toFixed(2)),
      'Place Of Supply': defaultPlaceOfSupply,
      'Reverse Charge': 'N',
      'Applicable % of Tax Rate': '',
      'Invoice Type': 'Regular B2B',
      'E-Commerce GSTIN': '',
      'Rate (%)': r.taxRate,
      'Taxable Value': Number(r.subtotal.toFixed(2)),
      'Integrated Tax (IGST)': Number((r.igstAmount || 0).toFixed(2)),
      'Central Tax (CGST)': Number((r.cgstAmount || 0).toFixed(2)),
      'State/UT Tax (SGST)': Number((r.sgstAmount || 0).toFixed(2)),
      'Cess Amount': 0,
    }));

  // 2. Table 5: B2CL (Interstate Unregistered Invoices > Rs. 2,50,000)
  const b2clRows = invoiceRows
    .filter(
      (r) =>
        (!r.customerTaxNumber || r.customerTaxNumber.trim().length < 10) &&
        (r.igstAmount || 0) > 0 &&
        r.grandTotal > 250000
    )
    .map((r) => ({
      'Invoice Number': r.documentNumber,
      'Invoice Date': r.date,
      'Invoice Value': Number(r.grandTotal.toFixed(2)),
      'Place Of Supply': defaultPlaceOfSupply,
      'Applicable % of Tax Rate': '',
      'Rate (%)': r.taxRate,
      'Taxable Value': Number(r.subtotal.toFixed(2)),
      'Cess Amount': 0,
      'Integrated Tax (IGST)': Number((r.igstAmount || 0).toFixed(2)),
      'E-Commerce GSTIN': '',
    }));

  // 3. Table 7: B2CS Invoices (Unregistered / Retail Customers)
  const b2cRows = invoiceRows
    .filter((r) => {
      const isUnregistered = !r.customerTaxNumber || r.customerTaxNumber.trim().length < 10;
      const isB2CL = isUnregistered && (r.igstAmount || 0) > 0 && r.grandTotal > 250000;
      return isUnregistered && !isB2CL;
    })
    .map((r) => ({
      'Type': 'OE',
      'Place Of Supply': defaultPlaceOfSupply,
      'Applicable % of Tax Rate': '',
      'Rate (%)': r.taxRate,
      'Taxable Value': Number(r.subtotal.toFixed(2)),
      'Cess Amount': 0,
      'Integrated Tax (IGST)': Number((r.igstAmount || 0).toFixed(2)),
      'Central Tax (CGST)': Number((r.cgstAmount || 0).toFixed(2)),
      'State/UT Tax (SGST)': Number((r.sgstAmount || 0).toFixed(2)),
      'E-Commerce GSTIN': '',
    }));

  // 3. Table 12: HSN / SAC Summary
  const hsnRows = (data.taxSummary.hsnSummary || []).map((h) => ({
    'HSN/SAC Code': h.code || '998311',
    'Description': h.description || (h.itemType === 'SERVICE' ? 'Services' : 'Goods'),
    'UQC': h.itemType === 'SERVICE' ? 'OTH' : 'NOS',
    'Total Quantity': 1,
    'Total Value': Number(h.totalAmount.toFixed(2)),
    'Taxable Value': Number(h.taxableAmount.toFixed(2)),
    'Integrated Tax (IGST)': Number((h.igstAmount || 0).toFixed(2)),
    'Central Tax (CGST)': Number((h.cgstAmount || 0).toFixed(2)),
    'State/UT Tax (SGST)': Number((h.sgstAmount || 0).toFixed(2)),
    'Cess Amount': 0,
  }));

  // 4. Table 13: Document Summary (Docs Issued)
  const numbers = invoiceRows.map((r) => r.documentNumber).filter(Boolean);
  const minDoc = numbers.length > 0 ? numbers[numbers.length - 1] : 'INV-0001';
  const maxDoc = numbers.length > 0 ? numbers[0] : 'INV-0001';
  const cancelledCount = data.rows.filter(
    (r) => r.documentType === 'INVOICE' && (r.status === 'CANCELLED' || r.status === 'VOIDED')
  ).length;

  const docRows = [
    {
      'Nature of Document': 'Invoices for outward supply',
      'Sr. No. From': minDoc,
      'Sr. No. To': maxDoc,
      'Total Number': invoiceRows.length + cancelledCount,
      'Cancelled': cancelledCount,
      'Net Issued': invoiceRows.length,
    },
  ];

  // Create multi-sheet Workbook
  const wb = XLSX.utils.book_new();

  const wsB2B = XLSX.utils.json_to_sheet(b2bRows.length > 0 ? b2bRows : [{ 'Notice': 'No B2B Invoices in this period' }]);
  const wsB2CL = XLSX.utils.json_to_sheet(b2clRows.length > 0 ? b2clRows : [{ 'Notice': 'No B2CL Invoices in this period' }]);
  const wsB2C = XLSX.utils.json_to_sheet(b2cRows.length > 0 ? b2cRows : [{ 'Notice': 'No B2CS Invoices in this period' }]);
  const wsHSN = XLSX.utils.json_to_sheet(hsnRows.length > 0 ? hsnRows : [{ 'Notice': 'No HSN data available' }]);
  const wsDocs = XLSX.utils.json_to_sheet(docRows);

  XLSX.utils.book_append_sheet(wb, wsB2B, 'b2b');
  XLSX.utils.book_append_sheet(wb, wsB2CL, 'b2cl');
  XLSX.utils.book_append_sheet(wb, wsB2C, 'b2cs');
  XLSX.utils.book_append_sheet(wb, wsHSN, 'hsn');
  XLSX.utils.book_append_sheet(wb, wsDocs, 'docs');

  const exportName = filename || `GSTR1_${orgGstin || 'IN'}_${(data as any).filters?.preset || 'report'}_${new Date().toISOString().split('T')[0]}.xlsx`;

    if (typeof window !== 'undefined') {
      XLSX.writeFile(wb, exportName);
      return true;
    }
    return false;
  });
}

/**
 * Builds and downloads the official GSTR-1 Offline Tool JSON format.
 * STRICTLY GATED TO INDIA: Only executes if data.taxSummary.isIndiaGst is true.
 */
export function exportGstr1Json(data: ReportResponseData, filename?: string): boolean {
  if (!data.taxSummary.isIndiaGst) {
    throw new Error('GSTR-1 JSON export is strictly available for Indian GST-registered organizations only.');
  }

  const invoiceRows = data.rows.filter(
    (r) => r.documentType === 'INVOICE' && r.status !== 'CANCELLED' && r.status !== 'VOIDED'
  );

  const orgGstin = data.organization.taxNumber || '';
  const now = new Date();
  const fp = `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`; // MMYYYY

  // Group B2B by recipient GSTIN
  const b2bMap = new Map<string, any[]>();
  invoiceRows
    .filter((r) => Boolean(r.customerTaxNumber && r.customerTaxNumber.trim().length >= 10))
    .forEach((r) => {
      const ctin = r.customerTaxNumber!.trim().toUpperCase();
      const invList = b2bMap.get(ctin) || [];
      invList.push({
        inum: r.documentNumber,
        idt: r.date,
        val: Number(r.grandTotal.toFixed(2)),
        pos: '32',
        rchrg: 'N',
        inv_typ: 'R',
        itms: [
          {
            num: 1,
            itm_det: {
              rt: r.taxRate,
              txval: Number(r.subtotal.toFixed(2)),
              iamt: Number((r.igstAmount || 0).toFixed(2)),
              camt: Number((r.cgstAmount || 0).toFixed(2)),
              samt: Number((r.sgstAmount || 0).toFixed(2)),
              csamt: 0,
            },
          },
        ],
      });
      b2bMap.set(ctin, invList);
    });

  const b2b = Array.from(b2bMap.entries()).map(([ctin, invs]) => ({
    ctin,
    inv: invs,
  }));

  // B2CL Array (Interstate unregistered invoices > Rs. 2,50,000)
  const b2cl = invoiceRows
    .filter(
      (r) =>
        (!r.customerTaxNumber || r.customerTaxNumber.trim().length < 10) &&
        (r.igstAmount || 0) > 0 &&
        r.grandTotal > 250000
    )
    .map((r) => ({
      pos: '32',
      inv: [
        {
          inum: r.documentNumber,
          idt: r.date,
          val: Number(r.grandTotal.toFixed(2)),
          itms: [
            {
              num: 1,
              itm_det: {
                rt: r.taxRate,
                txval: Number(r.subtotal.toFixed(2)),
                iamt: Number((r.igstAmount || 0).toFixed(2)),
                csamt: 0,
              },
            },
          ],
        },
      ],
    }));

  // B2CS Array (Other unregistered retail invoices)
  const b2cs = invoiceRows
    .filter((r) => {
      const isUnregistered = !r.customerTaxNumber || r.customerTaxNumber.trim().length < 10;
      const isB2CL = isUnregistered && (r.igstAmount || 0) > 0 && r.grandTotal > 250000;
      return isUnregistered && !isB2CL;
    })
    .map((r) => ({
      sply_ty: 'INTRA',
      pos: '32',
      typ: 'OE',
      rt: r.taxRate,
      txval: Number(r.subtotal.toFixed(2)),
      camt: Number((r.cgstAmount || 0).toFixed(2)),
      samt: Number((r.sgstAmount || 0).toFixed(2)),
      iamt: Number((r.igstAmount || 0).toFixed(2)),
      csamt: 0,
    }));

  // HSN Section
  const hsn = {
    data: (data.taxSummary.hsnSummary || []).map((h, idx) => ({
      num: idx + 1,
      hsn_sc: h.code || '998311',
      desc: h.description || (h.itemType === 'SERVICE' ? 'Services' : 'Goods'),
      uqc: h.itemType === 'SERVICE' ? 'OTH' : 'NOS',
      qty: 1,
      val: Number(h.totalAmount.toFixed(2)),
      txval: Number(h.taxableAmount.toFixed(2)),
      iamt: Number((h.igstAmount || 0).toFixed(2)),
      camt: Number((h.cgstAmount || 0).toFixed(2)),
      samt: Number((h.sgstAmount || 0).toFixed(2)),
      csamt: 0,
    })),
  };

  // Doc Issue Section
  const numbers = invoiceRows.map((r) => r.documentNumber).filter(Boolean);
  const minDoc = numbers.length > 0 ? numbers[numbers.length - 1] : 'INV-0001';
  const maxDoc = numbers.length > 0 ? numbers[0] : 'INV-0001';
  const cancelledCount = data.rows.filter(
    (r) => r.documentType === 'INVOICE' && (r.status === 'CANCELLED' || r.status === 'VOIDED')
  ).length;

  const doc_issue = {
    doc_det: [
      {
        doc_num: 1,
        doc_typ: 'Invoices for outward supply',
        docs: [
          {
            num: 1,
            from: minDoc,
            to: maxDoc,
            totnum: invoiceRows.length + cancelledCount,
            canc: cancelledCount,
            net_issue: invoiceRows.length,
          },
        ],
      },
    ],
  };

  const gstr1Payload = {
    gstin: orgGstin,
    fp,
    gt: Number(data.metrics.totalSales.toFixed(2)),
    cur_gt: Number(data.metrics.totalSales.toFixed(2)),
    b2b,
    ...(b2cl.length > 0 ? { b2cl } : {}),
    b2cs,
    hsn,
    doc_issue,
  };

  if (typeof window !== 'undefined') {
    const jsonStr = JSON.stringify(gstr1Payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `GSTR1_${orgGstin || 'IN'}_${fp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }

  return false;
}
