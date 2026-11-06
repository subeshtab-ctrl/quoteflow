import { z } from 'zod';

// ============================================================================
// RICH AI RESPONSE SCHEMA & TYPES FOR QUOTEFLOW AI
// ============================================================================

export const WorkflowStepSchema = z.object({
  step: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string(),
  icon: z.enum(['document', 'ai', 'approve', 'send', 'check', 'payment', 'email', 'whatsapp', 'clock', 'users']).optional(),
  badge: z.string().optional(),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const WorkflowBlockSchema = z.object({
  type: z.literal('workflow'),
  title: z.string().optional(),
  steps: z.array(WorkflowStepSchema).min(1),
});
export type WorkflowBlock = z.infer<typeof WorkflowBlockSchema>;

export const ArchitectureNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  sublabel: z.string().optional(),
  icon: z.enum(['business', 'cloudflare', 'supabase', 'whatsapp', 'client', 'server', 'database', 'api']).optional(),
  badge: z.string().optional(),
});
export type ArchitectureNode = z.infer<typeof ArchitectureNodeSchema>;

export const ArchitectureEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  direction: z.enum(['forward', 'both', 'down']).optional(),
});
export type ArchitectureEdge = z.infer<typeof ArchitectureEdgeSchema>;

export const ArchitectureBlockSchema = z.object({
  type: z.literal('architecture'),
  title: z.string().optional(),
  nodes: z.array(ArchitectureNodeSchema).min(1),
  edges: z.array(ArchitectureEdgeSchema).optional(),
  mermaidCode: z.string().optional(),
});
export type ArchitectureBlock = z.infer<typeof ArchitectureBlockSchema>;

export const FeatureCardItemSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  icon: z.enum(['whatsapp', 'ai', 'bell', 'users', 'shield', 'trending', 'document', 'credit_card']).optional(),
  tag: z.string().optional(),
});
export type FeatureCardItem = z.infer<typeof FeatureCardItemSchema>;

export const FeatureCardsBlockSchema = z.object({
  type: z.literal('feature_cards'),
  title: z.string().optional(),
  cards: z.array(FeatureCardItemSchema).min(1),
});
export type FeatureCardsBlock = z.infer<typeof FeatureCardsBlockSchema>;

export const KpiMetricItemSchema = z.object({
  label: z.string().min(1),
  value: z.union([z.string(), z.number()]),
  trend: z.string().optional(), // e.g. "+12%"
  trendDirection: z.enum(['up', 'down', 'neutral']).optional(),
  subtext: z.string().optional(),
  icon: z.enum(['sent', 'viewed', 'converted', 'revenue', 'pending', 'clock']).optional(),
});
export type KpiMetricItem = z.infer<typeof KpiMetricItemSchema>;

export const KpiGridBlockSchema = z.object({
  type: z.literal('kpi_grid'),
  title: z.string().optional(),
  metrics: z.array(KpiMetricItemSchema).min(1),
  footerNote: z
    .object({
      label: z.string(),
      value: z.string(),
      subtext: z.string().optional(),
      icon: z.string().optional(),
    })
    .optional(),
});
export type KpiGridBlock = z.infer<typeof KpiGridBlockSchema>;

export const DataTableBlockSchema = z.object({
  type: z.literal('table'),
  title: z.string().optional(),
  headers: z.array(z.string()).min(1),
  rows: z.array(z.array(z.union([z.string(), z.number()]))),
  footer: z.string().optional(),
});
export type DataTableBlock = z.infer<typeof DataTableBlockSchema>;

export const ChartDataSeriesSchema = z.object({
  name: z.string(),
  data: z.array(z.number()),
  color: z.string().optional(),
});
export type ChartDataSeries = z.infer<typeof ChartDataSeriesSchema>;

export const ChartBlockSchema = z.object({
  type: z.literal('chart'),
  title: z.string().optional(),
  chartType: z.enum(['bar', 'line', 'area']),
  categories: z.array(z.string()),
  series: z.array(ChartDataSeriesSchema).min(1),
});
export type ChartBlock = z.infer<typeof ChartBlockSchema>;

export const DocumentPreviewItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  rate: z.number(),
  amount: z.number(),
});
export type DocumentPreviewItem = z.infer<typeof DocumentPreviewItemSchema>;

export const DocumentPreviewBlockSchema = z.object({
  type: z.literal('document_preview'),
  title: z.string().optional(),
  docType: z.enum(['quotation', 'invoice']),
  docNumber: z.string(),
  recipientName: z.string(),
  date: z.string(),
  currency: z.string().default('INR'),
  items: z.array(DocumentPreviewItemSchema),
  subtotal: z.number(),
  taxLabel: z.string().default('GST (18%)'),
  taxAmount: z.number(),
  total: z.number(),
  viewUrl: z.string().optional(),
  actionLabel: z.string().optional(),
});
export type DocumentPreviewBlock = z.infer<typeof DocumentPreviewBlockSchema>;

export const MarkdownBlockSchema = z.object({
  type: z.literal('markdown'),
  content: z.string(),
});
export type MarkdownBlock = z.infer<typeof MarkdownBlockSchema>;

export const RichBlockSchema = z.discriminatedUnion('type', [
  MarkdownBlockSchema,
  WorkflowBlockSchema,
  ArchitectureBlockSchema,
  FeatureCardsBlockSchema,
  KpiGridBlockSchema,
  DataTableBlockSchema,
  ChartBlockSchema,
  DocumentPreviewBlockSchema,
]);
export type RichBlock = z.infer<typeof RichBlockSchema>;

export const RichAiResponsePayloadSchema = z.object({
  leadingText: z.string().optional(),
  isVisualResponse: z.boolean().default(false),
  blocks: z.array(RichBlockSchema).default([]),
  suggestedQuestions: z.array(z.string()).default([]),
});
export type RichAiResponsePayload = z.infer<typeof RichAiResponsePayloadSchema>;

/**
 * Validates untrusted AI responses against strict schema.
 * Replaces any invalid blocks with markdown error notices rather than throwing.
 */
export function validateRichAiResponse(raw: unknown): RichAiResponsePayload {
  if (!raw || typeof raw !== 'object') {
    return {
      leadingText: typeof raw === 'string' ? raw : '',
      isVisualResponse: false,
      blocks: [],
      suggestedQuestions: [],
    };
  }

  const candidate = raw as any;
  const leadingText = typeof candidate.leadingText === 'string' ? candidate.leadingText : '';
  const isVisualResponse = Boolean(candidate.isVisualResponse);
  const suggestedQuestions = Array.isArray(candidate.suggestedQuestions)
    ? candidate.suggestedQuestions.filter((q: any) => typeof q === 'string' && q.trim().length > 0)
    : [];

  const validBlocks: RichBlock[] = [];
  if (Array.isArray(candidate.blocks)) {
    for (const b of candidate.blocks) {
      const parsed = RichBlockSchema.safeParse(b);
      if (parsed.success) {
        validBlocks.push(parsed.data);
      } else if (b && typeof b.content === 'string') {
        validBlocks.push({ type: 'markdown', content: b.content });
      }
    }
  }

  return {
    leadingText,
    isVisualResponse: isVisualResponse || validBlocks.length > 0,
    blocks: validBlocks,
    suggestedQuestions,
  };
}

export const AI_THEME = {
  bg: '#080F20',
  primaryPurple: '#5638F5',
  brightBlue: '#2388FF',
  neonGreen: '#11C995',
  cardBg: '#17243B',
  secondaryBg: '#101A2D',
  textPrimary: '#F5F7FF',
  textSecondary: '#A8B4CA',
  border: '#263653',
} as const;

