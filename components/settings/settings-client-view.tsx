'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Organization, CurrencyCode, PaymentDisplayMode } from '@/types/database';
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
  CreditCard,
  Landmark,
  QrCode,
  Bitcoin,
  Smartphone,
  Eye,
  FlaskConical,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  ArrowRight,
  LifeBuoy,
  Crop,
  Banknote,
  Search,
  MessageSquare,
  Bell,
  Brain,
} from 'lucide-react';
import { IOSSwitch } from '@/components/ui/ios-switch';
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
import { INDIAN_STATES, validateGstin, getStateCodeByName, getStateNameByCode } from '@/lib/tax/india-gst';
import { UAE_EMIRATES, isValidUaeTrn, sanitizeUaeTrn } from '@/lib/tax/uae-tax';
import { isGccCountry, DocumentLanguage } from '@/lib/tax/gcc-translations';
import { formatCurrency, getCurrencySymbol, roundCurrency } from '@/lib/quotations/calculations';
import { COUNTRY_CODES } from '@/lib/country-codes';
import { DEFAULT_WHATSAPP_TEMPLATES } from '@/lib/whatsapp/automation';
import { TrainingGuideModal } from '@/components/training/training-guide-modal';
import { SupportView } from '@/components/support/support-view';
import { AppearanceSettingsView } from '@/components/settings/appearance-settings-view';
import { LogoEditorModal } from '@/components/settings/logo-editor-modal';
import { WhatsAppIntegrationView } from '@/components/settings/whatsapp-integration-view';
import { NotificationSettingsView } from '@/components/settings/notification-settings-view';
import { StaffManagementView } from '@/components/settings/staff/staff-management-view';
import { BusinessMemorySettingsView } from '@/components/settings/ai/business-memory-settings-view';
import { isOwnerOrAdminRole } from '@/types/staff';

