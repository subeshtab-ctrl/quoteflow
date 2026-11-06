export type DocumentLanguage = 'en' | 'ar' | 'both';

export const GCC_COUNTRY_CODES = ['AE', 'SA', 'QA', 'KW', 'BH', 'OM'] as const;
export type GccCountryCode = typeof GCC_COUNTRY_CODES[number];

export const GCC_COUNTRIES_METADATA: Record<GccCountryCode, { name: string; nativeName: string; flag: string; currency: string; taxRate: number }> = {
  AE: { name: 'United Arab Emirates', nativeName: 'الإمارات العربية المتحدة', flag: '🇦🇪', currency: 'AED', taxRate: 5 },
  SA: { name: 'Saudi Arabia', nativeName: 'المملكة العربية السعودية', flag: '🇸🇦', currency: 'SAR', taxRate: 15 },
  QA: { name: 'Qatar', nativeName: 'دولة قطر', flag: '🇶🇦', currency: 'QAR', taxRate: 0 },
  KW: { name: 'Kuwait', nativeName: 'دولة الكويت', flag: '🇰🇼', currency: 'KWD', taxRate: 0 },
  BH: { name: 'Bahrain', nativeName: 'مملكة البحرين', flag: '🇧🇭', currency: 'BHD', taxRate: 10 },
  OM: { name: 'Oman', nativeName: 'سلطنة عمان', flag: '🇴🇲', currency: 'OMR', taxRate: 5 },
};

/**
 * Checks if a given country or currency belongs to the GCC (Gulf Cooperation Council).
 */
export function isGccCountry(country?: string | null, currency?: string | null): boolean {
  if (!country && !currency) return false;

  const cleanCountry = (country || '').trim().toUpperCase();
  const cleanCurrency = (currency || '').trim().toUpperCase();

  // Check currency codes
  if (['AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR'].includes(cleanCurrency)) {
    return true;
  }

  // Check ISO country codes
  if (GCC_COUNTRY_CODES.includes(cleanCountry as GccCountryCode)) {
    return true;
  }

  // Check country names
  const lowerCountry = (country || '').trim().toLowerCase();
  if (
    lowerCountry === 'uae' ||
    lowerCountry.includes('emirates') ||
    lowerCountry.includes('saudi') ||
    lowerCountry === 'ksa' ||
    lowerCountry.includes('qatar') ||
    lowerCountry.includes('kuwait') ||
    lowerCountry.includes('bahrain') ||
    lowerCountry.includes('oman')
  ) {
    return true;
  }

  return false;
}

