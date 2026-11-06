import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedDeveloperAdmin, getAdminActorContext, recordAdminSecurityEvent } from '@/lib/billing/dev-admin-auth';
import {
  getAllTemplates,
  saveTemplate,
  duplicateTemplate,
  deleteTemplate,
  compileTemplateEmail,
} from '@/lib/email/template-service';
import { sendEmail } from '@/lib/email/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized developer admin' }, { status: 403 });
    }

    const templates = getAllTemplates();
    return NextResponse.json({ success: true, templates });
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

    if (action === 'save') {
      const { id, name, subject, html, css, plainText } = body;
      if (!name || !subject || !html) {
        return NextResponse.json({ error: 'Name, subject, and HTML are required.' }, { status: 400 });
      }

      const saved = saveTemplate({ id, name, subject, html, css: css || '', plainText });

      recordAdminSecurityEvent({
        action: id ? 'email_template_updated' : 'email_template_created',
        actor: actor.email || 'developer_admin',
        target: saved.id,
        details: { name: saved.name },
      });

      return NextResponse.json({ success: true, template: saved });
    }

    if (action === 'duplicate') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'Template ID required' }, { status: 400 });

      const dup = duplicateTemplate(id);
      if (!dup) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

      return NextResponse.json({ success: true, template: dup });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'Template ID required' }, { status: 400 });

      const ok = deleteTemplate(id);
      return NextResponse.json({ success: ok });
    }

    if (action === 'send_test') {
      const { to, subject, html, css, variables } = body;
      const testEmail = (to || '').trim();
      if (!testEmail || !testEmail.includes('@')) {
        return NextResponse.json({ error: 'Valid test recipient email is required.' }, { status: 400 });
      }

      // Compile and interpolate
      let interpSubject = subject || 'Test Email Preview';
      const sampleVars = {
        customer_name: 'Alex Morgan',
        business_name: 'Blend & Bold Design Studio',
        quote_number: 'QF-2026-TEST',
        quote_link: 'https://blendandbold.com',
        unsubscribe_link: 'https://blendandbold.com/unsubscribe',
        ...(variables || {}),
      };

      Object.entries(sampleVars).forEach(([k, v]) => {
        interpSubject = interpSubject.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'gi'), v);
      });

      const { html: compiledHtml } = compileTemplateEmail({
        html: html || '',
        css: css || '',
        variables: sampleVars,
      });

      const result = await sendEmail({
        to: testEmail,
        fromName: 'QuoteFlow Preview',
        subject: `[TEST PREVIEW] ${interpSubject}`,
        html: compiledHtml,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to dispatch test email' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `✓ Test email sent successfully to ${testEmail}!`,
        id: result.id,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error handling email template request:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
