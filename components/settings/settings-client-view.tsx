'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Organization, CurrencyCode } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import {
  Building,
  Save,
  CheckCircle2,
  Upload,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Palette,
  Sparkles,
  Users as UsersIcon,
  UserPlus,
  ShieldAlert,
  X,
} from 'lucide-react';

export function SettingsClientView({
  initialOrganization,
  currentUserRole = 'OWNER',
}: {
  initialOrganization: Organization;
  currentUserRole?: string;
}) {
  const router = useRouter();
  const [org, setOrg] = useState<Organization>(initialOrganization);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Staff creation state
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'STAFF' | 'ADMIN'>('STAFF');
  const [staffError, setStaffError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);

    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword) {
      setStaffError('Please fill out all fields.');
      return;
    }

    if (newStaffPassword.length < 6) {
      setStaffError('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsAddingStaff(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newStaffName.trim(),
          email: newStaffEmail.trim(),
          password: newStaffPassword,
          role: newStaffRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create team member');

      setSuccessMsg(`Team account "${newStaffEmail}" created successfully! They can now log in.`);
      setIsAddStaffOpen(false);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPassword('');
      setNewStaffRole('STAFF');
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setStaffError(err.message || 'Error creating staff member');
    } finally {
      setIsAddingStaff(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user account "${email}"? This will permanently remove their access.`)) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSuccessMsg(`User ${email} deleted successfully.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting user');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleLogoFile = async (file: File) => {
    if (!file) return;

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 5MB.');
      return;
    }

    try {
      setIsUploadingLogo(true);
      setErrorMsg(null);

      // Create FormData
      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload logo');

      setOrg((prev) => ({ ...prev, logo_url: data.logo_url }));
      setSuccessMsg('Logo uploaded successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoFile(file);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      setIsUploadingLogo(true);
      setErrorMsg(null);

      const res = await fetch('/api/upload/logo', {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove logo');

      setOrg((prev) => ({ ...prev, logo_url: '' }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccessMsg('Logo removed.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error removing logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(org),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');

      setOrg(data.organization);
      setSuccessMsg('Company settings successfully updated.');
      router.refresh();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Organization & Quotation Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize your company profile, upload your brand logo, default currency, prefix, and legal terms.
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-800 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700">
          {errorMsg}
        </div>
      )}

      {currentUserRole === 'STAFF' && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs font-medium text-amber-800">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900">Signed in as Staff</p>
            <p className="text-amber-700 mt-0.5">
              You have read-only access to Organization Settings. Adding staff and modifying company settings requires an Owner or Admin account.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Brand & Logo Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">Company Logo & Visual Identity</h3>
              <p className="text-xs text-slate-500">
                This logo appears on your quotations, customer digital approval portal, and exported PDFs.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Logo Preview Container */}
            <div className="space-y-1.5 shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Logo</span>
              <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-2 overflow-hidden shadow-inner">
                {org.logo_url ? (
                  <img
                    src={org.logo_url}
                    alt="Company Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="h-8 w-8 stroke-1" />
                    <span className="text-[10px] font-medium mt-1">No Logo</span>
                  </div>
                )}
                {isUploadingLogo && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                  </div>
                )}
              </div>
            </div>

            {/* Upload & Controls */}
            <div className="space-y-3 flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={handleFileInputChange}
                className="hidden"
                id="company-logo-upload"
              />

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="gap-2 shadow-sm"
                >
                  <Upload className="h-4 w-4" />
                  <span>{org.logo_url ? 'Change Logo' : 'Upload Logo'}</span>
                </Button>

                {org.logo_url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={isUploadingLogo}
                    className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </Button>
                )}
              </div>

              <p className="text-xs text-slate-500">
                Supports <strong className="font-semibold text-slate-700">PNG, JPG, WebP, SVG</strong> (Max 5MB).
                Transparent background recommended for best appearance.
              </p>

              {/* Brand Color Swatch */}
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Brand Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={org.brand_color || '#4f46e5'}
                    onChange={(e) => setOrg({ ...org, brand_color: e.target.value })}
                    className="h-8 w-10 cursor-pointer rounded-lg border border-slate-300 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={org.brand_color || '#4f46e5'}
                    onChange={(e) => setOrg({ ...org, brand_color: e.target.value })}
                    className="h-8 w-28 rounded-lg border border-slate-300 px-2.5 text-xs font-mono font-medium uppercase"
                  />
                  <div className="flex items-center gap-1.5 ml-2">
                    {['#4f46e5', '#2563eb', '#059669', '#7c3aed', '#e11d48', '#0f172a'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setOrg({ ...org, brand_color: c })}
                        style={{ backgroundColor: c }}
                        className="h-6 w-6 rounded-full border border-slate-200 shadow-xs hover:scale-110 transition-transform"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Profile Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900">Company Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Name *"
              value={org.name}
              onChange={(e) => setOrg({ ...org, name: e.target.value })}
              required
            />
            <Input
              label="Business Type / Industry"
              value={org.business_type || ''}
              onChange={(e) => setOrg({ ...org, business_type: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Business Email *"
              type="email"
              value={org.email}
              onChange={(e) => setOrg({ ...org, email: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              value={org.phone || ''}
              onChange={(e) => setOrg({ ...org, phone: e.target.value })}
            />
            <Input
              label="Website"
              value={org.website || ''}
              onChange={(e) => setOrg({ ...org, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="GST / Tax ID Number"
              value={org.gst_vat_number || ''}
              onChange={(e) => setOrg({ ...org, gst_vat_number: e.target.value })}
            />
            <Input
              label="City"
              value={org.city || ''}
              onChange={(e) => setOrg({ ...org, city: e.target.value })}
            />
            <Input
              label="State / Province"
              value={org.state || ''}
              onChange={(e) => setOrg({ ...org, state: e.target.value })}
            />
          </div>

          <Input
            label="Registered Address"
            value={org.address_line1 || ''}
            onChange={(e) => setOrg({ ...org, address_line1: e.target.value })}
          />
        </div>

        {/* Quotation Numbering & Defaults */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900">Quotation Defaults</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Quotation Number Prefix"
              value={org.quotation_prefix}
              onChange={(e) => setOrg({ ...org, quotation_prefix: e.target.value })}
              placeholder="Q-"
            />

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Default Currency
              </label>
              <select
                value={org.default_currency}
                onChange={(e) =>
                  setOrg({ ...org, default_currency: e.target.value as CurrencyCode })
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED (AED)</option>
              </select>
            </div>

            <Input
              label="Default Tax Rate (%)"
              type="number"
              min="0"
              max="100"
              value={org.default_tax_rate}
              onChange={(e) =>
                setOrg({ ...org, default_tax_rate: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <Textarea
            label="Default Terms & Conditions"
            value={org.default_terms || ''}
            onChange={(e) => setOrg({ ...org, default_terms: e.target.value })}
            rows={3}
          />

          <Input
            label="Invoice / Quotation Footer Note"
            value={org.invoice_footer || ''}
            onChange={(e) => setOrg({ ...org, invoice_footer: e.target.value })}
          />
        </div>

        {/* Team Members & Staff Accounts Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-indigo-600" />
                <span>Team Accounts & Staff Members</span>
              </h3>
              <p className="text-xs text-slate-500">
                Manage members belonging to your company workspace. Staff members can create quotes and manage customers.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                {users.length} {users.length === 1 ? 'Member' : 'Members'}
              </span>
              {currentUserRole !== 'STAFF' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStaffError(null);
                    setIsAddStaffOpen(true);
                  }}
                  className="gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add Staff Member</span>
                </Button>
              )}
            </div>
          </div>

          {isLoadingUsers ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span>Loading user accounts...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              No registered user accounts found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map((user) => (
                <div key={user.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-sm shadow-xs">
                      {(user.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {user.full_name || 'System User'}
                        </p>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            user.role === 'OWNER'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : user.role === 'ADMIN'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {user.role || 'STAFF'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        user.email_confirmed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {user.email_confirmed ? 'Verified' : 'Pending Verification'}
                    </span>

                    {currentUserRole !== 'STAFF' && user.role !== 'OWNER' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        disabled={deletingUserId === user.id}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 font-medium transition-colors"
                        title="Delete User Account"
                      >
                        {deletingUserId === user.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save CTA */}
        {currentUserRole !== 'STAFF' && (
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2 shadow-md">
              <Save className="h-4 w-4" />
              <span>Save Settings</span>
            </Button>
          </div>
        )}
      </form>

      {/* Add Staff Member Modal */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Add Team Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              {staffError && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  {staffError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address (Login ID) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="email"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="password"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as 'STAFF' | 'ADMIN')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="STAFF">Staff (Can create & manage quotations, customers, products)</option>
                  <option value="ADMIN">Admin (Full organization access)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddStaffOpen(false)}
                  disabled={isAddingStaff}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isAddingStaff}
                  className="gap-2 shadow-sm"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Create Account</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