export function SettingsClientView({
  initialOrganization,
  currentUserRole = 'OWNER',
  currentUserId = '',
  currentUserEmail = '',
  initialTab = 'general',
}: {
  initialOrganization: Organization;
  currentUserRole?: string;
  currentUserId?: string;
  currentUserEmail?: string;
  initialTab?: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'appearance' | 'support' | 'integrations' | 'notifications' | 'ai-memory'>(
    initialTab === 'team'
      ? 'team'
      : initialTab === 'support'
      ? 'support'
      : initialTab === 'appearance'
      ? 'appearance'
      : initialTab === 'integrations' || initialTab === 'whatsapp'
      ? 'integrations'
      : initialTab === 'notifications'
      ? 'notifications'
      : initialTab === 'ai-memory' || initialTab === 'ai'
      ? 'ai-memory'
      : 'general'
  );

  useEffect(() => {
    if (initialTab === 'team') {
      setActiveTab('team');
    } else if (initialTab === 'support') {
      setActiveTab('support');
    } else if (initialTab === 'appearance') {
      setActiveTab('appearance');
    } else if (initialTab === 'ai-memory' || initialTab === 'ai') {
      setActiveTab('ai-memory');
    } else if (initialTab === 'integrations' || initialTab === 'whatsapp') {
      setActiveTab('integrations');
    } else if (initialTab === 'notifications') {
      setActiveTab('notifications');
    } else {
      setActiveTab('general');
    }
  }, [initialTab]);

  const [org, setOrg] = useState<Organization>(() => ({
    ...initialOrganization,
    default_tax_mode: initialOrganization.default_tax_mode || 'exclusive',
    default_currency: initialOrganization.default_currency || 'INR',
  }));
  const [savedOrgSnapshot, setSavedOrgSnapshot] = useState<string>(() =>
    JSON.stringify({
      ...initialOrganization,
      default_tax_mode: initialOrganization.default_tax_mode || 'exclusive',
      default_currency: initialOrganization.default_currency || 'INR',
    })
  );
  const [justSaved, setJustSaved] = useState(false);
  const hasUnsavedChanges = JSON.stringify(org) !== savedOrgSnapshot;

  const initialParsed = parseLogoUrl(initialOrganization.logo_url);
  const [logoShape, setLogoShape] = useState<LogoShape>(initialParsed.shape);
  const [logoFit, setLogoFit] = useState<LogoFit>(initialParsed.fit);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isExtractingColor, setIsExtractingColor] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logged-in user password change state
  const [myNewPassword, setMyNewPassword] = useState('');
  const [myConfirmPassword, setMyConfirmPassword] = useState('');
  const [isChangingMyPassword, setIsChangingMyPassword] = useState(false);
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<string | null>(null);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);

  const [isUploadingDefaultUpiQr, setIsUploadingDefaultUpiQr] = useState(false);
  const [isUploadingDefaultCryptoQr, setIsUploadingDefaultCryptoQr] = useState(false);

  // Automated GSTIN / Tax ID Verification & Auto-fill
  const [isFetchingGst, setIsFetchingGst] = useState(false);
  const [gstFetchSuccess, setGstFetchSuccess] = useState<string | null>(null);
  const [gstFetchError, setGstFetchError] = useState<string | null>(null);

  const handleFetchGstDetails = async (taxNumToFetch?: string) => {
    const query = (taxNumToFetch || org.gstin || org.gst_vat_number || '').trim().toUpperCase();
    if (!query) {
      setGstFetchError('Please enter a GSTIN or Tax ID first.');
      return;
    }
    setIsFetchingGst(true);
    setGstFetchError(null);
    setGstFetchSuccess(null);
    try {
      const res = await fetch(
        `/api/lookup/tax-id?query=${encodeURIComponent(query)}&country=${encodeURIComponent(org.country || '')}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify Tax ID');

      setOrg((prev) => ({
        ...prev,
        gst_vat_number: data.taxNumber || query,
        gstin: data.country === 'India' ? (data.taxNumber || query) : prev.gstin,
        gst_registered: data.country === 'India' ? true : prev.gst_registered,
        name: data.companyName || prev.name,
        business_type: data.entityType || prev.business_type,
        state: data.state || prev.state,
        business_state: data.state || prev.business_state,
        state_code: data.stateCode || prev.state_code,
        city: data.city || prev.city,
        address_line1: data.address || prev.address_line1,
        postal_code: data.postalCode || prev.postal_code,
      }));

      setGstFetchSuccess(
        data.companyName
          ? `✓ Verified from portal: ${data.companyName} (${data.state || data.country})`
          : `✓ State identified: ${data.state || data.country} (Code ${data.stateCode || ''})`
      );
      setTimeout(() => setGstFetchSuccess(null), 6000);
    } catch (err: any) {
      setGstFetchError(err.message || 'Lookup failed. You can still fill details manually.');
    } finally {
      setIsFetchingGst(false);
    }
  };

  // Interactive Training & Workflow Guides
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  const handleSaveLogoModal = async (newFormattedUrl: string) => {
    setOrg((prev) => ({ ...prev, logo_url: newFormattedUrl }));
    const parsed = parseLogoUrl(newFormattedUrl);
    setLogoShape(parsed.shape);
    setLogoFit(parsed.fit);

    // Auto extract color if possible
    try {
      const color = await extractDominantColor(parsed.cleanUrl);
      if (color) {
        setOrg((prev) => ({ ...prev, brand_color: color }));
        document.documentElement.style.setProperty('--brand-color', color);
      }
    } catch {}

    // Save to server
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...org,
        logo_url: newFormattedUrl,
      }),
    });

    setSuccessMsg('Logo updated successfully!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDefaultUpiQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('QR code image must be under 5MB.');
      return;
    }

    try {
      setIsUploadingDefaultUpiQr(true);
      const formData = new FormData();
      formData.append('qr', file);

      const res = await fetch('/api/upload/qr', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload QR code');

      const uploadedUrl = data.qr_url;
      const updatedUpiDetails = {
        ...(org.default_upi_details || { upi_id: '' }),
        qr_code_url: uploadedUrl,
      };

      setOrg((prev) => ({
        ...prev,
        default_upi_details: updatedUpiDetails,
      }));

      // Immediately auto-save to server
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...org,
          default_upi_details: updatedUpiDetails,
        }),
      });

      setSuccessMsg('UPI QR code uploaded and saved!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Error uploading QR code');
    } finally {
      setIsUploadingDefaultUpiQr(false);
      e.target.value = '';
    }
  };

  const handleDefaultCryptoQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('QR code image must be under 5MB.');
      return;
    }

    try {
      setIsUploadingDefaultCryptoQr(true);
      const formData = new FormData();
      formData.append('qr', file);

      const res = await fetch('/api/upload/qr', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload QR code');

      const uploadedUrl = data.qr_url;
      const updatedCryptoDetails = {
        ...(org.default_crypto_details || { currency: 'USDT', network: 'TRC20', wallet_address: '' }),
        qr_code_url: uploadedUrl,
      };

      setOrg((prev) => ({
        ...prev,
        default_crypto_details: updatedCryptoDetails,
      }));

      // Immediately auto-save to server
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...org,
          default_crypto_details: updatedCryptoDetails,
        }),
      });

      setSuccessMsg('Crypto QR code uploaded and saved!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Error uploading QR code');
    } finally {
      setIsUploadingDefaultCryptoQr(false);
      e.target.value = '';
    }
  };

  const handleSelectDefaultPaymentMode = (mode: PaymentDisplayMode) => {
    let showBank = true;
    let showUpi = true;
    let showCrypto = false;

    if (mode === 'BANK_ONLY') {
      showBank = true;
      showUpi = false;
      showCrypto = false;
    } else if (mode === 'UPI_ONLY') {
      showBank = false;
      showUpi = true;
      showCrypto = false;
    } else if (mode === 'CRYPTO_ONLY') {
      showBank = false;
      showUpi = false;
      showCrypto = true;
    } else if (mode === 'ALL') {
      showBank = true;
      showUpi = true;
      showCrypto = true;
    } else if (mode === 'BOTH') {
      showBank = true;
      showUpi = true;
      showCrypto = false;
    }

    setOrg((prev) => ({
      ...prev,
      default_payment_display_mode: mode,
      default_show_bank_details: showBank,
      default_show_upi_details: showUpi,
      default_show_crypto_details: showCrypto,
    }));
  };

  // Synchronize CSS variable and data-accent when brand color changes
  useEffect(() => {
    if (org.brand_color) {
      document.documentElement.style.setProperty('--brand-color', org.brand_color);
      const root = document.getElementById('quoteflow-dashboard-root');
      if (root) {
        root.style.setProperty('--brand-color', org.brand_color);
      }
      let matchedAccent = 'purple';
      const c = org.brand_color.toLowerCase();
      if (c === '#059669' || c.includes('059669') || c.includes('10b981') || c.includes('047857')) {
        matchedAccent = 'emerald';
      } else if (c === '#2563eb' || c.includes('2563eb') || c.includes('3b82f6')) {
        matchedAccent = 'blue';
      } else if (c === '#ea580c' || c.includes('ea580c') || c.includes('f97316')) {
        matchedAccent = 'orange';
      } else if (c === '#e11d48' || c.includes('e11d48') || c.includes('f43f5e')) {
        matchedAccent = 'rose';
      }
      document.documentElement.setAttribute('data-accent', matchedAccent);
      try {
        localStorage.setItem('quoteflow_brand_color', org.brand_color);
        const curCustom = localStorage.getItem('quoteflow-customization-v2');
        const parsed = curCustom ? JSON.parse(curCustom) : {};
        localStorage.setItem('quoteflow-customization-v2', JSON.stringify({ ...parsed, accentColor: matchedAccent }));
      } catch {}
    }
  }, [org.brand_color]);

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

  const saveSettingsPayload = async () => {
    setIsLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    setJustSaved(false);

    try {
      const payload = {
        ...org,
        default_tax_mode: org.default_tax_mode || 'exclusive',
        default_currency: org.default_currency || 'INR',
      };
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Settings couldn't be saved.");

      const savedOrg: Organization = {
        ...org,
        ...(data.organization || {}),
        default_tax_mode:
          data.organization?.default_tax_mode || org.default_tax_mode || 'exclusive',
        default_currency:
          data.organization?.default_currency || org.default_currency || 'INR',
      };

      setOrg(savedOrg);
      setSavedOrgSnapshot(JSON.stringify(savedOrg));
      setJustSaved(true);

      if (savedOrg.brand_color) {
        document.documentElement.style.setProperty('--brand-color', savedOrg.brand_color);
        const root = document.getElementById('quoteflow-dashboard-root');
        if (root) {
          root.style.setProperty('--brand-color', savedOrg.brand_color);
        }
        try {
          localStorage.setItem('quoteflow_brand_color', savedOrg.brand_color);
        } catch {}
      }

      try {
        window.dispatchEvent(
          new CustomEvent('quoteflow:org-settings-updated', { detail: savedOrg })
        );
      } catch {}

      setSuccessMsg('✓ Settings saved');
      router.refresh();
      setTimeout(() => {
        setSuccessMsg(null);
        setJustSaved(false);
      }, 3500);
    } catch (err: any) {
      setErrorMsg(err.message || "Settings couldn't be saved.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettingsPayload();
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

  const previewTaxRate = Number(org.default_tax_rate) > 0 ? Number(org.default_tax_rate) : 5;
  const previewBaseAmount = 5000;
  const exclusiveTaxPreview = roundCurrency((previewBaseAmount * previewTaxRate) / 100);
  const exclusiveTotalPreview = roundCurrency(previewBaseAmount + exclusiveTaxPreview);
  const inclusiveTaxablePreview = roundCurrency(previewBaseAmount / (1 + previewTaxRate / 100));
  const inclusiveTaxPreview = roundCurrency(previewBaseAmount - inclusiveTaxablePreview);

  return (
    <div className="space-y-6 max-w-4xl transition-colors">
      {/* Top Tab Switcher — only actual Settings categories */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setActiveTab('general');
              router.push('/settings?tab=general', { scroll: false });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'general'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building className="h-4 w-4" />
            <span>Organization & Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('appearance');
              router.push('/settings?tab=appearance', { scroll: false });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'appearance'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Appearance & Themes</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('team');
              router.push('/settings?tab=team', { scroll: false });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'team'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UsersIcon className="h-4 w-4" />
            <span>Team & Staff</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('integrations');
              router.push('/settings?tab=integrations', { scroll: false });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'integrations'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>WhatsApp Business</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('notifications');
              router.push('/settings?tab=notifications', { scroll: false });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'notifications'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Notifications &amp; AI Alerts</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('ai-memory');
              router.push('/settings?tab=ai-memory', { scroll: false });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ai-memory'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Brain className="h-4 w-4" />
            <span>QuoteFlow AI (Memory)</span>
          </button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2.5 flex-wrap">

        {activeTab === 'general' && isOwnerOrAdminRole(currentUserRole) && (
          <div className="flex items-center gap-2.5">
            {hasUnsavedChanges ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved changes
              </span>
            ) : justSaved ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Settings saved
              </span>
            ) : null}

            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isLoading}
              onClick={saveSettingsPayload}
              className="gap-1.5 shadow-xs text-xs font-bold"
            >
              {justSaved && !hasUnsavedChanges ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        )}
        </div>
      </div>

      {activeTab === 'support' ? (
        <div className="space-y-6">
          <SupportView />
        </div>
      ) : activeTab === 'appearance' ? (
        <div className="space-y-6">
          <AppearanceSettingsView
            initialBrandColor={org.brand_color || undefined}
            onBrandColorChange={(newColor) => setOrg((prev) => ({ ...prev, brand_color: newColor }))}
          />
        </div>
      ) : activeTab === 'team' ? (
        <div className="space-y-6">
          <StaffManagementView
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
          />
        </div>
      ) : activeTab === 'integrations' ? (
        <div className="space-y-6">
          <WhatsAppIntegrationView
            organization={org}
            userRole={currentUserRole}
          />
        </div>
      ) : activeTab === 'notifications' ? (
        <div className="space-y-6">
          <NotificationSettingsView />
        </div>
      ) : activeTab === 'ai-memory' ? (
        <div className="space-y-6">
          <BusinessMemorySettingsView />
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Organization & Quotation Settings
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Customize your company profile, brand logo & theme color, team members, currency, and tax defaults.
              </p>
            </div>
          </div>

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-3.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-3.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <span>Settings couldn&apos;t be saved: {errorMsg}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={saveSettingsPayload}
                isLoading={isLoading}
                className="h-7 px-3 text-xs border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/50 shrink-0"
              >
                Try Again
              </Button>
            </div>
          )}

          {!isOwnerOrAdminRole(currentUserRole) && (
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


        {/* Brand & Logo Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Palette className="h-5 w-5 text-indigo-500" />
                <span>Company Logo</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload and frame your official company logo. Use the editor to crop, zoom, and center.
              </p>
            </div>
          </div>

          <div className="space-y-4">
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
                    Live Header Fit
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
                        Workspace
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
                    onClick={() => setIsLogoModalOpen(true)}
                    disabled={isUploadingLogo}
                    className="gap-2 shadow-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Crop className="h-4 w-4" />
                    <span>{org.logo_url ? 'Edit Logo' : 'Upload & Edit Logo'}</span>
                  </Button>

                  {org.logo_url && (
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
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Supports <strong className="font-semibold text-slate-700 dark:text-slate-300">PNG, JPG, WebP, SVG</strong> (Max 5MB). Click Edit Logo to crop and resize.
                </p>
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

          {/* 1-Click GSTIN / Tax ID Auto-Fetch Bar */}
          {(() => {
            const countryClean = (org.country || org.business_country || '').trim().toLowerCase();
            const currencyClean = (org.default_currency || '').trim().toUpperCase();
            const isExplicitIndia = countryClean === 'india' || countryClean === 'in' || countryClean.includes('india');
            const isExplicitForeign = countryClean !== '' && !isExplicitIndia;
            const isForeignCurrency = currencyClean !== '' && currencyClean !== 'INR';
            const isIndia = isExplicitIndia || (!isExplicitForeign && !isForeignCurrency && (org.billing_region === 'INDIA' || currencyClean === 'INR'));

            return (
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                  <div className="flex-1 w-full space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                        {isIndia
                          ? 'GSTIN (GOODS & SERVICES TAX - INDIA ONLY)'
                          : (org.tax_id_label || 'TAX IDENTIFICATION NUMBER (VAT / TRN)')}
                      </label>
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                        {isIndia
                          ? 'Enter 15-character GSTIN first to auto-fill company details'
                          : 'Enter Tax ID / VAT number to auto-fill details'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={org.gstin || org.gst_vat_number || ''}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setOrg({ ...org, gst_vat_number: val, gstin: val });
                          if (val.length === 15 && isIndia) {
                            handleFetchGstDetails(val);
                          }
                        }}
                        placeholder={
                          isIndia
                            ? 'e.g. 32AABCU9603R1ZM (15-character Indian GSTIN)'
                            : (org.tax_id_label ? `e.g. ${org.tax_id_label}` : 'e.g. TRN or VAT number')
                        }
                        className="h-10 w-full rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => handleFetchGstDetails()}
                    disabled={isFetchingGst}
                    className="h-10 px-4 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 gap-1.5 shadow-xs"
                  >
                    {isFetchingGst ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    <span>{isFetchingGst ? 'Verifying...' : 'Auto-Fetch Details'}</span>
                  </Button>
                </div>


                {gstFetchSuccess && (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{gstFetchSuccess}</span>
                  </p>
                )}
                {gstFetchError && (
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {gstFetchError}
                  </p>
                )}
              </div>
            );
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-4 space-y-1">
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
                    default_currency: profile.defaultCurrency as CurrencyCode,
                    tax_system: profile.taxSystem,
                    tax_id_label: profile.taxLabel,
                    goods_classification_label: profile.goodsClassificationLabel,
                    service_classification_label: profile.serviceClassificationLabel,
                    default_tax_rate: profile.defaultTaxRate,
                    default_gst_rate: profile.defaultTaxRate,
                  }));
                }}
                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.defaultCurrency})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3 space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Business Currency *
              </label>
              <select
                value={org.default_currency || 'INR'}
                onChange={(e) =>
                  setOrg({ ...org, default_currency: e.target.value as CurrencyCode })
                }
                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="AED">AED (د.إ) - UAE Dirham</option>
                <option value="SAR">SAR (ر.س) - Saudi Riyal</option>
                <option value="KWD">KWD (د.ك) - Kuwaiti Dinar</option>
                <option value="CAD">CAD (C$) - Canadian Dollar</option>
                <option value="AUD">AUD (A$) - Australian Dollar</option>
                <option value="SGD">SGD (S$) - Singapore Dollar</option>
                <option disabled>──────────</option>
                {Array.from(new Set(COUNTRIES.map((c) => c.defaultCurrency).filter(Boolean)))
                  .sort()
                  .filter((c) => !['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'KWD', 'CAD', 'AUD', 'SGD'].includes(c))
                  .map((curr) => (
                    <option key={curr} value={curr}>
                      {curr} ({getCurrencySymbol(curr).trim()})
                    </option>
                  ))}
              </select>
            </div>

            <div className="sm:col-span-5">
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
            {(() => {
              const countryClean = (org.country || org.business_country || '').trim().toLowerCase();
              const isIndia = countryClean === 'india' || countryClean === 'in' || countryClean.includes('india') || org.default_currency === 'INR';
              return (
                <Input
                  label={isIndia ? 'GSTIN (India Only)' : (org.tax_id_label || 'Tax Registration / VAT Number')}
                  placeholder={isIndia ? 'e.g. 32AABCU9603R1ZM' : 'e.g. TRN, VAT, or Tax ID'}
                  value={org.gst_vat_number || ''}
                  onChange={(e) => setOrg({ ...org, gst_vat_number: e.target.value, gstin: e.target.value })}
                />
              );
            })()}
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



        {/* Country-Adaptive Tax, Calculation Mode & India GST Configuration */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-500" />
                <span>
                  {(() => {
                    const countryClean = (org.country || org.business_country || '').trim().toLowerCase();
                    const currencyClean = (org.default_currency || '').trim().toUpperCase();
                    const isExplicitIndia = countryClean === 'india' || countryClean === 'in' || countryClean.includes('india');
                    const isExplicitForeign = countryClean !== '' && !isExplicitIndia;
                    const isForeignCurrency = currencyClean !== '' && currencyClean !== 'INR';
                    const isIndia = isExplicitIndia || (!isExplicitForeign && !isForeignCurrency && (org.billing_region === 'INDIA' || currencyClean === 'INR'));
                    const profile = getCountryProfile(org.country || org.business_country || (isIndia ? 'IN' : 'AE'));
                    return isIndia
                      ? `Tax Settings & India GST Breakdown (${org.country || 'India'})`
                      : `${profile.name} ${profile.taxSystem} Settings (${org.country || 'International'})`;
                  })()}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure Tax Exclusive vs Tax Inclusive calculation mode, registration details, and classification codes.
              </p>
            </div>
          </div>

          {/* 1. Tax Calculation Mode: Compact Exclusive vs Inclusive Selection Cards */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Default Tax Calculation Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              {(() => {
                const isExclusive = (org.default_tax_mode || 'exclusive') === 'exclusive';
                const isInclusive = org.default_tax_mode === 'inclusive';
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setOrg((prev) => ({ ...prev, default_tax_mode: 'exclusive' }))}
                      className={`text-left px-3.5 py-2.5 rounded-xl border transition-all ${
                        isExclusive
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/35 ring-1 ring-indigo-600/30 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-4 w-4 rounded flex items-center justify-center text-[11px] font-bold transition-colors ${
                              isExclusive
                                ? 'bg-indigo-600 text-white'
                                : 'border border-slate-300 dark:border-slate-600 text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            Tax Exclusive
                          </span>
                        </div>
                        {isExclusive && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-6">
                        Tax added to price
                      </p>
                      <div className="mt-1.5 pt-1.5 pl-6 border-t border-slate-200/60 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                        {formatCurrency(previewBaseAmount, org.default_currency)} + {previewTaxRate}% ={' '}
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(exclusiveTotalPreview, org.default_currency)}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrg((prev) => ({ ...prev, default_tax_mode: 'inclusive' }))}
                      className={`text-left px-3.5 py-2.5 rounded-xl border transition-all ${
                        isInclusive
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/35 ring-1 ring-indigo-600/30 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-4 w-4 rounded flex items-center justify-center text-[11px] font-bold transition-colors ${
                              isInclusive
                                ? 'bg-indigo-600 text-white'
                                : 'border border-slate-300 dark:border-slate-600 text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            Tax Inclusive
                          </span>
                        </div>
                        {isInclusive && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-6">
                        Tax included in price
                      </p>
                      <div className="mt-1.5 pt-1.5 pl-6 border-t border-slate-200/60 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                        {formatCurrency(inclusiveTaxablePreview, org.default_currency)} +{' '}
                        {formatCurrency(inclusiveTaxPreview, org.default_currency)} ({previewTaxRate}%) ={' '}
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(previewBaseAmount, org.default_currency)}
                        </span>
                      </div>
                    </button>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
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

          {/* India GST Automatic Breakdown Settings OR Country Tax/VAT Settings */}
          {(() => {
            const countryClean = (org.country || org.business_country || '').trim().toLowerCase();
            const currencyClean = (org.default_currency || '').trim().toUpperCase();
            const isExplicitIndia = countryClean === 'india' || countryClean === 'in' || countryClean.includes('india');
            const isExplicitForeign = countryClean !== '' && !isExplicitIndia;
            const isForeignCurrency = currencyClean !== '' && currencyClean !== 'INR';
            const isIndia = isExplicitIndia || (!isExplicitForeign && !isForeignCurrency && (org.billing_region === 'INDIA' || currencyClean === 'INR'));
            const profile = getCountryProfile(org.country || org.business_country || (isIndia ? 'IN' : 'AE'));

            if (isIndia) {
              return (
                <div className="rounded-xl border border-indigo-200/70 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>🇮🇳 India GST Automatic Breakdown (CGST / SGST / IGST)</span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Automatically splits GST into CGST + SGST for intra-state supply or IGST for inter-state supply based on Place of Supply.
                      </p>
                    </div>
                    <IOSSwitch
                      checked={org.gst_registered ?? true}
                      onChange={(checked) => setOrg({ ...org, gst_registered: checked })}
                    />
                  </div>

                  {(org.gst_registered ?? true) && (
                    <div className="space-y-4 pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <Input
                            label="Company GSTIN (15-Char)"
                            placeholder="27AAPFU0939F1ZV"
                            value={org.gstin || org.gst_vat_number || ''}
                            onChange={(e) => {
                              const upper = e.target.value.toUpperCase().replace(/\s+/g, '');
                              const code = upper.length >= 2 ? upper.slice(0, 2) : '';
                              const stateName = code ? getStateNameByCode(code) : undefined;
                              setOrg({
                                ...org,
                                gstin: upper,
                                gst_vat_number: upper,
                                ...(stateName
                                  ? {
                                      business_state: stateName,
                                      state: stateName,
                                      state_code: code,
                                    }
                                  : {}),
                              });
                            }}
                          />
                          {(org.gstin || org.gst_vat_number) &&
                            !validateGstin(org.gstin || org.gst_vat_number).valid && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                                {validateGstin(org.gstin || org.gst_vat_number).error}
                              </p>
                            )}
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Business State (Origin)
                          </label>
                          <select
                            value={org.business_state || org.state || ''}
                            onChange={(e) => {
                              const st = e.target.value;
                              const code = getStateCodeByName(st) || '';
                              setOrg({
                                ...org,
                                business_state: st,
                                state: st,
                                state_code: code,
                              });
                            }}
                            className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="">Select Business State...</option>
                            {INDIAN_STATES.map((st) => (
                              <option key={st.code} value={st.name}>
                                {st.name} ({st.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <Input
                          label="State Code"
                          placeholder="e.g. 27"
                          value={org.state_code || getStateCodeByName(org.business_state || org.state) || ''}
                          onChange={(e) => setOrg({ ...org, state_code: e.target.value })}
                        />

                        <div className="space-y-1">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Default GST Rate
                          </label>
                          <select
                            value={org.default_gst_rate ?? org.default_tax_rate ?? 18}
                            onChange={(e) => {
                              const r = parseFloat(e.target.value) || 0;
                              setOrg({ ...org, default_gst_rate: r, default_tax_rate: r });
                            }}
                            className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value={0}>0% (Nil Rated / Exempt)</option>
                            <option value={5}>5% GST</option>
                            <option value={12}>12% GST</option>
                            <option value={18}>18% GST (Standard)</option>
                            <option value={28}>28% GST</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Enable HSN / SAC Code Columns on Documents
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Displays HSN/SAC classification codes on quotations, invoices, and PDFs.
                          </p>
                        </div>
                        <IOSSwitch
                          checked={org.hsn_sac_enabled ?? true}
                          onChange={(checked) => setOrg({ ...org, hsn_sac_enabled: checked })}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-indigo-900 dark:text-indigo-200 bg-white/70 dark:bg-slate-900/70 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                        <div>
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">• Intra-State Supply (Same State):</span>{' '}
                          Customer Place of Supply matches {org.business_state || org.state || 'Business State'} → Splits 50/50 into <span className="font-semibold">CGST + SGST</span>.
                        </div>
                        <div>
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">• Inter-State Supply (Different State):</span>{' '}
                          Customer Place of Supply differs from {org.business_state || org.state || 'Business State'} → Applies full <span className="font-semibold">IGST</span>.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div className="rounded-xl border border-indigo-200/70 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>{profile.flag} {profile.name} {profile.taxSystem} Settings ({profile.taxLabel.split('(')[0].trim()})</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure business {profile.taxSystem} registration, business location, and default tax rate for {profile.name}. Indian CGST/SGST rules are strictly disabled.
                    </p>
                  </div>
                  <IOSSwitch
                    checked={org.gst_registered ?? true}
                    onChange={(checked) => setOrg({ ...org, gst_registered: checked })}
                  />
                </div>

                {(org.gst_registered ?? true) && (
                  <div className="space-y-4 pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <Input
                          label={profile.taxLabel}
                          placeholder={profile.isUaeVat ? 'e.g. 100234567800003' : 'e.g. Tax / VAT ID'}
                          value={org.gst_vat_number || org.gstin || ''}
                          onChange={(e) => {
                            const val = profile.isUaeVat ? sanitizeUaeTrn(e.target.value) : e.target.value.trim();
                            setOrg({
                              ...org,
                              gst_vat_number: val,
                              gstin: val,
                            });
                          }}
                        />
                        {profile.isUaeVat && Boolean(org.gst_vat_number || org.gstin) && !isValidUaeTrn(org.gst_vat_number || org.gstin) && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                            UAE TRN must be exactly 15 digits (e.g. 100234567800003). Currently {(org.gst_vat_number || org.gstin || '').length} digits.
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                          Printed on customer invoices and quotations as your official {profile.taxSystem} registration number.
                        </p>
                      </div>

                      {profile.isUaeVat ? (
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Emirate (Origin / Place of Supply)
                          </label>
                          <select
                            value={org.business_state || org.state || ''}
                            onChange={(e) =>
                              setOrg({
                                ...org,
                                business_state: e.target.value,
                                state: e.target.value,
                              })
                            }
                            className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="">Select Emirate...</option>
                            {UAE_EMIRATES.map((em) => (
                              <option key={em.code} value={em.name}>
                                {em.name} (Form 201 Box {em.boxIndex})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <Input
                          label="Business Location (City / Emirate / State)"
                          placeholder="e.g. London, California, Berlin"
                          value={org.business_state || org.state || ''}
                          onChange={(e) =>
                            setOrg({
                              ...org,
                              business_state: e.target.value,
                              state: e.target.value,
                            })
                          }
                        />
                      )}

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Default {profile.taxSystem} Rate
                        </label>
                        <select
                          value={org.default_tax_rate ?? org.default_gst_rate ?? profile.defaultTaxRate}
                          onChange={(e) => {
                            const r = parseFloat(e.target.value) || 0;
                            setOrg({ ...org, default_tax_rate: r, default_gst_rate: r });
                          }}
                          className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          {profile.taxRates.map((tr) => (
                            <option key={tr.label} value={tr.rate}>
                              {tr.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Enable {profile.goodsClassificationLabel} / {profile.serviceClassificationLabel} Columns on Documents
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Displays international item classification codes on quotations, invoices, and PDFs.
                        </p>
                      </div>
                      <IOSSwitch
                        checked={org.hsn_sac_enabled ?? true}
                        onChange={(checked) => setOrg({ ...org, hsn_sac_enabled: checked })}
                      />
                    </div>

                    {profile.isUaeVat ? (
                      <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 space-y-2 text-xs">
                        <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
                          <span>🇦🇪 UAE E-Invoicing System (EIS) & Peppol PINT-AE Readiness</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100 font-semibold uppercase tracking-wide">
                            Compliant
                          </span>
                        </div>
                        <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed text-[11px]">
                          QuoteFlow generates compliant 15-digit TRN invoices, Box 1a–1g Emirate breakdowns for UAE VAT Form 201, and structured Peppol PINT-AE UBL 2.1 XML files ready for FTA-accredited ASP e-delivery.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-indigo-900 dark:text-indigo-200 bg-white/70 dark:bg-slate-900/70 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                        <div>
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">• Clean International Invoicing:</span>{' '}
                          Quotes and invoices display a single clean <span className="font-semibold">{profile.taxSystem} {org.default_tax_rate ?? profile.defaultTaxRate}%</span> line. Indian dual GST components (CGST/SGST/IGST) are strictly excluded.
                        </div>
                        <div>
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">• Classification Codes:</span>{' '}
                          Classification headers automatically adapt to <span className="font-semibold">{profile.goodsClassificationLabel}</span> and <span className="font-semibold">{profile.serviceClassificationLabel}</span> across all client views.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* GCC Document Language Selection (Arabic / English / Both) */}
        {isGccCountry(org.country || org.business_country, org.default_currency) && (
          <div className="rounded-2xl border border-sky-200/80 dark:border-sky-900/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  <span>Document Display Language / لغة عرض المستندات (GCC)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select how quotations, tax invoices, and client portals display in GCC markets (Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman).
                </p>
              </div>
              <span className="self-start sm:self-auto text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                GCC Compliance
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Both (Bilingual English / Arabic) */}
              <button
                type="button"
                onClick={() => setOrg({ ...org, document_language: 'both' })}
                className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  (org.document_language || 'both') === 'both'
                    ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/30 ring-2 ring-sky-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>🌐 Both (Bilingual)</span>
                    </span>
                    {(org.document_language || 'both') === 'both' && (
                      <CheckCircle2 className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">English &amp; العربية</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    Dual side-by-side labels (e.g. <em>Tax Invoice / فاتورة ضريبية</em>). Fully compliant with Saudi ZATCA and UAE FTA e-invoicing standards.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] font-medium text-sky-600 dark:text-sky-400">
                  Recommended for GCC
                </div>
              </button>

              {/* English Only */}
              <button
                type="button"
                onClick={() => setOrg({ ...org, document_language: 'en' })}
                className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  org.document_language === 'en'
                    ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/30 ring-2 ring-sky-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>🇬🇧 English Only</span>
                    </span>
                    {org.document_language === 'en' && (
                      <CheckCircle2 className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">English</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    Displays invoices, estimates, and emails strictly with English titles and terminology. Suitable for international multinational accounts.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] font-medium text-slate-500">
                  International standard
                </div>
              </button>

              {/* Arabic Only */}
              <button
                type="button"
                onClick={() => setOrg({ ...org, document_language: 'ar' })}
                className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  org.document_language === 'ar'
                    ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/30 ring-2 ring-sky-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>🇸🇦 العربية (Arabic Only)</span>
                    </span>
                    {org.document_language === 'ar' && (
                      <CheckCircle2 className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">العربية فقط</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    Renders titles, line item headers, VAT summaries, and terms solely in formal Arabic. Ideal for domestic public and government tenders.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] font-medium text-slate-500">
                  Domestic Arabic
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Quotation Numbering & Defaults */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Quotation Defaults</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Quotation Number Prefix"
              value={org.quotation_prefix}
              onChange={(e) => setOrg({ ...org, quotation_prefix: e.target.value })}
              placeholder="Q-"
            />

            <Input
              label="Invoice Number Prefix"
              value={org.invoice_prefix || ''}
              onChange={(e) => setOrg({ ...org, invoice_prefix: e.target.value })}
              placeholder="INV"
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
                <option value="AED">AED (د.إ)</option>
                <option value="SAR">SAR (ر.س)</option>
                <option value="KWD">KWD (د.ك)</option>
                <option value="CAD">CAD (CA$)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="SGD">SGD (S$)</option>
              </select>
            </div>

            <Input
              label="Default Tax Rate (%)"
              type="number"
              min="0"
              max="100"
              value={org.default_tax_rate}
              onChange={(e) => {
                const r = parseFloat(e.target.value) || 0;
                setOrg({ ...org, default_tax_rate: r, default_gst_rate: r });
              }}
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

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={org.require_full_payment_for_invoice ?? true}
                onChange={(e) =>
                  setOrg({ ...org, require_full_payment_for_invoice: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                  Require 100% Full Payment for Commercial Tax Invoice Generation
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  When enabled, official commercial tax invoices are strictly held until the quotation is marked as 100% fully paid. Clients making advance payments (e.g. 10%, 20%, 50%) can download official verified Payment Receipts, and will see a note indicating their Tax Invoice will be generated upon full payment settlement.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Default Payment Methods & Remittance Settings Card */}
        {(() => {
          const isIndia = (org.business_country || '').toUpperCase() === 'IN' ||
            (org.country || '').toLowerCase() === 'india' ||
            (org.country || '').toUpperCase() === 'IN' ||
            org.billing_region === 'INDIA' ||
            org.default_currency === 'INR';

          return (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-5">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-indigo-500" />
                  <span>Default Payment Methods & Remittance Settings</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isIndia
                    ? 'Configure company bank remittance details, domestic UPI ID & QR code (India), and cash payment options. These will be pre-filled on every new quotation automatically.'
                    : 'Configure company bank remittance details (IBAN/SWIFT), online payment link (Stripe, PayPal, Wise), international crypto wallets, and cash instructions. These will be pre-filled on every new quotation automatically.'}
                </p>
              </div>

              {/* Quick Selection Pills */}
              <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs">
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                    Payment Option Selection
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Turn switches ON to expand and enter payment details. Switched OFF methods remain hidden.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setOrg((prev) => ({
                        ...prev,
                        default_show_bank_details: true,
                        default_show_upi_details: isIndia,
                        default_show_payment_link: !isIndia,
                        default_show_cash_details: true,
                        default_show_crypto_details: true,
                        accepted_payment_methods: isIndia
                          ? ['BANK_TRANSFER', 'UPI', 'CASH', 'CRYPTO']
                          : ['BANK_TRANSFER', 'PAYMENT_LINK', 'CASH', 'CRYPTO'],
                        default_payment_display_mode: 'ALL',
                      }));
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 shadow-2xs"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrg((prev) => ({
                        ...prev,
                        default_show_bank_details: true,
                        default_show_upi_details: isIndia,
                        default_show_payment_link: !isIndia,
                        default_show_cash_details: false,
                        default_show_crypto_details: false,
                        accepted_payment_methods: isIndia
                          ? ['BANK_TRANSFER', 'UPI']
                          : ['BANK_TRANSFER', 'PAYMENT_LINK'],
                        default_payment_display_mode: 'BOTH',
                      }));
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 shadow-2xs"
                  >
                    {isIndia ? 'Bank + UPI' : 'Bank + Payment Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrg((prev) => ({
                        ...prev,
                        default_show_bank_details: false,
                        default_show_upi_details: false,
                        default_show_payment_link: false,
                        default_show_cash_details: false,
                        default_show_crypto_details: false,
                        accepted_payment_methods: [],
                        default_payment_display_mode: 'CUSTOM',
                      }));
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 hover:bg-slate-100 shadow-2xs"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

          {/* Option 1: Bank Transfer / Wire */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-2xs transition-all">
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Bank Transfer / Wire Remittance</span>
                    {(org.default_show_bank_details ?? true) && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                        Active
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-400">Domestic &amp; international direct bank wire coordinates</p>
                </div>
              </div>

              <IOSSwitch
                checked={org.default_show_bank_details ?? true}
                onChange={(checked) =>
                  setOrg((prev) => ({
                    ...prev,
                    default_show_bank_details: checked,
                    default_payment_display_mode: 'CUSTOM',
                  }))
                }
                ariaLabel="Toggle Bank Transfer"
              />
            </div>

            {/* Collapsible Bank Fields */}
            {(org.default_show_bank_details ?? true) && (
              <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/20 space-y-3 animate-fade-in-up">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <Input
                    label="Bank Name"
                    value={org.default_bank_details?.bank_name || ''}
                    onChange={(e) =>
                      setOrg((prev) => ({
                        ...prev,
                        default_bank_details: {
                          ...(prev.default_bank_details || {}),
                          bank_name: e.target.value,
                        },
                      }))
                    }
                    placeholder="e.g. HDFC Bank, Emirates NBD, Chase"
                  />

                  <Input
                    label="Account Holder / Beneficiary Name"
                    value={org.default_bank_details?.account_name || ''}
                    onChange={(e) =>
                      setOrg((prev) => ({
                        ...prev,
                        default_bank_details: {
                          ...(prev.default_bank_details || {}),
                          account_name: e.target.value,
                        },
                      }))
                    }
                    placeholder="e.g. SUBESH M LLC"
                  />

                  <Input
                    label="Account Number / IBAN"
                    value={org.default_bank_details?.account_number || ''}
                    onChange={(e) =>
                      setOrg((prev) => ({
                        ...prev,
                        default_bank_details: {
                          ...(prev.default_bank_details || {}),
                          account_number: e.target.value,
                        },
                      }))
                    }
                    placeholder="e.g. 50200012345678 or AE07033123456789"
                  />

                  <Input
                    label="IFSC Code (India)"
                    value={org.default_bank_details?.ifsc_code || ''}
                    onChange={(e) =>
                      setOrg((prev) => ({
                        ...prev,
                        default_bank_details: {
                          ...(prev.default_bank_details || {}),
                          ifsc_code: e.target.value.toUpperCase(),
                        },
                      }))
                    }
                    placeholder="e.g. HDFC0001234"
                  />

                  <Input
                    label="SWIFT / BIC Code (International)"
                    value={org.default_bank_details?.swift_code || ''}
                    onChange={(e) =>
                      setOrg((prev) => ({
                        ...prev,
                        default_bank_details: {
                          ...(prev.default_bank_details || {}),
                          swift_code: e.target.value.toUpperCase(),
                        },
                      }))
                    }
                    placeholder="e.g. HDFCINBBXXX"
                  />

                  <Input
                    label="Branch Name & City"
                    value={org.default_bank_details?.branch_name || ''}
                    onChange={(e) =>
                      setOrg((prev) => ({
                        ...prev,
                        default_bank_details: {
                          ...(prev.default_bank_details || {}),
                          branch_name: e.target.value,
                        },
                      }))
                    }
                    placeholder="e.g. Downtown Branch, Kochi"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Option 2: UPI ID & QR Code (India Only) OR Online Payment Link (International Only) */}
          {isIndia ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-2xs transition-all">
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>UPI ID &amp; QR Code (India)</span>
                      {(org.default_show_upi_details ?? true) && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                          Active
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400">Instant scan &amp; pay via Google Pay, PhonePe, Paytm, BHIM</p>
                  </div>
                </div>

                <IOSSwitch
                  checked={org.default_show_upi_details ?? true}
                  onChange={(checked) =>
                    setOrg((prev) => ({
                      ...prev,
                      default_show_upi_details: checked,
                      default_payment_display_mode: 'CUSTOM',
                    }))
                  }
                  ariaLabel="Toggle UPI Payment"
                />
              </div>

              {/* Collapsible UPI Fields */}
              {(org.default_show_upi_details ?? true) && (
                <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/20 space-y-3 animate-fade-in-up">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
                    <div className="sm:col-span-7 space-y-3">
                      <Input
                        label="UPI ID / VPA"
                        value={org.default_upi_details?.upi_id || ''}
                        onChange={(e) =>
                          setOrg((prev) => ({
                            ...prev,
                            default_upi_details: {
                              ...(prev.default_upi_details || {}),
                              upi_id: e.target.value,
                            },
                          }))
                        }
                        placeholder="e.g. yourbusiness@okhdfcbank"
                      />

                      <Input
                        label="Payee / Merchant Name"
                        value={org.default_upi_details?.payee_name || ''}
                        onChange={(e) =>
                          setOrg((prev) => ({
                            ...prev,
                            default_upi_details: {
                              ...(prev.default_upi_details || {}),
                              payee_name: e.target.value,
                            },
                          }))
                        }
                        placeholder="e.g. SUBESH M LLC"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        UPI QR Code Image
                      </label>
                      {org.default_upi_details?.qr_code_url ? (
                        <div className="relative p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 flex items-center gap-3">
                          <img
                            src={org.default_upi_details.qr_code_url}
                            alt="UPI QR Code"
                            className="h-16 w-16 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-1"
                          />
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Attached
                            </span>
                            <div className="flex gap-2 items-center">
                              <label className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1">
                                {isUploadingDefaultUpiQr ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Change</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleDefaultUpiQrUpload}
                                      className="hidden"
                                      disabled={isUploadingDefaultUpiQr}
                                    />
                                  </>
                                )}
                              </label>
                              <button
                                type="button"
                                onClick={async () => {
                                  const updated = {
                                    ...(org.default_upi_details || {}),
                                    qr_code_url: '',
                                  };
                                  setOrg((prev) => ({
                                    ...prev,
                                    default_upi_details: updated,
                                  }));
                                  await fetch('/api/settings', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      ...org,
                                      default_upi_details: updated,
                                    }),
                                  });
                                  setSuccessMsg('UPI QR code removed.');
                                  setTimeout(() => setSuccessMsg(null), 2500);
                                }}
                                className="text-[10px] font-semibold text-rose-600 hover:text-rose-800"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <label className={`border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-400 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50/30 ${isUploadingDefaultUpiQr ? 'opacity-60 pointer-events-none' : ''}`}>
                          {isUploadingDefaultUpiQr ? (
                            <>
                              <Loader2 className="h-6 w-6 text-emerald-600 animate-spin mb-1" />
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Uploading QR Code...</span>
                            </>
                          ) : (
                            <>
                              <QrCode className="h-6 w-6 text-slate-400 mb-1" />
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Upload UPI QR Code</span>
                              <span className="text-[10px] text-slate-400">PNG, JPG, WebP up to 5MB</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleDefaultUpiQrUpload}
                                className="hidden"
                              />
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Option 2 (International): Online Payment Link */
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-2xs transition-all">
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                    <LinkIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>Online Payment Link (Card / Stripe / PayPal)</span>
                      {(org.default_show_payment_link ?? false) && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                          Active
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400">Provide a direct checkout link (Stripe, PayPal, Wise, or custom checkout portal)</p>
                  </div>
                </div>

                <IOSSwitch
                  checked={org.default_show_payment_link ?? false}
                  onChange={(checked) =>
                    setOrg((prev) => ({
                      ...prev,
                      default_show_payment_link: checked,
                      default_payment_display_mode: 'CUSTOM',
                    }))
                  }
                  ariaLabel="Toggle Payment Link"
                />
              </div>

              {/* Collapsible Payment Link Fields */}
              {(org.default_show_payment_link ?? false) && (
                <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/20 space-y-3 animate-fade-in-up">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
                    <div className="sm:col-span-8 space-y-3">
                      <Input
                        label="Payment Link URL *"
                        value={org.default_payment_link || ''}
                        onChange={(e) =>
                          setOrg((prev) => ({
                            ...prev,
                            default_payment_link: e.target.value,
                          }))
                        }
                        placeholder="e.g. https://buy.stripe.com/abc... or https://paypal.me/yourbusiness"
                      />
                      <Input
                        label="Button / Link Label"
                        value={org.default_payment_link_label || ''}
                        onChange={(e) =>
                          setOrg((prev) => ({
                            ...prev,
                            default_payment_link_label: e.target.value,
                          }))
                        }
                        placeholder="e.g. Pay Online (Card / Stripe / PayPal)"
                      />
                    </div>
                    <div className="sm:col-span-4 flex flex-col justify-center p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-slate-600 dark:text-slate-300 space-y-1">
                      <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> Client Portal Pay Button
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        When active, your international customers will see a prominent <strong>Pay</strong> button on their client portal that directly opens this checkout link.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Option 3: Cash Payment */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-2xs transition-all">
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Cash Payment / Counter Handover</span>
                    {(org.default_show_cash_details ?? true) && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                        Active
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-400">Accept physical cash payments with custom instructions</p>
                </div>
              </div>

              <IOSSwitch
                checked={org.default_show_cash_details ?? true}
                onChange={(checked) =>
                  setOrg((prev) => ({
                    ...prev,
                    default_show_cash_details: checked,
                  }))
                }
                ariaLabel="Toggle Cash Payment"
              />
            </div>

            {/* Collapsible Cash Fields */}
            {(org.default_show_cash_details ?? true) && (
              <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/20 space-y-2 animate-fade-in-up">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Cash Payment Instructions &amp; Receipt Policy
                </label>
                <input
                  type="text"
                  value={org.default_cash_instructions || ''}
                  onChange={(e) =>
                    setOrg((prev) => ({
                      ...prev,
                      default_cash_instructions: e.target.value,
                    }))
                  }
                  placeholder="e.g. Cash accepted at store billing desk. Official signed receipt will be issued immediately."
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
            )}
          </div>

          {/* Option 4: Cryptocurrency */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-2xs transition-all">
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 shrink-0">
                  <Bitcoin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Cryptocurrency / Web3 (Global)</span>
                    {(org.default_show_crypto_details ?? false) && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                        Active
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-400">USDT, USDC, BTC wallets for international clients</p>
                </div>
              </div>

              <IOSSwitch
                checked={org.default_show_crypto_details ?? false}
                onChange={(checked) =>
                  setOrg((prev) => ({
                    ...prev,
                    default_show_crypto_details: checked,
                    default_payment_display_mode: 'CUSTOM',
                  }))
                }
                ariaLabel="Toggle Crypto Payment"
              />
            </div>

            {/* Collapsible Crypto Fields */}
            {(org.default_show_crypto_details ?? false) && (
              <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/20 space-y-3 animate-fade-in-up">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
                  <div className="sm:col-span-7 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Coin / Token"
                        value={org.default_crypto_details?.currency || 'USDT'}
                        onChange={(e) =>
                          setOrg((prev) => ({
                            ...prev,
                            default_crypto_details: {
                              ...(prev.default_crypto_details || {}),
                              currency: e.target.value.toUpperCase(),
                            },
                          }))
                        }
                        placeholder="e.g. USDT, BTC"
                      />

                      <Input
                        label="Network / Chain"
                        value={org.default_crypto_details?.network || 'TRC20'}
                        onChange={(e) =>
                          setOrg((prev) => ({
                            ...prev,
                            default_crypto_details: {
                              ...(prev.default_crypto_details || {}),
                              network: e.target.value.toUpperCase(),
                            },
                          }))
                        }
                        placeholder="e.g. TRC20, ERC20"
                      />
                    </div>

                    <Input
                      label="Wallet Address"
                      value={org.default_crypto_details?.wallet_address || ''}
                      onChange={(e) =>
                        setOrg((prev) => ({
                          ...prev,
                          default_crypto_details: {
                            ...(prev.default_crypto_details || {}),
                            wallet_address: e.target.value,
                          },
                        }))
                      }
                      placeholder="e.g. TXYZ1234567890abcdef..."
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Crypto QR Code Image
                    </label>
                    {org.default_crypto_details?.qr_code_url ? (
                      <div className="relative p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20 flex items-center gap-3">
                        <img
                          src={org.default_crypto_details.qr_code_url}
                          alt="Crypto QR Code"
                          className="h-16 w-16 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-1"
                        />
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-amber-600" /> Attached
                          </span>
                          <div className="flex gap-2 items-center">
                            <label className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1">
                              {isUploadingDefaultCryptoQr ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <span>Change</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleDefaultCryptoQrUpload}
                                    className="hidden"
                                    disabled={isUploadingDefaultCryptoQr}
                                  />
                                </>
                              )}
                            </label>
                            <button
                              type="button"
                              onClick={async () => {
                                const updated = {
                                  ...(org.default_crypto_details || {}),
                                  qr_code_url: '',
                                };
                                setOrg((prev) => ({
                                  ...prev,
                                  default_crypto_details: updated,
                                }));
                                await fetch('/api/settings', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    ...org,
                                    default_crypto_details: updated,
                                  }),
                                });
                                setSuccessMsg('Crypto QR code removed.');
                                setTimeout(() => setSuccessMsg(null), 2500);
                              }}
                              className="text-[10px] font-semibold text-rose-600 hover:text-rose-800"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className={`border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-amber-400 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40 hover:bg-amber-50/30 ${isUploadingDefaultCryptoQr ? 'opacity-60 pointer-events-none' : ''}`}>
                        {isUploadingDefaultCryptoQr ? (
                          <>
                            <Loader2 className="h-6 w-6 text-amber-600 animate-spin mb-1" />
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Uploading QR Code...</span>
                          </>
                        ) : (
                          <>
                            <Bitcoin className="h-6 w-6 text-slate-400 mb-1" />
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Upload Crypto QR Code</span>
                            <span className="text-[10px] text-slate-400">PNG, JPG, WebP up to 5MB</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleDefaultCryptoQrUpload}
                              className="hidden"
                            />
                          </>
                        )}
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    })()}

        {/* Save CTA */}
        {isOwnerOrAdminRole(currentUserRole) && (
          <div className="flex items-center justify-end gap-3 pt-2">
            {hasUnsavedChanges && (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Unsaved changes
              </span>
            )}
            <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2 shadow-md">
              <Save className="h-4 w-4" />
              <span>{hasUnsavedChanges ? 'Save Changes' : justSaved ? '✓ Saved' : 'Save Settings'}</span>
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
    </>
  )}

      {/* Settings Footer */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs text-slate-500">
        <p className="font-medium text-slate-600 dark:text-slate-400">
          QuoteFlow 24/7 Workspace Settings
        </p>
      </div>

      {/* Interactive Workflow & Training Modal */}
      <TrainingGuideModal
        isOpen={isTrainingModalOpen}
        onClose={() => setIsTrainingModalOpen(false)}
      />

      {/* Customize Logo & Crop Modal */}
      <LogoEditorModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        currentLogoUrl={org.logo_url}
        companyName={org.name}
        onSave={handleSaveLogoModal}
        onRemove={handleRemoveLogo}
      />
    </div>
  );
}
