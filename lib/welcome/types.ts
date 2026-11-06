export type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type WelcomeDeliveryStatus = 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';

export type AIWelcomeActionType =
  | 'CREATE_FIRST_QUOTE'
  | 'SETUP_BUSINESS'
  | 'ADD_CUSTOMER'
  | 'EXPLAIN_QUOTEFLOW'
  | 'OPEN_QUOTES'
  | 'OPEN_CUSTOMERS'
  | 'OPEN_SETTINGS'
  | 'START_AI_CHAT';

export interface AIWelcomeSuggestion {
  id: string;
  label: string;
  action: AIWelcomeActionType;
  prompt: string;
  icon?: string;
  subtitle?: string;
}

export interface AIWelcomeConfig {
  enabled: boolean;
  greeting: string;
  description: string;
  suggestions: AIWelcomeSuggestion[];
  updatedAt: string;
  updatedBy?: string;
}

export interface WelcomeTemplateConfig {
  heading: string;
  subtitle: string;
  heroTitle: string;
  heroDescription: string;
  primaryCtaText: string;
  primaryCtaUrl: string;
  secondaryCtaText: string;
  secondaryCtaUrl: string;
  aiTitle: string;
  aiDescription: string;
  aiCtaText: string;
  aiCtaUrl: string;
  trialCardTitle: string;
  trialCardDescription: string;
  supportTitle: string;
  supportDescription: string;
  supportEmail: string;
  supportCtaText: string;
  supportCtaUrl: string;
  footerText: string;
}

export interface WelcomeTemplateVersion {
  id: string;
  version: number;
  status: TemplateStatus;
  subject: string;
  preheader: string;
  senderName: string;
  replyTo: string;
  html: string;
  css: string;
  config: WelcomeTemplateConfig;
  createdAt: string;
  createdBy: string;
  publishedAt?: string;
  publishedBy?: string;
}

export interface WelcomeExperienceConfig {
  emailEnabled: boolean;
  featureActivatedAt: string; // ISO timestamp - only orgs created on/after this receive it automatically
  currentVersion: number;
  publishedVersion?: WelcomeTemplateVersion;
  draftVersion?: WelcomeTemplateVersion;
  history: WelcomeTemplateVersion[];
  aiWelcome: AIWelcomeConfig;
  updatedAt: string;
  updatedBy?: string;
}

export interface WelcomeEmailDeliveryLog {
  id: string;
  organizationId: string;
  businessName: string;
  ownerName: string;
  email: string;
  templateVersion: number;
  status: WelcomeDeliveryStatus;
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  failureReason?: string;
  isTest?: boolean;
  resendCount?: number;
  lastResentAt?: string;
}

export interface WelcomeMetrics {
  totalSent: number;
  deliveredCount: number;
  deliveryRate: number;
  openedCount: number;
  openRate: number;
  clickedCount: number;
  clickRate: number;
  failedCount: number;
  firstQuoteCreatedCount: number;
  firstQuoteConversionRate: number;
  aiOpenedCount: number;
  aiOpenedRate: number;
  avgMinutesToFirstQuote: number;
}

export interface BusinessSetupStatus {
  businessNameSet: boolean;
  countrySet: boolean;
  currencySet: boolean;
  logoSet: boolean;
  taxConfigured: boolean;
  validityConfigured: boolean;
  termsConfigured: boolean;
  contactSet: boolean;
  overallPercent: number;
  nextRecommendedStep: string;
  nextRecommendedPrompt: string;
}
