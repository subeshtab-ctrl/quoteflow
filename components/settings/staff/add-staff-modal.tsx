'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Building,
  ShieldCheck,
  KeyRound,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  StaffRole,
  StaffPermissions,
  ROLE_PERMISSION_PRESETS,
  DEFAULT_FULL_PERMISSIONS,
} from '@/types/staff';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStaffAdded: (staff: any) => void;
  currentUserRole: string;
}

const ROLES: { id: StaffRole; label: string; desc: string; color: string }[] = [
  { id: 'OWNER', label: 'Owner', desc: 'Full control of the business & workspace', color: 'purple' },
  { id: 'ADMIN', label: 'Admin', desc: 'Almost full operational control & staff management', color: 'blue' },
  { id: 'MANAGER', label: 'Manager', desc: 'Manage customers, quotes, invoices & reports', color: 'teal' },
  { id: 'SALES', label: 'Sales', desc: 'Customers, leads and quotations pipeline', color: 'amber' },
  { id: 'ACCOUNTS', label: 'Accounts', desc: 'Invoices, payments, tax & financial reports', color: 'emerald' },
  { id: 'MARKETING', label: 'Marketing', desc: 'Customer/lead access & campaign materials', color: 'pink' },
  { id: 'CUSTOM', label: 'Custom', desc: 'Manually select granular module permissions', color: 'indigo' },
];

const PERMISSION_GROUPS: {
  title: string;
  items: { key: keyof StaffPermissions; label: string; desc?: string }[];
}[] = [
  {
    title: 'Customers',
    items: [
      { key: 'customers_view', label: 'View Customers' },
      { key: 'customers_create', label: 'Create Customer' },
      { key: 'customers_edit', label: 'Edit Customer' },
      { key: 'customers_delete', label: 'Delete Customer' },
      { key: 'customers_export', label: 'Export Customers (CSV)' },
    ],
  },
  {
    title: 'Quotations',
    items: [
      { key: 'quotes_view', label: 'View Quotes' },
      { key: 'quotes_create', label: 'Create Quote' },
      { key: 'quotes_edit', label: 'Edit Quote' },
      { key: 'quotes_delete', label: 'Delete Quote' },
      { key: 'quotes_send', label: 'Send to Customer' },
      { key: 'quotes_apply_discounts', label: 'Apply Discounts' },
      { key: 'quotes_view_values', label: 'View Quote Total Values' },
    ],
  },
  {
    title: 'Tax Invoices',
    items: [
      { key: 'invoices_view', label: 'View Invoices' },
      { key: 'invoices_create', label: 'Create Invoices' },
      { key: 'invoices_edit', label: 'Edit Invoices' },
      { key: 'invoices_delete', label: 'Delete Invoices' },
      { key: 'invoices_send', label: 'Send Invoices' },
    ],
  },
  {
    title: 'Payments & Revenue',
    items: [
      { key: 'payments_view', label: 'View Payments' },
      { key: 'payments_record', label: 'Record Payments' },
      { key: 'payments_edit_status', label: 'Edit Payment Status' },
    ],
  },
  {
    title: 'Reports & Analytics',
    items: [
      { key: 'reports_view', label: 'View Reports' },
      { key: 'reports_export', label: 'Export Financial Reports' },
    ],
  },
  {
    title: 'QuoteFlow AI Copilot',
    items: [
      { key: 'ai_use', label: 'Use AI Copilot' },
      { key: 'ai_create_quotes', label: 'Draft Quotes with AI' },
    ],
  },
  {
    title: 'Marketing & Leads',
    items: [
      { key: 'marketing_view_leads', label: 'View Leads' },
      { key: 'marketing_send_campaigns', label: 'Send Campaigns' },
      { key: 'marketing_manage_templates', label: 'Manage Templates' },
    ],
  },
  {
    title: 'Staff Management',
    items: [
      { key: 'staff_view', label: 'View Staff List' },
      { key: 'staff_add', label: 'Add New Staff' },
      { key: 'staff_edit', label: 'Edit Staff Details' },
      { key: 'staff_remove', label: 'Remove Staff' },
      { key: 'staff_change_roles', label: 'Change Roles & Permissions' },
    ],
  },
  {
    title: 'Organization Settings',
    items: [
      { key: 'settings_view', label: 'View Settings' },
      { key: 'settings_edit', label: 'Edit Company Profile & Settings' },
    ],
  },
  {
    title: 'Subscription & Billing (Owner/Admin Only)',
    items: [
      { key: 'billing_view', label: 'View Subscription' },
      { key: 'billing_manage_subscription', label: 'Manage Plan & Renewals' },
      { key: 'billing_manage_payment_method', label: 'Manage Payment Methods' },
    ],
  },
];

