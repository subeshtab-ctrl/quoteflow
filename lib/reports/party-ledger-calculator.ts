import { Customer, Invoice, Quotation, Organization, CurrencyCode } from '@/types/database';
import { differenceInDays, parseISO } from 'date-fns';

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'INVOICE' | 'PROFORMA' | 'DELIVERY_NOTE' | 'CHALLAN' | 'PAYMENT' | 'ADVANCE';
  refNo: string;
  description: string;
  debit: number;   // Invoiced amount (increases receivable)
  credit: number;  // Payment amount (decreases receivable)
  runningBalance: number;
  status: string;
  linkHref?: string;
  isPaid?: boolean;
}

export interface PartyLedgerAging {
  current: number;     // Not yet due
  days1to30: number;   // 1 to 30 days overdue
  days31to60: number;  // 31 to 60 days overdue
  days61to90: number;  // 61 to 90 days overdue
  days90plus: number;  // More than 90 days overdue
  totalOverdue: number;
}

export interface PartyLedgerStatement {
  customerId: string;
  customerName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
  billingAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  currency: CurrencyCode;
  totalInvoiced: number;
  totalPaid: number;
  netBalanceDue: number;
  aging: PartyLedgerAging;
  entries: LedgerEntry[];
  generatedAt: string;
}

/**
 * Calculates a complete, audit-grade customer party ledger and aging statement
 */
export function calculateCustomerLedger(
  customerOrOptions: Customer | { customer: Customer; invoices: Invoice[]; quotations?: Quotation[]; currency?: CurrencyCode },
  invoicesParam: Invoice[] = [],
  quotationsParam: Quotation[] = [],
  currencyParam: CurrencyCode = 'INR'
): PartyLedgerStatement {
  let customer: Customer;
  let invoices: Invoice[];
  let quotations: Quotation[];
  let currency: CurrencyCode;

  if (customerOrOptions && typeof customerOrOptions === 'object' && 'customer' in customerOrOptions) {
    const opts = customerOrOptions as any;
    customer = opts.customer;
    invoices = opts.invoices || [];
    quotations = opts.quotations || [];
    currency = opts.currency || (opts.organization?.default_currency as CurrencyCode) || 'INR';
  } else {
    customer = customerOrOptions as Customer;
    invoices = invoicesParam || [];
    quotations = quotationsParam || [];
    currency = currencyParam || 'INR';
  }

  const now = new Date();

  // Filter invoices for this customer (exclude cancelled or voided)
  const custInvoices = (invoices || []).filter(
    (inv) =>
      inv &&
      inv.customer_id === customer.id &&
      inv.status !== 'CANCELLED' &&
      inv.status !== 'VOIDED' &&
      inv.status !== 'DRAFT'
  );

  let totalInvoiced = 0;
  let totalPaid = 0;

  const rawEntries: Array<{
    date: Date;
    dateStr: string;
    entry: Omit<LedgerEntry, 'runningBalance'>;
  }> = [];

  const aging: PartyLedgerAging = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days90plus: 0,
    totalOverdue: 0,
  };

  for (const inv of custInvoices) {
    const invGrandTotal = Number(inv.grand_total) || 0;
    const invPaid = Number(inv.paid_amount) || (inv.is_paid ? invGrandTotal : 0);
    const invBalance = Math.max(0, invGrandTotal - invPaid);

    totalInvoiced += invGrandTotal;
    totalPaid += invPaid;

    // Aging calculation based on due_date
    if (invBalance > 0) {
      const dueDate = inv.due_date ? parseISO(inv.due_date) : parseISO(inv.issue_date || inv.created_at);
      const overdueDays = differenceInDays(now, dueDate);

      if (overdueDays <= 0) {
        aging.current += invBalance;
      } else if (overdueDays <= 30) {
        aging.days1to30 += invBalance;
        aging.totalOverdue += invBalance;
      } else if (overdueDays <= 60) {
        aging.days31to60 += invBalance;
        aging.totalOverdue += invBalance;
      } else if (overdueDays <= 90) {
        aging.days61to90 += invBalance;
        aging.totalOverdue += invBalance;
      } else {
        aging.days90plus += invBalance;
        aging.totalOverdue += invBalance;
      }
    }

    const docType: LedgerEntry['type'] =
      inv.document_type === 'proforma_invoice'
        ? 'PROFORMA'
        : (inv.document_type === 'delivery_note' || inv.document_type === 'delivery_challan')
        ? 'DELIVERY_NOTE'
        : 'INVOICE';

    const invDateStr = inv.issue_date || inv.created_at.split('T')[0];
    const invDate = new Date(invDateStr);

    // 1. Debit Entry for Invoice
    rawEntries.push({
      date: invDate,
      dateStr: invDateStr,
      entry: {
        id: `inv_${inv.id}`,
        date: invDateStr,
        type: docType,
        refNo: inv.invoice_number,
        description: inv.notes || `Invoice for goods/services (${inv.items?.length || 0} line items)`,
        debit: invGrandTotal,
        credit: 0,
        status: inv.status,
        linkHref: `/invoices/${inv.id}`,
        isPaid: inv.is_paid,
      },
    });

    // 2. Credit Entry for Recorded Payment (if invoice is paid or partially paid)
    if (invPaid > 0) {
      const paidDateStr = inv.paid_at ? inv.paid_at.split('T')[0] : invDateStr;
      const paidDate = new Date(paidDateStr);

      rawEntries.push({
        date: paidDate,
        dateStr: paidDateStr,
        entry: {
          id: `pay_${inv.id}`,
          date: paidDateStr,
          type: 'PAYMENT',
          refNo: `REC-${inv.invoice_number}`,
          description: `Payment received against ${inv.invoice_number}${inv.payment_method ? ` via ${inv.payment_method}` : ''}`,
          debit: 0,
          credit: invPaid,
          status: 'RECEIVED',
          linkHref: `/invoices/${inv.id}`,
          isPaid: true,
        },
      });
    }
  }

  // Sort chronological (oldest to newest)
  rawEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Compute running balance
  let currentBalance = 0;
  const entries: LedgerEntry[] = rawEntries.map((item) => {
    currentBalance = currentBalance + item.entry.debit - item.entry.credit;
    return {
      ...item.entry,
      runningBalance: Math.max(0, currentBalance),
    };
  });

  const netBalanceDue = Math.max(0, totalInvoiced - totalPaid);

  return {
    customerId: customer.id,
    customerName: customer.name,
    companyName: customer.company_name,
    email: customer.email,
    phone: customer.phone,
    taxNumber: customer.customer_gstin || customer.tax_number,
    billingAddress: customer.billing_address,
    city: customer.city,
    state: customer.state || customer.billing_state,
    country: customer.country,
    currency,
    totalInvoiced,
    totalPaid,
    netBalanceDue,
    aging,
    entries,
    generatedAt: new Date().toISOString(),
  };
}
