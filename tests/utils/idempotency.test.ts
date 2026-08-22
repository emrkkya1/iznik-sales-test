import { describe, it, expect } from 'vitest';

import { generateIdempotencyKey } from '@/utils/idempotency';

describe('generateIdempotencyKey', () => {
  it('returns a non-empty string', () => {
    expect(generateIdempotencyKey().length).toBeGreaterThan(0);
  });

  it('generates unique keys', () => {
    const keys = new Set(Array.from({ length: 1000 }, generateIdempotencyKey));
    expect(keys.size).toBe(1000);
  });

  it('returns a valid UUID v4 format', () => {
    expect(generateIdempotencyKey()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
