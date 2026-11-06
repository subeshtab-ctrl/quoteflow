import { Customer, Invoice, Organization, Quotation } from '@/types/database';
import { formatCurrency, getDocumentTitle } from '@/lib/quotations/calculations';

export type WhatsAppMessageType =
  | 'QUOTE_READY'
  | 'QUOTE_REMINDER'
  | 'QUOTE_APPROVED'
  | 'PAYMENT_REMINDER'
  | 'INVOICE_READY'
  | 'DELIVERY_NOTE'
  | 'CHAT_AUTO_REPLY';

export const DEFAULT_WHATSAPP_TEMPLATES: Record<WhatsAppMessageType, string> = {
  QUOTE_READY:
    'Hello {customer_name},\n\nQuotation {quotation_number} ({amount}) from {company_name} is ready.\n\nReview items & digitally approve online:\n{quote_link}{pin_info}\n\nThank you,\n{company_name}',
  QUOTE_REMINDER:
    'Hi {customer_name},\n\nGentle follow-up regarding quotation {quotation_number} ({amount}) from {company_name}.\n\nYou can review and approve directly with 1 tap here:\n{quote_link}{pin_info}\n\nPlease let us know if you have any questions!\nThank you,\n{company_name}',
  QUOTE_APPROVED:
    'Thank you {customer_name}! Your approval for quotation {quotation_number} ({amount}) has been received by {company_name}. We are now preparing your order.\n\nView details:\n{quote_link}',
  INVOICE_READY:
    'Hello {customer_name},\n\n{document_title} {invoice_number} from {company_name} is ready.\n\nAmount: {amount}\n{due_date_line}\n\nView / Download {document_title}:\n{document_url}\n\nThank you,\n{company_name}',
  PAYMENT_REMINDER:
    'Hello {customer_name},\n\nFriendly reminder that payment for {document_title} {invoice_number} ({amount}) from {company_name} is currently pending.{balance_line}\n\n{due_date_line}\n\nReview details & complete payment online:\n{document_url}{pin_info}\n\nThank you,\n{company_name}',
  DELIVERY_NOTE:
    'Hello {customer_name},\n\nDelivery Note {invoice_number} from {company_name} has been dispatched.\n\nView / Confirm Delivery:\n{document_url}\n\nThank you,\n{company_name}',
  CHAT_AUTO_REPLY:
    'Thank you for your message! Our team at {company_name} has been notified and will get back to you shortly. For immediate assistance, you can also reach our official WhatsApp at {business_whatsapp}.',
};

export function cleanWhatsAppNumber(phone?: string | null, countryCode = '+91'): string {
  if (!phone) return '';
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('00')) clean = '+' + clean.slice(2);
  if (!clean.startsWith('+')) {
    const cleanCode = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
    const digitsOnly = clean.replace(/\D/g, '');
    clean = `${cleanCode}${digitsOnly.replace(/^0+/, '')}`;
  }
  return clean.replace(/\D/g, '');
}

