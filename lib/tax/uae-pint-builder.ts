/**
 * UAE E-Invoicing PINT-AE XML Builder
 * STRICTLY GATED TO UNITED ARAB EMIRATES (country === 'AE' or isUaeVat)
 * Formats invoices into Peppol PINT-AE / UBL 2.1 structured XML specification
 * mandated by the UAE Ministry of Finance (MoF) & Federal Tax Authority (FTA).
 */

export interface UaeInvoiceExportData {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  notes?: string;
  placeOfSupply?: string; // Emirate (e.g. Dubai, Abu Dhabi)
  supplier: {
    name: string;
    trn: string;
    address?: string;
    city?: string;
    emirate?: string;
    email?: string;
    phone?: string;
  };
  customer: {
    name: string;
    companyName?: string;
    trn?: string;
    address?: string;
    emirate?: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    itemType?: 'GOODS' | 'SERVICE';
    hsCode?: string;
    vatCategory?: 'S' | 'Z' | 'E' | 'O';
  }>;
  taxableSubtotal: number;
  totalTax: number;
  grandTotal: number;
  isCreditNote?: boolean;
}

function escapeXml(unsafe: string | number | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return '';
  const str = String(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Normalizes an Invoice and Organization into a standard UaeInvoiceExportData structure.
 */
export function mapInvoiceToUaePintData(invoice: any, org?: any): UaeInvoiceExportData {
  const customerTrn =
    invoice.customer?.tax_number ||
    invoice.customer?.trn ||
    invoice.customer_gstin ||
    invoice.customer_trn ||
    '';
  const supplierTrn =
    org?.gst_vat_number ||
    org?.tax_number ||
    org?.trn ||
    org?.gstin ||
    '';

  const rawItems = Array.isArray(invoice.items) ? invoice.items : [];
  const items = rawItems.map((it: any) => {
    const qty = Number(it.quantity) || 1;
    const unitPrice = Number(it.unit_price) || 0;
    const subtotal = Number(it.total_price ?? it.subtotal ?? qty * unitPrice);
    const taxRate = Number(it.tax_rate ?? 5);
    const taxAmount = Number(it.tax_amount ?? subtotal * (taxRate / 100));
    const totalAmount = Number(it.total_amount ?? subtotal + taxAmount);
    return {
      id: it.id,
      description: it.description || it.name || 'Item',
      quantity: qty,
      unitPrice,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      itemType: (it.goods_service_type || it.item_type || 'SERVICE') as 'GOODS' | 'SERVICE',
      hsCode: it.hsn_sac_code || it.classification_code || '',
      vatCategory: (taxRate > 0 ? 'S' : 'Z') as 'S' | 'Z',
    };
  });

  const taxableSubtotal = items.reduce((sum: number, it: any) => sum + it.subtotal, 0);
  const totalTax = items.reduce((sum: number, it: any) => sum + it.taxAmount, 0);
  const grandTotal = Number(invoice.total_amount ?? taxableSubtotal + totalTax);

  return {
    invoiceNumber: invoice.invoice_number || invoice.id || 'INV',
    issueDate: invoice.invoice_date || invoice.issue_date || new Date().toISOString().split('T')[0],
    dueDate: invoice.due_date,
    currency: invoice.currency || 'AED',
    notes: invoice.notes,
    placeOfSupply:
      invoice.place_of_supply ||
      invoice.customer_state ||
      invoice.customer?.place_of_supply ||
      org?.business_state ||
      'Dubai',
    supplier: {
      name: org?.name || 'Supplier LLC',
      trn: supplierTrn,
      address: org?.address,
      city: org?.city,
      emirate: org?.business_state || org?.state || 'Dubai',
      email: org?.email,
      phone: org?.phone,
    },
    customer: {
      name: invoice.customer_name || invoice.customer?.name || 'Customer',
      companyName: invoice.customer?.company_name,
      trn: customerTrn,
      address: invoice.customer_address || invoice.customer?.billing_address || invoice.customer?.address,
      emirate: invoice.place_of_supply || invoice.customer_state || 'Dubai',
      email: invoice.customer_email || invoice.customer?.email,
      phone: invoice.customer_phone || invoice.customer?.phone,
    },
    items,
    taxableSubtotal: Number(invoice.subtotal ?? taxableSubtotal),
    totalTax: Number(invoice.total_tax ?? totalTax),
    grandTotal,
    isCreditNote: invoice.document_type === 'credit_note',
  };
}

/**
 * Builds the official PINT-AE XML string compliant with UAE FTA Electronic Invoicing System (EIS).
 * Supports either direct UaeInvoiceExportData or (invoice, org) objects.
 */
export function buildUaePintXml(dataOrInvoice: UaeInvoiceExportData | any, maybeOrg?: any): string {
  const data: UaeInvoiceExportData =
    dataOrInvoice &&
    typeof dataOrInvoice === 'object' &&
    'supplier' in dataOrInvoice &&
    'customer' in dataOrInvoice &&
    'items' in dataOrInvoice
      ? (dataOrInvoice as UaeInvoiceExportData)
      : mapInvoiceToUaePintData(dataOrInvoice, maybeOrg);

  const customerTrn = data.customer?.trn ? String(data.customer.trn).replace(/[^0-9]/g, '') : '';
  const isB2B = customerTrn.length === 15;
  const invoiceType = data.isCreditNote ? '381' : isB2B ? '380' : '388'; // 380 = Commercial B2B, 388 = Tax/Simplified B2C
  const currency = (data.currency || 'AED').toUpperCase();
  const emirate = data.placeOfSupply || data.supplier?.emirate || 'Dubai';

  // Group line items by VAT category
  const standardItems = data.items.filter((it) => (it.taxRate || 0) > 0);
  const zeroRatedItems = data.items.filter((it) => (it.taxRate || 0) === 0 && it.vatCategory !== 'E');
  const exemptItems = data.items.filter((it) => it.vatCategory === 'E');

  const standardTaxable = standardItems.reduce((acc, it) => acc + it.subtotal, 0);
  const standardTax = standardItems.reduce((acc, it) => acc + it.taxAmount, 0);

  const zeroTaxable = zeroRatedItems.reduce((acc, it) => acc + it.subtotal, 0);
  const exemptTaxable = exemptItems.reduce((acc, it) => acc + it.subtotal, 0);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:peppol:pint:billing-3.0@ae-1</cbc:CustomizationID>
  <cbc:ProfileID>urn:peppol:bis:billing</cbc:ProfileID>
  <cbc:ID>${escapeXml(data.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(data.issueDate)}</cbc:IssueDate>
  ${data.dueDate ? `<cbc:DueDate>${escapeXml(data.dueDate)}</cbc:DueDate>` : ''}
  <cbc:InvoiceTypeCode listID="UNCL1001">${invoiceType}</cbc:InvoiceTypeCode>
  ${data.notes ? `<cbc:Note>${escapeXml(data.notes)}</cbc:Note>` : ''}
  <cbc:DocumentCurrencyCode>${escapeXml(currency)}</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${escapeXml(data.customer.companyName || data.customer.name)}</cbc:BuyerReference>

  <!-- Corner 1: Accounting Supplier Party -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      ${data.supplier.trn ? `<cbc:EndpointID schemeID="0231">${escapeXml(data.supplier.trn.replace(/[^0-9]/g, ''))}</cbc:EndpointID>` : ''}
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(data.supplier.address || 'Business Bay')}</cbc:StreetName>
        <cbc:CityName>${escapeXml(data.supplier.city || emirate)}</cbc:CityName>
        <cbc:CountrySubentity>${escapeXml(emirate)}</cbc:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>AE</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(data.supplier.trn)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(data.supplier.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      ${data.supplier.email || data.supplier.phone ? `
      <cac:Contact>
        ${data.supplier.phone ? `<cbc:Telephone>${escapeXml(data.supplier.phone)}</cbc:Telephone>` : ''}
        ${data.supplier.email ? `<cbc:ElectronicMail>${escapeXml(data.supplier.email)}</cbc:ElectronicMail>` : ''}
      </cac:Contact>` : ''}
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Corner 5: Accounting Customer Party -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      ${customerTrn ? `<cbc:EndpointID schemeID="0231">${escapeXml(customerTrn)}</cbc:EndpointID>` : ''}
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(data.customer.address || 'UAE')}</cbc:StreetName>
        <cbc:CityName>${escapeXml(data.customer.emirate || emirate)}</cbc:CityName>
        <cbc:CountrySubentity>${escapeXml(data.customer.emirate || emirate)}</cbc:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>AE</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${data.customer.trn ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(data.customer.trn)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>` : ''}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(data.customer.companyName || data.customer.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      ${data.customer.email || data.customer.phone ? `
      <cac:Contact>
        ${data.customer.phone ? `<cbc:Telephone>${escapeXml(data.customer.phone)}</cbc:Telephone>` : ''}
        ${data.customer.email ? `<cbc:ElectronicMail>${escapeXml(data.customer.email)}</cbc:ElectronicMail>` : ''}
      </cac:Contact>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Tax Total & VAT Breakdown -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${escapeXml(currency)}">${data.totalTax.toFixed(2)}</cbc:TaxAmount>
    ${standardTaxable > 0 ? `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${escapeXml(currency)}">${standardTaxable.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${escapeXml(currency)}">${standardTax.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>5.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>` : ''}
    ${zeroTaxable > 0 ? `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${escapeXml(currency)}">${zeroTaxable.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${escapeXml(currency)}">0.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>Z</cbc:ID>
        <cbc:Percent>0.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>` : ''}
    ${exemptTaxable > 0 ? `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${escapeXml(currency)}">${exemptTaxable.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${escapeXml(currency)}">0.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>E</cbc:ID>
        <cbc:Percent>0.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>` : ''}
  </cac:TaxTotal>

  <!-- Legal Monetary Totals -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${escapeXml(currency)}">${data.taxableSubtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${escapeXml(currency)}">${data.taxableSubtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${escapeXml(currency)}">${data.grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${escapeXml(currency)}">${data.grandTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Invoice Line Items -->
  ${data.items
    .map((item, idx) => {
      const lineCategory = (item.taxRate || 0) > 0 ? 'S' : (item.vatCategory || 'Z');
      const linePercent = (item.taxRate || 0).toFixed(2);
      return `
  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${escapeXml(currency)}">${item.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${escapeXml(item.description)}</cbc:Description>
      <cbc:Name>${escapeXml(item.description)}</cbc:Name>
      ${item.hsCode ? `
      <cac:CommodityClassification>
        <cbc:ItemClassificationCode listID="HS">${escapeXml(item.hsCode)}</cbc:ItemClassificationCode>
      </cac:CommodityClassification>` : ''}
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${lineCategory}</cbc:ID>
        <cbc:Percent>${linePercent}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${escapeXml(currency)}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
    })
    .join('')}
</Invoice>`;

  return xml.trim();
}

/**
 * Client-side browser trigger to download the generated PINT-AE XML file.
 */
export function downloadUaePintXmlFile(dataOrInvoice: UaeInvoiceExportData | any, maybeOrg?: any): void {
  if (typeof window === 'undefined') return;

  const data: UaeInvoiceExportData =
    dataOrInvoice &&
    typeof dataOrInvoice === 'object' &&
    'supplier' in dataOrInvoice &&
    'customer' in dataOrInvoice &&
    'items' in dataOrInvoice
      ? (dataOrInvoice as UaeInvoiceExportData)
      : mapInvoiceToUaePintData(dataOrInvoice, maybeOrg);

  const xmlContent = buildUaePintXml(data);
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(data.invoiceNumber || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_')}_PINT_AE.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
