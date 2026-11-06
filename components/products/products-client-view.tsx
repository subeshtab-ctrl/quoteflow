'use client';

import React, { useState } from 'react';
import { Product, CurrencyCode, Organization } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/quotations/calculations';
import { cn } from '@/lib/utils';
import {
  getCountryProfile,
  getCountryClassificationPresets,
  CountryTaxProfile,
} from '@/lib/tax/country-config';
import {
  Plus,
  Search,
  Package,
  CheckCircle2,
  Check,
  XCircle,
  Pencil,
  Trash2,
  Loader2,
  Tag,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface ParsedBulkItem {
  name: string;
  sku: string;
  description: string;
  unit_price: number;
  unit: string;
  tax_rate: number;
  hsn_code: string;
  classification_type: string | null;
  category: string;
  isValid: boolean;
  error?: string;
}

function getSampleCsv(countryProfile: CountryTaxProfile): string {
  if (countryProfile.isUaeVat) {
    return `Item Name,SKU,Description,Unit Price,Unit,Tax Rate %,HS or Service Code,Classification Type,Category
Enterprise RO Water System,RO-IND-5000,5000 LPH multi-stage filtration plant,35000,plant,5,8421.21,HS,Water Equipment
Annual Maintenance Contract,AMC-GOLD,24/7 SLA onsite comprehensive quarterly maintenance,4500,year,5,SRV-MAINT-5,SERVICE,Maintenance
Sediment Filter Cartridge 20-inch,FLT-SED-20,High density polypropylene micron filter,85,piece,5,3926.90,HS,Spare Parts
Custom Cloud Software,SOFT-DEV,Full stack web application development and consulting,12000,project,5,SRV-IT-5,SERVICE,IT Services`;
  }

  if (countryProfile.isIndiaGst) {
    return `Item Name,SKU,Description,Unit Price,Unit,Tax Rate %,HSN or SAC Code,Classification Type,Category
Enterprise RO Water System,RO-IND-5000,5000 LPH multi-stage filtration plant,350000,plant,18,8421,HSN,Water Equipment
Annual Maintenance Contract,AMC-GOLD,24/7 SLA onsite comprehensive quarterly maintenance,45000,year,18,998717,SAC,Maintenance
Sediment Filter Cartridge 20-inch,FLT-SED-20,High density polypropylene micron filter,850,piece,18,842199,HSN,Spare Parts
Custom Software Engineering,SOFT-DEV,Full stack web application development and consulting,120000,project,18,998311,SAC,IT Services`;
  }

  return `Item Name,SKU,Description,Unit Price,Unit,Tax Rate %,Classification Code,Classification Type,Category
Commercial Water Purification System,SYS-5000,Commercial multi-stage filtration plant,9500,unit,${countryProfile.defaultTaxRate},8421.21,GOODS,Equipment
Quarterly SLA Preventative Maintenance,AMC-PREM,Onsite inspection and membrane maintenance,1200,year,${countryProfile.defaultTaxRate},SVC-MAINT,SERVICE,Maintenance
Sediment Filter Cartridge 20-inch,FLT-SED-20,High density polypropylene micron filter,25,piece,${countryProfile.defaultTaxRate},3926.90,GOODS,Spare Parts
Cloud Monitoring & Diagnostics,SaaS-ANNUAL,Annual license for IoT telemetry dashboard,2400,year,${countryProfile.defaultTaxRate},SVC-SAAS,SERVICE,Software`;
}

function parseCsvLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseProductCsvText(rawText: string): ParsedBulkItem[] {
  const clean = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!clean) return [];

  const lines = clean.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Detect delimiter (comma or tab)
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headerTokens = parseCsvLine(lines[0], delimiter).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  const hasNameHeader = headerTokens.some((h) =>
    ['name', 'itemname', 'productname', 'item', 'service', 'title'].includes(h)
  );

  let nameCol = 0;
  let skuCol = 1;
  let descCol = 2;
  let priceCol = 3;
  let unitCol = 4;
  let taxCol = 5;
  let hsnCol = 6;
  let classCol = 7;
  let catCol = 8;

  let startIdx = 0;

  if (hasNameHeader) {
    startIdx = 1;
    nameCol = headerTokens.findIndex((h) =>
      ['name', 'itemname', 'productname', 'item', 'service', 'title'].includes(h)
    );
    skuCol = headerTokens.findIndex((h) =>
      ['sku', 'itemcode', 'code', 'productcode'].includes(h)
    );
    descCol = headerTokens.findIndex((h) =>
      ['description', 'desc', 'details'].includes(h)
    );
    priceCol = headerTokens.findIndex((h) =>
      ['unitprice', 'price', 'rate', 'amount', 'cost'].includes(h)
    );
    unitCol = headerTokens.findIndex((h) =>
      ['unit', 'uom', 'unitofmeasure'].includes(h)
    );
    taxCol = headerTokens.findIndex((h) =>
      ['taxrate', 'tax', 'gst', 'vat', 'salestax', 'taxratepercent', 'gstpercent', 'vatpercent', 'taxpercent'].includes(h)
    );
    hsnCol = headerTokens.findIndex((h) =>
      ['hsnorasaccode', 'hsncode', 'saccode', 'hscode', 'commoditycode', 'code', 'hsn', 'sac', 'hs', 'hsnsac', 'classificationcode'].includes(h)
    );
    classCol = headerTokens.findIndex((h) =>
      ['classificationtype', 'type', 'hsnsactype', 'categorytype', 'itemtype'].includes(h)
    );
    catCol = headerTokens.findIndex((h) =>
      ['category', 'itemcategory', 'group'].includes(h)
    );
  }

  const parsed: ParsedBulkItem[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    if (cols.length === 0 || cols.every((c) => !c)) continue;

    const name = (nameCol >= 0 && cols[nameCol]) ? cols[nameCol].trim() : (cols[0] || '').trim();
    const sku = (skuCol >= 0 && cols[skuCol]) ? cols[skuCol].trim() : (cols[1] || '').trim();
    const description = (descCol >= 0 && cols[descCol]) ? cols[descCol].trim() : (cols[2] || '').trim();

    const rawPrice = (priceCol >= 0 && cols[priceCol]) ? cols[priceCol] : (cols[3] || '0');
    const unitPrice = parseFloat(rawPrice.replace(/[^0-9.-]/g, '')) || 0;

    const unit = (unitCol >= 0 && cols[unitCol]) ? cols[unitCol].trim() : (cols[4] || 'unit').trim();

    const rawTax = (taxCol >= 0 && cols[taxCol]) ? cols[taxCol] : (cols[5] || '0');
    const taxRate = parseFloat(rawTax.replace(/[^0-9.]/g, '')) || 0;

    const hsnCode = (hsnCol >= 0 && cols[hsnCol]) ? cols[hsnCol].trim() : (cols[6] || '').trim();

    let classificationType: string | null = null;
    const rawClass = (classCol >= 0 && cols[classCol]) ? cols[classCol].trim().toUpperCase() : (cols[7] || '').trim().toUpperCase();
    if (rawClass === 'SAC' || (hsnCode && (hsnCode.startsWith('99') || (hsnCode.length === 6 && hsnCode.startsWith('9'))))) {
      classificationType = 'SAC';
    } else if (rawClass === 'HSN' || rawClass === 'HS' || rawClass === 'GOODS') {
      classificationType = rawClass || 'HSN';
    } else if (rawClass === 'SERVICE' || rawClass.includes('SERV')) {
      classificationType = 'SERVICE';
    } else if (rawClass) {
      classificationType = rawClass;
    } else if (hsnCode) {
      classificationType = hsnCode.startsWith('99') ? 'SAC' : 'HSN';
    }

    const category = (catCol >= 0 && cols[catCol]) ? cols[catCol].trim() : (cols[8] || '').trim();

    const isValid = Boolean(name && name.length >= 2);
    let error: string | undefined;
    if (!name) {
      error = 'Name is missing';
    } else if (name.length < 2) {
      error = 'Name is too short';
    }

    parsed.push({
      name,
      sku,
      description,
      unit_price: unitPrice,
      unit: unit || 'unit',
      tax_rate: Math.max(0, Math.min(100, taxRate)),
      hsn_code: hsnCode,
      classification_type: classificationType,
      category,
      isValid,
      error,
    });
  }

  return parsed;
}

