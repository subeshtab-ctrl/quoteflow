import { describe, it, expect, beforeEach } from 'vitest';
import { staffCommentService } from '../lib/comments/staff-comment-service';

describe('StaffCommentService - Internal Staff Comments & Smart Notifications', () => {
  const orgA = 'test-org-alpha-123';
  const orgB = 'test-org-beta-456';
  const quotation1 = 'test-quote-001';
  const quotation2 = 'test-quote-002';

  const userAlice = {
    id: 'user-alice-1',
    name: 'Alice Johnson',
    role: 'STAFF',
  };

  const userBob = {
    id: 'user-bob-2',
    name: 'Bob Miller',
    role: 'STAFF',
  };

  const userSarah = {
    id: 'user-sarah-3',
    name: 'Sarah Connor',
    role: 'ADMIN',
  };

  it('successfully creates an internal comment and retrieves it', async () => {
    const comment = await staffCommentService.addComment({
      quotationId: quotation1,
      orgId: orgA,
      authorId: userAlice.id,
      authorName: userAlice.name,
      authorRole: userAlice.role,
      text: 'Technician confirmed Hashboard 2 diagnosis is underway.',
    });

    expect(comment).toBeDefined();
    expect(comment.id).toBeTruthy();
    expect(comment.text).toBe('Technician confirmed Hashboard 2 diagnosis is underway.');
    expect(comment.quotation_id).toBe(quotation1);

    const comments = await staffCommentService.getComments(quotation1, orgA);
    expect(comments.length).toBeGreaterThanOrEqual(1);
    const found = comments.find((c) => c.id === comment.id);
    expect(found).toBeDefined();
    expect(found?.author_name).toBe('Alice Johnson');
  });

  it('enforces strict organization tenant isolation', async () => {
    // Org B should not see comments from Org A
    const orgBComments = await staffCommentService.getComments(quotation1, orgB);
    expect(orgBComments.length).toBe(0);

    const notificationOrgB = await staffCommentService.getNotificationStatus(
      quotation1,
      orgB,
      userBob.id
    );
    expect(notificationOrgB.hasUnread).toBe(false);
  });

  it('never marks author own comment as unread (Author receives State A)', async () => {
    const statusAlice = await staffCommentService.getNotificationStatus(
      quotation1,
      orgA,
      userAlice.id
    );

    // Alice is the author of the only comment, so she should NOT have unread comments
    expect(statusAlice.hasUnread).toBe(false);
    expect(statusAlice.hasUnreadMention).toBe(false);
    expect(statusAlice.unreadCount).toBe(0);
  });

  it('notifies other staff members of unread comments (State B - Green Dot)', async () => {
    const statusBob = await staffCommentService.getNotificationStatus(
      quotation1,
      orgA,
      userBob.id
    );

    // Bob did not author Alice's comment, so he should have an unread comment
    expect(statusBob.hasUnread).toBe(true);
    expect(statusBob.hasUnreadMention).toBe(false);
    expect(statusBob.unreadCount).toBeGreaterThanOrEqual(1);
  });

  it('detects direct @mentions and triggers State C (@ symbol + Green Dot)', async () => {
    const mentionComment = await staffCommentService.addComment({
      quotationId: quotation1,
      orgId: orgA,
      authorId: userAlice.id,
      authorName: userAlice.name,
      authorRole: userAlice.role,
      text: '@Sarah please check and verify this repair cost before client approval.',
      mentions: [userSarah.id],
    });

    expect(mentionComment.mentions).toContain(userSarah.id);

    // Sarah should have unread mention (State C)
    const statusSarah = await staffCommentService.getNotificationStatus(
      quotation1,
      orgA,
      userSarah.id
    );
    expect(statusSarah.hasUnread).toBe(true);
    expect(statusSarah.hasUnreadMention).toBe(true);
    expect(statusSarah.unreadMentionCount).toBeGreaterThanOrEqual(1);

    // Bob was NOT mentioned, so Bob has unread (State B), but NOT unread mention
    const statusBob = await staffCommentService.getNotificationStatus(
      quotation1,
      orgA,
      userBob.id
    );
    expect(statusBob.hasUnread).toBe(true);
    expect(statusBob.hasUnreadMention).toBe(false);
  });

  it('supports independent per-user read tracking (Bob reading does not clear Sarah)', async () => {
    // Bob marks comments as read
    const success = await staffCommentService.markCommentsRead(
      quotation1,
      orgA,
      userBob.id
    );
    expect(success).toBe(true);

    // Now Bob has read everything -> State A
    const statusBobAfterRead = await staffCommentService.getNotificationStatus(
      quotation1,
      orgA,
      userBob.id
    );
    expect(statusBobAfterRead.hasUnread).toBe(false);
    expect(statusBobAfterRead.unreadCount).toBe(0);

    // Sarah has NOT marked as read yet -> Sarah still has State C
    const statusSarah = await staffCommentService.getNotificationStatus(
      quotation1,
      orgA,
      userSarah.id
    );
    expect(statusSarah.hasUnread).toBe(true);
    expect(statusSarah.hasUnreadMention).toBe(true);

    // When Sarah finally marks as read -> Sarah transitions to State A
    await staffCommentService.markCommentsRead(quotation1, orgA, userSarah.id);
    const statusSarahAfterRead = await staffCommentService.getNotificationStatus(
      quotation1,
      orgA,
      userSarah.id
    );
    expect(statusSarahAfterRead.hasUnread).toBe(false);
    expect(statusSarahAfterRead.hasUnreadMention).toBe(false);
  });

  it('batches notification statuses correctly for quotation list', async () => {
    // Add comment to quotation 2 authored by Bob
    await staffCommentService.addComment({
      quotationId: quotation2,
      orgId: orgA,
      authorId: userBob.id,
      authorName: userBob.name,
      authorRole: userBob.role,
      text: 'Quotation 2 update: waiting for parts.',
    });

    const batchStatusAlice = await staffCommentService.getBatchNotificationStatus(
      [quotation1, quotation2],
      orgA,
      userAlice.id
    );

    expect(batchStatusAlice[quotation1]).toBeDefined();
    expect(batchStatusAlice[quotation2]).toBeDefined();
    // Alice hasn't read quotation 2 comments authored by Bob
    expect(batchStatusAlice[quotation2].hasUnread).toBe(true);
  });
});