export function buildWhatsAppMessage(params: {
  type: WhatsAppMessageType;
  template?: string | null;
  customer?: Partial<Customer> | null;
  quotation?: Partial<Quotation> | null;
  invoice?: Partial<Invoice> | null;
  organization?: Partial<Organization> | null;
  baseUrl?: string;
}): string {
  const {
    type,
    template,
    customer,
    quotation,
    invoice,
    organization,
    baseUrl = typeof window !== 'undefined'
      ? (window.location.origin.includes('localhost') ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin) : window.location.origin)
      : process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com',
  } = params;

  const rawTemplate = template?.trim() || DEFAULT_WHATSAPP_TEMPLATES[type] || DEFAULT_WHATSAPP_TEMPLATES.INVOICE_READY;

  const customerName =
    customer?.name ||
    quotation?.customer?.name ||
    customer?.company_name ||
    quotation?.customer?.company_name ||
    'Valued Client';

  const companyName =
    organization?.name ||
    quotation?.organization?.name ||
    'Our Company';

  const quotationNumber = quotation?.quotation_number || '';
  const invoiceNumber = invoice?.invoice_number || quotationNumber;

  const currency = quotation?.currency || invoice?.currency || organization?.default_currency || 'INR';
  const amountVal = quotation?.grand_total ?? invoice?.grand_total ?? 0;
  const amount = formatCurrency(amountVal, currency);

  const paidVal = (quotation as any)?.paid_amount ?? (invoice as any)?.paid_amount ?? 0;
  const balanceVal = Math.max(0, amountVal - paidVal);
  const balanceLine =
    paidVal > 0
      ? `\nPaid: ${formatCurrency(paidVal, currency)} | Balance Due: ${formatCurrency(balanceVal, currency)}`
      : '';

  const publicToken = quotation?.public_token || '';
  const quoteLink = publicToken ? `${baseUrl}/q/${publicToken}` : baseUrl;

  const rawDocTitle = invoice?.document_type
    ? getDocumentTitle(invoice.document_type, invoice.status)
    : quotation
    ? 'Quotation'
    : 'Invoice';

  const docTitle = rawDocTitle
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const documentUrl = publicToken
    ? `${baseUrl}/q/${publicToken}`
    : invoice?.id
    ? `${baseUrl}/api/public/invoice-pdf?invoice_id=${encodeURIComponent(invoice.id)}`
    : baseUrl;

  const pin = quotation?.pin;
  const isPinActive = Boolean(quotation?.pin_protection_enabled || pin);
  const pinInfo = isPinActive && pin ? `\n🔑 Access PIN: ${pin}` : '';

  const businessPhone =
    organization?.whatsapp_number ||
    organization?.phone ||
    '';
  const businessCountryCode = organization?.whatsapp_country_code || '+91';
  const formattedBizPhone = businessPhone
    ? `${businessCountryCode} ${businessPhone.replace(/[^\d]/g, '')}`
    : companyName;

  const expiryDate = quotation?.valid_until ? quotation.valid_until.split('T')[0] : '';
  const rawDueDate = invoice?.due_date ? invoice.due_date.split('T')[0] : '';
  const dueDateLine = rawDueDate ? `Due Date: ${rawDueDate}` : '';

  return rawTemplate
    .replace(/{customer_name}/g, customerName)
    .replace(/{company_name}/g, companyName)
    .replace(/{quotation_number}/g, quotationNumber)
    .replace(/{invoice_number}/g, invoiceNumber)
    .replace(/{document_title}/g, docTitle)
    .replace(/{amount}/g, amount)
    .replace(/{balance_line}/g, balanceLine)
    .replace(/{quote_link}/g, quoteLink)
    .replace(/{document_url}/g, documentUrl)
    .replace(/{pin_info}/g, pinInfo)
    .replace(/{business_whatsapp}/g, formattedBizPhone)
    .replace(/{expiry_date}/g, expiryDate)
    .replace(/{due_date}/g, rawDueDate)
    .replace(/{due_date_line}/g, dueDateLine);
}

export function getWhatsAppUrl(params: {
  targetPhone?: string | null;
  countryCode?: string | null;
  message: string;
}): string {
  const digits = cleanWhatsAppNumber(params.targetPhone, params.countryCode || '+91');
  const encoded = encodeURIComponent(params.message);
  return digits ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export function getBusinessDirectWhatsAppUrl(params: {
  businessWhatsAppNumber?: string | null;
  businessCountryCode?: string | null;
  quotationNumber?: string | null;
  companyName?: string | null;
  customerName?: string | null;
}): string | null {
  const { businessWhatsAppNumber, businessCountryCode, quotationNumber, companyName, customerName } = params;
  if (!businessWhatsAppNumber) return null;

  const cleanNum = cleanWhatsAppNumber(businessWhatsAppNumber, businessCountryCode || '+91');
  if (!cleanNum) return null;

  const greeting = customerName ? `Hi, I am ${customerName}.` : 'Hi,';
  const quoteRef = quotationNumber ? ` regarding quotation #${quotationNumber}` : '';
  const compRef = companyName ? ` with ${companyName}` : '';
  const text = `${greeting} I am inquiring${quoteRef}${compRef}.`;

  return `https://wa.me/${cleanNum}?text=${encodeURIComponent(text)}`;
}
