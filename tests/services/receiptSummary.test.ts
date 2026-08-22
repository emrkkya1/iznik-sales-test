import { describe, it, expect } from 'vitest';

import { buildReceiptSummary } from '@/services/receiptSummary';
import type {
  Branch,
  Delivery,
  DeliveryItem,
  Payment,
  Product,
} from '@/types';

function makeDelivery(overrides: Partial<Delivery> = {}): Delivery {
  return {
    id: 'delivery-1',
    branchId: 'branch-1',
    userId: 'user-1',
    totalSalesAmount: 775,
    date: '2024-03-15',
    idempotencyKey: null,
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    createdAt: '2024-03-15T10:00:00Z',
    ...overrides,
  };
}

function makeBranch(overrides: Partial<Branch> = {}): Branch {
  return {
    id: 'branch-1',
    districtId: 'district-1',
    name: 'Özpaş',
    currentBalance: 1475,
    openingBalance: 0,
    isActive: true,
    ...overrides,
  };
}

function makeItems(): DeliveryItem[] {
  return [
    {
      id: 'item-1',
      deliveryId: 'delivery-1',
      productId: 'product-1',
      deliveredQuantity: 10,
      returnedQuantity: 3,
      netQuantity: 7,
      unitPrice: 85,
    },
    {
      id: 'item-2',
      deliveryId: 'delivery-1',
      productId: 'product-2',
      deliveredQuantity: 5,
      returnedQuantity: 0,
      netQuantity: 5,
      unitPrice: 60,
    },
  ];
}

function makeProducts(): Product[] {
  return [
    { id: 'product-1', name: 'Büyük Ekmek', imageUrl: null, isActive: true },
    { id: 'product-2', name: 'Çavdar', imageUrl: null, isActive: true },
  ];
}

function makePayments(): Payment[] {
  return [
    {
      id: 'payment-1',
      branchId: 'branch-1',
      userId: 'user-1',
      deliveryId: 'delivery-1',
      amount: 300,
      paymentType: 'field_collection',
      date: '2024-03-15',
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
    },
  ];
}

describe('buildReceiptSummary', () => {
  it('builds item summaries with line totals', () => {
    const summary = buildReceiptSummary({
      delivery: makeDelivery(),
      items: makeItems(),
      products: makeProducts(),
      payments: makePayments(),
      branch: makeBranch(),
    });

    expect(summary.items).toHaveLength(2);
    expect(summary.items[0]).toEqual({
      productName: 'Büyük Ekmek',
      deliveredQuantity: 10,
      returnedQuantity: 3,
      netQuantity: 7,
      unitPrice: 85,
      lineTotal: 595,
    });
    expect(summary.items[1].lineTotal).toBe(300);
  });

  it('sums payment amounts', () => {
    const summary = buildReceiptSummary({
      delivery: makeDelivery(),
      items: makeItems(),
      products: makeProducts(),
      payments: makePayments(),
      branch: makeBranch(),
    });

    expect(summary.paymentAmount).toBe(300);
  });

  it('derives previous balance correctly', () => {
    // new_balance = previous_balance + sales_total - payment
    // previous_balance = new_balance - sales_total + payment
    // 1475 - 775 + 300 = 1000
    const summary = buildReceiptSummary({
      delivery: makeDelivery(),
      items: makeItems(),
      products: makeProducts(),
      payments: makePayments(),
      branch: makeBranch(),
    });

    expect(summary.previousBalance).toBe(1000);
    expect(summary.newBalance).toBe(1475);
  });

  it('handles negative sales totals (returns exceed deliveries)', () => {
    const summary = buildReceiptSummary({
      delivery: makeDelivery({ totalSalesAmount: -850 }),
      items: makeItems(),
      products: makeProducts(),
      payments: makePayments(),
      branch: makeBranch(),
    });

    // previous = 1475 - (-850) + 300 = 2625
    expect(summary.previousBalance).toBe(2625);
  });

  it('uses fallback name for unknown products', () => {
    const summary = buildReceiptSummary({
      delivery: makeDelivery(),
      items: makeItems(),
      products: [], // no products provided
      payments: makePayments(),
      branch: makeBranch(),
    });

    expect(summary.items[0].productName).toBe('—');
  });
});
