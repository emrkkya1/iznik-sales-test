import { describe, it, expect } from 'vitest';

import {
  computeSnapOffsets,
  pickerFontSize,
  snapIndexForOffset,
} from '@/components/ui/picker/pickerUtils';

describe('computeSnapOffsets', () => {
  it('centers item 0 at offset 0', () => {
    const offsets = computeSnapOffsets([100, 100, 100], 400);
    expect(offsets[0]).toBe(0);
  });

  it('spaces equal-width items by their width', () => {
    const offsets = computeSnapOffsets([100, 100, 100], 400);
    expect(offsets[1]).toBe(100);
    expect(offsets[2]).toBe(200);
  });

  it('handles variable widths', () => {
    const offsets = computeSnapOffsets([200, 100], 400);
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBe(150);
  });

  it('returns empty for empty widths', () => {
    expect(computeSnapOffsets([], 400)).toEqual([]);
  });
});

describe('pickerFontSize', () => {
  it('buckets by label length', () => {
    expect(pickerFontSize('Kısa')).toBe('md');
    expect(pickerFontSize('1234567890123456')).toBe('sm');
    expect(pickerFontSize('123456789012345678901234')).toBe('xs');
    expect(pickerFontSize('123456789012345678901234567890')).toBe('2xs');
  });
});

describe('snapIndexForOffset', () => {
  it('returns the nearest index', () => {
    expect(snapIndexForOffset([0, 100, 200], 95)).toBe(1);
    expect(snapIndexForOffset([0, 100, 200], 199)).toBe(2);
    expect(snapIndexForOffset([0, 100, 200], 5)).toBe(0);
  });

  it('returns -1 for empty offsets', () => {
    expect(snapIndexForOffset([], 50)).toBe(-1);
  });
});
