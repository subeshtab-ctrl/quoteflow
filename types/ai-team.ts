export type AIAgentId = 'ceo' | 'growth' | 'finance' | 'ops';

export type AIAgentStatus = 'idle' | 'analyzing' | 'action_required' | 'completed';

export interface AIAgent {
  id: AIAgentId;
  name: string;
  role: string;
  title: string;
  avatar: string;
  status: AIAgentStatus;
  statusMessage: string;
  lastActiveAt: string;
  model: string;
  specialization: string[];
  stats: {
    tasksCompleted: number;
    pendingApprovals: number;
    accuracyRate: number;
  };
}

export type AITaskCategory = 'STRATEGY' | 'SALES' | 'FINANCE' | 'SUPPORT' | 'SYSTEM';
export type AITaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AITaskStatus = 'QUEUED' | 'IN_PROGRESS' | 'AWAITING_APPROVAL' | 'COMPLETED' | 'REJECTED';

export interface AITask {
  id: string;
  agentId: AIAgentId;
  title: string;
  description: string;
  category: AITaskCategory;
  priority: AITaskPriority;
  status: AITaskStatus;
  createdAt: string;
  completedAt?: string;
  approvalId?: string;
  actionPayload?: Record<string, any>;
  resultSummary?: string;
}

export type AIApprovalActionType =
  | 'WHATSAPP_CAMPAIGN'
  | 'EMAIL_NUDGE'
  | 'EXTEND_TRIAL'
  | 'RESOLVE_TICKET'
  | 'EXPORT_TAX_AUDIT'
  | 'PRICE_PROMO'
  | 'OVERDUE_INVOICE_CHASE'
  | 'SYSTEM_PATCH';

export type AIApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AIApproval {
  id: string;
  taskId: string;
  agentId: AIAgentId;
  actionType: AIApprovalActionType;
  title: string;
  summary: string;
  estimatedImpact: string;
  targetCount?: number;
  payload: Record<string, any>;
  status: AIApprovalStatus;
  createdAt: string;
  reviewedAt?: string;
  founderNotes?: string;
  executionResult?: Record<string, any>;
}

export type AIActivityLogLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';

export interface AIActivityLog {
  id: string;
  agentId: AIAgentId;
  timestamp: string;
  level: AIActivityLogLevel;
  message: string;
  details?: string;
}

export interface AIEngineCycleResult {
  briefing: {
    headline: string;
    summary: string;
    keyObservations: string[];
    recommendedImmediateAction: string;
    timestamp: string;
  };
  kpis: {
    mrr: number;
    mrrCurrency: string;
    totalSubscribers: number;
    activeTrials: number;
    expiringTrials: number;
    overdueInvoicesCount: number;
    overdueInvoicesAmount: number;
    overdueCurrency: string;
    openTicketsCount: number;
    criticalTicketsCount: number;
    quotationPipelineValue: number;
    quotationPipelineCurrency: string;
    pendingQuotesCount: number;
  };
  agents: AIAgent[];
  tasks: AITask[];
  approvals: AIApproval[];
  logs: AIActivityLog[];
  geminiConnected: boolean;
}
