import { describe, it, expect } from 'vitest';

import type { DistributionRow } from '@/types';
import { mergeTopDistribution } from '@/utils/distribution';

function row(id: string, value: number): DistributionRow {
  return { id, label: id, value };
}

describe('mergeTopDistribution', () => {
  it('returns empty result for empty input', () => {
    const { merged, mergedCount } = mergeTopDistribution([], 7);
    expect(merged).toEqual([]);
    expect(mergedCount).toBe(0);
  });

  it('returns single row unchanged (no merge)', () => {
    const input = [row('a', 100)];
    const { merged, mergedCount } = mergeTopDistribution(input, 7);
    expect(merged).toEqual(input);
    expect(mergedCount).toBe(0);
  });

  it('returns rows unchanged when count is <= topN', () => {
    const input = [
      row('a', 100),
      row('b', 50),
      row('c', 25),
    ];
    const { merged, mergedCount } = mergeTopDistribution(input, 7);
    expect(mergedCount).toBe(0);
    expect(merged).toHaveLength(3);
    expect(merged).toEqual(input);
  });

  it('merges rows past topN into single Diğer (N) row with summed value', () => {
    const input = [
      row('a', 100),
      row('b', 80),
      row('c', 60),
      row('d', 40),
      row('e', 20),
    ];
    const { merged, mergedCount } = mergeTopDistribution(input, 3);
    expect(mergedCount).toBe(2);
    expect(merged).toHaveLength(4);
    expect(merged[3]).toEqual({
      id: '__merged__',
      label: 'Diğer (2)',
      value: 60,
      isMerged: true,
    });
  });

  it('sorts rows by value descending before slicing', () => {
    const input = [
      row('low', 1),
      row('high', 100),
      row('mid', 50),
    ];
    const { merged, mergedCount } = mergeTopDistribution(input, 2);
    expect(mergedCount).toBe(1);
    expect(merged.map((r) => r.id)).toEqual(['high', 'mid', '__merged__']);
  });

  it('skips Diğer row when rest has zero total value', () => {
    const input = [
      row('a', 100),
      row('b', 50),
      row('c', 0),
      row('d', 0),
    ];
    const { merged, mergedCount } = mergeTopDistribution(input, 2);
    expect(mergedCount).toBe(0);
    expect(merged).toHaveLength(2);
    expect(merged.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('filters out null/NaN/Infinity/negative values', () => {
    const input: DistributionRow[] = [
      { id: 'a', label: 'a', value: 100 },
      { id: 'nan', label: 'nan', value: Number.NaN },
      { id: 'inf', label: 'inf', value: Number.POSITIVE_INFINITY },
      { id: 'neg', label: 'neg', value: -50 },
      { id: 'zero', label: 'zero', value: 0 },
    ];
    const { merged } = mergeTopDistribution(input, 7);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('a');
  });

  it('returns empty result when every value is non-finite', () => {
    const input: DistributionRow[] = [
      { id: 'a', label: 'a', value: Number.NaN },
      { id: 'b', label: 'b', value: Number.POSITIVE_INFINITY },
      { id: 'c', label: 'c', value: 0 },
    ];
    const { merged, mergedCount } = mergeTopDistribution(input, 7);
    expect(merged).toEqual([]);
    expect(mergedCount).toBe(0);
  });

  it('marks merged row with isMerged=true and stable id', () => {
    const input = [row('a', 100), row('b', 50), row('c', 25), row('d', 10)];
    const { merged } = mergeTopDistribution(input, 2);
    const mergedRow = merged.find((r) => r.isMerged);
    expect(mergedRow).toBeDefined();
    expect(mergedRow?.id).toBe('__merged__');
    expect(mergedRow?.label).toBe('Diğer (2)');
  });

  it('handles topN=0 by merging everything', () => {
    const input = [row('a', 100), row('b', 50), row('c', 25)];
    const { merged, mergedCount } = mergeTopDistribution(input, 0);
    expect(mergedCount).toBe(3);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual({
      id: '__merged__',
      label: 'Diğer (3)',
      value: 175,
      isMerged: true,
    });
  });
});