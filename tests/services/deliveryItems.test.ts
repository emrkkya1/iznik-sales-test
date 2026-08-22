import { describe, it, expect } from 'vitest';

import { toSnakeCaseItems } from '@/services/deliveryItems';

describe('toSnakeCaseItems', () => {
  it('maps camelCase item keys to snake_case for the RPC payload', () => {
    const result = toSnakeCaseItems([
      { productId: 'p1', deliveredQuantity: 10, returnedQuantity: 3 },
      { productId: 'p2', deliveredQuantity: 5, returnedQuantity: 0 },
    ]);

    expect(result).toEqual([
      { product_id: 'p1', delivered_quantity: 10, returned_quantity: 3 },
      { product_id: 'p2', delivered_quantity: 5, returned_quantity: 0 },
    ]);
  });

  it('returns an empty array for an empty input', () => {
    expect(toSnakeCaseItems([])).toEqual([]);
  });

  it('does not retain camelCase keys', () => {
    const result = toSnakeCaseItems([
      { productId: 'p1', deliveredQuantity: 1, returnedQuantity: 0 },
    ]);

    expect(result[0]).not.toHaveProperty('productId');
    expect(result[0]).not.toHaveProperty('deliveredQuantity');
    expect(result[0]).not.toHaveProperty('returnedQuantity');
  });
});
