import { PaymentCountryRule } from '@/types/database';
import { SUBSCRIPTION_CONFIG } from './subscription-config';

export interface CountryListItem {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  flag: string;
  currency: string;
  billingRegion: 'INDIA' | 'INTERNATIONAL';
}

/**
 * Standard list of countries for business location selection
 */
export const ALL_COUNTRIES: CountryListItem[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', billingRegion: 'INDIA' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  // Non-eligible / Sanctioned countries (disabled by default)
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'KP', name: 'North Korea', flag: '🇰🇵', currency: 'USD', billingRegion: 'INTERNATIONAL' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾', currency: 'USD', billingRegion: 'INTERNATIONAL' },
];

/**
 * Initial/Default Payment Country Rules
 */
export function getDefaultCountryRules(): PaymentCountryRule[] {
  const restrictedCodes = new Set(['CU', 'IR', 'KP', 'SY']);

  return ALL_COUNTRIES.map((c) => {
    const isIndia = c.code === 'IN';
    const isRestricted = restrictedCodes.has(c.code);

    return {
      country_code: c.code,
      country_name: c.name,
      flag: c.flag,
      razorpay_enabled: isIndia,
      nowpayments_enabled: !isIndia && !isRestricted,
      billing_currency: isIndia ? 'INR' : 'USD',
      plan_amount: isIndia ? SUBSCRIPTION_CONFIG.INDIA.monthlyPrice : SUBSCRIPTION_CONFIG.GLOBAL.monthlyPrice,
      active: !isRestricted,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
}

/**
 * Resolve country metadata from ISO code or name
 */
export function findCountry(countryCodeOrName?: string | null): CountryListItem {
  if (!countryCodeOrName) {
    return ALL_COUNTRIES[0]; // Default India
  }

  const query = countryCodeOrName.trim().toUpperCase();
  const match = ALL_COUNTRIES.find(
    (c) => c.code.toUpperCase() === query || c.name.toUpperCase() === query
  );

  if (match) return match;

  // Generic international fallback
  return {
    code: query.slice(0, 2) || 'XX',
    name: countryCodeOrName.trim(),
    flag: '🌍',
    currency: 'USD',
    billingRegion: 'INTERNATIONAL',
  };
}

/**
 * Calculate billing configuration strictly on server side
 */
export function getBillingDetailsForCountry(
  countryCode?: string | null,
  customRules?: PaymentCountryRule[]
): {
  countryCode: string;
  countryName: string;
  flag: string;
  billingRegion: 'INDIA' | 'INTERNATIONAL';
  billingCurrency: 'INR' | 'USD';
  planAmount: number;
  paymentProvider: 'RAZORPAY' | 'NOWPAYMENTS';
  isEligible: boolean;
  unsupportedMessage: string | null;
} {
  const country = findCountry(countryCode);
  const code = country.code.toUpperCase();

  // Find rule in custom rules if provided, else fallback to defaults
  let rule: PaymentCountryRule | undefined;
  if (customRules && customRules.length > 0) {
    rule = customRules.find((r) => r.country_code.toUpperCase() === code);
  }

  if (!rule) {
    const defaultRules = getDefaultCountryRules();
    rule = defaultRules.find((r) => r.country_code.toUpperCase() === code);
  }

  // If still no rule, construct a default rule
  if (!rule) {
    const isIndia = code === 'IN';
    rule = {
      country_code: code,
      country_name: country.name,
      flag: country.flag,
      razorpay_enabled: isIndia,
      nowpayments_enabled: !isIndia,
      billing_currency: isIndia ? 'INR' : 'USD',
      plan_amount: isIndia ? SUBSCRIPTION_CONFIG.INDIA.monthlyPrice : SUBSCRIPTION_CONFIG.GLOBAL.monthlyPrice,
      active: true,
    };
  }

  const isIndia = code === 'IN';
  const isEligible = isIndia ? rule.active && rule.razorpay_enabled : rule.active && rule.nowpayments_enabled;

  return {
    countryCode: code,
    countryName: country.name,
    flag: country.flag,
    billingRegion: isIndia ? 'INDIA' : 'INTERNATIONAL',
    billingCurrency: isIndia ? 'INR' : 'USD',
    planAmount: isIndia ? SUBSCRIPTION_CONFIG.INDIA.monthlyPrice : (rule.plan_amount || SUBSCRIPTION_CONFIG.GLOBAL.monthlyPrice),
    paymentProvider: isIndia ? 'RAZORPAY' : 'NOWPAYMENTS',
    isEligible,
    unsupportedMessage: isEligible
      ? null
      : 'QuoteFlow online subscription payments are not currently available in your country. Please contact support.',
  };
}
