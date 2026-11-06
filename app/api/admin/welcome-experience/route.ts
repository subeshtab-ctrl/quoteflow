import { NextRequest, NextResponse } from 'next/server';
import {
  isAuthorizedDeveloperAdmin,
  getAdminActorContext,
  recordAdminSecurityEvent,
} from '@/lib/billing/dev-admin-auth';
import {
  getWelcomeConfig,
  saveWelcomeConfig,
  getWelcomeLogs,
  getWelcomeMetrics,
  sendTestWelcomeEmail,
  resendWelcomeEmail,
  getBusinessSetupStatus,
} from '@/lib/welcome/welcome-service';
import {
  createDefaultWelcomeTemplateVersion,
  DEFAULT_AI_WELCOME_CONFIG,
} from '@/lib/welcome/default-template';
import { WelcomeTemplateVersion } from '@/lib/welcome/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized developer admin' }, { status: 403 });
    }

    const config = getWelcomeConfig();
    const logs = getWelcomeLogs();
    const metrics = await getWelcomeMetrics();

    return NextResponse.json({
      success: true,
      config,
      logs,
      metrics,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized developer admin' }, { status: 403 });
    }

    const actor = await getAdminActorContext(req);
    const body = await req.json().catch(() => ({}));
    const { action } = body;
    const config = getWelcomeConfig();

    // 1. Toggle Welcome Email automation
    if (action === 'toggle_email') {
      config.emailEnabled = Boolean(body.enabled);
      saveWelcomeConfig(config);
      recordAdminSecurityEvent({
        action: config.emailEnabled ? 'welcome_email_enabled' : 'welcome_email_disabled',
        actor: actor.email || 'developer_admin',
        target: 'welcome_automation',
      });
      return NextResponse.json({ success: true, emailEnabled: config.emailEnabled });
    }

    // 2. Toggle QuoteFlow AI Welcome
    if (action === 'toggle_ai') {
      config.aiWelcome.enabled = Boolean(body.enabled);
      saveWelcomeConfig(config);
      recordAdminSecurityEvent({
        action: config.aiWelcome.enabled ? 'ai_welcome_enabled' : 'ai_welcome_disabled',
        actor: actor.email || 'developer_admin',
        target: 'ai_welcome',
      });
      return NextResponse.json({ success: true, aiEnabled: config.aiWelcome.enabled });
    }

    // 3. Save Draft Email Template
    if (action === 'save_draft') {
      const { subject, preheader, senderName, replyTo, html, css, templateConfig } = body;
      const draft: WelcomeTemplateVersion = {
        id: `tmpl_welcome_v${config.currentVersion + 1}_draft`,
        version: config.currentVersion + 1,
        status: 'DRAFT',
        subject: subject || config.publishedVersion?.subject || 'Welcome to QuoteFlow',
        preheader: preheader || config.publishedVersion?.preheader || '',
        senderName: senderName || config.publishedVersion?.senderName || 'QuoteFlow',
        replyTo: replyTo || config.publishedVersion?.replyTo || 'hello@blendandbold.com',
        html: html || config.publishedVersion?.html || '',
        css: css !== undefined ? css : config.publishedVersion?.css || '',
        config: templateConfig || config.publishedVersion?.config || {},
        createdAt: new Date().toISOString(),
        createdBy: actor.email || 'developer_admin',
      };

      config.draftVersion = draft;
      saveWelcomeConfig(config);

      recordAdminSecurityEvent({
        action: 'welcome_template_draft_saved',
        actor: actor.email || 'developer_admin',
        target: draft.id,
      });

      return NextResponse.json({ success: true, draftVersion: config.draftVersion });
    }

    // 4. Publish Draft Template
    if (action === 'publish') {
      const draft = config.draftVersion;
      if (!draft) {
        return NextResponse.json({ error: 'No draft template found to publish' }, { status: 400 });
      }

      // Archive previous published version
      if (config.publishedVersion) {
        config.publishedVersion.status = 'ARCHIVED';
      }

      const newVersionNum = config.currentVersion + 1;
      const published: WelcomeTemplateVersion = {
        ...draft,
        id: `tmpl_welcome_v${newVersionNum}`,
        version: newVersionNum,
        status: 'PUBLISHED',
        publishedAt: new Date().toISOString(),
        publishedBy: actor.email || 'developer_admin',
      };

      config.publishedVersion = published;
      config.currentVersion = newVersionNum;
      config.history.unshift(published);
      config.draftVersion = { ...published, id: `tmpl_welcome_v${newVersionNum + 1}_draft`, status: 'DRAFT' };

      saveWelcomeConfig(config);

      recordAdminSecurityEvent({
        action: 'welcome_template_published',
        actor: actor.email || 'developer_admin',
        target: published.id,
        details: { version: newVersionNum, subject: published.subject },
      });

      return NextResponse.json({ success: true, publishedVersion: config.publishedVersion });
    }

    // 5. Restore Default Email Template
    if (action === 'restore_email_default') {
      const def = createDefaultWelcomeTemplateVersion();
      config.draftVersion = { ...def, id: `tmpl_welcome_v${config.currentVersion + 1}_draft`, status: 'DRAFT' };
      saveWelcomeConfig(config);
      return NextResponse.json({ success: true, draftVersion: config.draftVersion });
    }

    // 6. Save AI Welcome Configuration
    if (action === 'save_ai_welcome') {
      const { greeting, description, suggestions } = body;
      config.aiWelcome = {
        ...config.aiWelcome,
        greeting: greeting || config.aiWelcome.greeting,
        description: description || config.aiWelcome.description,
        suggestions: suggestions || config.aiWelcome.suggestions,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.email || 'developer_admin',
      };

      saveWelcomeConfig(config);

      recordAdminSecurityEvent({
        action: 'ai_welcome_config_saved',
        actor: actor.email || 'developer_admin',
        target: 'ai_welcome_config',
      });

      return NextResponse.json({ success: true, aiWelcome: config.aiWelcome });
    }

    // 7. Restore Default AI Welcome Configuration
    if (action === 'restore_ai_default') {
      config.aiWelcome = {
        ...DEFAULT_AI_WELCOME_CONFIG,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.email || 'developer_admin',
      };
      saveWelcomeConfig(config);
      return NextResponse.json({ success: true, aiWelcome: config.aiWelcome });
    }

    // 8. Send Test Email
    if (action === 'send_test') {
      const { toEmail, templateOverride } = body;
      if (!toEmail || !toEmail.includes('@')) {
        return NextResponse.json({ error: 'Valid recipient email required' }, { status: 400 });
      }

      const res = await sendTestWelcomeEmail({
        toEmail: toEmail.trim(),
        templateOverride,
      });

      if (!res.success) {
        return NextResponse.json({ error: res.error || 'Failed to send test email' }, { status: 500 });
      }

      recordAdminSecurityEvent({
        action: 'welcome_test_email_sent',
        actor: actor.email || 'developer_admin',
        target: toEmail,
      });

      return NextResponse.json({ success: true, id: res.id });
    }

    // 9. Resend Welcome Email to an organization
    if (action === 'resend') {
      const { organizationId } = body;
      if (!organizationId) {
        return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
      }

      const res = await resendWelcomeEmail(organizationId);
      if (!res.success) {
        return NextResponse.json({ error: res.message }, { status: 500 });
      }

      recordAdminSecurityEvent({
        action: 'welcome_email_manually_resent',
        actor: actor.email || 'developer_admin',
        target: organizationId,
      });

      return NextResponse.json({ success: true, message: res.message });
    }

    // 10. Inspect Business Setup Status (Diagnostic tool)
    if (action === 'get_setup_status') {
      const { organizationId } = body;
      if (!organizationId) {
        return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
      }
      const setup = await getBusinessSetupStatus(organizationId);
      return NextResponse.json({ success: true, setup });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
