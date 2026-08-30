import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { parseBranchAnalyticsPage } from '@/services/supabase/analyticsSchema';

import {
  createAdminClient,
  createAnonClient,
  createStaffClient,
  serviceClient,
  type AdminClient,
  type AnonClient,
} from './_helpers/clients';

type FixtureIds = {
  cityId: string;
  districtId: string;
  branchWithActivityId: string;
  branchEmptyId: string;
  branchInactiveId: string;
  productId: string;
  branchProductId: string;
  deliveryIds: string[];
  paymentIds: string[];
  deletedDeliveryId: string;
  deletedPaymentId: string;
};

const ids: Partial<FixtureIds> = {};

const PREFIX = `ITEST ${Date.now().toString(36)}`;

function expectIsoDate(value: string | null): string {
  expect(value).not.toBeNull();
  expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  return value as string;
}

async function seedFixtures(service: AdminClient): Promise<FixtureIds> {
  const city = await service.from('cities').insert({ name: `${PREFIX} Şehir` }).select('id').single();
  if (city.error || !city.data) throw new Error(`City insert failed: ${city.error?.message}`);
  ids.cityId = city.data.id;

  const district = await service
    .from('districts')
    .insert({ city_id: ids.cityId!, name: `${PREFIX} İlçe` })
    .select('id')
    .single();
  if (district.error || !district.data) throw new Error(`District insert failed: ${district.error?.message}`);
  ids.districtId = district.data.id;

  const branchWithActivity = await service
    .from('branches')
    .insert({
      district_id: ids.districtId,
      name: `${PREFIX} Aktif Şube`,
      current_balance: -125.5,
      is_active: true,
    })
    .select('id')
    .single();
  if (branchWithActivity.error || !branchWithActivity.data) {
    throw new Error(`Active branch insert failed: ${branchWithActivity.error?.message}`);
  }
  ids.branchWithActivityId = branchWithActivity.data.id;

  const branchEmpty = await service
    .from('branches')
    .insert({ district_id: ids.districtId, name: `${PREFIX} Boş Şube`, is_active: true })
    .select('id')
    .single();
  if (branchEmpty.error || !branchEmpty.data) {
    throw new Error(`Empty branch insert failed: ${branchEmpty.error?.message}`);
  }
  ids.branchEmptyId = branchEmpty.data.id;

  const branchInactive = await service
    .from('branches')
    .insert({
      district_id: ids.districtId,
      name: `${PREFIX} Pasif Şube`,
      is_active: false,
      current_balance: 0,
    })
    .select('id')
    .single();
  if (branchInactive.error || !branchInactive.data) {
    throw new Error(`Inactive branch insert failed: ${branchInactive.error?.message}`);
  }
  ids.branchInactiveId = branchInactive.data.id;

  const product = await service
    .from('products')
    .insert({ name: `${PREFIX} Ürün`, is_active: true })
    .select('id')
    .single();
  if (product.error || !product.data) {
    throw new Error(`Product insert failed: ${product.error?.message}`);
  }
  ids.productId = product.data.id;

  const branchProduct = await service
    .from('branch_products')
    .insert({ branch_id: ids.branchWithActivityId!, product_id: ids.productId!, is_active: true })
    .select('id')
    .single();
  if (branchProduct.error || !branchProduct.data) {
    throw new Error(`Branch product insert failed: ${branchProduct.error?.message}`);
  }
  ids.branchProductId = branchProduct.data.id;

  const adminUser = await service
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single();
  if (adminUser.error || !adminUser.data) throw new Error(`Admin user lookup failed: ${adminUser.error?.message}`);
  const adminId = adminUser.data.id;

  const deliveries: { id: string; date: string; delivered: number; returned: number; total: number }[] = [
    { id: '', date: '2026-08-24', delivered: 10, returned: 2, total: 100 },
    { id: '', date: '2026-08-25', delivered: 5, returned: 1, total: 50 },
    { id: '', date: '2026-08-26', delivered: 5, returned: 2, total: 50 },
  ];

  const deliveryIds: string[] = [];
  for (const d of deliveries) {
    const inserted = await service
      .from('deliveries')
      .insert({
        branch_id: ids.branchWithActivityId!,
        user_id: adminId,
        total_sales_amount: d.total,
        date: d.date,
      })
      .select('id')
      .single();
    if (inserted.error || !inserted.data) {
      throw new Error(`Delivery insert failed: ${inserted.error?.message}`);
    }
    d.id = inserted.data.id;
    deliveryIds.push(inserted.data.id);

    const items = await service.from('delivery_items').insert({
      delivery_id: inserted.data.id,
      product_id: ids.productId!,
      delivered_quantity: d.delivered,
      returned_quantity: d.returned,
      unit_price: 10,
    });
    if (items.error) throw new Error(`Delivery item insert failed: ${items.error.message}`);
  }
  ids.deliveryIds = deliveryIds;

  const payments: { id: string; date: string; amount: number; type: 'field_collection' | 'bank_transfer' }[] = [
    { id: '', date: '2026-08-24', amount: 30, type: 'field_collection' },
    { id: '', date: '2026-08-27', amount: 20, type: 'bank_transfer' },
  ];
  const paymentIds: string[] = [];
  for (const p of payments) {
    const inserted = await service
      .from('payments')
      .insert({
        branch_id: ids.branchWithActivityId!,
        user_id: adminId,
        amount: p.amount,
        payment_type: p.type,
        date: p.date,
      })
      .select('id')
      .single();
    if (inserted.error || !inserted.data) {
      throw new Error(`Payment insert failed: ${inserted.error?.message}`);
    }
    p.id = inserted.data.id;
    paymentIds.push(inserted.data.id);
  }
  ids.paymentIds = paymentIds;

  const deletedDelivery = await service
    .from('deliveries')
    .insert({
      branch_id: ids.branchWithActivityId!,
      user_id: adminId,
      total_sales_amount: 1000,
      date: '2026-08-23',
      deleted_at: new Date().toISOString(),
      deletion_reason: 'integration-test-soft-delete',
    })
    .select('id')
    .single();
  if (deletedDelivery.error || !deletedDelivery.data) {
    throw new Error(`Deleted delivery insert failed: ${deletedDelivery.error?.message}`);
  }
  ids.deletedDeliveryId = deletedDelivery.data.id;

  await service.from('delivery_items').insert({
    delivery_id: ids.deletedDeliveryId!,
    product_id: ids.productId!,
    delivered_quantity: 1000,
    returned_quantity: 999,
    unit_price: 100,
  });

  const deletedPayment = await service
    .from('payments')
    .insert({
      branch_id: ids.branchWithActivityId!,
      user_id: adminId,
      amount: 9999,
      payment_type: 'bank_transfer',
      date: '2026-08-23',
      deleted_at: new Date().toISOString(),
      deletion_reason: 'integration-test-soft-delete',
    })
    .select('id')
    .single();
  if (deletedPayment.error || !deletedPayment.data) {
    throw new Error(`Deleted payment insert failed: ${deletedPayment.error?.message}`);
  }
  ids.deletedPaymentId = deletedPayment.data.id;

  const inactivePayment = await service
    .from('payments')
    .insert({
      branch_id: ids.branchInactiveId!,
      user_id: adminId,
      amount: 50,
      payment_type: 'field_collection',
      date: '2026-08-26',
    })
    .select('id')
    .single();
  if (inactivePayment.error || !inactivePayment.data) {
    throw new Error(`Inactive branch payment insert failed: ${inactivePayment.error?.message}`);
  }
  ids.paymentIds.push(inactivePayment.data.id);

  return ids as FixtureIds;
}

