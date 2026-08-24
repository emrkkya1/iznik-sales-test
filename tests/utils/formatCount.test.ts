import { describe, it, expect } from 'vitest';

import { formatCount } from '@/utils/formatCount';

describe('formatCount', () => {
  it('formats zero', () => {
    expect(formatCount(0)).toBe('0');
  });

  it('formats positive integers in Turkish locale', () => {
    expect(formatCount(1234)).toMatch(/1.234/);
  });

  it('formats large numbers with Turkish thousand separator', () => {
    expect(formatCount(1_000_000)).toMatch(/1\.000\.000/);
  });

  it('truncates decimal values (no fractional digits)', () => {
    const result = formatCount(1234.7);
    expect(result).toBe('1.235');
  });

  it('formats negative numbers', () => {
    expect(formatCount(-42)).toMatch(/-42/);
  });
});