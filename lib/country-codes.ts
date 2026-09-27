export interface CountryCodeItem {
  name: string;
  code: string; // ISO 2-letter country code
  dialCode: string; // e.g. +91
  flag: string;
}

export const COUNTRY_CODES: CountryCodeItem[] = [
  // Frequently used first
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'Qatar', code: 'QA', dialCode: '+974', flag: '🇶🇦' },
  { name: 'Oman', code: 'OM', dialCode: '+968', flag: '🇴🇲' },
  { name: 'Kuwait', code: 'KW', dialCode: '+965', flag: '🇰🇼' },
  { name: 'Bahrain', code: 'BH', dialCode: '+973', flag: '🇧🇭' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
  { name: 'Malaysia', code: 'MY', dialCode: '+60', flag: '🇲🇾' },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: '🇳🇿' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦' },
  { name: 'Ireland', code: 'IE', dialCode: '+353', flag: '🇮🇪' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱' },
  { name: 'Switzerland', code: 'CH', dialCode: '+41', flag: '🇨🇭' },
  { name: 'Sweden', code: 'SE', dialCode: '+46', flag: '🇸🇪' },
  { name: 'Norway', code: 'NO', dialCode: '+47', flag: '🇳🇴' },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸' },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵' },
  { name: 'China', code: 'CN', dialCode: '+86', flag: '🇨🇳' },
  { name: 'Hong Kong', code: 'HK', dialCode: '+852', flag: '🇭🇰' },
  { name: 'Indonesia', code: 'ID', dialCode: '+62', flag: '🇮🇩' },
  { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭' },
  { name: 'Thailand', code: 'TH', dialCode: '+66', flag: '🇹🇭' },
  { name: 'Vietnam', code: 'VN', dialCode: '+84', flag: '🇻🇳' },
  { name: 'Sri Lanka', code: 'LK', dialCode: '+94', flag: '🇱🇰' },
  { name: 'Bangladesh', code: 'BD', dialCode: '+880', flag: '🇧🇩' },
  { name: 'Nepal', code: 'NP', dialCode: '+977', flag: '🇳🇵' },
  { name: 'Pakistan', code: 'PK', dialCode: '+92', flag: '🇵🇰' },
  { name: 'Egypt', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬' },
  { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
  { name: 'Mexico', code: 'MX', dialCode: '+52', flag: '🇲🇽' },
  { name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷' },
  { name: 'Israel', code: 'IL', dialCode: '+972', flag: '🇮🇱' },
  { name: 'Turkey', code: 'TR', dialCode: '+90', flag: '🇹🇷' },
  { name: 'Poland', code: 'PL', dialCode: '+48', flag: '🇵🇱' },
  { name: 'Belgium', code: 'BE', dialCode: '+32', flag: '🇧🇪' },
  { name: 'Austria', code: 'AT', dialCode: '+43', flag: '🇦🇹' },
  { name: 'Denmark', code: 'DK', dialCode: '+45', flag: '🇩🇰' },
  { name: 'Finland', code: 'FI', dialCode: '+358', flag: '🇫🇮' },
  { name: 'Portugal', code: 'PT', dialCode: '+351', flag: '🇵🇹' },
  { name: 'Greece', code: 'GR', dialCode: '+30', flag: '🇬🇷' },
];

/**
 * Automatically determine the default country code based on the registered business country.
 * e.g., if business is in India -> '+91'
 * e.g., if business is in UAE -> '+971'
 * Defaults to '+91' if unspecified or not found.
 */
export function getDefaultCountryCode(businessCountry?: string | null): string {
  if (!businessCountry) return '+91';

  const cleaned = businessCountry.trim().toLowerCase();

  // Match by code or common names
  if (cleaned === 'in' || cleaned === 'india') return '+91';
  if (
    cleaned === 'ae' ||
    cleaned === 'uae' ||
    cleaned.includes('united arab emirates') ||
    cleaned.includes('emirates') ||
    cleaned.includes('dubai')
  ) {
    return '+971';
  }
  if (cleaned === 'us' || cleaned === 'usa' || cleaned.includes('united states')) return '+1';
  if (cleaned === 'gb' || cleaned === 'uk' || cleaned.includes('united kingdom') || cleaned.includes('britain')) return '+44';
  if (cleaned === 'sa' || cleaned.includes('saudi')) return '+966';
  if (cleaned === 'qa' || cleaned.includes('qatar')) return '+974';
  if (cleaned === 'om' || cleaned.includes('oman')) return '+968';
  if (cleaned === 'kw' || cleaned.includes('kuwait')) return '+965';
  if (cleaned === 'bh' || cleaned.includes('bahrain')) return '+973';
  if (cleaned === 'sg' || cleaned.includes('singapore')) return '+65';
  if (cleaned === 'au' || cleaned.includes('australia')) return '+61';
  if (cleaned === 'ca' || cleaned.includes('canada')) return '+1';
  if (cleaned === 'de' || cleaned.includes('germany')) return '+49';
  if (cleaned === 'fr' || cleaned.includes('france')) return '+33';
  if (cleaned === 'my' || cleaned.includes('malaysia')) return '+60';
  if (cleaned === 'nz' || cleaned.includes('new zealand')) return '+64';
  if (cleaned === 'za' || cleaned.includes('south africa')) return '+27';

  // Generic lookup from list
  const found = COUNTRY_CODES.find(
    (c) =>
      c.code.toLowerCase() === cleaned ||
      c.name.toLowerCase() === cleaned ||
      cleaned.includes(c.name.toLowerCase())
  );

  return found ? found.dialCode : '+91';
}

/**
 * Strips formatting, non-digits, and removes leading zero or duplicate country code if user typed it.
 */
export function cleanPhoneNumber(phone: string, dialCode?: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[\s\-\(\)\.]/g, '');

  // If phone starts with + or dialCode, strip the dialCode prefix
  if (dialCode) {
    const rawDial = dialCode.replace('+', '');
    if (clean.startsWith('+' + rawDial)) {
      clean = clean.substring(('+' + rawDial).length);
    } else if (clean.startsWith(dialCode)) {
      clean = clean.substring(dialCode.length);
    } else if (clean.startsWith(rawDial) && clean.length > rawDial.length + 5) {
      clean = clean.substring(rawDial.length);
    }
  }

  // Remove leading + or 0
  clean = clean.replace(/^\+/, '');
  if (clean.startsWith('0') && clean.length > 7) {
    clean = clean.substring(1);
  }

  return clean;
}

/**
 * Format phone with country code for display
 */
export function formatPhoneNumber(countryCode?: string | null, phone?: string | null): string {
  if (!phone) return '';
  const code = countryCode ? (countryCode.startsWith('+') ? countryCode : `+${countryCode}`) : '';
  return code ? `${code} ${phone}` : phone;
}

/**
 * Mask phone number for client portal display: e.g. +91 ******3210
 */
export function maskPhone(phone: string, countryCode?: string): string {
  if (!phone) return '******';
  const clean = phone.replace(/\D/g, '');
  if (clean.length <= 4) {
    return '******' + clean;
  }
  const last4 = clean.slice(-4);
  const prefix = countryCode ? (countryCode.startsWith('+') ? countryCode : `+${countryCode}`) + ' ' : '';
  return `${prefix}******${last4}`;
}
