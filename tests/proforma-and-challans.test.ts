import { describe, it, expect } from 'vitest';
import { Invoice } from '@/types/database';

describe('Proforma Invoices & Delivery Challans Document Lifecycle', () => {
  it('supports proforma invoice with PI- prefix and conversion linking', () => {
    const proforma: Invoice = {
      id: 'pi-001',
      organization_id: 'org-1',
      customer_id: 'cust-1',
      invoice_number: 'PI-1001',
      document_type: 'proforma_invoice',
      status: 'ISSUED',
      issue_date: '2026-04-01T00:00:00Z',
      due_date: '2026-04-15T00:00:00Z',
      currency: 'INR',
      subtotal: 50000,
      tax_rate: 18,
      tax_amount: 9000,
      grand_total: 59000,
      is_paid: false,
      created_at: '2026-04-01T00:00:00Z',
      items: [
        {
          id: 'item-1',
          invoice_id: 'pi-001',
          description: 'Custom Enterprise Web Portal',
          quantity: 1,
          unit: 'service',
          unit_price: 50000,
          tax_rate: 18,
          tax_amount: 9000,
          line_total: 59000,
          sort_order: 1,
          item_type: 'SERVICE',
        },
      ],
    };

    expect(proforma.document_type).toBe('proforma_invoice');
    expect(proforma.invoice_number.startsWith('PI-')).toBe(true);

    // Simulate conversion to Tax Invoice
    const convertedTaxInvoice: Invoice = {
      ...proforma,
      id: 'inv-tax-1001',
      invoice_number: 'INV-1001',
      document_type: 'tax_invoice',
      created_at: '2026-04-05T00:00:00Z',
    };

    // Update proforma with pointer
    proforma.proforma_converted_invoice_id = convertedTaxInvoice.id;

    expect(convertedTaxInvoice.document_type).toBe('tax_invoice');
    expect(convertedTaxInvoice.invoice_number.startsWith('INV-')).toBe(true);
    expect(proforma.proforma_converted_invoice_id).toBe('inv-tax-1001');
    expect(convertedTaxInvoice.grand_total).toBe(proforma.grand_total);
    expect(convertedTaxInvoice.items?.length).toBe(proforma.items?.length);
  });

  it('supports delivery notes with DN- prefix and legacy delivery challans with DC- prefix', () => {
    const deliveryNote: Invoice = {
      id: 'dn-001',
      organization_id: 'org-1',
      customer_id: 'cust-1',
      invoice_number: 'DN-5001',
      document_type: 'delivery_note',
      status: 'ISSUED',
      issue_date: '2026-04-02T00:00:00Z',
      due_date: '2026-04-02T00:00:00Z',
      currency: 'INR',
      subtotal: 25000,
      tax_rate: 18,
      tax_amount: 4500,
      grand_total: 29500,
      is_paid: false,
      created_at: '2026-04-02T00:00:00Z',
    };

    expect(deliveryNote.document_type).toBe('delivery_note');
    expect(deliveryNote.invoice_number.startsWith('DN-')).toBe(true);

    const legacyChallan: Invoice = {
      ...deliveryNote,
      invoice_number: 'DC-5001',
      document_type: 'delivery_challan',
    };
    expect(legacyChallan.document_type).toBe('delivery_challan');
    expect(legacyChallan.invoice_number.startsWith('DC-')).toBe(true);
  });
});
