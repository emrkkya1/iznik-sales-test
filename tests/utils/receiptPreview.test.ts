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
    const products = [product('p1', 'Ekmek', 10), product('p2', 'Simit', 5)];
    const preview = computeReceiptPreview(products, { p1: 3, p2: 2 }, 0, 100);

    expect(preview.lines).toHaveLength(2);
    expect(preview.requiredAmount).toBe(40);
    expect(preview.resultingBalance).toBe(140);
  });

  it('skips products with zero or missing quantity', () => {
    const products = [product('p1', 'Ekmek', 10), product('p2', 'Simit', 5)];
    const preview = computeReceiptPreview(products, { p1: 2 }, 0, 0);

    expect(preview.lines.map((l) => l.productId)).toEqual(['p1']);
    expect(preview.requiredAmount).toBe(20);
  });

  it('handles partial payment and negative resulting balance (credit)', () => {
    const products = [product('p1', 'Ekmek', 10)];
    const preview = computeReceiptPreview(products, { p1: 2 }, 50, 0);

    expect(preview.requiredAmount).toBe(20);
    expect(preview.resultingBalance).toBe(-30);
  });

  it('handles overpayment producing credit', () => {
    const products = [product('p1', 'Ekmek', 10)];
    const preview = computeReceiptPreview(products, { p1: 1 }, 25, 0);

    expect(preview.resultingBalance).toBe(-15);
  });

  it('rounds totals to two decimals', () => {
    const products = [product('p1', 'X', 0.1)];
    const preview = computeReceiptPreview(products, { p1: 3 }, 0, 0);

    expect(preview.requiredAmount).toBe(0.3);
  });
});
