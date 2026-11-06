import { INDIAN_STATES } from './india-gst';
import { COUNTRY_CODES } from '../country-codes';

export interface RegionOption {
  code: string;
  name: string;
}

export interface CountryRegionMetadata {
  countryCode: string;
  countryName: string;
  dialCode: string;
  flag: string;
  stateLabel: string;
  statePlaceholder: string;
  placeOfSupplyLabel: string;
  placeOfSupplyPlaceholder: string;
  taxLabel: string;
  taxPlaceholder: string;
  cityPlaceholder: string;
  regions: RegionOption[];
  isIndia: boolean;
  isUae: boolean;
}

export const UAE_EMIRATES: RegionOption[] = [
  { code: 'DXB', name: 'Dubai' },
  { code: 'AUH', name: 'Abu Dhabi' },
  { code: 'SHJ', name: 'Sharjah' },
  { code: 'AJM', name: 'Ajman' },
  { code: 'RAK', name: 'Ras Al Khaimah' },
  { code: 'FUJ', name: 'Fujairah' },
  { code: 'UAQ', name: 'Umm Al Quwain' },
];

export const US_STATES: RegionOption[] = [
  { code: 'CA', name: 'California' },
  { code: 'NY', name: 'New York' },
  { code: 'TX', name: 'Texas' },
  { code: 'FL', name: 'Florida' },
  { code: 'WA', name: 'Washington' },
  { code: 'IL', name: 'Illinois' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'OH', name: 'Ohio' },
  { code: 'GA', name: 'Georgia' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'MI', name: 'Michigan' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'VA', name: 'Virginia' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'IN', name: 'Indiana' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MD', name: 'Maryland' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'CO', name: 'Colorado' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'AL', name: 'Alabama' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'OR', name: 'Oregon' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'UT', name: 'Utah' },
  { code: 'NV', name: 'Nevada' },
];

export const UK_REGIONS: RegionOption[] = [
  { code: 'ENG', name: 'England' },
  { code: 'SCT', name: 'Scotland' },
  { code: 'WLS', name: 'Wales' },
  { code: 'NIR', name: 'Northern Ireland' },
  { code: 'LDN', name: 'Greater London' },
];

export const SAUDI_REGIONS: RegionOption[] = [
  { code: 'RUH', name: 'Riyadh' },
  { code: 'MAK', name: 'Makkah' },
  { code: 'EAS', name: 'Eastern Province' },
  { code: 'MED', name: 'Madinah' },
  { code: 'ASI', name: 'Asir' },
  { code: 'TAB', name: 'Tabuk' },
  { code: 'QAS', name: 'Al-Qassim' },
];

export const CANADA_PROVINCES: RegionOption[] = [
  { code: 'ON', name: 'Ontario' },
  { code: 'QC', name: 'Quebec' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'AB', name: 'Alberta' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NS', name: 'Nova Scotia' },
];

export const AUSTRALIA_STATES: RegionOption[] = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
];

/**
 * Resolves country code, name, and regional metadata based on input dial code or country code
 */
export function getCountryRegionMetadata(
  inputCodeOrDial?: string | null,
  businessCountryFallback?: string | null
): CountryRegionMetadata {
  const raw = (inputCodeOrDial || businessCountryFallback || 'IN').trim().toUpperCase();

  // Find country by dial code or country code
  let matchedCountry = COUNTRY_CODES.find(
    (c) => c.dialCode === raw || c.code.toUpperCase() === raw || c.name.toUpperCase() === raw
  );

  if (!matchedCountry && businessCountryFallback) {
    const cleanB = businessCountryFallback.trim().toUpperCase();
    matchedCountry = COUNTRY_CODES.find(
      (c) => c.dialCode === cleanB || c.code.toUpperCase() === cleanB || c.name.toUpperCase() === cleanB
    );
  }

  const cCode = matchedCountry ? matchedCountry.code : 'IN';
  const cName = matchedCountry ? matchedCountry.name : 'India';
  const dial = matchedCountry ? matchedCountry.dialCode : '+91';
  const flag = matchedCountry ? matchedCountry.flag : '🌐';

  // UAE
  if (cCode === 'AE' || dial === '+971' || cName.toLowerCase().includes('emirates') || raw === 'UAE') {
    return {
      countryCode: 'AE',
      countryName: 'United Arab Emirates',
      dialCode: '+971',
      flag: '🇦🇪',
      stateLabel: 'Emirate',
      statePlaceholder: 'e.g. Dubai or Abu Dhabi',
      placeOfSupplyLabel: 'Place of Supply / Emirate',
      placeOfSupplyPlaceholder: 'Defaults to Emirate (e.g. Dubai)',
      taxLabel: 'Customer TRN (Tax Registration Number)',
      taxPlaceholder: 'e.g. 100345678900003',
      cityPlaceholder: 'e.g. Dubai, Abu Dhabi, Sharjah',
      regions: UAE_EMIRATES,
      isIndia: false,
      isUae: true,
    };
  }

  // India
  if (cCode === 'IN' || dial === '+91' || cName.toLowerCase() === 'india') {
    return {
      countryCode: 'IN',
      countryName: 'India',
      dialCode: '+91',
      flag: '🇮🇳',
      stateLabel: 'Billing State (GST)',
      statePlaceholder: 'e.g. Kerala or Maharashtra',
      placeOfSupplyLabel: 'Place of Supply (GST - India Only)',
      placeOfSupplyPlaceholder: 'Defaults to Billing State',
      taxLabel: 'Customer GSTIN (India Only)',
      taxPlaceholder: 'e.g. 32AABCU9603R1ZM',
      cityPlaceholder: 'e.g. Kochi, Mumbai, Bengaluru',
      regions: INDIAN_STATES,
      isIndia: true,
      isUae: false,
    };
  }

  // United States
  if (cCode === 'US' || dial === '+1' && (cName === 'United States' || raw === 'US' || raw === 'USA')) {
    return {
      countryCode: 'US',
      countryName: 'United States',
      dialCode: '+1',
      flag: '🇺🇸',
      stateLabel: 'State',
      statePlaceholder: 'e.g. California or New York',
      placeOfSupplyLabel: 'Place of Supply / State',
      placeOfSupplyPlaceholder: 'Defaults to State',
      taxLabel: 'Federal Tax ID / EIN',
      taxPlaceholder: 'e.g. 12-3456789',
      cityPlaceholder: 'e.g. New York, San Francisco, Austin',
      regions: US_STATES,
      isIndia: false,
      isUae: false,
    };
  }

  // United Kingdom
  if (cCode === 'GB' || dial === '+44' || cName.toLowerCase().includes('kingdom') || raw === 'UK') {
    return {
      countryCode: 'GB',
      countryName: 'United Kingdom',
      dialCode: '+44',
      flag: '🇬🇧',
      stateLabel: 'County / Region',
      statePlaceholder: 'e.g. Greater London or West Midlands',
      placeOfSupplyLabel: 'Place of Supply / County',
      placeOfSupplyPlaceholder: 'Defaults to County',
      taxLabel: 'VAT Registration Number (VRN)',
      taxPlaceholder: 'e.g. GB 123 4567 89',
      cityPlaceholder: 'e.g. London, Manchester, Edinburgh',
      regions: UK_REGIONS,
      isIndia: false,
      isUae: false,
    };
  }

  // Saudi Arabia
  if (cCode === 'SA' || dial === '+966' || cName.toLowerCase().includes('saudi') || raw === 'KSA') {
    return {
      countryCode: 'SA',
      countryName: 'Saudi Arabia',
      dialCode: '+966',
      flag: '🇸🇦',
      stateLabel: 'Province / Region',
      statePlaceholder: 'e.g. Riyadh or Makkah',
      placeOfSupplyLabel: 'Place of Supply / Region',
      placeOfSupplyPlaceholder: 'Defaults to Region',
      taxLabel: 'Customer VAT Number (ZATCA)',
      taxPlaceholder: 'e.g. 300XXXXXXXXX003',
      cityPlaceholder: 'e.g. Riyadh, Jeddah, Dammam',
      regions: SAUDI_REGIONS,
      isIndia: false,
      isUae: false,
    };
  }

  // Canada
  if (cCode === 'CA' || cName.toLowerCase() === 'canada') {
    return {
      countryCode: 'CA',
      countryName: 'Canada',
      dialCode: '+1',
      flag: '🇨🇦',
      stateLabel: 'Province / Territory',
      statePlaceholder: 'e.g. Ontario or British Columbia',
      placeOfSupplyLabel: 'Place of Supply / Province',
      placeOfSupplyPlaceholder: 'Defaults to Province',
      taxLabel: 'Business Number / GST/HST ID',
      taxPlaceholder: 'e.g. 123456789 RT0001',
      cityPlaceholder: 'e.g. Toronto, Vancouver, Montreal',
      regions: CANADA_PROVINCES,
      isIndia: false,
      isUae: false,
    };
  }

  // Australia
  if (cCode === 'AU' || dial === '+61' || cName.toLowerCase() === 'australia') {
    return {
      countryCode: 'AU',
      countryName: 'Australia',
      dialCode: '+61',
      flag: '🇦🇺',
      stateLabel: 'State / Territory',
      statePlaceholder: 'e.g. New South Wales or Victoria',
      placeOfSupplyLabel: 'Place of Supply / State',
      placeOfSupplyPlaceholder: 'Defaults to State',
      taxLabel: 'ABN (Australian Business Number)',
      taxPlaceholder: 'e.g. 12 345 678 901',
      cityPlaceholder: 'e.g. Sydney, Melbourne, Brisbane',
      regions: AUSTRALIA_STATES,
      isIndia: false,
      isUae: false,
    };
  }

  // Generic Global / Other
  return {
    countryCode: cCode,
    countryName: cName,
    dialCode: dial,
    flag: flag,
    stateLabel: 'State / Province / Region',
    statePlaceholder: 'e.g. State or Province',
    placeOfSupplyLabel: 'Place of Supply / Region',
    placeOfSupplyPlaceholder: 'Defaults to State / Region',
    taxLabel: 'Customer Tax ID / VAT Number',
    taxPlaceholder: 'e.g. Tax ID or VAT Number',
    cityPlaceholder: 'e.g. City Name',
    regions: [],
    isIndia: false,
    isUae: false,
  };
}
