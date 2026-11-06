import { describe, it, expect } from 'vitest';
import { store } from '@/lib/supabase/data-store';

describe('Product & Service Persistence Suite', () => {
  const TEST_ORG_ID = 'a0000000-0000-0000-0000-000000000001';

  it('persists newly added product and survives memory purge (simulating page refresh / worker restart)', async () => {
    const created = await store.createProduct({
      organization_id: TEST_ORG_ID,
      name: 'High-Density Carbon Filter 20-inch',
      sku: 'FLT-HD-20',
      description: 'Extruded activated carbon filter for sediment & VOC removal',
      unit_price: 1850,
      unit: 'piece',
      tax_rate: 18,
      hsn_code: '842199',
      classification_type: 'HSN',
      category: 'Filter Cartridges',
      is_active: true,
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('High-Density Carbon Filter 20-inch');
    expect(created.hsn_code).toBe('842199');
    expect(created.classification_type).toBe('HSN');
    expect(created.category).toBe('Filter Cartridges');
    expect(created.description).toBe('Extruded activated carbon filter for sediment & VOC removal');

    // Simulate complete worker restart / isolate teardown by wiping in-memory Map
    (store as any).products.clear();

    // Call getProducts simulating fresh page load
    const products = await store.getProducts(TEST_ORG_ID);
    const item = products.find((p) => p.id === created.id);

    expect(item).toBeDefined();
    expect(item?.name).toBe('High-Density Carbon Filter 20-inch');
    expect(item?.sku).toBe('FLT-HD-20');
    expect(item?.unit_price).toBe(1850);
    expect(item?.hsn_code).toBe('842199');
    expect(item?.classification_type).toBe('HSN');
    expect(item?.category).toBe('Filter Cartridges');
    expect(item?.description).toBe('Extruded activated carbon filter for sediment & VOC removal');

    // Simulate updating product
    const updated = await store.updateProduct(
      created.id,
      {
        unit_price: 2100,
        category: 'Premium Cartridges',
      },
      TEST_ORG_ID
    );

    expect(updated.unit_price).toBe(2100);
    expect(updated.category).toBe('Premium Cartridges');

    // Wipe memory again to verify update persisted
    (store as any).products.clear();

    const productsAfterUpdate = await store.getProducts(TEST_ORG_ID);
    const updatedItem = productsAfterUpdate.find((p) => p.id === created.id);
    expect(updatedItem).toBeDefined();
    expect(updatedItem?.unit_price).toBe(2100);
    expect(updatedItem?.category).toBe('Premium Cartridges');
    expect(updatedItem?.hsn_code).toBe('842199');

    // Clean up
    await store.deleteProduct(created.id, TEST_ORG_ID);
    (store as any).products.clear();

    const productsAfterDelete = await store.getProducts(TEST_ORG_ID);
    expect(productsAfterDelete.some((p) => p.id === created.id)).toBe(false);
  });
});