export const GCC_TERMS: Record<string, { en: string; ar: string }> = {
  // Document titles
  tax_invoice: { en: 'Tax Invoice', ar: 'فاتورة ضريبية' },
  commercial_invoice: { en: 'Commercial Invoice', ar: 'فاتورة تجارية' },
  proforma_invoice: { en: 'Proforma Invoice', ar: 'فاتورة أولية' },
  delivery_note: { en: 'Delivery Note', ar: 'إشعار تسليم' },
  quotation: { en: 'Quotation', ar: 'عرض أسعار' },
  cost_estimate: { en: 'Cost Estimate', ar: 'تقدير تكلفة' },

  // Metadata headers
  invoice_number: { en: 'Invoice No', ar: 'رقم الفاتورة' },
  quotation_number: { en: 'Quote No', ar: 'رقم عرض الأسعار' },
  delivery_note_number: { en: 'Delivery Note No', ar: 'رقم إشعار التسليم' },
  issue_date: { en: 'Issue Date', ar: 'تاريخ الإصدار' },
  invoice_date: { en: 'Invoice Date', ar: 'تاريخ الفاتورة' },
  quotation_date: { en: 'Quote Date', ar: 'تاريخ العرض' },
  due_date: { en: 'Due Date', ar: 'تاريخ الاستحقاق' },
  valid_until: { en: 'Valid Until', ar: 'صالح حتى' },
  delivery_date: { en: 'Delivery Date', ar: 'تاريخ التسليم' },
  po_number: { en: 'PO / Ref #', ar: 'رقم أمر الشراء' },
  trn_tax_id: { en: 'TRN / Tax ID', ar: 'الرقم الضريبي' },
  place_of_supply: { en: 'Place of Supply', ar: 'مكان التوريد' },

  // Parties
  billed_to: { en: 'Billed To', ar: 'فاتورة إلى' },
  quoted_to: { en: 'Quoted To', ar: 'مقدم إلى' },
  attn: { en: 'Attn', ar: 'عناية' },
  address: { en: 'Address', ar: 'العنوان' },
  tel: { en: 'Tel', ar: 'الهاتف' },
  email: { en: 'Email', ar: 'البريد الإلكتروني' },

  // Table columns
  hash: { en: '#', ar: 'م' },
  item_description: { en: 'Item Description', ar: 'بيان السلع أو الخدمات' },
  sku_code: { en: 'SKU / Code', ar: 'الرمز' },
  quantity: { en: 'Qty', ar: 'الكمية' },
  unit: { en: 'Unit', ar: 'الوحدة' },
  rate: { en: 'Rate', ar: 'سعر الوحدة' },
  tax: { en: 'VAT', ar: 'الضريبة' },
  total: { en: 'Total', ar: 'الإجمالي' },

  // Totals
  subtotal: { en: 'Subtotal', ar: 'المجموع الفرعي' },
  discount: { en: 'Discount', ar: 'الخصم' },
  tax_amount: { en: 'VAT Amount', ar: 'مبلغ الضريبة' },
  grand_total: { en: 'Grand Total', ar: 'المجموع الكلي' },
  paid_amount: { en: 'Amount Paid', ar: 'المبلغ المدفوع' },
  balance_due: { en: 'Balance Due', ar: 'المبلغ المستحق' },

  // Settlement & Payment
  settlement_status: { en: 'Settlement Status', ar: 'حالة السداد' },
  paid_in_full: { en: 'Settled in Full', ar: 'مدفوع بالكامل' },
  payment_pending: { en: 'Payment Pending', ar: 'بانتظار السداد' },
  mode_of_payment: { en: 'Mode of Payment', ar: 'طريقة الدفع' },
  bank_details: { en: 'Bank Remittance Details', ar: 'بيانات التحويل البنكي' },
  bank_name: { en: 'Bank Name', ar: 'اسم البنك' },
  account_name: { en: 'Account Name', ar: 'اسم الحساب' },
  account_number: { en: 'Account Number', ar: 'رقم الحساب' },
  iban: { en: 'IBAN', ar: 'رقم الآيبان' },
  swift: { en: 'SWIFT / BIC', ar: 'رمز السويفت' },

  // Terms & Signatures
  terms_conditions: { en: 'Terms & Conditions', ar: 'الشروط والأحكام' },
  notes: { en: 'Notes', ar: 'ملاحظات' },
  authorized_stamp: { en: 'Authorized Signature & Stamp', ar: 'الختم والتوقيع المعتمد' },
  client_signature: { en: 'Client Acceptance & Signature', ar: 'توقيع وموافقة العميل' },
  payment_terms: { en: 'Payment Terms', ar: 'شروط الدفع' },
};

/**
 * Returns the localized label based on the selected document language.
 * - 'en': English label
 * - 'ar': Arabic label
 * - 'both': Bilingual (English / Arabic)
 */
export function getLocalizedTerm(
  key: string,
  lang: DocumentLanguage = 'en',
  customEnglish?: string
): string {
  const term = GCC_TERMS[key];
  const english = customEnglish || term?.en || key;
  const arabic = term?.ar || '';

  if (lang === 'ar') {
    return arabic || english;
  }

  if (lang === 'both' && arabic) {
    return `${english} / ${arabic}`;
  }

  return english;
}

/**
 * Resolves the effective document language for an organization.
 * Defaults to 'both' for GCC countries, or 'en' for non-GCC.
 */
export function getEffectiveDocumentLanguage(
  org?: {
    document_language?: DocumentLanguage | string | null;
    country?: string | null;
    business_country?: string | null;
    default_currency?: string | null;
  } | null,
  overrideLang?: DocumentLanguage | null
): DocumentLanguage {
  if (overrideLang) return overrideLang;

  const userSelected = org?.document_language as DocumentLanguage | undefined;
  if (userSelected && ['en', 'ar', 'both'].includes(userSelected)) {
    return userSelected;
  }

  // If organization is in GCC and no preference set, default to 'both' (Bilingual standard)
  const inGcc = isGccCountry(org?.country || org?.business_country, org?.default_currency);
  if (inGcc) {
    return 'both';
  }

  return 'en';
}
