/**
 * Central Subscription Configuration for QuoteFlow
 * Single Source of Truth for:
 * - Free Trial duration
 * - Regional pricing (India ₹149/mo, Global $12/mo)
 * - Razorpay plan IDs & amounts (in smallest currency unit - paise/cents)
 * - Support contact
 */

export const SUBSCRIPTION_CONFIG = {
  // Global Free Trial duration (changed from 30 days -> 14 days)
  TRIAL_DAYS: 14,
  TRIAL_LABEL: '14-Day Free Trial',
  TRIAL_SUBTITLE: 'Try QuoteFlow free for 14 days',

  // India Plan Configuration
  INDIA: {
    currency: 'INR' as const,
    currencySymbol: '₹',
    monthlyPrice: 149,
    amountPaise: 14900, // 149 INR in paise
    formattedPrice: '₹149',
    formattedPriceWithMo: '₹149/mo',
    formattedMonthly: '₹149 / month',
    planId: process.env.RAZORPAY_PLAN_ID_STANDARD_149 || process.env.RAZORPAY_PLAN_ID_MONTHLY_149 || process.env.RAZORPAY_PLAN_ID_MONTHLY_99 || process.env.RAZORPAY_PLAN_ID_PROMO_99 || 'plan_standard_149',
    name: 'QuoteFlow Pro',
    slug: 'monthly_149',
    description: 'Complete recurring monthly subscription at ₹149/month with full access to estimates, quotes, invoicing, and client portal.',
  },

  // International / Global Plan Configuration
  GLOBAL: {
    currency: 'USD' as const,
    currencySymbol: '$',
    monthlyPrice: 12,
    amountCents: 1200, // 12 USD in cents
    formattedPrice: '$12',
    formattedPriceWithMo: '$12/mo',
    formattedMonthly: '$12 / month',
    name: 'QuoteFlow Pro Global',
    slug: 'monthly_usd_12',
    description: 'Complete recurring monthly subscription at $12/month with full access to estimates, quotes, invoicing, and client portal.',
  },

  // Central Support contact
  SUPPORT_EMAIL: 'hello@blendandbold.com',
  MARKETING_EMAIL: 'marketing@blendandbold.com',
} as const;

/**
 * Returns the relevant subscription config for a country code or billing region.
 */
export function getSubscriptionConfig(countryCodeOrRegion?: string | null) {
  const code = (countryCodeOrRegion || '').trim().toUpperCase();
  const isIndia = code === 'IN' || code === 'INDIA';

  return {
    isIndia,
    trialDays: SUBSCRIPTION_CONFIG.TRIAL_DAYS,
    trialLabel: SUBSCRIPTION_CONFIG.TRIAL_LABEL,
    trialSubtitle: SUBSCRIPTION_CONFIG.TRIAL_SUBTITLE,
    currency: isIndia ? SUBSCRIPTION_CONFIG.INDIA.currency : SUBSCRIPTION_CONFIG.GLOBAL.currency,
    currencySymbol: isIndia ? SUBSCRIPTION_CONFIG.INDIA.currencySymbol : SUBSCRIPTION_CONFIG.GLOBAL.currencySymbol,
    monthlyPrice: isIndia ? SUBSCRIPTION_CONFIG.INDIA.monthlyPrice : SUBSCRIPTION_CONFIG.GLOBAL.monthlyPrice,
    formattedPrice: isIndia ? SUBSCRIPTION_CONFIG.INDIA.formattedPrice : SUBSCRIPTION_CONFIG.GLOBAL.formattedPrice,
    formattedMonthly: isIndia ? SUBSCRIPTION_CONFIG.INDIA.formattedMonthly : SUBSCRIPTION_CONFIG.GLOBAL.formattedMonthly,
    rawAmount: isIndia ? SUBSCRIPTION_CONFIG.INDIA.amountPaise : SUBSCRIPTION_CONFIG.GLOBAL.amountCents,
    planName: isIndia ? SUBSCRIPTION_CONFIG.INDIA.name : SUBSCRIPTION_CONFIG.GLOBAL.name,
    planSlug: isIndia ? SUBSCRIPTION_CONFIG.INDIA.slug : SUBSCRIPTION_CONFIG.GLOBAL.slug,
    supportEmail: SUBSCRIPTION_CONFIG.SUPPORT_EMAIL,
  };
}
