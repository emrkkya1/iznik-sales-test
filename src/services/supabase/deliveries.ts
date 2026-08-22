import type { DeliveryRepository } from '@/services/contracts';
import type {
  Branch,
  Delivery,
  DeliveryItem,
  DeliveryWithItems,
  Payment,
  Product,
  ReceiptSummary,
} from '@/types';

import { buildReceiptSummary } from '../receiptSummary';
import { supabaseClient } from './supabaseClient';

function mapDelivery(row: {
  id: string;
  branch_id: string;
  user_id: string;
  total_sales_amount: number;
  date: string;
  idempotency_key: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  deletion_reason: string | null;
  created_at: string;
}): Delivery {
  return {
    id: row.id,
    branchId: row.branch_id,
    userId: row.user_id,
    totalSalesAmount: row.total_sales_amount,
    date: row.date,
    idempotencyKey: row.idempotency_key,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    deletionReason: row.deletion_reason,
    createdAt: row.created_at,
  };
}

function mapDeliveryItem(row: {
  id: string;
  delivery_id: string;
  product_id: string;
  delivered_quantity: number;
  returned_quantity: number;
  net_quantity: number;
  unit_price: number;
}): DeliveryItem {
  return {
    id: row.id,
    deliveryId: row.delivery_id,
    productId: row.product_id,
    deliveredQuantity: row.delivered_quantity,
    returnedQuantity: row.returned_quantity,
    netQuantity: row.net_quantity,
    unitPrice: row.unit_price,
  };
}

function mapPayment(row: {
  id: string;
  branch_id: string;
  user_id: string;
  delivery_id: string | null;
  amount: number;
  payment_type: 'field_collection' | 'bank_transfer';
  date: string;
  deleted_at: string | null;
  deleted_by: string | null;
  deletion_reason: string | null;
}): Payment {
  return {
    id: row.id,
    branchId: row.branch_id,
    userId: row.user_id,
    deliveryId: row.delivery_id,
    amount: row.amount,
    paymentType: row.payment_type,
    date: row.date,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    deletionReason: row.deletion_reason,
  };
}

// Fetches all related rows needed to build a receipt summary.
async function fetchReceiptSummary(deliveryId: string): Promise<ReceiptSummary> {
  const { data: delivery, error: deliveryError } = await supabaseClient
    .from('deliveries')
    .select(
      'id, branch_id, user_id, total_sales_amount, date, idempotency_key, deleted_at, deleted_by, deletion_reason, created_at',
    )
    .eq('id', deliveryId)
    .single();

  if (deliveryError) throw deliveryError;

  const { data: items, error: itemsError } = await supabaseClient
    .from('delivery_items')
    .select(
      'id, delivery_id, product_id, delivered_quantity, returned_quantity, net_quantity, unit_price',
    )
    .eq('delivery_id', deliveryId);

  if (itemsError) throw itemsError;

  const { data: payments, error: paymentsError } = await supabaseClient
    .from('payments')
    .select(
      'id, branch_id, user_id, delivery_id, amount, payment_type, date, deleted_at, deleted_by, deletion_reason',
    )
    .eq('delivery_id', deliveryId)
    .is('deleted_at', null);

  if (paymentsError) throw paymentsError;

  const { data: branch, error: branchError } = await supabaseClient
    .from('branches')
    .select('id, district_id, name, current_balance, opening_balance, is_active')
    .eq('id', delivery.branch_id)
    .single();

  if (branchError) throw branchError;

  const productIds = (items ?? []).map((item) => item.product_id);
  const { data: products, error: productsError } = await supabaseClient
    .from('products')
    .select('id, name, image_url, is_active')
    .in('id', productIds);

  if (productsError) throw productsError;

  return buildReceiptSummary({
    delivery: mapDelivery(delivery),
    items: (items ?? []).map(mapDeliveryItem),
    products: (products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.image_url,
      isActive: p.is_active,
    })) satisfies Product[],
    payments: (payments ?? []).map(mapPayment),
    branch: {
      id: branch.id,
      districtId: branch.district_id,
      name: branch.name,
      currentBalance: branch.current_balance,
      openingBalance: branch.opening_balance,
      isActive: branch.is_active,
    } satisfies Branch,
  });
}

export const supabaseDeliveryRepository: DeliveryRepository = {
  async listMyDeliveries() {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabaseClient
      .from('deliveries')
      .select(
        'id, branch_id, user_id, total_sales_amount, date, idempotency_key, deleted_at, deleted_by, deletion_reason, created_at',
      )
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data ?? []).map(mapDelivery);
  },

  async getDelivery(id) {
    const { data, error } = await supabaseClient
      .from('deliveries')
      .select(
        `
        id,
        branch_id,
        user_id,
        total_sales_amount,
        date,
        idempotency_key,
        deleted_at,
        deleted_by,
        deletion_reason,
        created_at,
        branches (name),
        delivery_items (
          id, delivery_id, product_id, delivered_quantity, returned_quantity, net_quantity, unit_price,
          products (name)
        ),
        payments (
          id, branch_id, user_id, delivery_id, amount, payment_type, date, deleted_at, deleted_by, deletion_reason
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error) throw error;

    const delivery = data as {
      id: string;
      branch_id: string;
      user_id: string;
      total_sales_amount: number;
      date: string;
      idempotency_key: string | null;
      deleted_at: string | null;
      deleted_by: string | null;
      deletion_reason: string | null;
      created_at: string;
      branches: { name: string } | null;
      delivery_items: {
        id: string;
        delivery_id: string;
        product_id: string;
        delivered_quantity: number;
        returned_quantity: number;
        net_quantity: number;
        unit_price: number;
        products: { name: string } | null;
      }[];
      payments: {
        id: string;
        branch_id: string;
        user_id: string;
        delivery_id: string | null;
        amount: number;
        payment_type: 'field_collection' | 'bank_transfer';
        date: string;
        deleted_at: string | null;
        deleted_by: string | null;
        deletion_reason: string | null;
      }[];
    };

    const items = delivery.delivery_items.map((item) => ({
      ...mapDeliveryItem(item),
      productName: item.products?.name ?? '—',
    }));

    return {
      ...mapDelivery(delivery),
      branchName: delivery.branches?.name ?? '—',
      items,
      payments: delivery.payments.map(mapPayment),
    } satisfies DeliveryWithItems;
  },

  async createDelivery(input, idempotencyKey) {
    const { data, error } = await supabaseClient.rpc('create_delivery_atomic', {
      p_branch_id: input.branchId,
      p_items: input.items,
      p_payment_amount: input.paymentAmount,
      p_payment_type: input.paymentType,
      p_date: input.date,
      p_idempotency_key: idempotencyKey,
    });

    if (error) throw error;

    return fetchReceiptSummary(data);
  },

  async updateDelivery(input) {
    const { error } = await supabaseClient.rpc('update_delivery_atomic', {
      p_delivery_id: input.deliveryId,
      p_items: input.items,
      p_date: input.date,
    });

    if (error) throw error;

    return fetchReceiptSummary(input.deliveryId);
  },

  async softDeleteDelivery(id, reason) {
    const { error } = await supabaseClient.rpc('soft_delete_delivery_atomic', {
      p_delivery_id: id,
      p_deletion_reason: reason,
    });

    if (error) throw error;
  },
};
