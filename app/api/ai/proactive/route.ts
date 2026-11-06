import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';
import { generateAiBusinessBriefing } from '@/lib/ai/proactive-engine';
import { sendEmail } from '@/lib/email/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const org = await store.getOrganization(auth.orgId);
    const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';
    const firstName = (auth.fullName || '').trim().split(' ')[0] || 'there';

    const url = new URL(req.url);
    const hourParam = url.searchParams.get('hour');
    const clientHour = hourParam !== null ? parseInt(hourParam, 10) : undefined;

    const briefing = await generateAiBusinessBriefing(auth.orgId, env, firstName, clientHour);
    return NextResponse.json(briefing);
  } catch (err: any) {
    console.error('Error in GET /api/ai/proactive:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate proactive briefing' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = auth.orgId;
    const org = await store.getOrganization(orgId);
    const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';
    const body = await req.json().catch(() => ({}));
    const {
      action,
      recommendationId,
      recommendationKey,
      targetId,
      targetNumber,
      customerName,
      snoozeDays,
      snoozeDate,
      batchMessages,
      messagePayload,
    } = body;

    const userFullName = auth.fullName || 'User';
    const userId = auth.userId || null;
    const nowIso = new Date().toISOString();

    // 1. RECORD WHATSAPP REMINDER ACTION
    if (action === 'whatsapp_sent') {
      const recIdOrKey = recommendationId || recommendationKey;
      let updated = null;
      if (recIdOrKey) {
        updated = await store.updateRecommendationState(recIdOrKey, orgId, {
          status: 'actioned',
          action_taken: 'whatsapp_sent',
          action_taken_at: nowIso,
          last_reminder_sent_at: nowIso,
          user_id: userId,
          user_name: userFullName,
        });
      }

      // If not yet existing in persistent records, record it directly
      if (!updated && (recommendationKey || targetNumber)) {
        const key = recommendationKey || `quote_unapproved:${targetNumber || targetId}:cycle_1`;
        updated = await store.saveRecommendation({
          id: recommendationId || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          recommendation_key: key,
          organization_id: orgId,
          user_id: userId,
          user_name: userFullName,
          customer_name: customerName || 'Customer',
          quote_id: targetId,
          quote_number: targetNumber,
          recommendation_type: 'quote_unapproved',
          priority: 'ACTION_REQUIRED',
          title: `WhatsApp Reminder for ${targetNumber || customerName}`,
          description: `WhatsApp reminder dispatched by ${userFullName}.`,
          status: 'actioned',
          action_taken: 'whatsapp_sent',
          action_taken_at: nowIso,
          last_reminder_sent_at: nowIso,
          cycle_number: 1,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      return NextResponse.json({
        success: true,
        message: '✓ WhatsApp reminder sent and recorded successfully.',
        recommendation: updated,
      });
    }

    // 2. DISPATCH & RECORD EMAIL REMINDER ACTION
    if (action === 'email_sent') {
      const payload = messagePayload || body;
      const recipientEmail = payload.recipientEmail;
      if (!recipientEmail || !recipientEmail.includes('@')) {
        return NextResponse.json(
          { error: 'Customer does not have a valid email address configured.' },
          { status: 400 }
        );
      }

      try {
        if (env === 'test') {
          await store.logTestEmail({
            organization_id: orgId,
            document_type: 'QUOTE',
            document_number: targetNumber || payload.targetNumber || 'REMINDER',
            to_email: recipientEmail,
            to_name: customerName || payload.recipientName || 'Customer',
            subject: payload.subject || `Follow-up: #${targetNumber || 'Quotation'}`,
            html_preview: `<p>${payload.body || payload.messageText}</p>`,
            text_preview: payload.body || payload.messageText,
            simulated_at: nowIso,
          });
        } else {
          await sendEmail({
            to: recipientEmail,
            subject: payload.subject || `Follow-up: #${targetNumber || 'Quotation'}`,
            text: payload.body || payload.messageText,
            html: `<p>${(payload.body || payload.messageText).replace(/\n/g, '<br/>')}</p>`,
          });
        }
      } catch (sendErr: any) {
        console.error('Email send failed:', sendErr);
        return NextResponse.json(
          { error: `Email reminder could not be delivered: ${sendErr.message || 'SMTP delivery failure'}` },
          { status: 502 }
        );
      }

      // Successful email delivery -> update database state to 'actioned'
      const recIdOrKey = recommendationId || recommendationKey;
      let updated = null;
      if (recIdOrKey) {
        updated = await store.updateRecommendationState(recIdOrKey, orgId, {
          status: 'actioned',
          action_taken: 'email_sent',
          action_taken_at: nowIso,
          last_reminder_sent_at: nowIso,
          user_id: userId,
          user_name: userFullName,
        });
      }

      if (!updated && (recommendationKey || targetNumber)) {
        const key = recommendationKey || `quote_unapproved:${targetNumber || targetId}:cycle_1`;
        updated = await store.saveRecommendation({
          id: recommendationId || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          recommendation_key: key,
          organization_id: orgId,
          user_id: userId,
          user_name: userFullName,
          customer_name: customerName || 'Customer',
          quote_id: targetId,
          quote_number: targetNumber,
          recommendation_type: 'quote_unapproved',
          priority: 'ACTION_REQUIRED',
          title: `Email Reminder for ${targetNumber || customerName}`,
          description: `Email reminder sent to ${recipientEmail} by ${userFullName}.`,
          status: 'actioned',
          action_taken: 'email_sent',
          action_taken_at: nowIso,
          last_reminder_sent_at: nowIso,
          cycle_number: 1,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      return NextResponse.json({
        success: true,
        message: '✓ Email reminder sent successfully.',
        recommendation: updated,
      });
    }

    // 3. DISMISS RECOMMENDATION (Permanent Server-Side Dismissal)
    if (action === 'dismiss') {
      const recIdOrKey = recommendationId || recommendationKey;
      let updated = null;
      if (recIdOrKey) {
        updated = await store.updateRecommendationState(recIdOrKey, orgId, {
          status: 'dismissed',
          action_taken: 'dismissed',
          action_taken_at: nowIso,
          user_id: userId,
          user_name: userFullName,
        });
      }

      if (!updated && (recommendationKey || targetNumber)) {
        const key = recommendationKey || `rec_dismiss:${targetNumber || targetId}:cycle_1`;
        updated = await store.saveRecommendation({
          id: recommendationId || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          recommendation_key: key,
          organization_id: orgId,
          user_id: userId,
          user_name: userFullName,
          customer_name: customerName || 'Customer',
          quote_id: targetId,
          quote_number: targetNumber,
          recommendation_type: 'quote_unapproved',
          priority: 'ACTION_REQUIRED',
          title: `Dismissed recommendation for ${targetNumber || 'record'}`,
          description: `Dismissed by ${userFullName}`,
          status: 'dismissed',
          action_taken: 'dismissed',
          action_taken_at: nowIso,
          cycle_number: 1,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Recommendation dismissed.',
        recommendation: updated,
      });
    }

    // 4. IGNORE RECOMMENDATION (Permanent Server-Side Ignore)
    if (action === 'ignore') {
      const recIdOrKey = recommendationId || recommendationKey;
      let updated = null;
      if (recIdOrKey) {
        updated = await store.updateRecommendationState(recIdOrKey, orgId, {
          status: 'ignored',
          action_taken: 'ignored',
          action_taken_at: nowIso,
          user_id: userId,
          user_name: userFullName,
        });
      }

      if (!updated && (recommendationKey || targetNumber)) {
        const key = recommendationKey || `rec_ignore:${targetNumber || targetId}:cycle_1`;
        updated = await store.saveRecommendation({
          id: recommendationId || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          recommendation_key: key,
          organization_id: orgId,
          user_id: userId,
          user_name: userFullName,
          customer_name: customerName || 'Customer',
          quote_id: targetId,
          quote_number: targetNumber,
          recommendation_type: 'quote_unapproved',
          priority: 'ACTION_REQUIRED',
          title: `Ignored recommendation for ${targetNumber || 'record'}`,
          description: `Ignored by ${userFullName}`,
          status: 'ignored',
          action_taken: 'ignored',
          action_taken_at: nowIso,
          cycle_number: 1,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Recommendation ignored.',
        recommendation: updated,
      });
    }

    // 5. SNOOZE / REMIND LATER (1 Day, 3 Days, 7 Days, or Custom Date)
    if (action === 'snooze' || action === 'remind_later') {
      let snoozeUntil: string;
      if (snoozeDate) {
        snoozeUntil = new Date(snoozeDate).toISOString();
      } else {
        const days = Number(snoozeDays) || 1;
        snoozeUntil = new Date(Date.now() + days * 86400000).toISOString();
      }

      const recIdOrKey = recommendationId || recommendationKey;
      let updated = null;
      if (recIdOrKey) {
        updated = await store.updateRecommendationState(recIdOrKey, orgId, {
          status: 'snoozed',
          action_taken: 'snoozed',
          action_taken_at: nowIso,
          snooze_until: snoozeUntil,
          user_id: userId,
          user_name: userFullName,
        });
      }

      if (!updated && (recommendationKey || targetNumber)) {
        const key = recommendationKey || `rec_snooze:${targetNumber || targetId}:cycle_1`;
        updated = await store.saveRecommendation({
          id: recommendationId || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          recommendation_key: key,
          organization_id: orgId,
          user_id: userId,
          user_name: userFullName,
          customer_name: customerName || 'Customer',
          quote_id: targetId,
          quote_number: targetNumber,
          recommendation_type: 'quote_unapproved',
          priority: 'ACTION_REQUIRED',
          title: `Snoozed recommendation for ${targetNumber || 'record'}`,
          description: `Snoozed by ${userFullName} until ${new Date(snoozeUntil).toLocaleDateString()}`,
          status: 'snoozed',
          action_taken: 'snoozed',
          action_taken_at: nowIso,
          snooze_until: snoozeUntil,
          cycle_number: 1,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Recommendation snoozed until ${new Date(snoozeUntil).toLocaleDateString()}.`,
        snooze_until: snoozeUntil,
        recommendation: updated,
      });
    }

    // 6. GET ACTION HISTORY
    if (action === 'get_history') {
      const history = await store.getRecentAiActions(orgId, 25);
      return NextResponse.json({ success: true, history });
    }

    if (action === 'batch_send' && Array.isArray(batchMessages)) {
      const sentResults: any[] = [];
      for (const item of batchMessages) {
        if (item.channel === 'EMAIL' && item.recipientContact && item.recipientContact.includes('@')) {
          try {
            if (env === 'test') {
              await store.logTestEmail({
                organization_id: orgId,
                document_type: 'QUOTE',
                document_number: item.targetNumber,
                document_id: item.targetId,
                to_email: item.recipientContact,
                to_name: item.recipientName,
                subject: `Follow-up: Quotation #${item.targetNumber}`,
                html_preview: `<p>${item.messageText}</p>`,
                text_preview: item.messageText,
                simulated_at: new Date().toISOString(),
              });
            } else {
              await sendEmail({
                to: item.recipientContact,
                subject: `Follow-up: Quotation #${item.targetNumber}`,
                text: item.messageText,
                html: `<p>${item.messageText.replace(/\n/g, '<br/>')}</p>`,
              });
            }
            sentResults.push({ id: item.targetId, status: 'sent', channel: 'EMAIL' });
          } catch (e: any) {
            sentResults.push({ id: item.targetId, status: 'failed', error: e.message });
          }
        } else {
          // WhatsApp reminder simulated or logged
          sentResults.push({ id: item.targetId, status: 'prepared_whatsapp', channel: 'WHATSAPP' });
        }
      }

      return NextResponse.json({
        success: true,
        sentCount: sentResults.filter((r) => r.status === 'sent' || r.status === 'prepared_whatsapp').length,
        results: sentResults,
        message: `Successfully processed ${sentResults.length} follow-up reminder(s).`,
      });
    }

    if (action === 'single_send' && messagePayload) {
      if (messagePayload.channel === 'EMAIL' && messagePayload.recipientEmail) {
        if (env === 'test') {
          await store.logTestEmail({
            organization_id: orgId,
            document_type: 'QUOTE',
            document_number: messagePayload.targetNumber || 'REMINDER',
            to_email: messagePayload.recipientEmail,
            to_name: messagePayload.recipientName || 'Customer',
            subject: messagePayload.subject || 'Follow-up Reminder',
            html_preview: `<p>${messagePayload.body || messagePayload.messageText}</p>`,
            text_preview: messagePayload.body || messagePayload.messageText,
            simulated_at: new Date().toISOString(),
          });
        } else {
          await sendEmail({
            to: messagePayload.recipientEmail,
            subject: messagePayload.subject || 'Follow-up Reminder',
            text: messagePayload.body || messagePayload.messageText,
            html: `<p>${(messagePayload.body || messagePayload.messageText).replace(/\n/g, '<br/>')}</p>`,
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Reminder sent successfully.',
      });
    }

    return NextResponse.json({ error: 'Unrecognized action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/ai/proactive:', err);
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}