export function AddStaffModal({
  isOpen,
  onClose,
  onStaffAdded,
  currentUserRole,
}: AddStaffModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState('Main Branch');
  const [role, setRole] = useState<StaffRole>('SALES');
  const [permissions, setPermissions] = useState<StaffPermissions>(ROLE_PERMISSION_PRESETS.SALES);
  const [password, setPassword] = useState('');
  const [isCustomizingPermissions, setIsCustomizingPermissions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate random initial password
  useEffect(() => {
    if (isOpen) {
      const rand = `Qf!${Math.random().toString(36).slice(-5)}${Math.floor(10 + Math.random() * 90)}`;
      setPassword(rand);
      setRole('SALES');
      setPermissions(ROLE_PERMISSION_PRESETS.SALES);
      setIsCustomizingPermissions(false);
      setError(null);
    }
  }, [isOpen]);

  // When role changes, update permissions preset
  const handleRoleChange = (newRole: StaffRole) => {
    setRole(newRole);
    const preset = ROLE_PERMISSION_PRESETS[newRole] || ROLE_PERMISSION_PRESETS.STAFF;
    setPermissions({ ...preset });
  };

  const handleTogglePermission = (key: keyof StaffPermissions) => {
    setPermissions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Switch role dropdown display to CUSTOM if permissions deviate
      setRole('CUSTOM');
      return next;
    });
  };

  const handleSelectAllInGroup = (items: { key: keyof StaffPermissions }[]) => {
    setPermissions((prev) => {
      const allChecked = items.every((i) => prev[i.key]);
      const next = { ...prev };
      for (const item of items) {
        next[item.key] = !allChecked;
      }
      setRole('CUSTOM');
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim()) {
      setError('Full Name and Email address are required.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Temporary password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          branch: branch.trim() || 'Main Branch',
          role,
          permissions,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add staff member');
      }

      onStaffAdded(data.staff);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 -z-10" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Staff Member</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create user profile, assign branch role and configure granular permissions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Subscription Inheritance Notice */}
        <div className="px-6 py-2.5 bg-blue-50/60 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-300">
          <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            <strong>Workspace Subscription Inherited:</strong> Staff accounts belong to this business and inherit your active Pro/Trial plan. Staff never receive a separate trial or billing charge.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Row 1: Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="sarah@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Phone & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Branch / Office Location
              </label>
              <div className="relative">
                <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Main Branch, Mumbai, Downtown, etc."
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Role Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Role Template <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as StaffRole)}
                className="w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 appearance-none"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label} — {r.desc}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Selecting a role automatically pre-fills recommended module permissions.
            </p>
          </div>

          {/* Custom Permissions Accordion / Checklist */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/40 dark:bg-slate-950/40">
            <button
              type="button"
              onClick={() => setIsCustomizingPermissions(!isCustomizingPermissions)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Customize Permissions ({role} Template)
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                <span>{isCustomizingPermissions ? 'Collapse' : 'Customize Permissions'}</span>
                {isCustomizingPermissions ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </button>

            {isCustomizingPermissions && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 max-h-80 overflow-y-auto">
                {PERMISSION_GROUPS.map((group) => {
                  const allChecked = group.items.every((i) => permissions[i.key]);
                  return (
                    <div key={group.title} className="space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {group.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSelectAllInGroup(group.items)}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                        >
                          {allChecked ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.items.map((item) => {
                          const checked = Boolean(permissions[item.key]);
                          return (
                            <label
                              key={item.key}
                              className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                checked
                                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/50 text-indigo-950 dark:text-indigo-200 font-semibold'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleTogglePermission(item.key)}
                                className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>{item.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Password Setup */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Temporary Password <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setPassword(
                    `Qf!${Math.random().toString(36).slice(-5)}${Math.floor(10 + Math.random() * 90)}`
                  )
                }
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Generate New
              </button>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Staff will be prompted to set their permanent password immediately upon first sign in.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5"
            >
              {isSubmitting ? 'Adding Staff...' : 'Add Staff Member'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
