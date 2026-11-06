'use client';

import React from 'react';
import { Check, X, Shield, Users, Briefcase, Calculator, Megaphone, Settings } from 'lucide-react';
import { StaffRole, ROLE_PERMISSION_PRESETS, StaffPermissions } from '@/types/staff';

const ROLES: { id: StaffRole; label: string; icon: any; summary: string; color: string }[] = [
  { id: 'OWNER', label: 'Owner', icon: Shield, summary: 'Full business & subscription ownership', color: 'purple' },
  { id: 'ADMIN', label: 'Admin', icon: Settings, summary: 'Full operational control & staff management', color: 'blue' },
  { id: 'MANAGER', label: 'Manager', icon: Briefcase, summary: 'Manage operations, quotes, invoices & reports', color: 'teal' },
  { id: 'SALES', label: 'Sales', icon: Users, summary: 'Customers, leads, quotes & AI copilot', color: 'amber' },
  { id: 'ACCOUNTS', label: 'Accounts', icon: Calculator, summary: 'Invoices, payments, tax & financial reports', color: 'emerald' },
  { id: 'MARKETING', label: 'Marketing', icon: Megaphone, summary: 'Leads, customer communications & campaigns', color: 'pink' },
];

const MODULE_FEATURES: { category: string; features: { key: keyof StaffPermissions; name: string }[] }[] = [
  {
    category: 'Customers',
    features: [
      { key: 'customers_view', name: 'View Customer List' },
      { key: 'customers_create', name: 'Create Customers' },
      { key: 'customers_edit', name: 'Edit Customers' },
      { key: 'customers_delete', name: 'Delete Customers' },
      { key: 'customers_export', name: 'Export Customers (CSV)' },
    ],
  },
  {
    category: 'Quotations',
    features: [
      { key: 'quotes_view', name: 'View Quotations' },
      { key: 'quotes_create', name: 'Create Quotations' },
      { key: 'quotes_edit', name: 'Edit Quotations' },
      { key: 'quotes_delete', name: 'Delete Quotations' },
      { key: 'quotes_send', name: 'Send to Customer' },
      { key: 'quotes_apply_discounts', name: 'Apply Custom Discounts' },
      { key: 'quotes_view_values', name: 'View Quote Total Values' },
    ],
  },
  {
    category: 'Invoices & Payments',
    features: [
      { key: 'invoices_view', name: 'View Tax Invoices' },
      { key: 'invoices_create', name: 'Create Tax Invoices' },
      { key: 'invoices_edit', name: 'Edit Invoices' },
      { key: 'invoices_delete', name: 'Delete Invoices' },
      { key: 'payments_view', name: 'View Payments' },
      { key: 'payments_record', name: 'Record Manual Payments' },
    ],
  },
  {
    category: 'Reports & Intelligence',
    features: [
      { key: 'reports_view', name: 'View Business Analytics' },
      { key: 'reports_export', name: 'Export Financial Reports' },
      { key: 'ai_use', name: 'QuoteFlow AI Copilot' },
    ],
  },
  {
    category: 'Staff Management',
    features: [
      { key: 'staff_view', name: 'View Staff List' },
      { key: 'staff_add', name: 'Add / Invite Staff' },
      { key: 'staff_edit', name: 'Edit Staff Details' },
      { key: 'staff_remove', name: 'Remove Staff' },
      { key: 'staff_change_roles', name: 'Change Roles & Permissions' },
    ],
  },
  {
    category: 'Billing & Workspace',
    features: [
      { key: 'billing_view', name: 'View Pro Subscription' },
      { key: 'billing_manage_subscription', name: 'Upgrade / Manage Plan' },
      { key: 'settings_edit', name: 'Edit Organization Profile' },
    ],
  },
];

export function RolesPermissionsMatrix() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ROLES.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.id}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-start gap-3"
            >
              <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{r.label}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.summary}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Role Permission Comparison</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Default preset matrix applied when creating staff. Permissions can also be customized per user.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50">
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 w-1/3">
                  Module / Feature
                </th>
                {ROLES.map((r) => (
                  <th key={r.id} className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {MODULE_FEATURES.map((group) => (
                <React.Fragment key={group.category}>
                  <tr className="bg-slate-50/40 dark:bg-slate-950/20">
                    <td
                      colSpan={ROLES.length + 1}
                      className="py-2 px-4 font-bold text-[11px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400"
                    >
                      {group.category}
                    </td>
                  </tr>
                  {group.features.map((feat) => (
                    <tr key={feat.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {feat.name}
                      </td>
                      {ROLES.map((role) => {
                        const preset = ROLE_PERMISSION_PRESETS[role.id];
                        const allowed = Boolean(preset && preset[feat.key]);
                        return (
                          <td key={role.id} className="py-2.5 px-3 text-center">
                            {allowed ? (
                              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                            ) : (
                              <X className="h-4 w-4 text-slate-300 dark:text-slate-700 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
