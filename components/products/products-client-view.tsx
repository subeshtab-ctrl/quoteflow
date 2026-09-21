'use client';

import React, { useState } from 'react';
import { Product, CurrencyCode } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/quotations/calculations';
import { Plus, Search, Package, CheckCircle2, XCircle, Pencil, Trash2, Loader2 } from 'lucide-react';

interface ProductsClientViewProps {
  initialProducts: Product[];
  currency?: CurrencyCode;
}

export function ProductsClientView({ initialProducts, currency = 'INR' }: ProductsClientViewProps) {
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

  // Add Form
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [unit, setUnit] = useState('unit');
  const [taxRate, setTaxRate] = useState('18');

  // Edit Form
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState('');
  const [editUnit, setEditUnit] = useState('unit');
  const [editTaxRate, setEditTaxRate] = useState('18');
  const [editIsActive, setEditIsActive] = useState(true);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
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
      setTaxRate('18');
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
    setEditTaxRate(prod.tax_rate.toString());
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
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Products & Services
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Build your catalog of items to swiftly populate quotation line items.
          </p>
        </div>

        <Button onClick={() => setIsAddOpen(true)} className="gap-2 shadow-md">
          <Plus className="h-4 w-4" />
          <span>Add Item / Service</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter catalog by name, SKU, or description..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/50">
              <tr>
                <th className="py-3.5 px-4">Item / Service Name</th>
                <th className="py-3.5 px-4">SKU / Code</th>
                <th className="py-3.5 px-4">Default Unit Price</th>
                <th className="py-3.5 px-4">Unit</th>
                <th className="py-3.5 px-4">Tax Rate</th>
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
                      {prod.sku || '-'}
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
        maxWidth="md"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          <Input
            label="Name / Title *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cloud Security Audit"
            required
          />

          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-2 gap-3">
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
            <Input
              label="Tax Rate (%)"
              type="number"
              min="0"
              max="100"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="18"
            />
          </div>

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Detailed description of deliverables..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Save to Catalog
            </Button>
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
        maxWidth="md"
      >
        <form onSubmit={handleUpdateProduct} className="space-y-4">
          {editError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {editError}
            </div>
          )}

          <Input
            label="Name / Title *"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="e.g. Cloud Security Audit"
            required
          />

          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-2 gap-3">
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
            <Input
              label="Tax Rate (%)"
              type="number"
              min="0"
              max="100"
              value={editTaxRate}
              onChange={(e) => setEditTaxRate(e.target.value)}
              placeholder="18"
            />
          </div>

          <Textarea
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={2}
            placeholder="Detailed description of deliverables..."
          />

          <div className="pt-1">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Active catalog item (available for line items in quotations)</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setEditingProduct(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isEditLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
