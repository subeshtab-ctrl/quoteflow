'use client';

import React, { useState, useMemo } from 'react';
import { Customer, Quotation, Invoice, Organization } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Smartphone,
  Building,
  MapPin,
  FileText,
  Trash2,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Pencil,
  FileSpreadsheet,
  BookOpen,
  Download,
  MessageSquare,
  Check,
  AlertCircle,
  Copy,
  Sparkles,
  X,
  Clock,
  User,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  COUNTRY_CODES,
  getDefaultCountryCode,
  cleanPhoneNumber,
  formatPhoneNumber,
  splitPhoneNumber,
} from '@/lib/country-codes';
import { INDIAN_STATES, findIndianState } from '@/lib/tax/india-gst';
import { getCountryRegionMetadata } from '@/lib/tax/country-regions';
import { calculateCustomerLedger, PartyLedgerStatement } from '@/lib/reports/party-ledger-calculator';
import { formatCurrency } from '@/lib/quotations/calculations';
import { cn } from '@/lib/utils';
import { getCustomerInitials, getCustomerTheme, CustomerTheme, CUSTOMER_THEMES } from '@/lib/customers/themes';

export function CustomersClientView({
  initialCustomers,
  quotations = [],
  invoices = [],
  organization,
  organizationCountry,
}: {
  initialCustomers: Customer[];
  quotations?: Quotation[];
  invoices?: Invoice[];
  organization?: Organization | null;
  organizationCountry?: string | null;
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // iPhone style expand/collapse state
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyText = (text: string, fieldId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {}
  };

  const handleExportExcel = () => {
    try {
      setIsExporting(true);
      const link = document.createElement('a');
      link.href = '/api/customers/export';
      link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Export error:', e);
    } finally {
      setTimeout(() => setIsExporting(false), 1200);
    }
  };

  const businessCountry = organization?.business_country || organization?.country || organizationCountry;
  const defaultCountryCode = getDefaultCountryCode(businessCountry);

  // Add Form fields
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState(defaultCountryCode);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

  // Dynamic regional metadata based on selected phone country code
  const addRegionMeta = useMemo(
    () => getCountryRegionMetadata(phoneCountryCode, businessCountry),
    [phoneCountryCode, businessCountry]
  );

  // Edit State & Fields
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editPhoneCountryCode, setEditPhoneCountryCode] = useState(defaultCountryCode);
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPlaceOfSupply, setEditPlaceOfSupply] = useState('');
  const [editTaxNumber, setEditTaxNumber] = useState('');
  const [editBillingAddress, setEditBillingAddress] = useState('');

  const editRegionMeta = useMemo(
    () => getCountryRegionMetadata(editPhoneCountryCode, businessCountry),
    [editPhoneCountryCode, businessCountry]
  );

  // Automated GSTIN / Tax ID auto-fill in Customer modal
  const [isLookingUpCustTax, setIsLookingUpCustTax] = useState(false);
  const [custTaxLookupMsg, setCustTaxLookupMsg] = useState<string | null>(null);

  const handleLookupCustomerTax = async (isEdit = false) => {
    const rawTax = isEdit ? editTaxNumber : taxNumber;
    const cleanTax = (rawTax || '').trim().toUpperCase();
    if (!cleanTax) {
      alert('Please enter a Customer Tax ID, TRN, or GSTIN first.');
      return;
    }
    setIsLookingUpCustTax(true);
    setCustTaxLookupMsg(null);
    try {
      const dialCode = isEdit ? editPhoneCountryCode : phoneCountryCode;
      const regionMeta = getCountryRegionMetadata(dialCode, businessCountry);
      const res = await fetch(
        `/api/lookup/tax-id?query=${encodeURIComponent(cleanTax)}&country=${encodeURIComponent(regionMeta.countryCode)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tax ID verification failed');

      if (isEdit) {
        if (data.companyName && !editCompanyName) setEditCompanyName(data.companyName);
        if (data.companyName && !editName) setEditName(data.companyName);
        if (data.state) {
          setEditState(data.state);
          setEditPlaceOfSupply(data.state);
        }
        if (data.city) setEditCity(data.city);
        if (data.address) setEditBillingAddress(data.address);
      } else {
        if (data.companyName && !companyName) setCompanyName(data.companyName);
        if (data.companyName && !name) setName(data.companyName);
        if (data.state) {
          setState(data.state);
          setPlaceOfSupply(data.state);
        }
        if (data.city) setCity(data.city);
        if (data.address) setBillingAddress(data.address);
      }

      setCustTaxLookupMsg(
        data.companyName
          ? `✓ Verified: ${data.companyName} (${data.state || data.country})`
          : `✓ Region identified: ${data.state || data.country}`
      );
      setTimeout(() => setCustTaxLookupMsg(null), 5000);
    } catch (err: any) {
      setCustTaxLookupMsg(`Notice: ${err.message || 'Could not auto-fetch. Please fill manually.'}`);
    } finally {
      setIsLookingUpCustTax(false);
    }
  };

  // Party Ledger State
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isDownloadingLedgerPdf, setIsDownloadingLedgerPdf] = useState(false);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);
  const [statementData, setStatementData] = useState<PartyLedgerStatement | null>(null);
  const [ledgerCopied, setLedgerCopied] = useState(false);

  const handleOpenStatement = async (cust: Customer) => {
    setLedgerCustomer(cust);
    setIsLedgerOpen(true);
    if ((invoices && invoices.length > 0) || (quotations && quotations.length > 0)) {
      setStatementData(
        calculateCustomerLedger(
          cust,
          invoices || [],
          quotations || [],
          (organization?.default_currency || 'INR') as any
        )
      );
    } else {
      setIsLoadingStatement(true);
      try {
        const res = await fetch(`/api/customers/${cust.id}/ledger`);
        const json = await res.json();
        if (json.statement) {
          setStatementData(json.statement);
        }
      } catch (err) {
        console.error('Failed to load ledger statement:', err);
      } finally {
        setIsLoadingStatement(false);
      }
    }
  };

  const activeLedgerStatement = statementData;

  const handleDownloadLedgerPdf = async () => {
    if (!activeLedgerStatement) return;
    setIsDownloadingLedgerPdf(true);
    try {
      const { downloadPartyLedgerPdfClient } = await import('@/lib/pdf/client-download');
      await downloadPartyLedgerPdfClient(activeLedgerStatement, organization);
    } catch (err) {
      console.error('Statement PDF error:', err);
    } finally {
      setIsDownloadingLedgerPdf(false);
    }
  };

  const handleShareLedgerWhatsapp = () => {
    if (!activeLedgerStatement || !ledgerCustomer?.phone) {
      alert('This customer does not have a phone number on file.');
      return;
    }
    const cur = activeLedgerStatement.currency || 'INR';
    const text = `Dear ${activeLedgerStatement.customerName},\n\nHere is your Statement of Account from ${organization?.name || 'QuoteFlow'}:\n• Total Invoiced: ${cur} ${activeLedgerStatement.totalInvoiced.toLocaleString()}\n• Total Paid: ${cur} ${activeLedgerStatement.totalPaid.toLocaleString()}\n• Net Balance Due: ${cur} ${activeLedgerStatement.netBalanceDue.toLocaleString()}\n• Overdue: ${cur} ${activeLedgerStatement.aging.totalOverdue.toLocaleString()}\n\nPlease let us know if you need any clarification or the complete statement PDF.\n\nThank you!`;
    const cleanNum = cleanPhoneNumber(ledgerCustomer.phone, ledgerCustomer.phone_country_code || defaultCountryCode);
    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditName(cust.name || '');
    setEditCompanyName(cust.company_name || '');
    const fallbackCode = cust.phone_country_code || defaultCountryCode;
    const parsed = splitPhoneNumber(cust.phone, fallbackCode);
    setEditPhoneCountryCode(parsed.countryCode || defaultCountryCode);
    setEditPhone(parsed.phone || '');
    const cleanEmail =
      cust.email &&
      !cust.email.endsWith('@mobile.client') &&
      !cust.email.endsWith('@customer.local') &&
      !cust.email.endsWith('@phone.portal')
        ? cust.email
        : '';
    setEditEmail(cleanEmail);
    setEditCity(cust.city || '');
    setEditState(cust.billing_state || cust.state || '');
    setEditPlaceOfSupply(cust.place_of_supply || cust.billing_state || cust.state || '');
    setEditTaxNumber(cust.customer_gstin || cust.tax_number || '');
    setEditBillingAddress(cust.billing_address || '');
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError('Contact Person Name is required.');
      return;
    }

    const cleanPhone = editPhone.trim() ? cleanPhoneNumber(editPhone, editPhoneCountryCode) : '';
    const cleanEmail = editEmail.trim();

    if (!cleanPhone && !cleanEmail) {
      setEditError('Please provide at least a Mobile Number or an Email Address (cannot leave both blank).');
      return;
    }

    let effectiveState = editState.trim();
    let effectiveStateCode: string | undefined = undefined;

    if (editRegionMeta.isIndia) {
      const matchedState = findIndianState(editState.trim());
      effectiveState = matchedState ? matchedState.name : editState.trim();
      effectiveStateCode = matchedState ? matchedState.code : undefined;
    } else {
      const matchedRegion = editRegionMeta.regions.find(
        (r) =>
          r.name.toLowerCase() === editState.trim().toLowerCase() ||
          r.code.toLowerCase() === editState.trim().toLowerCase()
      );
      if (matchedRegion) {
        effectiveState = matchedRegion.name;
        effectiveStateCode = matchedRegion.code;
      }
    }

    const effectivePos = editPlaceOfSupply.trim() || effectiveState;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          company_name: editCompanyName.trim() || undefined,
          phone_country_code: editPhoneCountryCode,
          phone: cleanPhone || '',
          email: cleanEmail || '',
          city: editCity.trim() || undefined,
          state: effectiveState || undefined,
          billing_state: effectiveState || undefined,
          state_code: effectiveStateCode,
          place_of_supply: effectivePos || undefined,
          country: editRegionMeta.countryName,
          tax_number: editTaxNumber.trim().toUpperCase() || undefined,
          customer_gstin: editTaxNumber.trim().toUpperCase() || undefined,
          billing_address: editBillingAddress.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update customer');

      setCustomers((prev) =>
        prev.map((c) => (c.id === data.customer.id ? data.customer : c))
      );
      setIsEditOpen(false);
      setEditingCustomer(null);
      router.refresh();
    } catch (err: any) {
      setEditError(err.message || 'Error updating customer');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCustomer = async (id: string, customerName: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete customer "${customerName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete customer');

      setCustomers((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting customer');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company_name && c.company_name.toLowerCase().includes(search.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search))
  );

  const allExpanded = filtered.length > 0 && filtered.every((c) => expandedCustomerIds.has(c.id));
  const handleToggleAll = () => {
    if (allExpanded) {
      setExpandedCustomerIds(new Set());
    } else {
      setExpandedCustomerIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Contact Person Name is required.');
      return;
    }

    const cleanPhone = phone.trim() ? cleanPhoneNumber(phone, phoneCountryCode) : '';
    const cleanEmail = email.trim();

    if (!cleanPhone && !cleanEmail) {
      setError('Please provide at least a Mobile Number or an Email Address (cannot leave both blank).');
      return;
    }

    let effectiveState = state.trim();
    let effectiveStateCode: string | undefined = undefined;

    if (addRegionMeta.isIndia) {
      const matchedState = findIndianState(state.trim());
      effectiveState = matchedState ? matchedState.name : state.trim();
      effectiveStateCode = matchedState ? matchedState.code : undefined;
    } else {
      const matchedRegion = addRegionMeta.regions.find(
        (r) =>
          r.name.toLowerCase() === state.trim().toLowerCase() ||
          r.code.toLowerCase() === state.trim().toLowerCase()
      );
      if (matchedRegion) {
        effectiveState = matchedRegion.name;
        effectiveStateCode = matchedRegion.code;
      }
    }

    const effectivePos = placeOfSupply.trim() || effectiveState;

    setIsLoading(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          company_name: companyName.trim() || undefined,
          phone_country_code: phoneCountryCode,
          phone: cleanPhone || undefined,
          email: cleanEmail || undefined,
          city: city.trim() || undefined,
          state: effectiveState || undefined,
          billing_state: effectiveState || undefined,
          state_code: effectiveStateCode,
          place_of_supply: effectivePos || undefined,
          country: addRegionMeta.countryName,
          tax_number: taxNumber.trim().toUpperCase() || undefined,
          customer_gstin: taxNumber.trim().toUpperCase() || undefined,
          billing_address: billingAddress.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add customer');

      setCustomers((prev) => [data.customer, ...prev]);
      router.refresh();
      setIsAddOpen(false);

      // Reset form
      setName('');
      setCompanyName('');
      setPhoneCountryCode(defaultCountryCode);
      setPhone('');
      setEmail('');
      setCity('');
      setState('');
      setPlaceOfSupply('');
      setTaxNumber('');
      setBillingAddress('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Customers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain your customer directory and manage authentication options for client portals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportExcel}
            disabled={isExporting || customers.length === 0}
            className="gap-2 border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            )}
            <span>{isExporting ? 'Exporting...' : 'Export to Excel'}</span>
          </Button>

          <Button onClick={() => setIsAddOpen(true)} className="gap-2 shadow-md">
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </Button>
        </div>
      </div>

      {/* Search Bar & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by customer name, company, email, or phone..."
            className="h-10 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handleToggleAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            title={allExpanded ? 'Collapse all customer cards' : 'Expand all customer cards to view details'}
          >
            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-500" />
            <span>{allExpanded ? 'Collapse All' : 'Expand All'}</span>
          </button>

          <span className="text-xs font-semibold text-slate-400 px-1">
            {filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}
          </span>
        </div>
      </div>

      {/* Customer Cards Grid — Compact iPhone Contact Style with Click-to-Expand */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filtered.map((cust) => {
          const isExpanded = expandedCustomerIds.has(cust.id);
          const custQuotes = quotations.filter((q) => q.customer_id === cust.id);
          const hasPhone = Boolean(cust.phone && cust.phone.length >= 5);
          const hasEmail = Boolean(cust.email && cust.email.length > 0 && !cust.email.endsWith('@mobile.client') && !cust.email.endsWith('@customer.local'));
          const effectiveAuthMethod =
            cust.auth_method || (hasPhone && hasEmail ? 'BOTH' : hasPhone ? 'MOBILE' : 'EMAIL');
          const formattedPhone = formatPhoneNumber(
            cust.phone_country_code || defaultCountryCode,
            cust.phone
          );
          const initials = getCustomerInitials(cust.name, cust.company_name);
          const theme = getCustomerTheme(cust.id + cust.name);

          const cleanPhoneDigits = cust.phone ? cust.phone.replace(/[^0-9]/g, '') : '';
          const fullPhoneDigits = cust.phone_country_code
            ? `${cust.phone_country_code.replace(/[^0-9]/g, '')}${cleanPhoneDigits}`
            : cleanPhoneDigits;
          const whatsappUrl = fullPhoneDigits ? `https://wa.me/${fullPhoneDigits}` : null;

          return (
            <div
              key={cust.id}
              className={cn(
                'group relative rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col',
                isExpanded ? 'ring-2 ring-indigo-500/20 shadow-md' : 'hover:border-slate-300 dark:hover:border-slate-700'
              )}
            >
              {/* Colorful Top Accent Bar matching theme */}
              <div
                className={cn('h-1 w-full transition-opacity opacity-90 group-hover:opacity-100', theme.topBar)}
                style={{ background: theme.cssTopBar }}
              />

              {/* iPhone Contact Header — Always visible, compact, clickable to expand */}
              <div
                onClick={() => toggleExpand(cust.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(cust.id);
                  }
                }}
                className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                title={isExpanded ? 'Click to collapse contact' : 'Click to expand contact details'}
              >
                {/* Left: Colorful Squircle Avatar & Name */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Colorful Initials Avatar matching Name */}
                  <div
                    className={cn(
                      'h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-black text-sm tracking-wide shadow-sm shrink-0 ring-2 ring-white/90 dark:ring-slate-800 transition-transform duration-200 group-hover:scale-105',
                      theme.gradient,
                      theme.avatarShadow
                    )}
                    style={{ background: theme.cssGradient }}
                  >
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors truncate">
                        {cust.name}
                      </h3>
                    </div>

                    {/* Subtitle Line (iPhone contact style) */}
                    {cust.company_name ? (
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <Building className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{cust.company_name}</span>
                      </p>
                    ) : cust.phone ? (
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{formattedPhone}</span>
                      </p>
                    ) : cust.email ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{cust.email}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                        Direct Contact
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Quote Count Pill & Smooth Expand Chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Quotation count pill strictly targeting this customer */}
                  <Link
                    href={`/quotations?customerId=${encodeURIComponent(cust.id)}`}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black transition-all border shadow-2xs',
                      custQuotes.length > 0
                        ? `${theme.quoteBadge} ${theme.quoteBadgeBorder} hover:scale-105`
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200/80 dark:border-slate-700 hover:bg-slate-200'
                    )}
                    title={`View only quotations for ${cust.name}`}
                  >
                    <FileText className="h-3 w-3" />
                    <span>{custQuotes.length}</span>
                    <span className="hidden sm:inline font-semibold text-[10px]">
                      {custQuotes.length === 1 ? 'quote' : 'quotes'}
                    </span>
                  </Link>

                  {/* Expand Chevron Icon with smooth 180deg flip */}
                  <div
                    className={cn(
                      'h-7 w-7 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors',
                      isExpanded && 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50'
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-300',
                        isExpanded && 'rotate-180 text-indigo-600'
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Expandable Contact Details Section */}
              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* iPhone Style Quick Action Pills: Call, WhatsApp, Email, Statement */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {/* Call Button */}
                    {cust.phone ? (
                      <a
                        href={`tel:${cust.phone_country_code || defaultCountryCode}${cleanPhoneDigits}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 transition-colors border border-slate-200/60 dark:border-slate-700/60 group/btn"
                        title="Call Customer"
                      >
                        <Phone className="h-4 w-4 text-emerald-600 mb-0.5" />
                        <span className="text-[10px] font-bold">Call</span>
                      </a>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-slate-300 dark:text-slate-600 cursor-not-allowed">
                        <Phone className="h-4 w-4 mb-0.5 opacity-40" />
                        <span className="text-[10px] font-semibold">Call</span>
                      </div>
                    )}

                    {/* WhatsApp Button */}
                    {whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 transition-colors border border-slate-200/60 dark:border-slate-700/60 group/btn"
                        title="Chat on WhatsApp"
                      >
                        <MessageSquare className="h-4 w-4 text-emerald-500 mb-0.5" />
                        <span className="text-[10px] font-bold">WhatsApp</span>
                      </a>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-slate-300 dark:text-slate-600 cursor-not-allowed">
                        <MessageSquare className="h-4 w-4 mb-0.5 opacity-40" />
                        <span className="text-[10px] font-semibold">WhatsApp</span>
                      </div>
                    )}

                    {/* Email Button */}
                    {cust.email && !cust.email.endsWith('@mobile.client') ? (
                      <a
                        href={`mailto:${cust.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-700 transition-colors border border-slate-200/60 dark:border-slate-700/60 group/btn"
                        title="Send Email"
                      >
                        <Mail className="h-4 w-4 text-blue-600 mb-0.5" />
                        <span className="text-[10px] font-bold">Email</span>
                      </a>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-slate-300 dark:text-slate-600 cursor-not-allowed">
                        <Mail className="h-4 w-4 mb-0.5 opacity-40" />
                        <span className="text-[10px] font-semibold">Email</span>
                      </div>
                    )}

                    {/* Statement Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenStatement(cust);
                      }}
                      className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-700 transition-colors border border-slate-200/60 dark:border-slate-700/60 cursor-pointer"
                      title="View Customer Statement / Ledger"
                    >
                      <BookOpen className="h-4 w-4 text-indigo-600 mb-0.5" />
                      <span className="text-[10px] font-bold">Statement</span>
                    </button>
                  </div>

                  {/* Auth Pill & Tax ID Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {effectiveAuthMethod === 'BOTH' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70">
                        <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>Mobile &amp; Email Auth</span>
                      </span>
                    ) : effectiveAuthMethod === 'MOBILE' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70">
                        <Smartphone className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>Mobile Auth</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70">
                        <Mail className="h-3 w-3 text-blue-600 shrink-0" />
                        <span>Email Auth</span>
                      </span>
                    )}

                    {cust.tax_number && (
                      <button
                        type="button"
                        onClick={(e) => handleCopyText(cust.tax_number!, `tax-${cust.id}`, e)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 hover:bg-slate-200 transition-colors"
                        title="Click to copy Tax Number / GSTIN"
                      >
                        <span className="text-[9px] uppercase font-bold text-slate-500">TAX / GST:</span>
                        <span className="font-mono">{cust.tax_number}</span>
                        {copiedField === `tax-${cust.id}` ? (
                          <Check className="h-2.5 w-2.5 text-emerald-600 ml-0.5" />
                        ) : (
                          <Copy className="h-2.5 w-2.5 text-slate-400 ml-0.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Grouped Contact Details Card (iPhone Contacts layout) */}
                  <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 p-2.5 space-y-1.5 border border-slate-100 dark:border-slate-800 text-xs">
                    {cust.email && (
                      <div className="flex items-center justify-between gap-2 group/row">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 truncate min-w-0">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{cust.email}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleCopyText(cust.email!, `email-${cust.id}`, e)}
                          className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0"
                          title="Copy Email"
                        >
                          {copiedField === `email-${cust.id}` ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}

                    {cust.phone && (
                      <div className="flex items-center justify-between gap-2 group/row">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 min-w-0">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-xs">{formattedPhone}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleCopyText(formattedPhone, `phone-${cust.id}`, e)}
                          className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0"
                          title="Copy Phone"
                        >
                          {copiedField === `phone-${cust.id}` ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}

                    {(cust.city || cust.state || cust.billing_country || cust.country || cust.billing_address) && (
                      <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300 pt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-xs leading-snug">
                          {cust.billing_address ? (
                            <span>{cust.billing_address}, </span>
                          ) : null}
                          {[cust.city, cust.state, cust.billing_country || cust.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expanded Actions Footer: Edit, Delete, View Quotes, + New Quote */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                    {/* Left: Edit & Delete Icons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(cust);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                        title="Edit Customer Details"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomer(cust.id, cust.name);
                        }}
                        disabled={deletingId === cust.id}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                        title="Delete Customer"
                      >
                        {deletingId === cust.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Right: View Quotes & New Quote */}
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/quotations?customerId=${encodeURIComponent(cust.id)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                        title={`View only quotations for ${cust.name}`}
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Quotes ({custQuotes.length})</span>
                      </Link>

                      <Link
                        href={`/quotations/new?customerId=${encodeURIComponent(cust.id)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xs hover:opacity-95 transition-opacity"
                        title={`Create new quotation for ${cust.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>New Quote</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Customer Modal — Redesigned with QuoteFlow Welcome Popup Aesthetics */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-[4px] overflow-y-auto animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setIsAddOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
            {/* Top Glow Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src="/quoteflow-icon.png"
                  alt="QuoteFlow"
                  className="w-10 h-10 object-contain rounded-2xl shadow-xs shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      Add New Customer
                    </h2>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                      <span>{addRegionMeta.flag}</span>
                      <span>{addRegionMeta.countryName}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Save customer to directory. State rules &amp; tax compliance automatically adapt to this country.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 pt-4">
              {error && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Dynamic Region Datalist */}
              {addRegionMeta.regions.length > 0 && (
                <datalist id="add-customer-regions-datalist">
                  {addRegionMeta.regions.map((r) => (
                    <option key={r.code} value={r.name}>
                      {r.name} {addRegionMeta.isIndia ? `(Code: ${r.code})` : ''}
                    </option>
                  ))}
                </datalist>
              )}

              {/* Block 1: Contact Details */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  <User className="w-3.5 h-3.5" />
                  <span>Customer Contact</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Contact Person Name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Mathew"
                    required
                  />
                  <Input
                    label="Company Name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. JM Architect Studio"
                  />
                </div>
              </div>

              {/* Block 2: Authentication & Portal Delivery */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Client Portal &amp; Communication</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={phoneCountryCode}
                        onChange={(e) => setPhoneCountryCode(e.target.value)}
                        title="Select country code"
                        className="h-10 w-36 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shrink-0"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                            {c.flag} {c.dialCode} ({c.code})
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                        placeholder={addRegionMeta.isIndia ? 'e.g. 9876543210' : 'e.g. 50 123 4567'}
                        className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <Input
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="client@example.com"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Enter at least a mobile number or email address for customer portal authentication.
                </p>
              </div>

              {/* Block 3: Location & Tax Compliance */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Location &amp; {addRegionMeta.isIndia ? 'GST Details' : addRegionMeta.isUae ? 'VAT & TRN' : 'Tax Info'}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {addRegionMeta.countryName}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={addRegionMeta.cityPlaceholder}
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {addRegionMeta.stateLabel}
                      {addRegionMeta.isIndia && findIndianState(state) ? ` (Code: ${findIndianState(state)?.code})` : ''}
                    </label>
                    <input
                      type="text"
                      list={addRegionMeta.regions.length > 0 ? 'add-customer-regions-datalist' : undefined}
                      value={state}
                      onChange={(e) => {
                        const val = e.target.value;
                        setState(val);
                        if (!placeOfSupply || placeOfSupply === state) {
                          setPlaceOfSupply(val);
                        }
                      }}
                      placeholder={addRegionMeta.statePlaceholder}
                      className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {addRegionMeta.placeOfSupplyLabel}
                    </label>
                    <input
                      type="text"
                      list={addRegionMeta.regions.length > 0 ? 'add-customer-regions-datalist' : undefined}
                      value={placeOfSupply}
                      onChange={(e) => setPlaceOfSupply(e.target.value)}
                      placeholder={addRegionMeta.placeOfSupplyPlaceholder}
                      className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {addRegionMeta.taxLabel}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleLookupCustomerTax(false)}
                        disabled={isLookingUpCustTax}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                      >
                        {isLookingUpCustTax ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        <span>Auto-fill</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={taxNumber}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setTaxNumber(val);
                        if (val.length === 15 && addRegionMeta.isIndia) {
                          setTimeout(() => handleLookupCustomerTax(false), 200);
                        }
                      }}
                      placeholder={addRegionMeta.taxPlaceholder}
                      className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs sm:text-sm font-mono font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {custTaxLookupMsg && (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{custTaxLookupMsg}</span>
                  </p>
                )}

                <Textarea
                  label="Billing Address"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  rows={2}
                  placeholder="Street address, building, suite..."
                />
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl px-5 h-10 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl px-6 h-10 shadow-lg shadow-indigo-600/20 gap-1.5 border border-indigo-500/20"
                >
                  <span>Save Customer to Directory</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal — Redesigned with QuoteFlow Welcome Popup Aesthetics */}
      {isEditOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-[4px] overflow-y-auto animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 -z-10"
            onClick={() => {
              setIsEditOpen(false);
              setEditingCustomer(null);
            }}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
            {/* Top Glow Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-sky-500" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src="/quoteflow-icon.png"
                  alt="QuoteFlow"
                  className="w-10 h-10 object-contain rounded-2xl shadow-xs shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      Edit Customer Details
                    </h2>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                      <span>{editRegionMeta.flag}</span>
                      <span>{editRegionMeta.countryName}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Update client information, portal access credentials, and tax settings.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingCustomer(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-4 pt-4">
              {editError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Dynamic Region Datalist */}
              {editRegionMeta.regions.length > 0 && (
                <datalist id="edit-customer-regions-datalist">
                  {editRegionMeta.regions.map((r) => (
                    <option key={r.code} value={r.name}>
                      {r.name} {editRegionMeta.isIndia ? `(Code: ${r.code})` : ''}
                    </option>
                  ))}
                </datalist>
              )}

              {/* Block 1: Contact Details */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  <User className="w-3.5 h-3.5" />
                  <span>Customer Contact</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Contact Person Name *"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. John Mathew"
                    required
                  />
                  <Input
                    label="Company Name"
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    placeholder="e.g. JM Architect Studio"
                  />
                </div>
              </div>

              {/* Block 2: Authentication & Portal Delivery */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Client Portal &amp; Communication</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={editPhoneCountryCode}
                        onChange={(e) => setEditPhoneCountryCode(e.target.value)}
                        title="Select country code"
                        className="h-10 w-36 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shrink-0"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                            {c.flag} {c.dialCode} ({c.code})
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                        placeholder={editRegionMeta.isIndia ? 'e.g. 9876543210' : 'e.g. 50 123 4567'}
                        className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <Input
                      label="Email Address"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="client@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Block 3: Location & Tax Compliance */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Location &amp; {editRegionMeta.isIndia ? 'GST Details' : editRegionMeta.isUae ? 'VAT & TRN' : 'Tax Info'}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {editRegionMeta.countryName}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="City"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder={editRegionMeta.cityPlaceholder}
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {editRegionMeta.stateLabel}
                      {editRegionMeta.isIndia && findIndianState(editState) ? ` (Code: ${findIndianState(editState)?.code})` : ''}
                    </label>
                    <input
                      type="text"
                      list={editRegionMeta.regions.length > 0 ? 'edit-customer-regions-datalist' : undefined}
                      value={editState}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditState(val);
                        if (!editPlaceOfSupply || editPlaceOfSupply === editState) {
                          setEditPlaceOfSupply(val);
                        }
                      }}
                      placeholder={editRegionMeta.statePlaceholder}
                      className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {editRegionMeta.placeOfSupplyLabel}
                    </label>
                    <input
                      type="text"
                      list={editRegionMeta.regions.length > 0 ? 'edit-customer-regions-datalist' : undefined}
                      value={editPlaceOfSupply}
                      onChange={(e) => setEditPlaceOfSupply(e.target.value)}
                      placeholder={editRegionMeta.placeOfSupplyPlaceholder}
                      className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {editRegionMeta.taxLabel}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleLookupCustomerTax(true)}
                        disabled={isLookingUpCustTax}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                      >
                        {isLookingUpCustTax ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        <span>Auto-fill</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editTaxNumber}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setEditTaxNumber(val);
                        if (val.length === 15 && editRegionMeta.isIndia) {
                          setTimeout(() => handleLookupCustomerTax(true), 200);
                        }
                      }}
                      placeholder={editRegionMeta.taxPlaceholder}
                      className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs sm:text-sm font-mono font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <Textarea
                  label="Billing Address"
                  value={editBillingAddress}
                  onChange={(e) => setEditBillingAddress(e.target.value)}
                  rows={2}
                  placeholder="Street address, building, suite..."
                />
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingCustomer(null);
                  }}
                  className="rounded-xl px-5 h-10 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isUpdating}
                  className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl px-6 h-10 shadow-lg shadow-indigo-600/20 gap-1.5 border border-indigo-500/20"
                >
                  <span>Update Customer</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PARTY LEDGER & STATEMENT MODAL */}
      {isLedgerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Party Ledger &amp; Account Statement</span>
                    {activeLedgerStatement && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold">
                        {activeLedgerStatement.customerName}
                      </span>
                    )}
                  </h2>
                  {activeLedgerStatement && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeLedgerStatement.companyName ? `${activeLedgerStatement.companyName} • ` : ''}
                      {activeLedgerStatement.phone ? `${activeLedgerStatement.phone} • ` : ''}
                      {activeLedgerStatement.taxNumber ? `GSTIN/Tax: ${activeLedgerStatement.taxNumber}` : ''}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleShareLedgerWhatsapp}
                  disabled={!ledgerCustomer?.phone || !activeLedgerStatement}
                  className="text-xs h-8 gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-bold"
                  title="Share statement summary on WhatsApp"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleDownloadLedgerPdf}
                  disabled={isDownloadingLedgerPdf || !activeLedgerStatement}
                  className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs"
                >
                  {isDownloadingLedgerPdf ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span>{isDownloadingLedgerPdf ? 'Generating...' : 'Download PDF'}</span>
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLedgerOpen(false);
                    setLedgerCustomer(null);
                    setStatementData(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            {isLoadingStatement || !activeLedgerStatement ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading Customer Ledger &amp; Aging...</p>
              </div>
            ) : (
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* 3 Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Total Billed / Invoiced
                  </span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(activeLedgerStatement.totalInvoiced, activeLedgerStatement.currency)}
                  </span>
                </div>

                <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
                    Total Received / Paid
                  </span>
                  <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(activeLedgerStatement.totalPaid, activeLedgerStatement.currency)}
                  </span>
                </div>

                <div className={`rounded-2xl border p-4 ${
                  activeLedgerStatement.netBalanceDue > 0
                    ? 'border-rose-200/80 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850'
                }`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${
                    activeLedgerStatement.netBalanceDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                  }`}>
                    Net Outstanding Due
                  </span>
                  <span className={`text-xl font-black ${
                    activeLedgerStatement.netBalanceDue > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-white'
                  }`}>
                    {formatCurrency(activeLedgerStatement.netBalanceDue, activeLedgerStatement.currency)}
                  </span>
                </div>
              </div>

              {/* Overdue Aging Summary Bar */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Overdue Aging Analysis</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Total Overdue: <strong className="text-rose-600 font-bold">{formatCurrency(activeLedgerStatement.aging.totalOverdue, activeLedgerStatement.currency)}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <div className="text-[10px] text-slate-400 font-bold">Current (Not Due)</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {formatCurrency(activeLedgerStatement.aging.current, activeLedgerStatement.currency)}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30">
                    <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">1 - 30 Days</div>
                    <div className="text-xs font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                      {formatCurrency(activeLedgerStatement.aging.days1to30, activeLedgerStatement.currency)}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-orange-50/70 dark:bg-orange-950/30">
                    <div className="text-[10px] text-orange-700 dark:text-orange-400 font-bold">31 - 60 Days</div>
                    <div className="text-xs font-bold text-orange-800 dark:text-orange-300 mt-0.5">
                      {formatCurrency(activeLedgerStatement.aging.days31to60, activeLedgerStatement.currency)}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/30">
                    <div className="text-[10px] text-rose-700 dark:text-rose-400 font-bold">61 - 90 Days</div>
                    <div className="text-xs font-bold text-rose-800 dark:text-rose-300 mt-0.5">
                      {formatCurrency(activeLedgerStatement.aging.days61to90, activeLedgerStatement.currency)}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-red-100/70 dark:bg-red-950/40">
                    <div className="text-[10px] text-red-800 dark:text-red-300 font-bold">90+ Days</div>
                    <div className="text-xs font-bold text-red-900 dark:text-red-200 mt-0.5">
                      {formatCurrency(activeLedgerStatement.aging.days90plus, activeLedgerStatement.currency)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                  Transaction History &amp; Running Balance
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 dark:bg-slate-850/80 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Ref #</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5 text-right">Debit (+)</th>
                        <th className="p-2.5 text-right">Credit (-)</th>
                        <th className="p-2.5 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeLedgerStatement.entries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-xs text-slate-400">
                            No invoices or payment receipts recorded for this customer yet.
                          </td>
                        </tr>
                      ) : (
                        activeLedgerStatement.entries.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors">
                            <td className="p-2.5 text-slate-600 dark:text-slate-400 font-mono">
                              {item.date}
                            </td>
                            <td className="p-2.5 font-bold text-indigo-600">
                              {item.linkHref ? (
                                <Link href={item.linkHref} className="hover:underline">
                                  {item.refNo}
                                </Link>
                              ) : (
                                item.refNo
                              )}
                            </td>
                            <td className="p-2.5">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.type === 'INVOICE'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                  : item.type === 'PAYMENT'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                              }`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                              {item.description}
                            </td>
                            <td className="p-2.5 text-right font-semibold text-slate-900 dark:text-slate-100 font-mono">
                              {item.debit > 0 ? formatCurrency(item.debit, activeLedgerStatement.currency) : '-'}
                            </td>
                            <td className="p-2.5 text-right font-semibold text-emerald-600 font-mono">
                              {item.credit > 0 ? formatCurrency(item.credit, activeLedgerStatement.currency) : '-'}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                              {formatCurrency(item.runningBalance, activeLedgerStatement.currency)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/50 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Generated from active sales ledger records
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsLedgerOpen(false);
                  setLedgerCustomer(null);
                  setStatementData(null);
                }}
                className="text-xs"
              >
                Close Statement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
