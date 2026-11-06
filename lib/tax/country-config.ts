import { CurrencyCode, TaxSystem } from '@/types/database';
import { COMMON_HSN_SAC_CODES } from './india-gst';

export interface CountryTaxProfile {
  code: string;
  name: string;
  flag: string;
  defaultCurrency: CurrencyCode;
  taxSystem: TaxSystem;
  taxLabel: string;
  goodsClassificationLabel: string;
  goodsPlaceholder: string;
  serviceClassificationLabel: string;
  servicePlaceholder: string;
  defaultTaxRate: number;
  taxRates: Array<{ label: string; rate: number }>;
  isIndiaGst: boolean;
  isUaeVat: boolean;
}

export const COUNTRIES: CountryTaxProfile[] = [
  {
    "code": "IN",
    "name": "India",
    "flag": "🇮🇳",
    "defaultCurrency": "INR",
    "taxSystem": "GST",
    "taxLabel": "GSTIN (Goods & Services Tax ID)",
    "goodsClassificationLabel": "HSN Code",
    "goodsPlaceholder": "e.g. 84713010",
    "serviceClassificationLabel": "SAC Code",
    "servicePlaceholder": "e.g. 998311",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "GST 0% (Nil / Exempt)",
        "rate": 0
      },
      {
        "label": "GST 5% (CGST 2.5% + SGST 2.5% / IGST 5%)",
        "rate": 5
      },
      {
        "label": "GST 12% (CGST 6% + SGST 6% / IGST 12%)",
        "rate": 12
      },
      {
        "label": "GST 18% (CGST 9% + SGST 9% / IGST 18%)",
        "rate": 18
      },
      {
        "label": "GST 28% (CGST 14% + SGST 14% / IGST 28%)",
        "rate": 28
      }
    ],
    "isIndiaGst": true,
    "isUaeVat": false
  },
  {
    "code": "AE",
    "name": "United Arab Emirates",
    "flag": "🇦🇪",
    "defaultCurrency": "AED",
    "taxSystem": "VAT",
    "taxLabel": "TRN (Tax Registration Number)",
    "goodsClassificationLabel": "HS Code",
    "goodsPlaceholder": "e.g. 8471.30.00",
    "serviceClassificationLabel": "Service Category",
    "servicePlaceholder": "e.g. IT & Software Services",
    "defaultTaxRate": 5,
    "taxRates": [
      {
        "label": "Standard VAT 5%",
        "rate": 5
      },
      {
        "label": "Zero-rated VAT 0%",
        "rate": 0
      },
      {
        "label": "Exempt 0%",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": true
  },
  {
    "code": "US",
    "name": "United States",
    "flag": "🇺🇸",
    "defaultCurrency": "USD",
    "taxSystem": "SALES_TAX",
    "taxLabel": "EIN / Tax ID",
    "goodsClassificationLabel": "Item / SKU Code",
    "goodsPlaceholder": "e.g. SKU-1002",
    "serviceClassificationLabel": "Service Code",
    "servicePlaceholder": "e.g. SVC-CONSULT",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "No Sales Tax (0%)",
        "rate": 0
      },
      {
        "label": "Sales Tax 5%",
        "rate": 5
      },
      {
        "label": "Sales Tax 7.25%",
        "rate": 7.25
      },
      {
        "label": "Sales Tax 8.875%",
        "rate": 8.875
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GB",
    "name": "United Kingdom",
    "flag": "🇬🇧",
    "defaultCurrency": "GBP",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "Commodity Code",
    "goodsPlaceholder": "e.g. 8471 30 00",
    "serviceClassificationLabel": "Service Category",
    "servicePlaceholder": "e.g. Professional Consulting",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard VAT 20%",
        "rate": 20
      },
      {
        "label": "Reduced Rate 5%",
        "rate": 5
      },
      {
        "label": "Zero Rate 0%",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SA",
    "name": "Saudi Arabia",
    "flag": "🇸🇦",
    "defaultCurrency": "SAR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Account Number (ZATCA)",
    "goodsClassificationLabel": "HS Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category",
    "servicePlaceholder": "e.g. Technical Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard VAT 15%",
        "rate": 15
      },
      {
        "label": "Zero-rated 0%",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "KW",
    "name": "Kuwait",
    "flag": "🇰🇼",
    "defaultCurrency": "KWD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CA",
    "name": "Canada",
    "flag": "🇨🇦",
    "defaultCurrency": "CAD",
    "taxSystem": "SALES_TAX",
    "taxLabel": "GST/HST Number",
    "goodsClassificationLabel": "HS Code / SKU",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category",
    "servicePlaceholder": "e.g. Software Development",
    "defaultTaxRate": 13,
    "taxRates": [
      {
        "label": "GST (5%)",
        "rate": 5
      },
      {
        "label": "HST Ontario (13%)",
        "rate": 13
      },
      {
        "label": "HST Atlantic (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "AU",
    "name": "Australia",
    "flag": "🇦🇺",
    "defaultCurrency": "AUD",
    "taxSystem": "GST",
    "taxLabel": "ABN (Australian Business Number)",
    "goodsClassificationLabel": "Tariff / Item Code",
    "goodsPlaceholder": "e.g. 8471.30.00",
    "serviceClassificationLabel": "Service Category",
    "servicePlaceholder": "e.g. Business Advisory",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "GST 10%",
        "rate": 10
      },
      {
        "label": "GST Free 0%",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "DE",
    "name": "Germany",
    "flag": "🇩🇪",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 19,
    "taxRates": [
      {
        "label": "Standard (19%)",
        "rate": 19
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SG",
    "name": "Singapore",
    "flag": "🇸🇬",
    "defaultCurrency": "SGD",
    "taxSystem": "GST",
    "taxLabel": "GST Registration Number",
    "goodsClassificationLabel": "HS Code",
    "goodsPlaceholder": "e.g. 8471.30.10",
    "serviceClassificationLabel": "Service Category",
    "servicePlaceholder": "e.g. Managed IT Services",
    "defaultTaxRate": 9,
    "taxRates": [
      {
        "label": "GST 9%",
        "rate": 9
      },
      {
        "label": "Zero-rated 0%",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "AF",
    "name": "Afghanistan",
    "flag": "🇦🇫",
    "defaultCurrency": "AFN",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "AL",
    "name": "Albania",
    "flag": "🇦🇱",
    "defaultCurrency": "ALL",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "DZ",
    "name": "Algeria",
    "flag": "🇩🇿",
    "defaultCurrency": "DZD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 19,
    "taxRates": [
      {
        "label": "Standard (19%)",
        "rate": 19
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "AD",
    "name": "Andorra",
    "flag": "🇦🇩",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 4.5,
    "taxRates": [
      {
        "label": "Standard (4.5%)",
        "rate": 4.5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "AO",
    "name": "Angola",
    "flag": "🇦🇴",
    "defaultCurrency": "AOA",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 14,
    "taxRates": [
      {
        "label": "Standard (14%)",
        "rate": 14
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "AG",
    "name": "Antigua and Barbuda",
    "flag": "🇦🇬",
    "defaultCurrency": "XCD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "AR",
    "name": "Argentina",
    "flag": "🇦🇷",
    "defaultCurrency": "ARS",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 21,
    "taxRates": [
      {
        "label": "Standard (21%)",
        "rate": 21
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "AM",
    "name": "Armenia",
    "flag": "🇦🇲",
    "defaultCurrency": "AMD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "AT",
    "name": "Austria",
    "flag": "🇦🇹",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "AZ",
    "name": "Azerbaijan",
    "flag": "🇦🇿",
    "defaultCurrency": "AZN",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BS",
    "name": "Bahamas",
    "flag": "🇧🇸",
    "defaultCurrency": "BSD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BH",
    "name": "Bahrain",
    "flag": "🇧🇭",
    "defaultCurrency": "BHD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BD",
    "name": "Bangladesh",
    "flag": "🇧🇩",
    "defaultCurrency": "BDT",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BB",
    "name": "Barbados",
    "flag": "🇧🇧",
    "defaultCurrency": "BBD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 17.5,
    "taxRates": [
      {
        "label": "Standard (17.5%)",
        "rate": 17.5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BY",
    "name": "Belarus",
    "flag": "🇧🇾",
    "defaultCurrency": "BYN",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BE",
    "name": "Belgium",
    "flag": "🇧🇪",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 21,
    "taxRates": [
      {
        "label": "Standard (21%)",
        "rate": 21
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BZ",
    "name": "Belize",
    "flag": "🇧🇿",
    "defaultCurrency": "BZD",
    "taxSystem": "GST",
    "taxLabel": "GST Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 12.5,
    "taxRates": [
      {
        "label": "Standard (12.5%)",
        "rate": 12.5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BJ",
    "name": "Benin",
    "flag": "🇧🇯",
    "defaultCurrency": "XOF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BT",
    "name": "Bhutan",
    "flag": "🇧🇹",
    "defaultCurrency": "BTN",
    "taxSystem": "GST",
    "taxLabel": "GST Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 7,
    "taxRates": [
      {
        "label": "Standard (7%)",
        "rate": 7
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BO",
    "name": "Bolivia",
    "flag": "🇧🇴",
    "defaultCurrency": "BOB",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 13,
    "taxRates": [
      {
        "label": "Standard (13%)",
        "rate": 13
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BA",
    "name": "Bosnia and Herzegovina",
    "flag": "🇧🇦",
    "defaultCurrency": "BAM",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 17,
    "taxRates": [
      {
        "label": "Standard (17%)",
        "rate": 17
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BW",
    "name": "Botswana",
    "flag": "🇧🇼",
    "defaultCurrency": "BWP",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 14,
    "taxRates": [
      {
        "label": "Standard (14%)",
        "rate": 14
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BR",
    "name": "Brazil",
    "flag": "🇧🇷",
    "defaultCurrency": "BRL",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 17,
    "taxRates": [
      {
        "label": "Standard (17%)",
        "rate": 17
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BN",
    "name": "Brunei",
    "flag": "🇧🇳",
    "defaultCurrency": "BND",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BG",
    "name": "Bulgaria",
    "flag": "🇧🇬",
    "defaultCurrency": "BGN",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BF",
    "name": "Burkina Faso",
    "flag": "🇧🇫",
    "defaultCurrency": "XOF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BI",
    "name": "Burundi",
    "flag": "🇧🇮",
    "defaultCurrency": "BIF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "KH",
    "name": "Cambodia",
    "flag": "🇰🇭",
    "defaultCurrency": "KHR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CM",
    "name": "Cameroon",
    "flag": "🇨🇲",
    "defaultCurrency": "XAF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 19.25,
    "taxRates": [
      {
        "label": "Standard (19.25%)",
        "rate": 19.25
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CV",
    "name": "Cape Verde",
    "flag": "🇨🇻",
    "defaultCurrency": "CVE",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CF",
    "name": "Central African Republic",
    "flag": "🇨🇫",
    "defaultCurrency": "XAF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 19,
    "taxRates": [
      {
        "label": "Standard (19%)",
        "rate": 19
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "TD",
    "name": "Chad",
    "flag": "🇹🇩",
    "defaultCurrency": "XAF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CL",
    "name": "Chile",
    "flag": "🇨🇱",
    "defaultCurrency": "CLP",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 19,
    "taxRates": [
      {
        "label": "Standard (19%)",
        "rate": 19
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CN",
    "name": "China",
    "flag": "🇨🇳",
    "defaultCurrency": "CNY",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 13,
    "taxRates": [
      {
        "label": "Standard (13%)",
        "rate": 13
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CO",
    "name": "Colombia",
    "flag": "🇨🇴",
    "defaultCurrency": "COP",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 19,
    "taxRates": [
      {
        "label": "Standard (19%)",
        "rate": 19
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "KM",
    "name": "Comoros",
    "flag": "🇰🇲",
    "defaultCurrency": "KMF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CG",
    "name": "Congo",
    "flag": "🇨🇬",
    "defaultCurrency": "XAF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CD",
    "name": "Democratic Republic of the Congo",
    "flag": "🇨🇩",
    "defaultCurrency": "CDF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 16,
    "taxRates": [
      {
        "label": "Standard (16%)",
        "rate": 16
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CR",
    "name": "Costa Rica",
    "flag": "🇨🇷",
    "defaultCurrency": "CRC",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 13,
    "taxRates": [
      {
        "label": "Standard (13%)",
        "rate": 13
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CI",
    "name": "Cote d'Ivoire",
    "flag": "🇨🇮",
    "defaultCurrency": "XOF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "HR",
    "name": "Croatia",
    "flag": "🇭🇷",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 25,
    "taxRates": [
      {
        "label": "Standard (25%)",
        "rate": 25
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CU",
    "name": "Cuba",
    "flag": "🇨🇺",
    "defaultCurrency": "CUP",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CY",
    "name": "Cyprus",
    "flag": "🇨🇾",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 19,
    "taxRates": [
      {
        "label": "Standard (19%)",
        "rate": 19
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CZ",
    "name": "Czech Republic",
    "flag": "🇨🇿",
    "defaultCurrency": "CZK",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 21,
    "taxRates": [
      {
        "label": "Standard (21%)",
        "rate": 21
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "DK",
    "name": "Denmark",
    "flag": "🇩🇰",
    "defaultCurrency": "DKK",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 25,
    "taxRates": [
      {
        "label": "Standard (25%)",
        "rate": 25
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "DJ",
    "name": "Djibouti",
    "flag": "🇩🇯",
    "defaultCurrency": "DJF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "DM",
    "name": "Dominica",
    "flag": "🇩🇲",
    "defaultCurrency": "XCD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "DO",
    "name": "Dominican Republic",
    "flag": "🇩🇴",
    "defaultCurrency": "DOP",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "EC",
    "name": "Ecuador",
    "flag": "🇪🇨",
    "defaultCurrency": "USD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "EG",
    "name": "Egypt",
    "flag": "🇪🇬",
    "defaultCurrency": "EGP",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 14,
    "taxRates": [
      {
        "label": "Standard (14%)",
        "rate": 14
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SV",
    "name": "El Salvador",
    "flag": "🇸🇻",
    "defaultCurrency": "USD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 13,
    "taxRates": [
      {
        "label": "Standard (13%)",
        "rate": 13
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GQ",
    "name": "Equatorial Guinea",
    "flag": "🇬🇶",
    "defaultCurrency": "XAF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "ER",
    "name": "Eritrea",
    "flag": "🇪🇷",
    "defaultCurrency": "ERN",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 4,
    "taxRates": [
      {
        "label": "Standard (4%)",
        "rate": 4
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "EE",
    "name": "Estonia",
    "flag": "🇪🇪",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 22,
    "taxRates": [
      {
        "label": "Standard (22%)",
        "rate": 22
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SZ",
    "name": "Eswatini",
    "flag": "🇸🇿",
    "defaultCurrency": "SZL",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "ET",
    "name": "Ethiopia",
    "flag": "🇪🇹",
    "defaultCurrency": "ETB",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "FJ",
    "name": "Fiji",
    "flag": "🇫🇯",
    "defaultCurrency": "FJD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "FI",
    "name": "Finland",
    "flag": "🇫🇮",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 25.5,
    "taxRates": [
      {
        "label": "Standard (25.5%)",
        "rate": 25.5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "FR",
    "name": "France",
    "flag": "🇫🇷",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GA",
    "name": "Gabon",
    "flag": "🇬🇦",
    "defaultCurrency": "XAF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GM",
    "name": "Gambia",
    "flag": "🇬🇲",
    "defaultCurrency": "GMD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GE",
    "name": "Georgia",
    "flag": "🇬🇪",
    "defaultCurrency": "GEL",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GH",
    "name": "Ghana",
    "flag": "🇬🇭",
    "defaultCurrency": "GHS",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GR",
    "name": "Greece",
    "flag": "🇬🇷",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 24,
    "taxRates": [
      {
        "label": "Standard (24%)",
        "rate": 24
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GD",
    "name": "Grenada",
    "flag": "🇬🇩",
    "defaultCurrency": "XCD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GT",
    "name": "Guatemala",
    "flag": "🇬🇹",
    "defaultCurrency": "GTQ",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 12,
    "taxRates": [
      {
        "label": "Standard (12%)",
        "rate": 12
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GN",
    "name": "Guinea",
    "flag": "🇬🇳",
    "defaultCurrency": "GNF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GW",
    "name": "Guinea-Bissau",
    "flag": "🇬🇼",
    "defaultCurrency": "XOF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 19,
    "taxRates": [
      {
        "label": "Standard (19%)",
        "rate": 19
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GY",
    "name": "Guyana",
    "flag": "🇬🇾",
    "defaultCurrency": "GYD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 14,
    "taxRates": [
      {
        "label": "Standard (14%)",
        "rate": 14
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "HT",
    "name": "Haiti",
    "flag": "🇭🇹",
    "defaultCurrency": "HTG",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "HN",
    "name": "Honduras",
    "flag": "🇭🇳",
    "defaultCurrency": "HNL",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "HK",
    "name": "Hong Kong",
    "flag": "🇭🇰",
    "defaultCurrency": "HKD",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "HU",
    "name": "Hungary",
    "flag": "🇭🇺",
    "defaultCurrency": "HUF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 27,
    "taxRates": [
      {
        "label": "Standard (27%)",
        "rate": 27
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "IS",
    "name": "Iceland",
    "flag": "🇮🇸",
    "defaultCurrency": "ISK",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 24,
    "taxRates": [
      {
        "label": "Standard (24%)",
        "rate": 24
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "ID",
    "name": "Indonesia",
    "flag": "🇮🇩",
    "defaultCurrency": "IDR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 11,
    "taxRates": [
      {
        "label": "Standard (11%)",
        "rate": 11
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "IR",
    "name": "Iran",
    "flag": "🇮🇷",
    "defaultCurrency": "IRR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 9,
    "taxRates": [
      {
        "label": "Standard (9%)",
        "rate": 9
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "IQ",
    "name": "Iraq",
    "flag": "🇮🇶",
    "defaultCurrency": "IQD",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "IE",
    "name": "Ireland",
    "flag": "🇮🇪",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 23,
    "taxRates": [
      {
        "label": "Standard (23%)",
        "rate": 23
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "IL",
    "name": "Israel",
    "flag": "🇮🇱",
    "defaultCurrency": "ILS",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 17,
    "taxRates": [
      {
        "label": "Standard (17%)",
        "rate": 17
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "IT",
    "name": "Italy",
    "flag": "🇮🇹",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 22,
    "taxRates": [
      {
        "label": "Standard (22%)",
        "rate": 22
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "JM",
    "name": "Jamaica",
    "flag": "🇯🇲",
    "defaultCurrency": "JMD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "JP",
    "name": "Japan",
    "flag": "🇯🇵",
    "defaultCurrency": "JPY",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "JO",
    "name": "Jordan",
    "flag": "🇯🇴",
    "defaultCurrency": "JOD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 16,
    "taxRates": [
      {
        "label": "Standard (16%)",
        "rate": 16
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "KZ",
    "name": "Kazakhstan",
    "flag": "🇰🇿",
    "defaultCurrency": "KZT",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 12,
    "taxRates": [
      {
        "label": "Standard (12%)",
        "rate": 12
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "KE",
    "name": "Kenya",
    "flag": "🇰🇪",
    "defaultCurrency": "KES",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 16,
    "taxRates": [
      {
        "label": "Standard (16%)",
        "rate": 16
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "KI",
    "name": "Kiribati",
    "flag": "🇰🇮",
    "defaultCurrency": "AUD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 12.5,
    "taxRates": [
      {
        "label": "Standard (12.5%)",
        "rate": 12.5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "KR",
    "name": "South Korea",
    "flag": "🇰🇷",
    "defaultCurrency": "KRW",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "KG",
    "name": "Kyrgyzstan",
    "flag": "🇰🇬",
    "defaultCurrency": "KGS",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 12,
    "taxRates": [
      {
        "label": "Standard (12%)",
        "rate": 12
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "LA",
    "name": "Laos",
    "flag": "🇱🇦",
    "defaultCurrency": "LAK",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "LV",
    "name": "Latvia",
    "flag": "🇱🇻",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 21,
    "taxRates": [
      {
        "label": "Standard (21%)",
        "rate": 21
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "LB",
    "name": "Lebanon",
    "flag": "🇱🇧",
    "defaultCurrency": "LBP",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 11,
    "taxRates": [
      {
        "label": "Standard (11%)",
        "rate": 11
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "LS",
    "name": "Lesotho",
    "flag": "🇱🇸",
    "defaultCurrency": "LSL",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "LR",
    "name": "Liberia",
    "flag": "🇱🇷",
    "defaultCurrency": "LRD",
    "taxSystem": "GST",
    "taxLabel": "GST Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "LY",
    "name": "Libya",
    "flag": "🇱🇾",
    "defaultCurrency": "LYD",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "LI",
    "name": "Liechtenstein",
    "flag": "🇱🇮",
    "defaultCurrency": "CHF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 8.1,
    "taxRates": [
      {
        "label": "Standard (8.1%)",
        "rate": 8.1
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "LT",
    "name": "Lithuania",
    "flag": "🇱🇹",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 21,
    "taxRates": [
      {
        "label": "Standard (21%)",
        "rate": 21
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "LU",
    "name": "Luxembourg",
    "flag": "🇱🇺",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 17,
    "taxRates": [
      {
        "label": "Standard (17%)",
        "rate": 17
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MG",
    "name": "Madagascar",
    "flag": "🇲🇬",
    "defaultCurrency": "MGA",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MW",
    "name": "Malawi",
    "flag": "🇲🇼",
    "defaultCurrency": "MWK",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 16.5,
    "taxRates": [
      {
        "label": "Standard (16.5%)",
        "rate": 16.5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MY",
    "name": "Malaysia",
    "flag": "🇲🇾",
    "defaultCurrency": "MYR",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 8,
    "taxRates": [
      {
        "label": "Standard (8%)",
        "rate": 8
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MV",
    "name": "Maldives",
    "flag": "🇲🇻",
    "defaultCurrency": "MVR",
    "taxSystem": "GST",
    "taxLabel": "GST Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 8,
    "taxRates": [
      {
        "label": "Standard (8%)",
        "rate": 8
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "ML",
    "name": "Mali",
    "flag": "🇲🇱",
    "defaultCurrency": "XOF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MT",
    "name": "Malta",
    "flag": "🇲🇹",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MR",
    "name": "Mauritania",
    "flag": "🇲🇷",
    "defaultCurrency": "MRU",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 16,
    "taxRates": [
      {
        "label": "Standard (16%)",
        "rate": 16
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MU",
    "name": "Mauritius",
    "flag": "🇲🇺",
    "defaultCurrency": "MUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MX",
    "name": "Mexico",
    "flag": "🇲🇽",
    "defaultCurrency": "MXN",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 16,
    "taxRates": [
      {
        "label": "Standard (16%)",
        "rate": 16
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MD",
    "name": "Moldova",
    "flag": "🇲🇩",
    "defaultCurrency": "MDL",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MC",
    "name": "Monaco",
    "flag": "🇲🇨",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MN",
    "name": "Mongolia",
    "flag": "🇲🇳",
    "defaultCurrency": "MNT",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "ME",
    "name": "Montenegro",
    "flag": "🇲🇪",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 21,
    "taxRates": [
      {
        "label": "Standard (21%)",
        "rate": 21
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MA",
    "name": "Morocco",
    "flag": "🇲🇦",
    "defaultCurrency": "MAD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MZ",
    "name": "Mozambique",
    "flag": "🇲🇿",
    "defaultCurrency": "MZN",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 16,
    "taxRates": [
      {
        "label": "Standard (16%)",
        "rate": 16
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MM",
    "name": "Myanmar",
    "flag": "🇲🇲",
    "defaultCurrency": "MMK",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 5,
    "taxRates": [
      {
        "label": "Standard (5%)",
        "rate": 5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "NA",
    "name": "Namibia",
    "flag": "🇳🇦",
    "defaultCurrency": "NAD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "NP",
    "name": "Nepal",
    "flag": "🇳🇵",
    "defaultCurrency": "NPR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 13,
    "taxRates": [
      {
        "label": "Standard (13%)",
        "rate": 13
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "NL",
    "name": "Netherlands",
    "flag": "🇳🇱",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 21,
    "taxRates": [
      {
        "label": "Standard (21%)",
        "rate": 21
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "NZ",
    "name": "New Zealand",
    "flag": "🇳🇿",
    "defaultCurrency": "NZD",
    "taxSystem": "GST",
    "taxLabel": "GST Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "NI",
    "name": "Nicaragua",
    "flag": "🇳🇮",
    "defaultCurrency": "NIO",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "NE",
    "name": "Niger",
    "flag": "🇳🇪",
    "defaultCurrency": "XOF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 19,
    "taxRates": [
      {
        "label": "Standard (19%)",
        "rate": 19
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "NG",
    "name": "Nigeria",
    "flag": "🇳🇬",
    "defaultCurrency": "NGN",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 7.5,
    "taxRates": [
      {
        "label": "Standard (7.5%)",
        "rate": 7.5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "NO",
    "name": "Norway",
    "flag": "🇳🇴",
    "defaultCurrency": "NOK",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 25,
    "taxRates": [
      {
        "label": "Standard (25%)",
        "rate": 25
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "OM",
    "name": "Oman",
    "flag": "🇴🇲",
    "defaultCurrency": "OMR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 5,
    "taxRates": [
      {
        "label": "Standard (5%)",
        "rate": 5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "PK",
    "name": "Pakistan",
    "flag": "🇵🇰",
    "defaultCurrency": "PKR",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "PA",
    "name": "Panama",
    "flag": "🇵🇦",
    "defaultCurrency": "PAB",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 7,
    "taxRates": [
      {
        "label": "Standard (7%)",
        "rate": 7
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "PG",
    "name": "Papua New Guinea",
    "flag": "🇵🇬",
    "defaultCurrency": "PGK",
    "taxSystem": "GST",
    "taxLabel": "GST Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "PY",
    "name": "Paraguay",
    "flag": "🇵🇾",
    "defaultCurrency": "PYG",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "PE",
    "name": "Peru",
    "flag": "🇵🇪",
    "defaultCurrency": "PEN",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "PH",
    "name": "Philippines",
    "flag": "🇵🇭",
    "defaultCurrency": "PHP",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 12,
    "taxRates": [
      {
        "label": "Standard (12%)",
        "rate": 12
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "PL",
    "name": "Poland",
    "flag": "🇵🇱",
    "defaultCurrency": "PLN",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 23,
    "taxRates": [
      {
        "label": "Standard (23%)",
        "rate": 23
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "PT",
    "name": "Portugal",
    "flag": "🇵🇹",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 23,
    "taxRates": [
      {
        "label": "Standard (23%)",
        "rate": 23
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "QA",
    "name": "Qatar",
    "flag": "🇶🇦",
    "defaultCurrency": "QAR",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "RO",
    "name": "Romania",
    "flag": "🇷🇴",
    "defaultCurrency": "RON",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 19,
    "taxRates": [
      {
        "label": "Standard (19%)",
        "rate": 19
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "RU",
    "name": "Russia",
    "flag": "🇷🇺",
    "defaultCurrency": "RUB",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "RW",
    "name": "Rwanda",
    "flag": "🇷🇼",
    "defaultCurrency": "RWF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "KN",
    "name": "Saint Kitts and Nevis",
    "flag": "🇰🇳",
    "defaultCurrency": "XCD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 17,
    "taxRates": [
      {
        "label": "Standard (17%)",
        "rate": 17
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "LC",
    "name": "Saint Lucia",
    "flag": "🇱🇨",
    "defaultCurrency": "XCD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 12.5,
    "taxRates": [
      {
        "label": "Standard (12.5%)",
        "rate": 12.5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "VC",
    "name": "Saint Vincent and the Grenadines",
    "flag": "🇻🇨",
    "defaultCurrency": "XCD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 16,
    "taxRates": [
      {
        "label": "Standard (16%)",
        "rate": 16
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "WS",
    "name": "Samoa",
    "flag": "🇼🇸",
    "defaultCurrency": "WST",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SM",
    "name": "San Marino",
    "flag": "🇸🇲",
    "defaultCurrency": "EUR",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "ST",
    "name": "Sao Tome and Principe",
    "flag": "🇸🇹",
    "defaultCurrency": "STN",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SN",
    "name": "Senegal",
    "flag": "🇸🇳",
    "defaultCurrency": "XOF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "RS",
    "name": "Serbia",
    "flag": "🇷🇸",
    "defaultCurrency": "RSD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SC",
    "name": "Seychelles",
    "flag": "🇸🇨",
    "defaultCurrency": "SCR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SL",
    "name": "Sierra Leone",
    "flag": "🇸🇱",
    "defaultCurrency": "SLE",
    "taxSystem": "GST",
    "taxLabel": "GST Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SK",
    "name": "Slovakia",
    "flag": "🇸🇰",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SI",
    "name": "Slovenia",
    "flag": "🇸🇮",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 22,
    "taxRates": [
      {
        "label": "Standard (22%)",
        "rate": 22
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SB",
    "name": "Solomon Islands",
    "flag": "🇸🇧",
    "defaultCurrency": "SBD",
    "taxSystem": "GST",
    "taxLabel": "GST Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SO",
    "name": "Somalia",
    "flag": "🇸🇴",
    "defaultCurrency": "SOS",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 5,
    "taxRates": [
      {
        "label": "Standard (5%)",
        "rate": 5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "ZA",
    "name": "South Africa",
    "flag": "🇿🇦",
    "defaultCurrency": "ZAR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SS",
    "name": "South Sudan",
    "flag": "🇸🇸",
    "defaultCurrency": "SSP",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "ES",
    "name": "Spain",
    "flag": "🇪🇸",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 21,
    "taxRates": [
      {
        "label": "Standard (21%)",
        "rate": 21
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "LK",
    "name": "Sri Lanka",
    "flag": "🇱🇰",
    "defaultCurrency": "LKR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SD",
    "name": "Sudan",
    "flag": "🇸🇩",
    "defaultCurrency": "SDG",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 17,
    "taxRates": [
      {
        "label": "Standard (17%)",
        "rate": 17
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SR",
    "name": "Suriname",
    "flag": "🇸🇷",
    "defaultCurrency": "SRD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SE",
    "name": "Sweden",
    "flag": "🇸🇪",
    "defaultCurrency": "SEK",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 25,
    "taxRates": [
      {
        "label": "Standard (25%)",
        "rate": 25
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CH",
    "name": "Switzerland",
    "flag": "🇨🇭",
    "defaultCurrency": "CHF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 8.1,
    "taxRates": [
      {
        "label": "Standard (8.1%)",
        "rate": 8.1
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SY",
    "name": "Syria",
    "flag": "🇸🇾",
    "defaultCurrency": "SYP",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "TW",
    "name": "Taiwan",
    "flag": "🇹🇼",
    "defaultCurrency": "TWD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 5,
    "taxRates": [
      {
        "label": "Standard (5%)",
        "rate": 5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "TJ",
    "name": "Tajikistan",
    "flag": "🇹🇯",
    "defaultCurrency": "TJS",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 14,
    "taxRates": [
      {
        "label": "Standard (14%)",
        "rate": 14
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "TZ",
    "name": "Tanzania",
    "flag": "🇹🇿",
    "defaultCurrency": "TZS",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "TH",
    "name": "Thailand",
    "flag": "🇹🇭",
    "defaultCurrency": "THB",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 7,
    "taxRates": [
      {
        "label": "Standard (7%)",
        "rate": 7
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "TL",
    "name": "Timor-Leste",
    "flag": "🇹🇱",
    "defaultCurrency": "USD",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 2.5,
    "taxRates": [
      {
        "label": "Standard (2.5%)",
        "rate": 2.5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "TG",
    "name": "Togo",
    "flag": "🇹🇬",
    "defaultCurrency": "XOF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "TO",
    "name": "Tonga",
    "flag": "🇹🇴",
    "defaultCurrency": "TOP",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "TT",
    "name": "Trinidad and Tobago",
    "flag": "🇹🇹",
    "defaultCurrency": "TTD",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 12.5,
    "taxRates": [
      {
        "label": "Standard (12.5%)",
        "rate": 12.5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "TN",
    "name": "Tunisia",
    "flag": "🇹🇳",
    "defaultCurrency": "TND",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 19,
    "taxRates": [
      {
        "label": "Standard (19%)",
        "rate": 19
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "TR",
    "name": "Turkey",
    "flag": "🇹🇷",
    "defaultCurrency": "TRY",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "TM",
    "name": "Turkmenistan",
    "flag": "🇹🇲",
    "defaultCurrency": "TMT",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "TV",
    "name": "Tuvalu",
    "flag": "🇹🇻",
    "defaultCurrency": "AUD",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "UG",
    "name": "Uganda",
    "flag": "🇺🇬",
    "defaultCurrency": "UGX",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "UA",
    "name": "Ukraine",
    "flag": "🇺🇦",
    "defaultCurrency": "UAH",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "UY",
    "name": "Uruguay",
    "flag": "🇺🇾",
    "defaultCurrency": "UYU",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 22,
    "taxRates": [
      {
        "label": "Standard (22%)",
        "rate": 22
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "UZ",
    "name": "Uzbekistan",
    "flag": "🇺🇿",
    "defaultCurrency": "UZS",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 12,
    "taxRates": [
      {
        "label": "Standard (12%)",
        "rate": 12
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "VU",
    "name": "Vanuatu",
    "flag": "🇻🇺",
    "defaultCurrency": "VUV",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "VA",
    "name": "Vatican City",
    "flag": "🇻🇦",
    "defaultCurrency": "EUR",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "VE",
    "name": "Venezuela",
    "flag": "🇻🇪",
    "defaultCurrency": "VES",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 16,
    "taxRates": [
      {
        "label": "Standard (16%)",
        "rate": 16
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "VN",
    "name": "Vietnam",
    "flag": "🇻🇳",
    "defaultCurrency": "VND",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10,
    "taxRates": [
      {
        "label": "Standard (10%)",
        "rate": 10
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "YE",
    "name": "Yemen",
    "flag": "🇾🇪",
    "defaultCurrency": "YER",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 5,
    "taxRates": [
      {
        "label": "Standard (5%)",
        "rate": 5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "ZM",
    "name": "Zambia",
    "flag": "🇿🇲",
    "defaultCurrency": "ZMW",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 16,
    "taxRates": [
      {
        "label": "Standard (16%)",
        "rate": 16
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "ZW",
    "name": "Zimbabwe",
    "flag": "🇿🇼",
    "defaultCurrency": "ZWG",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 15,
    "taxRates": [
      {
        "label": "Standard (15%)",
        "rate": 15
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "PS",
    "name": "Palestine",
    "flag": "🇵🇸",
    "defaultCurrency": "ILS",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 16,
    "taxRates": [
      {
        "label": "Standard (16%)",
        "rate": 16
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "XK",
    "name": "Kosovo",
    "flag": "🇽🇰",
    "defaultCurrency": "EUR",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 18,
    "taxRates": [
      {
        "label": "Standard (18%)",
        "rate": 18
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MO",
    "name": "Macau",
    "flag": "🇲🇴",
    "defaultCurrency": "MOP",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "PR",
    "name": "Puerto Rico",
    "flag": "🇵🇷",
    "defaultCurrency": "USD",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 10.5,
    "taxRates": [
      {
        "label": "Standard (10.5%)",
        "rate": 10.5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "BM",
    "name": "Bermuda",
    "flag": "🇧🇲",
    "defaultCurrency": "BMD",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "KY",
    "name": "Cayman Islands",
    "flag": "🇰🇾",
    "defaultCurrency": "KYD",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "VG",
    "name": "British Virgin Islands",
    "flag": "🇻🇬",
    "defaultCurrency": "USD",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "VI",
    "name": "U.S. Virgin Islands",
    "flag": "🇻🇮",
    "defaultCurrency": "USD",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GI",
    "name": "Gibraltar",
    "flag": "🇬🇮",
    "defaultCurrency": "GIP",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "IM",
    "name": "Isle of Man",
    "flag": "🇮🇲",
    "defaultCurrency": "GBP",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 20,
    "taxRates": [
      {
        "label": "Standard (20%)",
        "rate": 20
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "JE",
    "name": "Jersey",
    "flag": "🇯🇪",
    "defaultCurrency": "GBP",
    "taxSystem": "GST",
    "taxLabel": "GST Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 5,
    "taxRates": [
      {
        "label": "Standard (5%)",
        "rate": 5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GG",
    "name": "Guernsey",
    "flag": "🇬🇬",
    "defaultCurrency": "GBP",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "FO",
    "name": "Faroe Islands",
    "flag": "🇫🇴",
    "defaultCurrency": "DKK",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 25,
    "taxRates": [
      {
        "label": "Standard (25%)",
        "rate": 25
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GL",
    "name": "Greenland",
    "flag": "🇬🇱",
    "defaultCurrency": "DKK",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "AW",
    "name": "Aruba",
    "flag": "🇦🇼",
    "defaultCurrency": "AWG",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 1.5,
    "taxRates": [
      {
        "label": "Standard (1.5%)",
        "rate": 1.5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "CW",
    "name": "Curacao",
    "flag": "🇨🇼",
    "defaultCurrency": "ANG",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 6,
    "taxRates": [
      {
        "label": "Standard (6%)",
        "rate": 6
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "SX",
    "name": "Sint Maarten",
    "flag": "🇸🇽",
    "defaultCurrency": "ANG",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 5,
    "taxRates": [
      {
        "label": "Standard (5%)",
        "rate": 5
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "TC",
    "name": "Turks and Caicos Islands",
    "flag": "🇹🇨",
    "defaultCurrency": "USD",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "AI",
    "name": "Anguilla",
    "flag": "🇦🇮",
    "defaultCurrency": "XCD",
    "taxSystem": "GST",
    "taxLabel": "GST Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 13,
    "taxRates": [
      {
        "label": "Standard (13%)",
        "rate": 13
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MS",
    "name": "Montserrat",
    "flag": "🇲🇸",
    "defaultCurrency": "XCD",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "PF",
    "name": "French Polynesia",
    "flag": "🇵🇫",
    "defaultCurrency": "XPF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 16,
    "taxRates": [
      {
        "label": "Standard (16%)",
        "rate": 16
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "NC",
    "name": "New Caledonia",
    "flag": "🇳🇨",
    "defaultCurrency": "XPF",
    "taxSystem": "VAT",
    "taxLabel": "VAT Registration Number",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 11,
    "taxRates": [
      {
        "label": "Standard (11%)",
        "rate": 11
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "GU",
    "name": "Guam",
    "flag": "🇬🇺",
    "defaultCurrency": "USD",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 4,
    "taxRates": [
      {
        "label": "Standard (4%)",
        "rate": 4
      },
      {
        "label": "Zero-rated (0%)",
        "rate": 0
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "AS",
    "name": "American Samoa",
    "flag": "🇦🇸",
    "defaultCurrency": "USD",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "MP",
    "name": "Northern Mariana Islands",
    "flag": "🇲🇵",
    "defaultCurrency": "USD",
    "taxSystem": "SALES_TAX",
    "taxLabel": "Sales Tax ID",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  },
  {
    "code": "OTHER",
    "name": "Other Country / International",
    "flag": "🌍",
    "defaultCurrency": "USD",
    "taxSystem": "CUSTOM",
    "taxLabel": "Tax Identification Number (TIN)",
    "goodsClassificationLabel": "HS / Product Code",
    "goodsPlaceholder": "e.g. 8471.30",
    "serviceClassificationLabel": "Service Category / Code",
    "servicePlaceholder": "e.g. IT Services",
    "defaultTaxRate": 0,
    "taxRates": [
      {
        "label": "Standard (0%)",
        "rate": 0
      },
      {
        "label": "Tax 5%",
        "rate": 5
      },
      {
        "label": "Tax 10%",
        "rate": 10
      }
    ],
    "isIndiaGst": false,
    "isUaeVat": false
  }
];

export function getCountryProfile(countryCodeOrName?: string | null): CountryTaxProfile {
  if (!countryCodeOrName) {
    return COUNTRIES[0]; // Default India
  }

  const query = countryCodeOrName.trim().toUpperCase();
  const found = COUNTRIES.find(
    (c) =>
      c.code.toUpperCase() === query ||
      c.name.toUpperCase() === query ||
      c.defaultCurrency.toUpperCase() === query ||
      (c.code === 'AE' && (query === 'UAE' || query.includes('EMIRATES') || query === 'AED')) ||
      (c.code === 'GB' && (query === 'UK' || query.includes('BRITAIN') || query.includes('KINGDOM') || query === 'GBP')) ||
      (c.code === 'US' && (query === 'USA' || query.includes('UNITED STATES') || query === 'USD')) ||
      (c.code === 'DE' && (query === 'EU' || query === 'EUROZONE' || query.includes('GERMANY') || query.includes('EUROPE') || query === 'EUR')) ||
      (c.code === 'SA' && (query === 'KSA' || query.includes('SAUDI') || query === 'SAR'))
  );

  return found || COUNTRIES[COUNTRIES.length - 1]; // Fallback to Other
}

export interface TaxClassificationItem {
  code: string;
  type: string; // 'HS' | 'SAC' | 'GOODS' | 'SERVICE'
  description: string;
  category: string;
  defaultTaxRate: number;
}

export const UAE_COMMON_CLASSIFICATIONS: TaxClassificationItem[] = [
  // Goods (HS Codes - WCO / GCC Customs)
  {
    code: '8421.21',
    type: 'HS',
    description: 'Water filtering or purifying machinery and apparatus',
    category: 'Water & Filtration',
    defaultTaxRate: 5,
  },
  {
    code: '8421.39',
    type: 'HS',
    description: 'Filtering or purifying machinery and apparatus for gases/liquids',
    category: 'Industrial Equipment',
    defaultTaxRate: 5,
  },
  {
    code: '8471.30',
    type: 'HS',
    description: 'Laptops, portable digital automatic data processing machines',
    category: 'IT Hardware',
    defaultTaxRate: 5,
  },
  {
    code: '8471.50',
    type: 'HS',
    description: 'Processing units, enterprise servers and storage arrays',
    category: 'IT Hardware',
    defaultTaxRate: 5,
  },
  {
    code: '8517.62',
    type: 'HS',
    description: 'Routers, switches, optical transmission apparatus & modems',
    category: 'Networking',
    defaultTaxRate: 5,
  },
  {
    code: '8413.70',
    type: 'HS',
    description: 'Centrifugal booster pumps and hydraulic liquid handling machinery',
    category: 'Pumps & Motors',
    defaultTaxRate: 5,
  },
  {
    code: '3926.90',
    type: 'HS',
    description: 'Polymer fittings, RO membrane housings and industrial plastic components',
    category: 'Spare Parts',
    defaultTaxRate: 5,
  },
  {
    code: '9026.10',
    type: 'HS',
    description: 'Instruments for measuring or checking the flow or level of liquids',
    category: 'Instrumentation',
    defaultTaxRate: 5,
  },
  // Services (UAE FTA VAT Categories)
  {
    code: 'SRV-IT-5',
    type: 'SERVICE',
    description: 'IT software engineering, web application development & cloud hosting',
    category: 'IT & Software',
    defaultTaxRate: 5,
  },
  {
    code: 'SRV-MAINT-5',
    type: 'SERVICE',
    description: 'Commercial maintenance contract (AMC), plant inspection & repair',
    category: 'Maintenance',
    defaultTaxRate: 5,
  },
  {
    code: 'SRV-ENG-5',
    type: 'SERVICE',
    description: 'Engineering consulting, installation, testing and commissioning',
    category: 'Engineering',
    defaultTaxRate: 5,
  },
  {
    code: 'SRV-MGMT-5',
    type: 'SERVICE',
    description: 'Management consulting, project advisory & corporate strategy',
    category: 'Consulting',
    defaultTaxRate: 5,
  },
  {
    code: 'SRV-EXP-0',
    type: 'SERVICE',
    description: 'Cross-border exported services to non-GCC residents (Article 31)',
    category: 'Export (Zero-Rated)',
    defaultTaxRate: 0,
  },
  {
    code: 'SRV-EXEMPT',
    type: 'SERVICE',
    description: 'Exempt financial services and bare land / residential transactions',
    category: 'FTA Exempt',
    defaultTaxRate: 0,
  },
];

export const US_COMMON_CLASSIFICATIONS: TaxClassificationItem[] = [
  {
    code: 'SKU-HW',
    type: 'GOODS',
    description: 'Hardware equipment, components & physical electronics',
    category: 'Hardware',
    defaultTaxRate: 0,
  },
  {
    code: 'SKU-WATER',
    type: 'GOODS',
    description: 'Commercial water purification systems and filtration units',
    category: 'Water Equipment',
    defaultTaxRate: 0,
  },
  {
    code: 'SVC-SAAS',
    type: 'SERVICE',
    description: 'Software-as-a-Service (SaaS) and digital platform subscription',
    category: 'Software',
    defaultTaxRate: 0,
  },
  {
    code: 'SVC-CONSULT',
    type: 'SERVICE',
    description: 'Professional engineering and technical consulting services',
    category: 'Professional Services',
    defaultTaxRate: 0,
  },
  {
    code: 'SVC-MAINT',
    type: 'SERVICE',
    description: 'Equipment preventative maintenance and SLA support services',
    category: 'Field Service',
    defaultTaxRate: 0,
  },
];

export const GLOBAL_COMMON_CLASSIFICATIONS: TaxClassificationItem[] = [
  {
    code: '8421.21',
    type: 'GOODS',
    description: 'Water filtering or purifying machinery & apparatus',
    category: 'Water Equipment',
    defaultTaxRate: 20,
  },
  {
    code: '8471.30',
    type: 'GOODS',
    description: 'Computers, laptops and data processing units',
    category: 'IT Hardware',
    defaultTaxRate: 20,
  },
  {
    code: '8517.62',
    type: 'GOODS',
    description: 'Networking and telecommunication devices',
    category: 'Networking',
    defaultTaxRate: 20,
  },
  {
    code: 'SRV-PROF',
    type: 'SERVICE',
    description: 'Professional, technical and software engineering services',
    category: 'Services',
    defaultTaxRate: 20,
  },
  {
    code: 'SRV-MAINT',
    type: 'SERVICE',
    description: 'Maintenance, installation and repair services',
    category: 'Maintenance',
    defaultTaxRate: 20,
  },
];

/**
 * Returns tax and commodity classification presets customized for the specified country.
 */
export function getCountryClassificationPresets(countryCodeOrName?: string | null): TaxClassificationItem[] {
  const profile = getCountryProfile(countryCodeOrName);

  if (profile.isIndiaGst) {
    return COMMON_HSN_SAC_CODES.map((c) => ({
      code: c.code,
      type: c.type,
      description: c.description,
      category: c.category,
      defaultTaxRate: c.defaultTaxRate,
    }));
  }

  if (profile.isUaeVat) {
    return UAE_COMMON_CLASSIFICATIONS;
  }

  if (profile.code === 'US') {
    return US_COMMON_CLASSIFICATIONS;
  }

  return GLOBAL_COMMON_CLASSIFICATIONS;
}

/**
 * Calculates item tax breakdown according to country profile
 */
export function calculateItemTaxBreakdown(params: {
  countryCode?: string | null;
  taxRate: number;
  taxableAmount: number;
  isInterstate?: boolean;
}): {
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
  vatAmount?: number;
  totalTax: number;
  breakdownSummary: string;
} {
  const profile = getCountryProfile(params.countryCode);
  const totalTax = Math.round(((params.taxableAmount * params.taxRate) / 100 + Number.EPSILON) * 100) / 100;

  if (profile.isIndiaGst) {
    if (params.isInterstate) {
      // Interstate: 100% IGST
      return {
        igstRate: params.taxRate,
        igstAmount: totalTax,
        totalTax,
        breakdownSummary: `IGST @ ${params.taxRate}%`,
      };
    } else {
      // Intrastate: 50% CGST + 50% SGST
      const halfRate = params.taxRate / 2;
      const halfAmount = Math.round(((totalTax / 2) + Number.EPSILON) * 100) / 100;
      return {
        cgstRate: halfRate,
        cgstAmount: halfAmount,
        sgstRate: halfRate,
        sgstAmount: totalTax - halfAmount,
        totalTax,
        breakdownSummary: `CGST ${halfRate}% + SGST ${halfRate}%`,
      };
    }
  }

  if (profile.isUaeVat) {
    return {
      vatAmount: totalTax,
      totalTax,
      breakdownSummary: `UAE VAT @ ${params.taxRate}%`,
    };
  }

  return {
    totalTax,
    breakdownSummary: `Tax @ ${params.taxRate}%`,
  };
}