async function cleanupFixtures(service: AdminClient) {
  if (ids.deletedPaymentId) {
    await service.from('payments').delete().eq('id', ids.deletedPaymentId);
  }
  if (ids.paymentIds && ids.paymentIds.length > 0) {
    await service.from('payments').delete().in('id', ids.paymentIds);
  }
  if (ids.deletedDeliveryId) {
    await service.from('delivery_items').delete().eq('delivery_id', ids.deletedDeliveryId);
    await service.from('deliveries').delete().eq('id', ids.deletedDeliveryId);
  }
  if (ids.deliveryIds && ids.deliveryIds.length > 0) {
    await service.from('delivery_items').delete().in('delivery_id', ids.deliveryIds);
    await service.from('deliveries').delete().in('id', ids.deliveryIds);
  }
  if (ids.branchProductId) {
    await service.from('branch_product_prices').delete().eq('branch_product_id', ids.branchProductId);
    await service.from('branch_products').delete().eq('id', ids.branchProductId);
  }
  if (ids.productId) {
    await service.from('products').delete().eq('id', ids.productId);
  }
  if (ids.branchWithActivityId) {
    await service.from('branches').delete().eq('id', ids.branchWithActivityId);
  }
  if (ids.branchEmptyId) {
    await service.from('branches').delete().eq('id', ids.branchEmptyId);
  }
  if (ids.branchInactiveId) {
    await service.from('branches').delete().eq('id', ids.branchInactiveId);
  }
  if (ids.districtId) {
    await service.from('districts').delete().eq('id', ids.districtId);
  }
  if (ids.cityId) {
    await service.from('cities').delete().eq('id', ids.cityId);
  }
}

