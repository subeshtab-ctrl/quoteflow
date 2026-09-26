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
  Circle,
  Square,
  Maximize2,
  Minimize2,
  Globe,
  Receipt,
} from 'lucide-react';
import { extractDominantColor } from '@/lib/utils/color-extractor';
import { ThemeSegmentedControl } from '@/components/theme/theme-toggle';
import {
  parseLogoUrl,
  formatLogoUrl,
  getLogoShapeClass,
  getLogoFitClass,
  getCompanyInitials,
  LogoShape,
  LogoFit,
} from '@/lib/utils/logo';
import { COUNTRIES, getCountryProfile } from '@/lib/tax/country-config';

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
  const initialParsed = parseLogoUrl(initialOrganization.logo_url);
  const [logoShape, setLogoShape] = useState<LogoShape>(initialParsed.shape);
  const [logoFit, setLogoFit] = useState<LogoFit>(initialParsed.fit);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isExtractingColor, setIsExtractingColor] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Staff creation state (Direct Password Setup)
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'STAFF' | 'ADMIN'>('STAFF');
  const [staffError, setStaffError] = useState<string | null>(null);

  // Logged-in user password change state
  const [myNewPassword, setMyNewPassword] = useState('');
  const [myConfirmPassword, setMyConfirmPassword] = useState('');
  const [isChangingMyPassword, setIsChangingMyPassword] = useState(false);
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<string | null>(null);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);

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

  const handleUpdateOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);
    setPasswordChangeMsg(null);

    if (!myNewPassword || myNewPassword.length < 6) {
      setPasswordChangeError('New password must be at least 6 characters.');
      return;
    }

    if (myNewPassword !== myConfirmPassword) {
      setPasswordChangeError('Passwords do not match.');
      return;
    }

    try {
      setIsChangingMyPassword(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: myNewPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password.');

      setPasswordChangeMsg('Your password has been updated successfully!');
      setMyNewPassword('');
      setMyConfirmPassword('');
      setTimeout(() => setPasswordChangeMsg(null), 4000);
    } catch (err: any) {
      setPasswordChangeError(err.message || 'Error updating password');
    } finally {
      setIsChangingMyPassword(false);
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

      setSuccessMsg(
        `Team account "${newStaffEmail}" created! They can log in with the temporary password and set their own password.`
      );
      setIsAddStaffOpen(false);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPassword('');
      setNewStaffRole('STAFF');
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err: any) {
      setStaffError(err.message || 'Error creating staff member');
    } finally {
      setIsAddingStaff(false);
    }
  };

  const handleResetStaffPassword = async (userId: string, email: string) => {
    const tempPassword = window.prompt(
      `Enter a new Temporary Password (at least 6 characters) for ${email}:`,
      '123456'
    );
    if (!tempPassword) return;
    if (tempPassword.length < 6) {
      alert('Temporary password must be at least 6 characters.');
      return;
    }

    try {
      setDeletingUserId(userId);
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: tempPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set temporary password');

      setSuccessMsg(
        `Temporary password set for ${email}! They can now log in with "${tempPassword}" and set their own password.`
      );
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error setting temporary password');
    } finally {
      setDeletingUserId(null);
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

      const rawLogoUrl = data.logo_url;
      const newLogoUrl = formatLogoUrl(rawLogoUrl, logoShape, logoFit);
      const updatedBrandColor = extractedThemeColor || org.brand_color || '#4f46e5';

      setOrg((prev) => ({
        ...prev,
        logo_url: newLogoUrl,
        brand_color: updatedBrandColor,
      }));

      document.documentElement.style.setProperty('--brand-color', updatedBrandColor);

      // Auto-save brand color and logo settings
      try {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...org,
            logo_url: newLogoUrl,
            brand_color: updatedBrandColor,
          }),
        });
      } catch (saveErr) {
        console.warn('Note: settings sync note:', saveErr);
      }

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

  const handleShapeChange = async (newShape: LogoShape) => {
    setLogoShape(newShape);
    if (org.logo_url) {
      const formatted = formatLogoUrl(org.logo_url, newShape, logoFit);
      setOrg((prev) => ({ ...prev, logo_url: formatted }));
      try {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...org, logo_url: formatted }),
        });
        setSuccessMsg(`Logo shape set to ${newShape === 'circle' ? 'Round (Instagram style)' : newShape}!`);
        setTimeout(() => setSuccessMsg(null), 2500);
      } catch (e) {
        console.warn('Auto save logo shape error:', e);
      }
    }
  };

  const handleFitChange = async (newFit: LogoFit) => {
    setLogoFit(newFit);
    if (org.logo_url) {
      const formatted = formatLogoUrl(org.logo_url, logoShape, newFit);
      setOrg((prev) => ({ ...prev, logo_url: formatted }));
      try {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...org, logo_url: formatted }),
        });
        setSuccessMsg(`Image fit set to ${newFit === 'cover' ? 'Fill (Cover)' : 'Fit Entire Logo (Contain)'}!`);
        setTimeout(() => setSuccessMsg(null), 2500);
      } catch (e) {
        console.warn('Auto save logo fit error:', e);
      }
    }
  };

  const handleAutoExtractColor = async () => {
    if (!org.logo_url) {
      setErrorMsg('Please upload a company logo first to match theme colors.');
      return;
    }

    try {
      setIsExtractingColor(true);
      const parsed = parseLogoUrl(org.logo_url);
      const color = await extractDominantColor(parsed.cleanUrl);
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
    // Reset file input value so choosing a new file or re-uploading always fires onChange
    e.target.value = '';
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

      // Ensure setting is persisted to server
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...org,
          logo_url: '',
        }),
      });

      setSuccessMsg('Logo removed successfully.');
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

          <div className="space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              {/* Logo Preview Container */}
              <div className="space-y-1.5 shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Logo Preview
                </span>
                <div
                  className={`relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 p-1.5 overflow-hidden shadow-md ring-4 ring-indigo-500/10 transition-all ${getLogoShapeClass(
                    logoShape
                  )}`}
                >
                  {org.logo_url ? (
                    <img
                      src={parseLogoUrl(org.logo_url).cleanUrl}
                      alt="Company Logo"
                      className={`h-full w-full ${getLogoShapeClass(logoShape)} ${getLogoFitClass(
                        logoFit
                      )}`}
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white font-black text-2xl tracking-wider select-none ${getLogoShapeClass(
                        logoShape
                      )}`}
                    >
                      {getCompanyInitials(org.name)}
                    </div>
                  )}
                  {isUploadingLogo && (
                    <div
                      className={`absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center ${getLogoShapeClass(
                        logoShape
                      )}`}
                    >
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* Live Fit in Sidebar Preview */}
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Live Sidebar Header Fit
                  </span>
                  <div className="mt-1 flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs max-w-sm">
                    {org.logo_url ? (
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs ring-2 ring-indigo-500/10 overflow-hidden ${getLogoShapeClass(
                          logoShape
                        )}`}
                      >
                        <img
                          src={parseLogoUrl(org.logo_url).cleanUrl}
                          alt={org.name}
                          className={`h-full w-full ${getLogoShapeClass(logoShape)} ${getLogoFitClass(
                            logoFit
                          )}`}
                        />
                      </div>
                    ) : (
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white font-black text-sm tracking-wider shadow-sm ring-2 ring-indigo-500/20 select-none ${getLogoShapeClass(
                          logoShape
                        )}`}
                      >
                        {getCompanyInitials(org.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight leading-snug">
                        {org.name || 'Company Name'}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate leading-none mt-0.5">
                        Quotation Workspace
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upload & Action Buttons */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="company-logo-upload"
                />

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="gap-2 shadow-sm font-bold"
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
                        <span>Auto-match Theme</span>
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
              </div>
            </div>

            {/* Shape & Image Fit Controls */}
            {org.logo_url && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Shape Selector */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Logo Shape
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleShapeChange('circle')}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all ${
                        logoShape === 'circle'
                          ? 'bg-white dark:bg-slate-700 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-500/10'
                          : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <Circle className="h-4 w-4 mb-1" />
                      <span>Round (IG)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShapeChange('rounded')}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all ${
                        logoShape === 'rounded'
                          ? 'bg-white dark:bg-slate-700 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-500/10'
                          : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <div className="h-4 w-4 mb-1 rounded-sm border-2 border-current" />
                      <span>Rounded</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShapeChange('square')}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all ${
                        logoShape === 'square'
                          ? 'bg-white dark:bg-slate-700 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-500/10'
                          : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <Square className="h-4 w-4 mb-1" />
                      <span>Square</span>
                    </button>
                  </div>
                </div>

                {/* Fit Mode Selector */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Image Fit Option
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleFitChange('cover')}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all ${
                        logoFit === 'cover'
                          ? 'bg-white dark:bg-slate-700 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-500/10'
                          : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/60'
                      }`}
                      title="Fills the avatar completely like an Instagram profile picture"
                    >
                      <Maximize2 className="h-4 w-4 mb-1" />
                      <span>Cover (Fill)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFitChange('contain')}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all ${
                        logoFit === 'contain'
                          ? 'bg-white dark:bg-slate-700 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-500/10'
                          : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/60'
                      }`}
                      title="Fits entire logo inside with no cropping"
                    >
                      <Minimize2 className="h-4 w-4 mb-1" />
                      <span>Contain (Fit)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supports <strong className="font-semibold text-slate-700 dark:text-slate-300">PNG, JPG, WebP, SVG</strong> (Max 5MB).
              Instagram-style round crop and cover fit make logos and avatars look clean and centered.
            </p>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1 space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Country *
              </label>
              <select
                value={
                  COUNTRIES.find(
                    (c) =>
                      c.name.toLowerCase() === (org.country || '').toLowerCase() ||
                      c.code.toLowerCase() === (org.country || '').toLowerCase()
                  )?.code || 'IN'
                }
                onChange={(e) => {
                  const profile = getCountryProfile(e.target.value);
                  setOrg((prev) => ({
                    ...prev,
                    country: profile.name,
                    default_currency: profile.defaultCurrency,
                    tax_system: profile.taxSystem,
                    tax_id_label: profile.taxLabel,
                    goods_classification_label: profile.goodsClassificationLabel,
                    service_classification_label: profile.serviceClassificationLabel,
                    default_tax_rate: profile.defaultTaxRate,
                  }));
                }}
                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Company Name *"
                value={org.name}
                onChange={(e) => setOrg({ ...org, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Business Type / Industry"
              value={org.business_type || ''}
              onChange={(e) => setOrg({ ...org, business_type: e.target.value })}
            />
            <Input
              label={org.tax_id_label || 'Tax Registration / GST Number'}
              placeholder="e.g. GSTIN, TRN, or Tax ID"
              value={org.gst_vat_number || ''}
              onChange={(e) => setOrg({ ...org, gst_vat_number: e.target.value })}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* Country-Adaptive Tax & Item Classification Configuration */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-500" />
                <span>Tax System & Item Classification ({org.country || 'India'})</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automatically adapts classification codes (HSN/SAC for India, HS Code for UAE, SKU for others) and tax rates without hardcoding India GST for other countries.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Tax System
              </label>
              <select
                value={org.tax_system || 'GST'}
                onChange={(e) => setOrg({ ...org, tax_system: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="GST">GST (Goods and Services Tax)</option>
                <option value="VAT">VAT (Value Added Tax)</option>
                <option value="SALES_TAX">Sales Tax</option>
                <option value="CUSTOM">Custom / International</option>
              </select>
            </div>

            <Input
              label="Goods Classification Label"
              placeholder="e.g. HSN Code or HS Code"
              value={org.goods_classification_label || ''}
              onChange={(e) => setOrg({ ...org, goods_classification_label: e.target.value })}
            />

            <Input
              label="Services Classification Label"
              placeholder="e.g. SAC Code or Service Category"
              value={org.service_classification_label || ''}
              onChange={(e) => setOrg({ ...org, service_classification_label: e.target.value })}
            />
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-800 dark:text-indigo-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <span>Current Configuration Profile:</span>
              <span className="font-bold underline">{org.country || 'India'}</span>
            </p>
            <p className="text-[11px] text-indigo-700/90 dark:text-indigo-400">
              Goods items will prompt for <span className="font-bold">{org.goods_classification_label || 'HSN Code'}</span>. Services items will prompt for <span className="font-bold">{org.service_classification_label || 'SAC Code'}</span>. Invoices and quotations will display these fields according to this company profile.
            </p>
          </div>
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
                Create staff accounts with a temporary password. When staff log in, they will be prompted to set up their own password.
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
                    setIsAddStaffOpen(true);
                  }}
                  className="gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
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

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                          user.email_confirmed
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {user.email_confirmed ? 'Verified' : 'Temp Password'}
                      </span>

                      {canDelete && (
                        <>
                          {!user.email_confirmed && (
                            <button
                              type="button"
                              onClick={() => handleResetStaffPassword(user.id, user.email)}
                              disabled={deletingUserId === user.id}
                              className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 font-medium transition-colors"
                              title="Set or Reset Temporary Password"
                            >
                              <span>Set Temp Password</span>
                            </button>
                          )}

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
                        </>
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

      {/* Update Password Section (For Logged-in Admin, Owner, and Staff Accounts) */}
      <form
        onSubmit={handleUpdateOwnPassword}
        className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-4"
      >
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
            Update Account Password
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Change the login password for your currently signed-in account ({currentUserEmail}).
          </p>
        </div>

        {passwordChangeMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{passwordChangeMsg}</span>
          </div>
        )}

        {passwordChangeError && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
            {passwordChangeError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="New Password *"
            type="password"
            value={myNewPassword}
            onChange={(e) => setMyNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
          <Input
            label="Confirm New Password *"
            type="password"
            value={myConfirmPassword}
            onChange={(e) => setMyConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
            minLength={6}
            required
          />
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary" isLoading={isChangingMyPassword} className="gap-2 shadow-sm">
            <Save className="h-4 w-4" />
            <span>Update Password</span>
          </Button>
        </div>
      </form>

      {/* Add Staff Member Modal (Direct Password Setup Only) */}
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
                onClick={() => setIsAddStaffOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDirectCreateStaff} className="p-6 space-y-4">
              {staffError && (
                <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl">
                  {staffError}
                </div>
              )}

              <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 p-3 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Set a temporary password to create the account immediately. When the staff member logs in, they will be prompted to set up their own password.
                </span>
              </div>

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
          </div>
        </div>
      )}
    </div>
  );
}
