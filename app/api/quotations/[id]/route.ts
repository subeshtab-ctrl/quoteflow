import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { QuotationFormSchema } from '@/lib/validations/quotation';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { sendQuotationEmail } from '@/lib/email/service';
import { staffService } from '@/lib/staff/staff-service';
import { isOwnerOrAdminRole } from '@/types/staff';

interface RouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  const auth = await getAuthenticatedUserContext();
  if (!auth || !auth.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canView =
    isOwnerOrAdminRole(auth.role) ||
    staffService.hasPermission(auth.role, undefined, 'quotes_view');
  if (!canView) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view quotations' }, { status: 403 });
  }
  const orgId = auth.orgId;
  const { id } = await params;
  const quote = await store.getQuotationById(id, orgId);
  if (!quote) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
  }
  // SECURITY: Cross-environment guard — never expose a record from the wrong environment
  const org = await store.getOrganization(orgId);
  const activeEnv = org?.mode === 'test' ? 'test' : 'live';
  const recordEnv = (quote as any).environment ?? 'live';
  if (recordEnv !== activeEnv) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, quotation: quote });
}

export async function PUT(req: NextRequest, { params }: RouteProps) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = auth.orgId;

    const canEdit =
      isOwnerOrAdminRole(auth.role) ||
      staffService.hasPermission(auth.role, undefined, 'quotes_edit');
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to edit quotations' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validated = QuotationFormSchema.parse(body);

    const updated = await store.updateQuotation(id, validated, orgId);

    // Email handling on update/issue
    if (updated.status === 'SENT') {
      let customer = updated.customer;
      if (!customer && updated.customer_id) {
        customer = await store.getCustomerById(updated.customer_id, orgId);
      }
      const quotOrg = updated.organization || (await store.getOrganization(orgId));
      if (customer?.email) {
        const mailRes = await sendQuotationEmail(updated, { customer, organization: quotOrg });
        if (mailRes.success) {
          try {
            await store.logEvent(orgId, updated.id, 'SYSTEM', 'EMAIL_SENT', {
              to: customer.email,
              recipient_name: customer.name,
              resend_id: mailRes.id,
              sent_at: new Date().toISOString(),
            });
          } catch (logErr) {
            console.error('[Quotation PUT] Failed to log email event:', logErr);
          }
        } else {
          console.error(`[Quotation PUT] Email delivery issue for ${updated.quotation_number}:`, mailRes.error);
        }
      }
    }

    // Log staff activity
    await staffService.logStaffActivity({
      organization_id: orgId,
      user_id: auth.userId,
      user_name: auth.fullName || auth.email,
      user_email: auth.email,
      user_role: auth.role,
      action: updated.status === 'SENT' ? 'EDIT_AND_SEND' : 'EDIT',
      action_key: updated.status === 'SENT' ? 'quote_edited_and_sent' : 'quote_edited',
      module: 'QUOTATION',
      target_id: updated.id,
      target_identifier: updated.quotation_number,
      details: `Updated quotation ${updated.quotation_number} (${updated.currency || '₹'}${Number(updated.total_amount || 0).toLocaleString()})`,
      diff: {
        status: updated.status,
        total_amount: updated.total_amount,
      },
    }).catch((err) => console.warn('Failed to log quote update activity:', err));

    return NextResponse.json({ success: true, quotation: updated });
  } catch (err: any) {
    console.error('Error updating quotation:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update quotation' },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = auth.orgId;
    const { id } = await params;
    const body = await req.json();
    if (body.status === 'SENT') {
      const updated = await store.updateQuotation(id, { status: 'SENT' }, orgId);
      let customer = updated.customer;
      if (!customer && updated.customer_id) {
        customer = await store.getCustomerById(updated.customer_id, orgId);
      }
      const quotOrg = updated.organization || (await store.getOrganization(orgId));
      if (customer?.email) {
        const mailRes = await sendQuotationEmail(updated, { customer, organization: quotOrg });
        if (mailRes.success) {
          try {
            await store.logEvent(orgId, updated.id, 'SYSTEM', 'EMAIL_SENT', {
              to: customer.email,
              recipient_name: customer.name,
              resend_id: mailRes.id,
              sent_at: new Date().toISOString(),
            });
          } catch (logErr) {
            console.error('[Quotation PATCH] Failed to log email event:', logErr);
          }
        }
      }
      return NextResponse.json({ success: true, quotation: updated });
    }
    if (body.status === 'APPROVED') {
      const updated = await store.markQuotationApproved(id, body.signer_name || auth?.fullName || 'Admin');
      return NextResponse.json({ success: true, quotation: updated });
    }
    if (body.status === 'IN_PROGRESS') {
      const updated = await store.markQuotationInProgress(
        id,
        orgId,
        body.signer_name || auth?.fullName || 'Business User',
        {
          estimatedDays:
            body.estimated_days !== undefined
              ? body.estimated_days === null
                ? null
                : Number(body.estimated_days)
              : null,
          estimatedCompletionDate: body.estimated_completion_date || undefined,
          notes: body.notes || body.estimated_time_text,
        }
      );
      return NextResponse.json({ success: true, quotation: updated });
    }
    if (body.action === 'EXTEND_TIME') {
      const updated = await store.extendQuotationTime(
        id,
        orgId,
        body.signer_name || auth?.fullName || 'Business User',
        {
          additionalDays: Number(body.additional_days) || 0,
          newEstimatedCompletionDate: body.new_estimated_completion_date,
          notes: body.notes,
        }
      );
      return NextResponse.json({ success: true, quotation: updated });
    }
    if (body.status === 'COMPLETED' || body.action === 'MARK_DONE') {
      const updated = await store.markQuotationCompleted(
        id,
        orgId,
        body.signer_name || auth?.fullName || 'Business User',
        { unpaid: body.unpaid !== undefined ? Boolean(body.unpaid) : undefined, reason: body.unpaidReason || body.reason }
      );
      return NextResponse.json({ success: true, quotation: updated });
    }
    if (
      body.action === 'UPDATE_PAYMENT' ||
      body.is_paid !== undefined ||
      body.paid_amount !== undefined ||
      body.payment_status !== undefined ||
      body.payment_records !== undefined
    ) {
      const updated = await store.updateQuotationPayment(id, body, orgId);
      return NextResponse.json({ success: true, quotation: updated });
    }
    const updated = await store.updateQuotation(id, body, orgId);
    return NextResponse.json({ success: true, quotation: updated });
  } catch (err: any) {
    console.error('Error in quotation PATCH:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update quotation' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteProps) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role === 'STAFF') {
      const canDelete =
        isOwnerOrAdminRole(auth.role) ||
        staffService.hasPermission(auth.role, undefined, 'quotes_delete');
      if (!canDelete) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions to delete quotations. Please contact the company owner.' },
          { status: 403 }
        );
      }
    }

    const orgId = auth.orgId;
    const { id } = await params;

    const quote = await store.getQuotationById(id, orgId);
    if (!quote) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const isLockedStatus = ['APPROVED', 'IN_PROGRESS', 'PAYMENT_COMPLETED', 'COMPLETED'].includes(quote.status);
    const hasIssuedInvoice = Boolean(quote.has_issued_invoice || quote.issued_invoice_id || quote.invoice_number);
    const hasPayments = Boolean(quote.is_paid || (quote.paid_amount && quote.paid_amount > 0));

    if (isLockedStatus || hasIssuedInvoice || hasPayments) {
      const reason = isLockedStatus
        ? `Status is "${quote.status.replace('_', ' ')}"`
        : hasIssuedInvoice
        ? `A commercial tax invoice (${quote.invoice_number || 'Tax Invoice'}) has already been issued`
        : 'Payments have been recorded';

      return NextResponse.json(
        {
          error: `Cannot delete quotation ${quote.quotation_number}. ${reason}. In accordance with statutory accounting and GST compliance standards, completed, approved, or invoiced orders are protected against deletion. To rescind this order, void the tax invoice and cancel the quotation instead.`,
        },
        { status: 400 }
      );
    }

    await store.deleteQuotation(id, orgId);

    // Log deletion activity
    await staffService.logStaffActivity({
      organization_id: orgId,
      user_id: auth.userId,
      user_name: auth.fullName || auth.email,
      user_email: auth.email,
      user_role: auth.role,
      action: 'DELETE',
      action_key: 'quote_deleted',
      module: 'QUOTATION',
      target_id: id,
      target_identifier: quote.quotation_number,
      details: `Deleted quotation ${quote.quotation_number}`,
      diff: {
        deleted_quotation: {
          id,
          quotation_number: quote.quotation_number,
          total_amount: quote.total_amount,
        },
      },
    }).catch((err) => console.warn('Failed to log quote deletion activity:', err));

    return NextResponse.json({ success: true, message: 'Quotation deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting quotation:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete quotation' },
      { status: 400 }
    );
  }
}