describe('list_branches_analytics (integration)', () => {
  let admin: AdminClient;
  let staff: AdminClient;
  let anon: AnonClient;
  let service: AdminClient;

  beforeAll(async () => {
    service = serviceClient();
    admin = await createAdminClient();
    staff = await createStaffClient();
    anon = await createAnonClient();
    await seedFixtures(admin);
  }, 60_000);

  afterAll(async () => {
    await cleanupFixtures(service);
  }, 60_000);

  it('aggregates only non-deleted deliveries and payments for the admin', async () => {
    const { data, error } = await admin.rpc('list_branches_analytics', {
      p_search: PREFIX,
      p_limit: 200,
      p_offset: 0,
    });
    expect(error).toBeNull();
    const parsed = parseBranchAnalyticsPage(data);
    const active = parsed.rows.find((row) => row.name === `${PREFIX} Aktif Şube`);
    expect(active).toBeDefined();
    if (!active) throw new Error('Active branch missing');
    expect(Number(active.deliveredQty)).toBe(20);
    expect(Number(active.returnedQty)).toBe(5);
    expect(Number(active.returnRate)).toBeCloseTo(25, 1);
    expect(expectIsoDate(active.lastActivityDate)).toBe('2026-08-27');
    expect(active.isActive).toBe(true);
  });

  it('returns zero quantities and null metrics for an empty branch', async () => {
    const { data, error } = await admin.rpc('list_branches_analytics', {
      p_search: PREFIX,
      p_limit: 200,
      p_offset: 0,
    });
    expect(error).toBeNull();
    const parsed = parseBranchAnalyticsPage(data);
    const empty = parsed.rows.find((row) => row.name === `${PREFIX} Boş Şube`);
    expect(empty).toBeDefined();
    if (!empty) throw new Error('Empty branch missing');
    expect(Number(empty.deliveredQty)).toBe(0);
    expect(Number(empty.returnedQty)).toBe(0);
    expect(empty.returnRate).toBeNull();
    expect(empty.lastActivityDate).toBeNull();
  });

  it('reports payments as the only activity for a branch with no deliveries', async () => {
    const { data, error } = await admin.rpc('list_branches_analytics', {
      p_search: `${PREFIX} Pasif`,
      p_status: 'inactive',
      p_limit: 200,
      p_offset: 0,
    });
    expect(error).toBeNull();
    const parsed = parseBranchAnalyticsPage(data);
    expect(parsed.totalCount).toBe(1);
    const inactive = parsed.rows[0];
    expect(inactive.name).toBe(`${PREFIX} Pasif Şube`);
    expect(Number(inactive.deliveredQty)).toBe(0);
    expect(Number(inactive.returnedQty)).toBe(0);
    expect(inactive.returnRate).toBeNull();
    expect(expectIsoDate(inactive.lastActivityDate)).toBe('2026-08-26');
  });

  it('keeps all branches visible when date filters do not match any activity', async () => {
    const { data, error } = await admin.rpc('list_branches_analytics', {
      p_search: PREFIX,
      p_date_from: '2099-01-01',
      p_date_to: '2099-01-07',
      p_limit: 200,
      p_offset: 0,
    });
    expect(error).toBeNull();
    const parsed = parseBranchAnalyticsPage(data);
    expect(parsed.totalCount).toBe(3);
    for (const row of parsed.rows) {
      expect(Number(row.deliveredQty)).toBe(0);
      expect(Number(row.returnedQty)).toBe(0);
      expect(row.returnRate).toBeNull();
      expect(row.lastActivityDate).toBeNull();
    }
  });

  it('filters activity by an inclusive date range and days-of-week array', async () => {
    const { data, error } = await admin.rpc('list_branches_analytics', {
      p_search: PREFIX,
      p_date_from: '2026-08-25',
      p_date_to: '2026-08-25',
      p_days_of_week: [2],
      p_limit: 200,
      p_offset: 0,
    });
    expect(error).toBeNull();
    const parsed = parseBranchAnalyticsPage(data);
    const active = parsed.rows.find((row) => row.name === `${PREFIX} Aktif Şube`);
    expect(active).toBeDefined();
    if (!active) throw new Error('Active branch missing');
    expect(Number(active.deliveredQty)).toBe(5);
    expect(Number(active.returnedQty)).toBe(1);
    expect(expectIsoDate(active.lastActivityDate)).toBe('2026-08-25');
  });

  it('sorts branches by balance descending', async () => {
    const { data, error } = await admin.rpc('list_branches_analytics', {
      p_search: PREFIX,
      p_sort_by: 'balance',
      p_sort_dir: 'desc',
      p_limit: 200,
      p_offset: 0,
    });
    expect(error).toBeNull();
    const parsed = parseBranchAnalyticsPage(data);
    const balances = parsed.rows.map((row) => Number(row.currentBalance));
    const sorted = [...balances].sort((a, b) => b - a);
    expect(balances).toEqual(sorted);
  });

  it('paginates without overlapping rows', async () => {
    const { data: firstData, error: firstError } = await admin.rpc('list_branches_analytics', {
      p_search: PREFIX,
      p_sort_by: 'name',
      p_sort_dir: 'asc',
      p_limit: 2,
      p_offset: 0,
    });
    expect(firstError).toBeNull();
    const first = parseBranchAnalyticsPage(firstData);
    expect(first.rows.length).toBe(2);

    const { data: secondData, error: secondError } = await admin.rpc('list_branches_analytics', {
      p_search: PREFIX,
      p_sort_by: 'name',
      p_sort_dir: 'asc',
      p_limit: 2,
      p_offset: 2,
    });
    expect(secondError).toBeNull();
    const second = parseBranchAnalyticsPage(secondData);
    expect(second.rows.length).toBe(1);

    const ids = new Set([
      ...first.rows.map((row) => row.branchId),
      ...second.rows.map((row) => row.branchId),
    ]);
    expect(ids.size).toBe(3);
  });

  it('rejects staff callers with an authorization error', async () => {
    const { data, error } = await staff.rpc('list_branches_analytics', { p_limit: 50, p_offset: 0 });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Not authorized/i);
  });

  it('rejects anonymous callers', async () => {
    const { data, error } = await anon.rpc('list_branches_analytics', { p_limit: 50, p_offset: 0 });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });
});
