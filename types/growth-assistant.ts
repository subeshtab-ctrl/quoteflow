import { CurrencyCode, Customer, Quotation, Invoice } from './database';

export type MistakeType =
  | 'EXPIRED_NO_FOLLOWUP'
  | 'APPROVAL_RATE_DROP'
  | 'DISCOUNT_INEFFECTIVE'
  | 'APPROVED_NOT_INVOICED'
  | 'OVERDUE_INVOICES'
  | 'CUSTOMER_DORMANCY'
  | 'SERVICE_CONVERSION_DISPARITY';

export interface BusinessMistake {
  id: string;
  type: MistakeType;
  title: string;
  description: string;
  potentialRevenueImpact?: number;
  currency: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  affectedCount: number;
  data?: any;
  actionLabel: string;
  actionKey: string;
}

export type OpportunityCategory =
  | 'RECOVER_UNANSWERED'
  | 'REORDER_READY'
  | 'UNINVOICED_APPROVED'
  | 'TARGETED_PROSPECTS'
  | 'DISCOUNT_OPTIMIZATION'
  | 'HIGH_VALUE_UPSELL';

export interface GrowthOpportunity {
  id: string;
  category: OpportunityCategory;
  title: string;
  description: string;
  potentialValue: number;
  currency: string;
  confidence: number; // 0 - 100
  actionLabel: string;
  actionType: string;
  details?: string[];
  data?: any;
}

export interface AiProspectLead {
  id: string;
  businessName: string;
  category: string;
  city: string;
  country: string;
  website?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  fitReason: string;
  leadSource: string;
  leadScore: number; // 0 - 100
  scoreReasons: string[];
  discoveredAt: string;
  status: 'DISCOVERED' | 'SAVED' | 'CONTACTED' | 'DISMISSED';
}

export interface HealthComponent {
  name: string;
  score: number; // 0 - 100
  metricValue: string | number;
  benchmark: string;
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_ATTENTION';
  explanation: string;
  recommendation?: string;
}

export interface BusinessHealthScore {
  overallScore: number; // 0 - 100
  grade: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
  summary: string;
  calculatedAt: string;
  components: {
    quoteConversion: HealthComponent;
    paymentCollection: HealthComponent;
    customerRetention: HealthComponent;
    followUpExecution: HealthComponent;
    pipelineHealth: HealthComponent;
  };
}

export interface LearnedPattern {
  id: string;
  organizationId: string;
  patternType: 'CONVERSION_DRIVER' | 'REORDER_CYCLE' | 'DISCOUNT_CEILING' | 'TOP_CATEGORY';
  summary: string;
  confidence: number;
  evidence: string;
  actionableInsight: string;
  updatedAt: string;
}

export interface RecommendationFeedbackRecord {
  id: string;
  organizationId: string;
  recommendationKey: string;
  actionTaken: 'APPLIED' | 'DISMISSED' | 'SNOOZED';
  outcome?: 'ACCEPTED' | 'REJECTED' | 'NO_RESPONSE' | 'PAID';
  revenueGenerated?: number;
  recordedAt: string;
}

export interface NaturalQueryResponse {
  question: string;
  answerMarkdown: string;
  dataPoints?: Array<{ label: string; value: string | number }>;
  suggestedFollowUps?: string[];
  actionLink?: { label: string; href: string };
}
