import { describe, it, expect } from 'vitest';
import { store } from '@/lib/supabase/data-store';
import { POST as bulkImportRoute } from '@/app/api/products/bulk/route';
import { NextRequest } from 'next/server';

describe('Product & Service Bulk Import Suite', () => {
  const TEST_ORG_ID = 'a0000000-0000-0000-0000-000000000001';

  it('creates multiple products in batch using store.createProductsBulk', async () => {
    const items = [
      {
        organization_id: TEST_ORG_ID,
        name: 'Bulk RO Membrane Filter 4040',
        sku: 'MEM-4040',
        description: 'Industrial reverse osmosis membrane',
        unit_price: 8500,
        unit: 'piece',
        tax_rate: 18,
        hsn_code: '842121',
        classification_type: 'HSN' as const,
        category: 'Membranes',
        is_active: true,
      },
      {
        organization_id: TEST_ORG_ID,
        name: 'Comprehensive Annual AMC Service',
        sku: 'SRV-AMC-PRO',
        description: 'Quarterly onsite inspection and filter servicing',
        unit_price: 36000,
        unit: 'year',
        tax_rate: 18,
        hsn_code: '998717',
        classification_type: 'SAC' as const,
        category: 'Maintenance',
        is_active: true,
      },
    ];

    const created = await store.createProductsBulk(items);
    expect(created.length).toBe(2);
    expect(created[0].id).toBeDefined();
    expect(created[0].name).toBe('Bulk RO Membrane Filter 4040');
    expect(created[0].hsn_code).toBe('842121');
    expect(created[0].classification_type).toBe('HSN');

    expect(created[1].id).toBeDefined();
    expect(created[1].name).toBe('Comprehensive Annual AMC Service');
    expect(created[1].hsn_code).toBe('998717');
    expect(created[1].classification_type).toBe('SAC');

    // Verify products are retrievable
    const allProducts = await store.getProducts(TEST_ORG_ID);
    expect(allProducts.some((p) => p.name === 'Bulk RO Membrane Filter 4040')).toBe(true);
    expect(allProducts.some((p) => p.name === 'Comprehensive Annual AMC Service')).toBe(true);
  });

  it('processes bulk import via POST /api/products/bulk with validation', async () => {
    const payload = {
      items: [
        {
          name: 'Activated Carbon Block 10 inch',
          sku: 'CTO-10',
          description: 'High chlorine and odor reduction filter',
          unit_price: '450.00',
          unit: 'piece',
          tax_rate: '18%',
          hsn_code: '842199',
          classification_type: 'HSN',
          category: 'Filters',
        },
        {
          name: 'Water Quality Testing & TDS Analysis',
          sku: 'TEST-LAB',
          description: 'Comprehensive lab report of potable water standards',
          unit_price: 2500,
          unit: 'sample',
          tax_rate: 18,
          hsn_code: '998311',
          classification_type: 'SAC',
          category: 'Testing Services',
        },
        {
          // Invalid row missing name
          sku: 'INVALID-ROW',
          unit_price: 100,
        },
      ],
    };

    const req = new NextRequest('http://localhost/api/products/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await bulkImportRoute(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.count).toBe(2);
    expect(json.products.length).toBe(2);
    expect(json.errors).toBeDefined();
    expect(json.errors.length).toBe(1);
    expect(json.errors[0].error).toContain('Name is required');

    expect(json.products[0].name).toBe('Activated Carbon Block 10 inch');
    expect(json.products[0].unit_price).toBe(450);
    expect(json.products[0].tax_rate).toBe(18);
    expect(json.products[0].classification_type).toBe('HSN');
  });

  it('rejects empty payload with 400 Bad Request', async () => {
    const req = new NextRequest('http://localhost/api/products/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    });

    const res = await bulkImportRoute(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('No items provided for bulk import');
  });

  it('persists newly created product and retains HSN, category, and clean description on page refresh (getProducts)', async () => {
    const newProduct = await store.createProduct({
      organization_id: TEST_ORG_ID,
      name: 'Smart IoT Water Flow Meter',
      sku: 'IOT-WFM-01',
      description: 'Digital ultrasonic water flow sensor with telemetry',
      unit_price: 14500,
      unit: 'piece',
      tax_rate: 18,
      hsn_code: '902610',
      classification_type: 'HSN',
      category: 'Sensors',
      is_active: true,
    });

    expect(newProduct.id).toBeDefined();
    expect(newProduct.name).toBe('Smart IoT Water Flow Meter');
    expect(newProduct.hsn_code).toBe('902610');
    expect(newProduct.classification_type).toBe('HSN');
    expect(newProduct.category).toBe('Sensors');
    expect(newProduct.description).toBe('Digital ultrasonic water flow sensor with telemetry');

    // Simulate page refresh / subsequent getProducts query
    const productsAfterRefresh = await store.getProducts(TEST_ORG_ID);
    const found = productsAfterRefresh.find((p) => p.id === newProduct.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Smart IoT Water Flow Meter');
    expect(found?.hsn_code).toBe('902610');
    expect(found?.classification_type).toBe('HSN');
    expect(found?.category).toBe('Sensors');
    expect(found?.description).toBe('Digital ultrasonic water flow sensor with telemetry');

    // Test update
    const updated = await store.updateProduct(
      newProduct.id,
      {
        unit_price: 15200,
        hsn_code: '902620',
      },
      TEST_ORG_ID
    );
    expect(updated.unit_price).toBe(15200);
    expect(updated.hsn_code).toBe('902620');

    const productsAfterUpdate = await store.getProducts(TEST_ORG_ID);
    const foundUpdated = productsAfterUpdate.find((p) => p.id === newProduct.id);
    expect(foundUpdated?.unit_price).toBe(15200);
    expect(foundUpdated?.hsn_code).toBe('902620');

    // Cleanup
    await store.deleteProduct(newProduct.id, TEST_ORG_ID);
    const productsAfterDelete = await store.getProducts(TEST_ORG_ID);
    expect(productsAfterDelete.some((p) => p.id === newProduct.id)).toBe(false);
  });
});