interface ProductsClientViewProps {
  initialProducts: Product[];
  currency?: CurrencyCode;
  organization?: Organization;
  country?: string;
}

export function ProductsClientView({
  initialProducts,
  currency = 'INR',
  organization,
  country,
}: ProductsClientViewProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Country tax profile resolution
  const countryProfile = getCountryProfile(country || organization?.country || currency);
  const isIndia = countryProfile.isIndiaGst;
  const isUae = countryProfile.isUaeVat;
  const taxSystem = countryProfile.taxSystem;
  const goodsLabel = organization?.goods_classification_label || countryProfile.goodsClassificationLabel;
  const serviceLabel = organization?.service_classification_label || countryProfile.serviceClassificationLabel;
  const defaultTaxRateVal = organization?.default_tax_rate ?? countryProfile.defaultTaxRate;
  const classificationPresets = getCountryClassificationPresets(countryProfile.code);

  const initialClassType = isIndia ? 'SAC' : 'SERVICE';
  const initialGoodsClassType = isIndia ? 'HSN' : isUae ? 'HS' : 'GOODS';

  // Add Form
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [unit, setUnit] = useState('unit');
  const [taxRate, setTaxRate] = useState(String(defaultTaxRateVal));
  const [hsnCode, setHsnCode] = useState('');
  const [classificationType, setClassificationType] = useState<string>(initialClassType);

  // Edit Form
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState('');
  const [editUnit, setEditUnit] = useState('unit');
  const [editTaxRate, setEditTaxRate] = useState(String(defaultTaxRateVal));
  const [editHsnCode, setEditHsnCode] = useState('');
  const [editClassificationType, setEditClassificationType] = useState<string>(initialClassType);
  const [editIsActive, setEditIsActive] = useState(true);

  // Bulk Import State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkTab, setBulkTab] = useState<'file' | 'paste'>('file');
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkParsedRows, setBulkParsedRows] = useState<ParsedBulkItem[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setName('');
    setSku('');
    setDescription('');
    setUnitPrice('');
    setUnit('unit');
    setTaxRate(String(defaultTaxRateVal));
    setHsnCode('');
    setClassificationType(initialClassType);
    setError(null);
    setIsAddOpen(true);
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = getSampleCsv(countryProfile);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'quoteflow_catalog_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      const parsed = parseProductCsvText(content);
      if (parsed.length === 0) {
        setBulkError('No product rows found in the selected file.');
      } else {
        setBulkParsedRows(parsed);
      }
    };
    reader.onerror = () => {
      setBulkError('Failed to read file. Please ensure it is a valid CSV or text file.');
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (val: string) => {
    setBulkInputText(val);
    setBulkError(null);
    if (!val.trim()) {
      setBulkParsedRows([]);
      return;
    }
    const parsed = parseProductCsvText(val);
    setBulkParsedRows(parsed);
  };

  const handleExecuteBulkImport = async () => {
    setBulkError(null);
    const validRows = bulkParsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setBulkError('Please enter at least 1 valid product with a name.');
      return;
    }

    setIsBulkLoading(true);
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validRows.map((r) => ({
            name: r.name,
            sku: r.sku || undefined,
            description: r.description || undefined,
            unit_price: r.unit_price,
            unit: r.unit,
            tax_rate: r.tax_rate,
            hsn_code: r.hsn_code || undefined,
            classification_type: r.classification_type || undefined,
            category: r.category || undefined,
            is_active: true,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import products');

      setProducts((prev) => [...(data.products || []), ...prev]);
      setBulkSuccess(`Successfully imported ${data.count || validRows.length} items to your catalog!`);
      setTimeout(() => {
        setIsBulkOpen(false);
        setBulkParsedRows([]);
        setBulkInputText('');
        setBulkSuccess(null);
      }, 1800);
    } catch (err: any) {
      setBulkError(err.message || 'Error occurred while saving bulk items.');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
      (p.hsn_code && p.hsn_code.toLowerCase().includes(search.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Product or service name is required.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim() || undefined,
          description: description.trim() || undefined,
          unit_price: parseFloat(unitPrice) || 0,
          unit: unit.trim() || 'unit',
          tax_rate: parseFloat(taxRate) || 0,
          hsn_code: hsnCode.trim() || undefined,
          classification_type: classificationType,
          is_active: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add product');

      setProducts((prev) => [data.product, ...prev]);
      setIsAddOpen(false);
      setName('');
      setSku('');
      setDescription('');
      setUnitPrice('');
      setTaxRate(String(defaultTaxRateVal));
      setHsnCode('');
      setClassificationType(initialClassType);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (prod: Product) => {
    setEditingProduct(prod);
    setEditName(prod.name);
    setEditSku(prod.sku || '');
    setEditDescription(prod.description || '');
    setEditUnitPrice(prod.unit_price.toString());
    setEditUnit(prod.unit || 'unit');
    setEditTaxRate(prod.tax_rate !== undefined ? prod.tax_rate.toString() : String(defaultTaxRateVal));
    setEditHsnCode(prod.hsn_code || '');
    const fallbackType = isIndia
      ? (prod.hsn_code?.startsWith('99') ? 'SAC' : 'HSN')
      : isUae
      ? (prod.hsn_code?.startsWith('SRV') ? 'SERVICE' : 'HS')
      : 'GOODS';
    setEditClassificationType(prod.classification_type || fallbackType);
    setEditIsActive(prod.is_active ?? true);
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError('Product or service name is required.');
      return;
    }

    setIsEditLoading(true);
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          sku: editSku.trim() || undefined,
          description: editDescription.trim() || undefined,
          unit_price: parseFloat(editUnitPrice) || 0,
          unit: editUnit.trim() || 'unit',
          tax_rate: parseFloat(editTaxRate) || 0,
          hsn_code: editHsnCode.trim() || undefined,
          classification_type: editClassificationType,
          is_active: editIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update product');

      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? data.product : p))
      );
      setIsEditOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (!confirm(`Are you sure you want to delete "${prodName}" from your catalog?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete product');

      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error deleting product');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Products & Services
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build your catalog of items to swiftly populate quotation line items.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsBulkOpen(true);
              setBulkError(null);
              setBulkSuccess(null);
            }}
            className="gap-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl shadow-xs"
          >
            <Upload className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Bulk Import</span>
          </Button>

          <Button onClick={handleOpenAddModal} className="gap-2 rounded-xl shadow-md bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold">
            <Plus className="h-4 w-4" />
            <span>Add Item / Service</span>
          </Button>
        </div>
      </div>

      {/* Global Success Banner */}
      {bulkSuccess && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{bulkSuccess}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter catalog by name, SKU, or description..."
          className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-2xs"
        />
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40">
              <tr>
                <th className="py-3.5 px-4">Item / Service Name</th>
                <th className="py-3.5 px-4">
                  {isIndia ? 'SKU / HSN / SAC' : isUae ? 'SKU / HS / VAT' : `SKU / ${goodsLabel}`}
                </th>
                <th className="py-3.5 px-4">Default Unit Price</th>
                <th className="py-3.5 px-4">Unit</th>
                <th className="py-3.5 px-4">Tax Rate ({taxSystem})</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Package className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    <p className="font-semibold text-slate-700">No items found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {search ? 'Try adjusting your search query.' : 'Add your first product or service to get started.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-900">{prod.name}</p>
                      {prod.description && (
                        <p className="text-xs text-slate-500 max-w-md truncate">{prod.description}</p>
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-600">
                      <div className="flex flex-col gap-1">
                        <span>{prod.sku || '-'}</span>
                        {prod.hsn_code && (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 w-fit">
                            <Tag className="h-2.5 w-2.5" />
                            {prod.classification_type || (isIndia ? (prod.hsn_code.startsWith('99') ? 'SAC' : 'HSN') : isUae ? (prod.hsn_code.startsWith('SRV') ? 'SERVICE' : 'HS') : 'CODE')}: {prod.hsn_code}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900">
                      {formatCurrency(prod.unit_price, currency)}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-600">{prod.unit}</td>
                    <td className="py-4 px-4 text-xs text-slate-600">{prod.tax_rate}%</td>
                    <td className="py-4 px-4 text-center">
                      {prod.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditClick(prod)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
                          title="Edit Product"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          disabled={deletingId === prod.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors disabled:opacity-50 shadow-sm"
                          title="Delete Product"
                        >
                          {deletingId === prod.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Product or Service"
        description="Save reusable items to auto-fill pricing and tax in your quotations."
        icon={<Package className="h-5 w-5" />}
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 pt-1">
          {error && (
            <div className="flex items-center gap-2 p-3.5 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Name / Title *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cloud Security Audit"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="SKU / Identifier"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. SRV-SEC-01"
            />
            <Input
              label="Unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. hours, days, units"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label={`Default Price (${currency}) *`}
              type="number"
              min="0"
              step="any"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0.00"
              required
            />
            <div className="space-y-1.5">
              <Input
                label={`Tax Rate (%) - ${taxSystem}`}
                type="number"
                min="0"
                max="100"
                step="any"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder={String(defaultTaxRateVal)}
              />
              {countryProfile.taxRates && countryProfile.taxRates.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Presets:
                  </span>
                  {countryProfile.taxRates.map((tr) => {
                    const isSelected = parseFloat(taxRate) === tr.rate;
                    return (
                      <button
                        key={tr.label}
                        type="button"
                        onClick={() => setTaxRate(String(tr.rate))}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-xl font-bold transition-all shadow-2xs',
                          isSelected
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/20'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                        )}
                      >
                        {tr.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tax Classification Card */}
          <div className="rounded-2xl border border-indigo-100/90 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/60 via-slate-50/40 to-purple-50/40 dark:from-indigo-950/40 dark:via-slate-900/40 dark:to-purple-950/30 p-4 space-y-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {isIndia
                      ? 'GST Tax Classification (HSN / SAC Code)'
                      : isUae
                      ? 'VAT & Commodity Classification'
                      : `${taxSystem} Classification`}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isIndia
                      ? 'Goods use HSN codes (e.g. 8421), services use SAC codes starting with 99 (e.g. 998311).'
                      : isUae
                      ? 'Physical goods use HS codes (e.g. 8421.21), services use VAT supply categories.'
                      : `${countryProfile.name} classification standard for items and services.`}
                  </p>
                </div>
              </div>

              {/* Segmented Toggle for Services vs Goods */}
              <div className="flex items-center p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl shrink-0 self-start sm:self-auto border border-slate-200/90 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setClassificationType(isIndia ? 'SAC' : 'SERVICE')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                    classificationType === 'SAC' || classificationType === 'SERVICE'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                >
                  {isIndia ? 'SAC (Services)' : `${serviceLabel} (Services)`}
                </button>
                <button
                  type="button"
                  onClick={() => setClassificationType(isIndia ? 'HSN' : isUae ? 'HS' : 'GOODS')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                    classificationType === 'HSN' || classificationType === 'HS' || classificationType === 'GOODS'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                >
                  {isIndia ? 'HSN (Goods)' : `${goodsLabel} (Goods)`}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Input
                label={classificationType === 'SAC' || classificationType === 'SERVICE' ? `${serviceLabel} Code` : `${goodsLabel} Code`}
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder={
                  classificationType === 'SAC' || classificationType === 'SERVICE'
                    ? countryProfile.servicePlaceholder
                    : countryProfile.goodsPlaceholder
                }
              />
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Quick Select Standard Code ({countryProfile.name})
                </label>
                <select
                  className="w-full h-10 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-2xs transition-all"
                  onChange={(e) => {
                    const found = classificationPresets.find((c) => c.code === e.target.value);
                    if (found) {
                      setHsnCode(found.code);
                      setClassificationType(found.type);
                      setTaxRate(found.defaultTaxRate.toString());
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">-- Choose Standard {countryProfile.name} Code --</option>
                  {classificationPresets.map((c) => (
                    <option key={c.code} value={c.code}>
                      [{c.type} {c.code}] {c.description.slice(0, 36)}... ({c.defaultTaxRate}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Detailed description of deliverables..."
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Save to Catalog</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingProduct(null);
        }}
        title="Edit Product or Service"
        description="Update pricing, tax rates, and specifications for this catalog item."
        icon={<Package className="h-5 w-5" />}
        maxWidth="2xl"
      >
        <form onSubmit={handleUpdateProduct} className="space-y-4 pt-1">
          {editError && (
            <div className="flex items-center gap-2 p-3.5 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <Input
            label="Name / Title *"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="e.g. Cloud Security Audit"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="SKU / Identifier"
              value={editSku}
              onChange={(e) => setEditSku(e.target.value)}
              placeholder="e.g. SRV-SEC-01"
            />
            <Input
              label="Unit"
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value)}
              placeholder="e.g. hours, days, units"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label={`Default Price (${currency}) *`}
              type="number"
              min="0"
              step="any"
              value={editUnitPrice}
              onChange={(e) => setEditUnitPrice(e.target.value)}
              placeholder="0.00"
              required
            />
            <div className="space-y-1.5">
              <Input
                label={`Tax Rate (%) - ${taxSystem}`}
                type="number"
                min="0"
                max="100"
                step="any"
                value={editTaxRate}
                onChange={(e) => setEditTaxRate(e.target.value)}
                placeholder={String(defaultTaxRateVal)}
              />
              {countryProfile.taxRates && countryProfile.taxRates.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Presets:
                  </span>
                  {countryProfile.taxRates.map((tr) => {
                    const isSelected = parseFloat(editTaxRate) === tr.rate;
                    return (
                      <button
                        key={tr.label}
                        type="button"
                        onClick={() => setEditTaxRate(String(tr.rate))}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-xl font-bold transition-all shadow-2xs',
                          isSelected
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/20'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                        )}
                      >
                        {tr.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tax Classification Card */}
          <div className="rounded-2xl border border-indigo-100/90 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/60 via-slate-50/40 to-purple-50/40 dark:from-indigo-950/40 dark:via-slate-900/40 dark:to-purple-950/30 p-4 space-y-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {isIndia
                      ? 'GST Tax Classification (HSN / SAC Code)'
                      : isUae
                      ? 'VAT & Commodity Classification'
                      : `${taxSystem} Classification`}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isIndia
                      ? 'Goods use HSN codes (e.g. 8421), services use SAC codes starting with 99 (e.g. 998311).'
                      : isUae
                      ? 'Physical goods use HS codes (e.g. 8421.21), services use VAT supply categories.'
                      : `${countryProfile.name} classification standard for items and services.`}
                  </p>
                </div>
              </div>

              {/* Segmented Toggle for Services vs Goods */}
              <div className="flex items-center p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl shrink-0 self-start sm:self-auto border border-slate-200/90 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditClassificationType(isIndia ? 'SAC' : 'SERVICE')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                    editClassificationType === 'SAC' || editClassificationType === 'SERVICE'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                >
                  {isIndia ? 'SAC (Services)' : `${serviceLabel} (Services)`}
                </button>
                <button
                  type="button"
                  onClick={() => setEditClassificationType(isIndia ? 'HSN' : isUae ? 'HS' : 'GOODS')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                    editClassificationType === 'HSN' || editClassificationType === 'HS' || editClassificationType === 'GOODS'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                >
                  {isIndia ? 'HSN (Goods)' : `${goodsLabel} (Goods)`}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Input
                label={editClassificationType === 'SAC' || editClassificationType === 'SERVICE' ? `${serviceLabel} Code` : `${goodsLabel} Code`}
                value={editHsnCode}
                onChange={(e) => setEditHsnCode(e.target.value)}
                placeholder={
                  editClassificationType === 'SAC' || editClassificationType === 'SERVICE'
                    ? countryProfile.servicePlaceholder
                    : countryProfile.goodsPlaceholder
                }
              />
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Quick Select Standard Code ({countryProfile.name})
                </label>
                <select
                  className="w-full h-10 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-2xs transition-all"
                  onChange={(e) => {
                    const found = classificationPresets.find((c) => c.code === e.target.value);
                    if (found) {
                      setEditHsnCode(found.code);
                      setEditClassificationType(found.type);
                      setEditTaxRate(found.defaultTaxRate.toString());
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">-- Choose Standard {countryProfile.name} Code --</option>
                  {classificationPresets.map((c) => (
                    <option key={c.code} value={c.code}>
                      [{c.type} {c.code}] {c.description.slice(0, 36)}... ({c.defaultTaxRate}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Textarea
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={2}
            placeholder="Detailed description of deliverables..."
          />

          <div className="pt-1">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="h-4 w-4 rounded-md border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Active catalog item (available for line items in quotations)</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsEditOpen(false);
                setEditingProduct(null);
              }}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isEditLoading}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isEditLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => {
          if (!isBulkLoading) {
            setIsBulkOpen(false);
            setBulkParsedRows([]);
            setBulkInputText('');
            setBulkError(null);
          }
        }}
        title="Bulk Import Products & Services"
        description="Quickly import multiple items, materials, or services using a CSV file or copying directly from Excel / Google Sheets."
        icon={<Upload className="h-5 w-5" />}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {/* Header Actions / Template Download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">Need the correct column structure?</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadSampleCsv}
              className="gap-1.5 text-xs text-emerald-700 border-emerald-300 bg-white hover:bg-emerald-50 h-8 self-start sm:self-auto shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Sample CSV Template</span>
            </Button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBulkTab('file')}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                bulkTab === 'file'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload CSV File
            </button>
            <button
              type="button"
              onClick={() => setBulkTab('paste')}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                bulkTab === 'paste'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paste CSV / Excel Data
            </button>
          </div>

          {bulkError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{bulkError}</span>
            </div>
          )}

          {bulkTab === 'file' ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Select File (.csv, .tsv, .txt)</label>
              <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-indigo-50/20 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  Click to browse or drag and drop your spreadsheet
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported formats: CSV, TSV (comma or tab delimited)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Paste rows from Excel, Google Sheets, or CSV:
              </label>
              <textarea
                rows={5}
                value={bulkInputText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder={
                  isUae
                    ? `Item Name, SKU, Description, Unit Price, Unit, Tax Rate, HS or Service Code, Type, Category\nEnterprise RO Plant, RO-5000, 5000 LPH multi-stage filtration plant, 35000, plant, 5, 8421.21, HS, Water Equipment\nQuarterly AMC, AMC-GOLD, 24/7 SLA onsite comprehensive maintenance, 4500, year, 5, SRV-MAINT-5, SERVICE, Maintenance`
                    : isIndia
                    ? `Item Name, SKU, Description, Unit Price, Unit, Tax Rate, HSN Code, Type, Category\nRO Membrane 8040, MEM-8040, High rejection membrane, 14500, piece, 18, 8421, HSN, Spares\nWater Quality Audit, SRV-AUDIT, Comprehensive lab testing, 8000, report, 18, 998311, SAC, Services`
                    : `Item Name, SKU, Description, Unit Price, Unit, Tax Rate, Code, Type, Category\nCommercial RO Filter, RO-5000, Multi-stage commercial filtration plant, 9500, unit, ${defaultTaxRateVal}, 8421.21, GOODS, Equipment\nSystem Maintenance, AMC-PREM, Preventative maintenance service, 1200, year, ${defaultTaxRateVal}, SVC-MAINT, SERVICE, Maintenance`
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          )}

          {/* Live Preview Table */}
          {bulkParsedRows.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <span>Parsed Preview:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                    {bulkParsedRows.filter((r) => r.isValid).length} ready
                  </span>
                  {bulkParsedRows.some((r) => !r.isValid) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                      {bulkParsedRows.filter((r) => !r.isValid).length} invalid
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBulkParsedRows([]);
                    setBulkInputText('');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  Clear
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Item / Service</th>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3">Unit</th>
                      <th className="py-2 px-3">Tax</th>
                      <th className="py-2 px-3">{isIndia ? 'HSN/SAC' : isUae ? 'HS Code / VAT' : 'Classification'}</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {bulkParsedRows.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/30'}>
                        <td className="py-2 px-3 font-sans font-medium text-slate-800">
                          {row.name || <span className="text-rose-500 italic">Empty Name</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{row.sku || '—'}</td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-800">
                          {formatCurrency(row.unit_price, currency)}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{row.unit}</td>
                        <td className="py-2 px-3 text-slate-600">{row.tax_rate}%</td>
                        <td className="py-2 px-3 text-slate-600">
                          {row.hsn_code ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px]">
                              {row.classification_type && (
                                <span className="px-1 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">
                                  {row.classification_type}
                                </span>
                              )}
                              {row.hsn_code}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600" title={row.error}>
                              <XCircle className="h-3.5 w-3.5" />
                              <span>{row.error}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              disabled={isBulkLoading}
              onClick={() => {
                setIsBulkOpen(false);
                setBulkParsedRows([]);
                setBulkInputText('');
                setBulkError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={bulkParsedRows.filter((r) => r.isValid).length === 0 || isBulkLoading}
              isLoading={isBulkLoading}
              onClick={handleExecuteBulkImport}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              <span>
                Import {bulkParsedRows.filter((r) => r.isValid).length || 0} Products
              </span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
