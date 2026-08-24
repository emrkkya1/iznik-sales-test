import { describe, it, expect } from 'vitest';

import { computeReceiptPreview } from '@/utils/receiptPreview';
import type { BranchProductWithPrice } from '@/types';

function product(id: string, name: string, price: number): BranchProductWithPrice {
  return {
    id,
    branchId: 'b1',
    productId: id,
    isActive: true,
    productName: name,
    productImageUrl: null,
    currentPrice: price,
  };
}

describe('computeReceiptPreview', () => {
  it('computes required amount and lines from quantities', () => {
    // Cash-flow convention ("+ means we got money"): previousBalance = 100
    // means we have 100 cash in hand; delivery of 40 reduces it to 60.
    const products = [product('p1', 'Ekmek', 10), product('p2', 'Simit', 5)];
    const preview = computeReceiptPreview(products, { p1: 3, p2: 2 }, 0, 100);

    expect(preview.lines).toHaveLength(2);
    expect(preview.requiredAmount).toBe(40);
    expect(preview.resultingBalance).toBe(60);
  });

  it('skips products with zero or missing quantity', () => {
    const products = [product('p1', 'Ekmek', 10), product('p2', 'Simit', 5)];
    const preview = computeReceiptPreview(products, { p1: 2 }, 0, 0);

    expect(preview.lines.map((l) => l.productId)).toEqual(['p1']);
    expect(preview.requiredAmount).toBe(20);
  });

  it('handles partial payment and positive resulting balance', () => {
    // Cash-flow convention: 50 payment > 20 delivery → 30 cash in hand
    // after settling.
    const products = [product('p1', 'Ekmek', 10)];
    const preview = computeReceiptPreview(products, { p1: 2 }, 50, 0);

    expect(preview.requiredAmount).toBe(20);
    expect(preview.resultingBalance).toBe(30);
  });

  it('handles overpayment producing positive balance', () => {
    // Cash-flow convention: 25 payment > 10 delivery → 15 cash in hand
    // (we have credit with the branch).
    const products = [product('p1', 'Ekmek', 10)];
    const preview = computeReceiptPreview(products, { p1: 1 }, 25, 0);

    expect(preview.resultingBalance).toBe(15);
  });

  it('handles a delivery with no payment reducing cash in hand', () => {
    // Cash-flow convention: no cash, no payment, 40 delivery → -40 cash
    // in hand (we're missing 40).
    const products = [product('p1', 'Ekmek', 10), product('p2', 'Simit', 5)];
    const preview = computeReceiptPreview(products, { p1: 3, p2: 2 }, 0, 0);

    expect(preview.requiredAmount).toBe(40);
    expect(preview.resultingBalance).toBe(-40);
  });

  it('rounds totals to two decimals', () => {
    const products = [product('p1', 'X', 0.1)];
    const preview = computeReceiptPreview(products, { p1: 3 }, 0, 0);

    expect(preview.requiredAmount).toBe(0.3);
  });

  it('accepts entries map with delivered and returned', () => {
    const products = [product('p1', 'Ekmek', 10)];
    const preview = computeReceiptPreview(
      products,
      { p1: { delivered: 5, returned: 2 } },
      0,
      0,
    );

    expect(preview.lines).toHaveLength(1);
    expect(preview.lines[0]).toMatchObject({
      deliveredQuantity: 5,
      returnedQuantity: 2,
      netQuantity: 3,
      lineTotal: 30,
    });
    expect(preview.requiredAmount).toBe(30);
  });

  it('allows returns greater than deliveries (negative net)', () => {
    const products = [product('p1', 'Ekmek', 10)];
    const preview = computeReceiptPreview(
      products,
      { p1: { delivered: 2, returned: 5 } },
      0,
      0,
    );

    expect(preview.lines[0].netQuantity).toBe(-3);
    expect(preview.lines[0].lineTotal).toBe(-30);
    expect(preview.requiredAmount).toBe(-30);
  });

  it('skips entries with both delivered and returned at 0', () => {
    const products = [product('p1', 'Ekmek', 10), product('p2', 'Simit', 5)];
    const preview = computeReceiptPreview(
      products,
      {
        p1: { delivered: 2, returned: 0 },
        p2: { delivered: 0, returned: 0 },
      },
      0,
      0,
    );

    expect(preview.lines.map((l) => l.productId)).toEqual(['p1']);
  });
});
