import { describe, it, expect } from 'vitest';
import { executeAITeamCycle, handleAgentChat } from '../lib/ai/ai-team-engine';
import { aiTeamStore } from '../lib/ai/ai-team-store';

describe('Autonomous AI Executive Team for QuoteFlow', () => {
  it('executes a complete AI team cycle and returns structured briefing & KPIs', async () => {
    const result = await executeAITeamCycle({ triggerSource: 'test_runner' });

    expect(result).toBeDefined();
    expect(result.briefing).toBeDefined();
    expect(result.briefing.headline).toContain('QuoteFlow');
    expect(result.briefing.summary.length).toBeGreaterThan(10);
    expect(result.briefing.keyObservations.length).toBeGreaterThan(0);
    expect(result.briefing.recommendedImmediateAction.length).toBeGreaterThan(5);

    expect(result.kpis).toBeDefined();
    expect(typeof result.kpis.mrr).toBe('number');
    expect(typeof result.kpis.totalSubscribers).toBe('number');

    expect(result.agents).toHaveLength(4);
    const agentIds = result.agents.map((a) => a.id);
    expect(agentIds).toContain('ceo');
    expect(agentIds).toContain('growth');
    expect(agentIds).toContain('finance');
    expect(agentIds).toContain('ops');

    expect(result.tasks.length).toBeGreaterThanOrEqual(3);
    expect(result.approvals.length).toBeGreaterThanOrEqual(1);
    expect(result.logs.length).toBeGreaterThanOrEqual(3);
  });

  it('handles interactive chat with specific agents', async () => {
    // Chat with CEO Atlas
    const ceoChat = await handleAgentChat({
      agentId: 'ceo',
      message: 'What is our priority today?',
    });
    expect(ceoChat.reply).toBeDefined();
    expect(ceoChat.agent.name).toBe('Atlas');

    // Chat with Growth Aria
    const growthChat = await handleAgentChat({
      agentId: 'growth',
      message: 'How can we acquire more customers this month?',
    });
    expect(growthChat.reply).toBeDefined();
    expect(growthChat.agent.name).toBe('Aria');

    // Chat with Finance Sterling
    const finChat = await handleAgentChat({
      agentId: 'finance',
      message: 'Check our VAT and GST compliance status',
    });
    expect(finChat.reply).toBeDefined();
    expect(finChat.agent.name).toBe('Sterling');

    // Chat with Ops Nexus
    const opsChat = await handleAgentChat({
      agentId: 'ops',
      message: 'Check Cloudflare edge health',
    });
    expect(opsChat.reply).toBeDefined();
    expect(opsChat.agent.name).toBe('Nexus');
  });

  it('approves an item in the approval queue and records audit log', async () => {
    const state = await aiTeamStore.getState(true);
    expect(state.approvals.length).toBeGreaterThan(0);

    const targetApproval = state.approvals[0];
    const initialPending = targetApproval.status;

    const res = await aiTeamStore.approveItem(targetApproval.id, 'Founder approved test item');
    expect(res.success).toBe(true);

    const updated = await aiTeamStore.getState(false);
    const found = updated.approvals.find((a) => a.id === targetApproval.id);
    expect(found?.status).toBe('APPROVED');
    expect(found?.founderNotes).toBe('Founder approved test item');
  });

  it('declines an item in the approval queue with reason', async () => {
    const state = await aiTeamStore.getState(true);
    if (state.approvals.length > 1) {
      const targetApproval = state.approvals[1];
      const res = await aiTeamStore.rejectItem(targetApproval.id, 'Discount too high');
      expect(res.success).toBe(true);

      const updated = await aiTeamStore.getState(false);
      const found = updated.approvals.find((a) => a.id === targetApproval.id);
      expect(found?.status).toBe('REJECTED');
      expect(found?.founderNotes).toBe('Discount too high');
    }
  });
});
