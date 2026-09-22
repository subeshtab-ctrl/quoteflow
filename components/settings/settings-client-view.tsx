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
  Copy,
  Check,
  Send,
  Link as LinkIcon,
  SunMoon,
} from 'lucide-react';
import { extractDominantColor } from '@/lib/utils/color-extractor';
import { ThemeSegmentedControl } from '@/components/theme/theme-toggle';

export function SettingsClientView({
  initialOrganization,
  currentUserRole = 'OWNER',
  currentUserId = '',
  currentUserEmail = '',
}: {
  initialOrganization: Organization;
  currentUserRole?: string;
  currentUserId?: string;
  currentUserEmail?: string;
}) {
  const router = useRouter();
  const [org, setOrg] = useState<Organization>(initialOrganization);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isExtractingColor, setIsExtractingColor] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Staff creation / invitation state
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffModalMode, setStaffModalMode] = useState<'invite' | 'direct'>('invite');
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'STAFF' | 'ADMIN'>('STAFF');
  const [staffError, setStaffError] = useState<string | null>(null);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Synchronize CSS variable when brand color changes
  useEffect(() => {
    if (org.brand_color) {
      document.documentElement.style.setProperty('--brand-color', org.brand_color);
    }
  }, [org.brand_color]);

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

  useEffect(() => {
    fetchUsers();
  }, []);

  // Staff creation via direct password or invite link
  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    setGeneratedInviteUrl(null);

    if (!newStaffEmail.trim()) {
      setStaffError('Please enter the team member email address.');
      return;
    }

    try {
      setIsAddingStaff(true);
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newStaffName.trim(),
          email: newStaffEmail.trim(),
          role: newStaffRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create staff invitation');

      setGeneratedInviteUrl(data.inviteUrl);
      setSuccessMsg(`Invitation dispatched to ${newStaffEmail}!`);
      fetchUsers();
    } catch (err: any) {
      setStaffError(err.message || 'Error creating staff invitation');
    } finally {
      setIsAddingStaff(false);
    }
  };

  const handleDirectCreateStaff = async (e: React.FormEvent) => {
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

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user account "${email}"? This will permanently remove their access from this company.`)) {
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

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 5MB.');
      return;
    }

    try {
      setIsUploadingLogo(true);
      setErrorMsg(null);

      // 1. Auto-extract dominant vibrant color from logo
      let extractedThemeColor: string | null = null;
      try {
        extractedThemeColor = await extractDominantColor(file);
      } catch (err) {
        console.warn('Could not extract color:', err);
      }

      // 2. Upload file to storage
      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload logo');

      const newLogoUrl = data.logo_url;
      const updatedBrandColor = extractedThemeColor || org.brand_color || '#4f46e5';

      setOrg((prev) => ({
        ...prev,
        logo_url: newLogoUrl,
        brand_color: updatedBrandColor,
      }));

      document.documentElement.style.setProperty('--brand-color', updatedBrandColor);

      // Auto-save logo and brand color to server
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...org,
          logo_url: newLogoUrl,
          brand_color: updatedBrandColor,
        }),
      });

      setSuccessMsg(
        extractedThemeColor
          ? `Logo uploaded! Brand theme color automatically matched to ${extractedThemeColor}.`
          : 'Logo uploaded successfully!'
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleAutoExtractColor = async () => {
    if (!org.logo_url) {
      setErrorMsg('Please upload a company logo first to match theme colors.');
      return;
    }

    try {
      setIsExtractingColor(true);
      const color = await extractDominantColor(org.logo_url);
      if (color) {
        setOrg((prev) => ({ ...prev, brand_color: color }));
        document.documentElement.style.setProperty('--brand-color', color);
        setSuccessMsg(`Brand color matched from logo: ${color}`);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setErrorMsg('Could not extract color from logo.');
    } finally {
      setIsExtractingColor(false);
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

  const copyInviteToClipboard = () => {
    if (generatedInviteUrl) {
      navigator.clipboard.writeText(generatedInviteUrl);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    }
  };

  const colorPresets = [
    { name: 'Indigo', hex: '#4f46e5' },
    { name: 'Violet', hex: '#7c3aed' },
    { name: 'Blue', hex: '#2563eb' },
    { name: 'Sky', hex: '#0284c7' },
    { name: 'Emerald', hex: '#059669' },
    { name: 'Amber', hex: '#d97706' },
    { name: 'Rose', hex: '#e11d48' },
    { name: 'Dark Slate', hex: '#334155' },
  ];

  return (
    <div className="space-y-6 max-w-4xl transition-colors">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Organization & Quotation Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize your company profile, brand logo & theme color, team members, currency, and defaults.
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-4 text-xs font-semibold text-emerald-800 dark:text-emerald-300 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {currentUserRole === 'STAFF' && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 text-xs font-medium text-amber-800 dark:text-amber-300">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">Signed in as Staff</p>
            <p className="text-amber-700 dark:text-amber-400 mt-0.5">
              You have read-only access to Organization Settings. Adding staff and modifying company settings requires an Owner or Admin account.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Appearance & Soft Dark Mode Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <SunMoon className="h-5 w-5 text-indigo-500" />
                <span>Appearance & Display Theme</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Switch between standard light mode, comfortable soft dark mode, or system automatic.
              </p>
            </div>
            <ThemeSegmentedControl />
          </div>
        </div>

        {/* Brand & Logo Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Palette className="h-5 w-5 text-indigo-500" />
                <span>Company Logo & Brand Theme Color</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                When you upload a logo, buttons and theme colors automatically match your brand identity!
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Logo Preview Container */}
            <div className="space-y-1.5 shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Current Logo</span>
              <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2 overflow-hidden shadow-inner">
                {org.logo_url ? (
                  <img
                    src={org.logo_url}
                    alt="Company Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                    <ImageIcon className="h-8 w-8 stroke-1" />
                    <span className="text-[10px] font-medium mt-1">No Logo</span>
                  </div>
                )}
                {isUploadingLogo && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
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
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoExtractColor}
                      disabled={isExtractingColor || isUploadingLogo}
                      className="gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                      title="Automatically re-detect dominant color from this logo"
                    >
                      {isExtractingColor ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>Auto-match Theme to Logo</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={isUploadingLogo}
                      className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </Button>
                  </>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supports <strong className="font-semibold text-slate-700 dark:text-slate-300">PNG, JPG, WebP, SVG</strong> (Max 5MB).
                Transparent background recommended for best appearance.
              </p>
            </div>
          </div>

          {/* Brand Theme Color Customizer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Workspace Button & Theme Color
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Controls the primary color for action buttons, badges, customer approval portal, and invoice headers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">Live Preview:</span>
                <button
                  type="button"
                  style={{ backgroundColor: org.brand_color || '#4f46e5' }}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-white shadow-xs"
                >
                  Primary Action
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Preset Swatches */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {colorPresets.map((p) => {
                  const isSelected = org.brand_color?.toLowerCase() === p.hex.toLowerCase();
                  return (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setOrg({ ...org, brand_color: p.hex })}
                      style={{ backgroundColor: p.hex }}
                      title={p.name}
                      className={`h-7 w-7 rounded-full border-2 transition-transform shadow-xs ${
                        isSelected
                          ? 'border-white dark:border-slate-900 ring-2 ring-indigo-500 scale-110'
                          : 'border-slate-200 dark:border-slate-700 hover:scale-105'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Custom Picker & Hex Input */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                <input
                  type="color"
                  value={org.brand_color || '#4f46e5'}
                  onChange={(e) => setOrg({ ...org, brand_color: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800"
                  title="Pick custom color"
                />
                <input
                  type="text"
                  value={org.brand_color || '#4f46e5'}
                  onChange={(e) => setOrg({ ...org, brand_color: e.target.value })}
                  placeholder="#4f46e5"
                  className="h-8 w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-mono font-bold uppercase text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Company Profile Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building className="h-5 w-5 text-indigo-500" />
            <span>Company Information</span>
          </h3>

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
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Quotation Defaults</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Quotation Number Prefix"
              value={org.quotation_prefix}
              onChange={(e) => setOrg({ ...org, quotation_prefix: e.target.value })}
              placeholder="Q-"
            />

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Default Currency
              </label>
              <select
                value={org.default_currency}
                onChange={(e) =>
                  setOrg({ ...org, default_currency: e.target.value as CurrencyCode })
                }
                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-indigo-500" />
                <span>Team Accounts & Staff Members</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Staff invited here connect directly to your company database. Owners & Admins can invite staff or remove access at any time.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg">
                {users.length} {users.length === 1 ? 'Member' : 'Members'}
              </span>
              {currentUserRole !== 'STAFF' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStaffError(null);
                    setGeneratedInviteUrl(null);
                    setIsAddStaffOpen(true);
                  }}
                  className="gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Invite / Add Staff Member</span>
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
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                const canDelete = currentUserRole !== 'STAFF' && !isCurrentUser;

                return (
                  <div key={user.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm shadow-xs">
                        {(user.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {user.full_name || 'Team Member'}
                          </p>
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              You
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              user.role === 'OWNER'
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : user.role === 'ADMIN'
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {user.role || 'STAFF'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                          user.email_confirmed
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {user.email_confirmed ? 'Verified' : 'Pending Verification'}
                      </span>

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          disabled={deletingUserId === user.id}
                          className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 font-medium transition-colors"
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
                );
              })}
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

      {/* Add / Invite Staff Member Modal */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-500" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Add Team Member</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddStaffOpen(false);
                  setGeneratedInviteUrl(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="px-6 pt-4">
              <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStaffModalMode('invite');
                    setStaffError(null);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-semibold transition-all ${
                    staffModalMode === 'invite'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Send Invite Link & Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStaffModalMode('direct');
                    setStaffError(null);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-semibold transition-all ${
                    staffModalMode === 'direct'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Direct Password Setup
                </button>
              </div>
            </div>

            {/* Generated Invite Card */}
            {generatedInviteUrl ? (
              <div className="p-6 space-y-4">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                    Invitation Created & Dispatched!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    An email notification has been sent to <strong>{newStaffEmail}</strong>. They will set their own password and gain access to your company database.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Shareable Invitation Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteUrl}
                      className="h-10 flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-mono text-slate-700 dark:text-slate-200 truncate"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyInviteToClipboard}
                      className="gap-1.5 shrink-0"
                    >
                      {copiedInvite ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    You can copy this link and send it directly via WhatsApp, SMS, or Slack.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      setIsAddStaffOpen(false);
                      setGeneratedInviteUrl(null);
                      setNewStaffEmail('');
                      setNewStaffName('');
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : staffModalMode === 'invite' ? (
              /* Option 1: Invite Form */
              <form onSubmit={handleInviteStaff} className="p-6 space-y-4">
                {staffError && (
                  <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl">
                    {staffError}
                  </div>
                )}

                <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 p-3 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    Staff will receive an invite email with a link where they can set their own secure password and immediately access your company quotations and customers.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Staff Member Full Name
                  </label>
                  <Input
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g. Rahul Verma"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as 'STAFF' | 'ADMIN')}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="STAFF">Staff (Can create & manage quotations, customers, products)</option>
                    <option value="ADMIN">Admin (Full organization access)</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
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
                    <Send className="h-4 w-4" />
                    <span>Send Invitation Link</span>
                  </Button>
                </div>
              </form>
            ) : (
              /* Option 2: Direct Password Form */
              <form onSubmit={handleDirectCreateStaff} className="p-6 space-y-4">
                {staffError && (
                  <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl">
                    {staffError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Temporary Password <span className="text-rose-500">*</span>
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as 'STAFF' | 'ADMIN')}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="STAFF">Staff (Can create & manage quotations, customers, products)</option>
                    <option value="ADMIN">Admin (Full organization access)</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
