import { UserRole, CurrencyCode } from './database';
import { StaffRole, StaffPermissions } from './staff';

export type MemoryType =
  | 'EXPLICIT_RULE'
  | 'CUSTOMER_RULE'
  | 'LEARNED_PATTERN'
  | 'CONVERSATION_CONTEXT'
  | 'AI_OBSERVATION';

export type SubjectType =
  | 'BUSINESS'
  | 'CUSTOMER'
  | 'PRODUCT'
  | 'PRICING'
  | 'COMMUNICATION'
  | 'BRANCH';

export type MemoryStatus = 'ACTIVE' | 'DISABLED' | 'DELETED';

export interface OrganizationAiProfile {
  id: string;
  organization_id: string;
  business_summary: string;
  industry: string;
  preferred_tone: 'PROFESSIONAL' | 'FRIENDLY' | 'CONCISE' | 'URGENT';
  default_currency: CurrencyCode;
  default_quote_validity_days: number;
  default_payment_terms: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationAiMemory {
  id: string;
  organization_id: string;
  memory_type: MemoryType;
  subject_type: SubjectType;
  subject_id?: string | null;
  subject_name?: string | null;
  key: string;
  value: string;
  source: 'MANUAL_SETTING' | 'AI_OBSERVATION' | 'CONFIRMED_USER' | 'INVOICE_PATTERN';
  confidence: number; // 0 - 100
  confirmed: boolean;
  status: MemoryStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type ActionCategory = 'READ' | 'DRAFT' | 'EXECUTE';

export interface ControlledAiActionDescriptor {
  name: string;
  category: ActionCategory;
  description: string;
  requiredPermission?: keyof StaffPermissions;
  requiresHumanConfirmation: boolean;
  sensitive: boolean;
}

export interface AiActionExecutionRequest {
  actionName: string;
  parameters: Record<string, any>;
  confirmedByUser?: boolean;
}

export interface AiActionExecutionResult<T = any> {
  success: boolean;
  actionName: string;
  category: ActionCategory;
  data?: T;
  error?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  draftPayload?: any;
}

export type OperatorRecommendationType =
  | 'FOLLOWUP_QUOTE'
  | 'CREATE_INVOICE'
  | 'CONTACT_PREVIOUS_CUSTOMER'
  | 'REVIEW_OVERDUE_PAYMENT'
  | 'REVIEW_LEAD'
  | 'INVESTIGATE_CONVERSION_DECLINE'
  | 'CHECK_UNUSUAL_DISCOUNT';

export type OperatorRecommendationStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'DISMISSED'
  | 'EXPIRED';

export type OperatorPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface OperatorRecommendation {
  id: string;
  organization_id: string;
  type: OperatorRecommendationType;
  title: string;
  summary: string;
  reason: string;
  priority: OperatorPriority;
  resource_type: 'quote' | 'invoice' | 'customer' | 'lead' | 'pricing';
  resource_id?: string | null;
  resource_identifier?: string | null;
  potential_value?: number | null;
  currency?: string;
  status: OperatorRecommendationStatus;
  action_label: string;
  action_key: string;
  action_data?: Record<string, any>;
  created_at: string;
  resolved_at?: string | null;
  resolved_reason?: 'APPROVED' | 'PAID' | 'DISMISSED' | 'CONTACTED' | 'MANUAL';
}

export interface AiActionLog {
  id: string;
  organization_id: string;
  user_id: string;
  user_email: string;
  user_role: StaffRole;
  conversation_id?: string | null;
  action: string;
  category: ActionCategory;
  resource_type?: string | null;
  resource_id?: string | null;
  approval_required: boolean;
  approved_by?: string | null;
  execution_status: 'SUCCESS' | 'FAILED' | 'BLOCKED_PERMISSIONS' | 'PENDING_APPROVAL';
  details?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AiOutcomeRecord {
  id: string;
  organization_id: string;
  recommendation_id?: string | null;
  recommendation_key?: string | null;
  action_type: string;
  result_type: 'ACCEPTED' | 'REJECTED' | 'NO_RESPONSE' | 'PAID' | 'LOST';
  revenue_generated?: number | null;
  currency?: string;
  notes?: string | null;
  created_at: string;
}

export interface AiUsageMetric {
  id: string;
  organization_id: string;
  user_id: string;
  feature_name: string;
  request_timestamp: string;
  response_time_ms: number;
  success: boolean;
  error_message?: string | null;
  actions_invoked?: string[];
}

export type OperatorActionCategory =
  | 'QUOTE_FOLLOWUP'
  | 'CONVERT_APPROVED_QUOTE'
  | 'REPEAT_CUSTOMER'
  | 'OVERDUE_INVOICE'
  | 'RECOVER_LOST_QUOTE'
  | 'PROSPECT_OPPORTUNITY';

export type DealTemperature = 'HOT' | 'WARM' | 'COLD';

export interface PipelineDealItem {
  id: string;
  quotationNumber: string;
  customerName: string;
  customerId?: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  value: number;
  currency: string;
  temperature: DealTemperature;
  status: string;
  viewCount: number;
  lastViewedAt?: string | null;
  createdAt: string;
  validUntil?: string | null;
  daysSinceSent: number;
  score: number; // 0-100 likelihood of conversion
  reason: string;
  recommendedAction: string;
  actionKey: string;
  publicUrl?: string;
}

export interface PipelineTemperatureAnalysis {
  analyzedAt: string;
  currency: string;
  summary: {
    totalDeals: number;
    totalPipelineValue: number;
    hotDealsCount: number;
    hotDealsValue: number;
    warmDealsCount: number;
    warmDealsValue: number;
    coldDealsCount: number;
    coldDealsValue: number;
    averageDealSize: number;
  };
  deals: PipelineDealItem[];
}

export interface WinLossDisparityAnalysis {
  analyzedAt: string;
  currency: string;
  metrics: {
    totalQuotesAnalyzed: number;
    approvedQuotesCount: number;
    rejectedQuotesCount: number;
    expiredQuotesCount: number;
    approvalRate: number; // percentage, e.g. 42
    averageTimeToApprovalDays: number;
    averageTimeToRejectionDays: number;
  };
  discountImpact: {
    highDiscountThreshold: number; // e.g. 15%
    highDiscountCount: number;
    highDiscountWinRate: number; // percentage
    standardDiscountCount: number;
    standardDiscountWinRate: number; // percentage
    insight: string; // e.g. "Quotes with discounts >15% convert at 28% vs 44% for standard quotes."
  };
  lostOpportunities: {
    unfollowedExpiredQuotes: number;
    unfollowedExpiredValue: number;
    recoverableQuotesCount: number;
    recoverableQuotesValue: number;
    recommendations: string[];
  };
}

export interface LeadRecoveryItem {
  id: string;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  customerId?: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  recoveryType: 'UNOPENED' | 'VIEWED_UNAPPROVED' | 'EXPIRED_REVIVAL' | 'REJECTED_RECONNECT' | 'DORMANT_CLIENT';
  value: number;
  currency: string;
  reason: string;
  recommendedAction: string;
  actionKey: string;
  suggestedMessage: string;
  quoteCreatedAt: string;
  daysInactive: number;
}

export interface OperatorActionItem {
  id: string;
  type: OperatorActionCategory;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  reason: string;
  customerName: string;
  customerId?: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  resourceType: 'quote' | 'invoice' | 'customer';
  resourceId: string;
  resourceNumber: string;
  value: number;
  currency: string;
  actionLabel: string;
  actionKey: string;
  secondaryActionLabel?: string;
  secondaryActionKey?: string;
  suggestedMessage?: string;
  draftPayload?: Record<string, any>;
  dueOrExpiryText?: string;
  metadata?: Record<string, any>;
}

export interface OperatorDailyPlan {
  planId: string;
  generatedAt: string;
  greeting: string;
  summary: {
    totalActions: number;
    highUrgencyCount: number;
    totalValueAtStake: number;
    currency: string;
    categories: {
      quoteFollowups: number;
      approvedUninvoiced: number;
      repeatCustomers: number;
      overdueInvoices: number;
      recoveredQuotes?: number;
      prospects?: number;
    };
  };
  actions: OperatorActionItem[];
}

// =============================================================================
// PHASE 4: ADVANCED INTELLIGENCE TYPES
// =============================================================================
export interface PricingMarginInsight {
  analyzedAt: string;
  currency: string;
  averageMarginPercentage: number;
  unusualDiscountsCount: number;
  insights: {
    title: string;
    description: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    potentialGain: number;
  }[];
}

export interface CrossSellSuggestion {
  triggerItem: string;
  recommendedItem: string;
  frequency: number; // percentage
  confidence: number;
  averagePrice: number;
  currency: string;
  explanation: string;
}

export interface CashFlow30DayProjection {
  projectedAt: string;
  currency: string;
  summary: {
    totalProjectedInflow: number;
    confirmedInflow: number; // invoices due in next 30 days
    overdueRecoverableInflow: number; // estimated overdue collection
    pipelineWeightedInflow: number; // hot & warm quotes expected to close
  };
  horizonDays: 30;
  weeklyBreakdown: {
    week: string; // e.g. "Week 1 (Days 1-7)"
    confirmed: number;
    weightedPipeline: number;
    totalExpected: number;
  }[];
}

// =============================================================================
// PHASE 5: BUSINESS OPERATOR AUTOMATION ENGINE
// =============================================================================
export type AutomationTrigger =
  | 'QUOTE_VIEWED_FIRST_TIME'
  | 'QUOTE_VIEWED_MULTIPLE_TIMES'
  | 'QUOTE_UNOPENED_48H'
  | 'QUOTE_EXPIRES_IN_24H'
  | 'QUOTE_APPROVED'
  | 'INVOICE_OVERDUE_7D'
  | 'CUSTOMER_INACTIVE_60D';

export type AutomationAction =
  | 'DRAFT_WHATSAPP_FOLLOWUP'
  | 'DRAFT_EMAIL_FOLLOWUP'
  | 'DRAFT_INVOICE'
  | 'SEND_IN_APP_NOTIFICATION'
  | 'CREATE_DAILY_ACTION_ITEM';

export interface BusinessAutomationRule {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  enabled: boolean;
  requiresHumanConfirmation: boolean;
  created_at: string;
  updated_at: string;
}
