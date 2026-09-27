'use client';

import React, { useState } from 'react';
import { Customer, Quotation } from '@/types/database';
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
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  COUNTRY_CODES,
  getDefaultCountryCode,
  cleanPhoneNumber,
  formatPhoneNumber,
} from '@/lib/country-codes';

export function CustomersClientView({
  initialCustomers,
  quotations,
  organizationCountry,
}: {
  initialCustomers: Customer[];
  quotations: Quotation[];
  organizationCountry?: string | null;
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaultCountryCode = getDefaultCountryCode(organizationCountry);

  // Form fields
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [authMethod, setAuthMethod] = useState<'MOBILE' | 'EMAIL'>('MOBILE');
  const [phoneCountryCode, setPhoneCountryCode] = useState(defaultCountryCode);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

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

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Contact Person Name is required.');
      return;
    }

    let cleanPhone = '';
    if (authMethod === 'MOBILE') {
      cleanPhone = cleanPhoneNumber(phone, phoneCountryCode);
      if (!cleanPhone || cleanPhone.length < 5) {
        setError('Mobile number is required for mobile authentication (enter without country code).');
        return;
      }
    } else {
      if (!email.trim() || !email.includes('@')) {
        setError('A valid email address is required for email authentication.');
        return;
      }
      if (phone.trim()) {
        cleanPhone = cleanPhoneNumber(phone, phoneCountryCode);
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          company_name: companyName.trim() || undefined,
          auth_method: authMethod,
          phone_country_code: phoneCountryCode,
          phone: cleanPhone || undefined,
          email: email.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          tax_number: taxNumber.trim() || undefined,
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
      setAuthMethod('MOBILE');
      setPhoneCountryCode(defaultCountryCode);
      setPhone('');
      setEmail('');
      setCity('');
      setState('');
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

        <Button onClick={() => setIsAddOpen(true)} className="gap-2 shadow-md">
          <Plus className="h-4 w-4" />
          <span>Add Customer</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by customer name, company, email, or phone..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((cust) => {
          const custQuotes = quotations.filter((q) => q.customer_id === cust.id);
          const effectiveAuthMethod =
            cust.auth_method || (cust.phone && !cust.email ? 'MOBILE' : 'EMAIL');
          const formattedPhone = formatPhoneNumber(
            cust.phone_country_code || defaultCountryCode,
            cust.phone
          );

          return (
            <div
              key={cust.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">{cust.name}</h3>
                  {cust.company_name && (
                    <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                      {cust.company_name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <div className="rounded-xl bg-slate-100 p-2 text-slate-500">
                    <Building className="h-4 w-4" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                    disabled={deletingId === cust.id}
                    className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    title="Delete Customer"
                  >
                    {deletingId === cust.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Authentication Method Badge */}
              <div>
                {effectiveAuthMethod === 'MOBILE' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                    <Smartphone className="h-3 w-3 text-emerald-600" />
                    <span>Mobile Auth ({formattedPhone || 'No Phone'})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200/80">
                    <Mail className="h-3 w-3 text-blue-600" />
                    <span>Email Auth ({cust.email || 'No Email'})</span>
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                {cust.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cust.email}</span>
                  </div>
                )}
                {cust.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{formattedPhone}</span>
                  </div>
                )}
                {(cust.city || cust.state) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>
                      {cust.city ? `${cust.city}, ` : ''}
                      {cust.state}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {custQuotes.length} {custQuotes.length === 1 ? 'quotation' : 'quotations'}
                </span>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/quotations?search=${encodeURIComponent(cust.name)}`}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>View Quotes</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                    disabled={deletingId === cust.id}
                    className="text-slate-400 hover:text-rose-600 font-medium text-xs flex items-center gap-1 transition-colors"
                    title="Delete Customer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Customer"
        description="Customer details are required. Configure authentication options for client portal security."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Section 1: Customer Contact Details (Mandatory) */}
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

          {/* Section 2: Authentication Option Selection */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-950 mb-1">
                Client Authentication Method *
              </label>
              <p className="text-[11px] text-slate-500">
                Choose how this customer will verify their identity to unlock quotations, invoices, and digital approvals.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAuthMethod('MOBILE')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  authMethod === 'MOBILE'
                    ? 'border-indigo-600 bg-white shadow-sm ring-2 ring-indigo-500/20 text-indigo-950 font-semibold'
                    : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    authMethod === 'MOBILE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Mobile Number</div>
                  <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                    Authenticates via Mobile & OTP / PIN. Email becomes optional.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAuthMethod('EMAIL')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  authMethod === 'EMAIL'
                    ? 'border-indigo-600 bg-white shadow-sm ring-2 ring-indigo-500/20 text-indigo-950 font-semibold'
                    : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    authMethod === 'EMAIL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Email Address</div>
                  <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                    Authenticates via Email & PIN. Mobile becomes optional.
                  </div>
                </div>
              </button>
            </div>

            {/* Conditional Authentication Input Fields */}
            {authMethod === 'MOBILE' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Mobile Authentication: Country Code + Phone without country code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number * (Mandatory)
                  </label>
                  <div className="flex gap-2">
                    {/* Separate Country-Code Dropdown */}
                    <select
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      title="Select country code"
                      className="h-10 w-32 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shrink-0"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                          {c.flag} {c.dialCode} ({c.name})
                        </option>
                      ))}
                    </select>

                    {/* Customer Mobile Number without Country Code */}
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                      placeholder="e.g. 98765 43210"
                      required
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Country code is set to business registered country by default and stored separately. Enter phone number without country code.
                  </p>
                </div>

                {/* Email is Optional */}
                <div>
                  <Input
                    label="Email Address (Optional)"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Optional for mobile-authenticated customers.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Email Authentication: Email is Mandatory */}
                <div>
                  <Input
                    label="Email Address * (Mandatory)"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    The customer will enter this email address to verify identity and unlock portal.
                  </p>
                </div>

                {/* Mobile is Optional */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number (Optional)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      title="Select country code"
                      className="h-10 w-32 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shrink-0"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                          {c.flag} {c.dialCode} ({c.name})
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                      placeholder="e.g. 98765 43210"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Optional contact number for business reference.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Billing & Tax Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Kochi"
            />
            <Input
              label="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Kerala"
            />
            <Input
              label="Tax / GST ID"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              placeholder="GSTIN"
            />
          </div>

          <Textarea
            label="Billing Address"
            value={billingAddress}
            onChange={(e) => setBillingAddress(e.target.value)}
            rows={2}
            placeholder="Street address, building, suite..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
