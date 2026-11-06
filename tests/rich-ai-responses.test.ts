import { describe, it, expect } from 'vitest';
import {
  validateRichAiResponse,
  AI_THEME,
  RichAiResponsePayload,
} from '@/types/rich-ai';
import { generateRichAiResponse } from '@/lib/ai/rich-response-generator';

describe('QuoteFlow AI — ChatGPT-Style Rich Responses Engine', () => {
  describe('Visual Theme Tokens', () => {
    it('defines the exact required brand color tokens', () => {
      expect(AI_THEME.bg).toBe('#080F20');
      expect(AI_THEME.primaryPurple).toBe('#5638F5');
      expect(AI_THEME.brightBlue).toBe('#2388FF');
      expect(AI_THEME.neonGreen).toBe('#11C995');
      expect(AI_THEME.cardBg).toBe('#17243B');
      expect(AI_THEME.secondaryBg).toBe('#101A2D');
      expect(AI_THEME.textPrimary).toBe('#F5F7FF');
      expect(AI_THEME.textSecondary).toBe('#A8B4CA');
      expect(AI_THEME.border).toBe('#263653');
    });
  });

  describe('Schema Validation & Graceful Fallback', () => {
    it('validates a complete rich response payload with all block types', () => {
      const payload: RichAiResponsePayload = {
        leadingText: 'Here is your Quotation delivery architecture overview.',
        isVisualResponse: true,
        blocks: [
          {
            type: 'workflow',
            title: 'Quote Lifecycle',
            steps: [
              { step: 1, title: 'Create Quote', description: 'Enter products and amounts', badge: 'Step 1' },
              { step: 2, title: 'Send via WhatsApp', description: 'Delivery directly to client phone', badge: 'Step 2' },
            ],
          },
          {
            type: 'architecture',
            title: 'QuoteFlow Delivery Pipeline',
            nodes: [
              { id: 'biz', label: 'Your Business' },
              { id: 'cf', label: 'Cloudflare Workers' },
              { id: 'db', label: 'Supabase' },
            ],
            edges: [
              { from: 'biz', to: 'cf', label: 'API calls' },
              { from: 'cf', to: 'db', label: 'Read/Write' },
            ],
          },
          {
            type: 'kpi_grid',
            title: 'Customer journey at a glance',
            metrics: [
              { label: 'Avg. Open Rate', value: '94%', trend: '+12% vs email' },
              { label: 'Avg. Decision Time', value: '18 hrs', trend: '3x faster' },
              { label: 'Accepted Without Edit', value: '82%', trend: '+8%' },
            ],
            footerNote: {
              label: 'Avg. time to convert',
              value: '2.3 days (from send to payment)',
            },
          },
          {
            type: 'document_preview',
            docType: 'quotation',
            docNumber: '#Q-2026-001',
            recipientName: 'Acme Corp',
            date: '2026-10-24',
            items: [
              { description: 'Glass Panel', quantity: 2, rate: 250, amount: 500 },
              { description: 'High-Capacity Battery', quantity: 1, rate: 600, amount: 600 },
            ],
            subtotal: 1100,
            taxAmount: 198,
            taxLabel: 'GST (18%)',
            total: 1298,
            currency: 'USD',
          },
          {
            type: 'table',
            title: 'Feature Comparison',
            headers: ['Feature', 'QuoteFlow', 'Legacy Tool'],
            rows: [
              ['WhatsApp Delivery', 'Instant 1-Click', 'Manual Export'],
              ['AI Proactive Follow-ups', 'Automated Daily', 'None'],
            ],
          },
          {
            type: 'chart',
            chartType: 'bar',
            title: 'Weekly Quotation Performance',
            categories: ['Mon', 'Tue', 'Wed'],
            series: [
              { name: 'Quotes', data: [4, 7, 12] },
            ],
          },
        ],
        suggestedQuestions: [
          'How do I create a quotation?',
          'Can I send it via WhatsApp?',
        ],
      };

      const parsed = validateRichAiResponse(payload);
      expect(parsed.isVisualResponse).toBe(true);
      expect(parsed.blocks.length).toBe(6);
      expect(parsed.suggestedQuestions.length).toBe(2);
    });

    it('gracefully recovers from completely malformed input by returning a safe markdown block', () => {
      const malformed = {
        nonsense: 12345,
        unexpected: true,
      };

      const validated = validateRichAiResponse(malformed);
      expect(validated.isVisualResponse).toBe(false);
      expect(validated.blocks.length).toBe(0);
      expect(Array.isArray(validated.suggestedQuestions)).toBe(true);
    });

    it('safely drops invalid block types while preserving valid blocks', () => {
      const partial = {
        leadingText: 'Partial test',
        blocks: [
          {
            type: 'workflow',
            title: 'Step list',
            steps: [{ step: 1, title: 'Step 1', description: 'Desc' }],
          },
          {
            type: 'unknown_alien_block',
            danger: '<script>alert(1)</script>',
          },
          {
            type: 'markdown',
            content: 'Normal safe text',
          },
        ],
      };

      const validated = validateRichAiResponse(partial);
      expect(validated.blocks.length).toBe(2);
      expect(validated.blocks[0].type).toBe('workflow');
      expect(validated.blocks[1].type).toBe('markdown');
    });
  });

  describe('Intent-Based Rich Response Generator', () => {
    it('generates the clean 5-step delivery workflow without internal system architecture when asked how quotes reach customers', async () => {
      const rich = await generateRichAiResponse({
        userPrompt: 'How does my business quotation reach the customer?',
        org: null,
      });

      const types = rich.blocks.map((b) => b.type);
      expect(types).toContain('workflow');
      expect(types).not.toContain('architecture');
      expect(rich.leadingText).toContain('WhatsApp or email');
      expect(rich.leadingText).toContain('approve');
      expect(rich.leadingText).not.toContain('Cloudflare');
      expect(rich.leadingText).not.toContain('Supabase');
    });

    it('generates analytics KPI grid and chart when queried about sales/performance', async () => {
      const rich = await generateRichAiResponse({
        userPrompt: 'Show me sales this month and conversion rates',
        org: null,
      });

      expect(rich.isVisualResponse).toBe(true);
      const types = rich.blocks.map((b) => b.type);
      expect(types).toContain('kpi_grid');
      expect(types).toContain('chart');
    });

    it('generates comparison table and feature cards when asked to compare tools', async () => {
      const rich = await generateRichAiResponse({
        userPrompt: 'Compare QuoteFlow vs Zoho or QuickBooks for invoicing',
        org: null,
      });

      expect(rich.isVisualResponse).toBe(true);
      const types = rich.blocks.map((b) => b.type);
      expect(types).toContain('table');
      expect(types).toContain('feature_cards');
    });

    it('generates step-by-step workflow for business process questions', async () => {
      const rich = await generateRichAiResponse({
        userPrompt: 'How do follow-up reminders work for quotations?',
        org: null,
      });

      expect(rich.isVisualResponse).toBe(true);
      const types = rich.blocks.map((b) => b.type);
      expect(types).toContain('workflow');
    });

    it('generates document preview when active quote draft payload is provided', async () => {
      const mockQuote: any = {
        id: 'q-99',
        quotation_number: 'QF-2026-99',
        customer: { name: 'Stark Industries' },
        currency: 'USD',
        subtotal: 1500,
        tax_amount: 75,
        grand_total: 1575,
        items: [
          { description: 'Arc Reactor Glass', quantity: 1, unit_price: 1500 },
        ],
      };

      const rich = await generateRichAiResponse({
        userPrompt: 'Create a quote for Arc Reactor Glass 1500 for Stark Industries',
        org: null,
        activeDraftQuote: mockQuote,
      });

      expect(rich.isVisualResponse).toBe(true);
      const docBlock = rich.blocks.find((b) => b.type === 'document_preview') as any;
      expect(docBlock).toBeDefined();
      expect(docBlock.docNumber).toBe('QF-2026-99');
      expect(docBlock.recipientName).toBe('Stark Industries');
      expect(docBlock.total).toBe(1575);
    });

    it('does NOT generate generic feature cards or architecture diagrams during normal quote creation queries', async () => {
      const rich = await generateRichAiResponse({
        userPrompt: 'create quote battery $600 for ABC',
        org: null,
      });

      expect(rich.isVisualResponse).toBe(false);
      expect(rich.blocks.length).toBe(0);
    });

    it('generates popular capabilities feature cards ONLY when explicitly asked what QuoteFlow can do', async () => {
      const rich = await generateRichAiResponse({
        userPrompt: 'What can you do? What are your AI capabilities?',
        org: null,
      });

      expect(rich.isVisualResponse).toBe(true);
      const featureBlock = rich.blocks.find((b) => b.type === 'feature_cards') as any;
      expect(featureBlock).toBeDefined();
      expect(featureBlock.title).toBe('Popular AI Capabilities');
    });
  });
});
