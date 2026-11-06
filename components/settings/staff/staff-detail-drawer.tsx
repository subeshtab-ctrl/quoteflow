'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Building,
  Shield,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  KeyRound,
  Trash2,
  Activity,
  Edit,
  Power,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { StaffMember, StaffActivityLog, StaffRole, StaffPermissions, ROLE_PERMISSION_PRESETS } from '@/types/staff';
import { Button } from '@/components/ui/button';

interface StaffDetailDrawerProps {
  staff: StaffMember | null;
  onClose: () => void;
  onStaffUpdated: (updated: StaffMember) => void;
  onStaffRemoved: (id: string) => void;
  currentUserRole: string;
  currentUserId: string;
}

export function StaffDetailDrawer({
  staff,
  onClose,
  onStaffUpdated,
  onStaffRemoved,
  currentUserRole,
  currentUserId,
}: StaffDetailDrawerProps) {
  const [activity, setActivity] = useState<StaffActivityLog[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [newRole, setNewRole] = useState<StaffRole>(staff?.role || 'STAFF');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (staff) {
      setNewRole(staff.role);
      setIsEditingRole(false);
      setFeedback(null);
      setResetPasswordOpen(false);
      fetchActivity();
    }
  }, [staff]);

  const fetchActivity = async () => {
    if (!staff) return;
    setIsLoadingActivity(true);
    try {
      const res = await fetch(`/api/staff/${staff.id}`);
      if (res.ok) {
        const data = await res.json();
        setActivity(data.activity || []);
      }
    } catch {
    } finally {
      setIsLoadingActivity(false);
    }
  };

  if (!staff) return null;

  const isSelf = currentUserId === staff.id;
  const isOwner = currentUserRole.toUpperCase() === 'OWNER';
  const isAdmin = currentUserRole.toUpperCase() === 'ADMIN';
  const targetIsOwner = staff.role === 'OWNER';

  // Permission guards
  const canModifyRole = (isOwner || (isAdmin && !targetIsOwner)) && !isSelf;
  const canToggleActive = (isOwner || (isAdmin && !targetIsOwner)) && !isSelf;
  const canRemove = (isOwner || (isAdmin && !targetIsOwner)) && !isSelf && !targetIsOwner;

  const handleToggleStatus = async () => {
    setStatusActionLoading(true);
    setFeedback(null);
    try {
      const nextActive = !staff.is_active;
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      const updated = { ...staff, is_active: nextActive };
      onStaffUpdated(updated);
      setFeedback({
        type: 'success',
        message: `Staff member has been ${nextActive ? 'activated' : 'deactivated'}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setStatusActionLoading(false);
    }
  };

  const handleSaveRole = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');

      const updated = {
        ...staff,
        role: newRole,
        permissions: data.staff?.permissions || staff.permissions,
      };
      onStaffUpdated(updated);
      setIsEditingRole(false);
      setFeedback({ type: 'success', message: `Role changed to ${newRole}.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newTempPassword || newTempPassword.length < 6) {
      setFeedback({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newTempPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setResetPasswordOpen(false);
      setNewTempPassword('');
      setFeedback({
        type: 'success',
        message: 'Password reset successfully. The user can sign in immediately.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStaff = async () => {
    if (
      !window.confirm(
        `Are you sure you want to remove "${staff.full_name}" from your workspace? They will lose access immediately.`
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove staff');

      onStaffRemoved(staff.id);
      onClose();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex justify-end bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 -z-10" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-base">
              {staff.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {staff.full_name}
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[220px]">{staff.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`px-6 py-3 text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-900/40'
                : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-b border-red-200 dark:border-red-900/40'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status & Quick Attributes */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Account Status</span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold ${
                  staff.is_active
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}
              >
                {staff.is_active ? 'Active' : 'Deactivated'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Assigned Role</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800">
                  {staff.role}
                </span>
                {canModifyRole && (
                  <button
                    type="button"
                    onClick={() => setIsEditingRole(!isEditingRole)}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>
            </div>

            {isEditingRole && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Select New Role Template:
                </label>
                <div className="flex gap-2">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as StaffRole)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="SALES">Sales</option>
                    <option value="ACCOUNTS">Accounts</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="STAFF">Staff (Basic)</option>
                    {isOwner && <option value="OWNER">Owner (Transfer)</option>}
                  </select>
                  <Button
                    size="sm"
                    onClick={handleSaveRole}
                    disabled={isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Branch Location</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                {staff.branch || 'Main Branch'}
              </span>
            </div>

            {staff.phone && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Phone</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {staff.phone}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Member Since</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(
                  new Date(staff.created_at)
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Last Sign In</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {staff.last_sign_in_at
                  ? new Intl.DateTimeFormat('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(staff.last_sign_in_at))
                  : 'Never'}
              </span>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="grid grid-cols-2 gap-2">
            {canToggleActive && (
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={statusActionLoading}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  staff.is_active
                    ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
                    : 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                }`}
              >
                <Power className="h-3.5 w-3.5" />
                <span>{staff.is_active ? 'Deactivate Account' : 'Activate Account'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setNewTempPassword(`Qf!${Math.random().toString(36).slice(-5)}${Math.floor(10 + Math.random() * 90)}`);
                setResetPasswordOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Reset Password</span>
            </button>

            {canRemove && (
              <button
                type="button"
                onClick={handleRemoveStaff}
                disabled={isSubmitting}
                className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove From Workspace</span>
              </button>
            )}
          </div>

          {/* Reset Password Form Inline */}
          {resetPasswordOpen && (
            <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950 dark:text-indigo-200">Set New Temporary Password</span>
                <button
                  type="button"
                  onClick={() => setResetPasswordOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                type="text"
                value={newTempPassword}
                onChange={(e) => setNewTempPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 font-mono text-xs"
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  onClick={handleResetPassword}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  Confirm Reset
                </Button>
              </div>
            </div>
          )}

          {/* Granted Permissions Badges */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-indigo-500" />
              <span>Assigned Permissions</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(staff.permissions)
                .filter(([_, val]) => Boolean(val))
                .map(([key]) => (
                  <span
                    key={key}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                  >
                    {key.replace(/_/g, ' ')}
                  </span>
                ))}
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-indigo-500" />
              <span>Recent Activity Timeline</span>
            </h4>

            {isLoadingActivity ? (
              <div className="py-6 text-center text-slate-400 text-xs">Loading activity...</div>
            ) : activity.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No recent actions recorded for this staff member yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activity.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white uppercase text-[10px]">
                        {act.action} ({act.module})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Intl.DateTimeFormat('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(act.created_at))}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">{act.details}</p>
                    {act.target_identifier && (
                      <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold block">
                        Record: {act.target_identifier}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
