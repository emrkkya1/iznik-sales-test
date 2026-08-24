import { describe, it, expect } from 'vitest';

import {
  getIstanbulToday,
  canEditDelivery,
  formatDateForDisplay,
  parseIsoDate,
  formatIsoDate,
} from '@/utils/dates';

describe('getIstanbulToday', () => {
  it('returns a YYYY-MM-DD formatted string', () => {
    const today = getIstanbulToday();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a valid date', () => {
    const today = getIstanbulToday();
    const [year, month, day] = today.split('-').map(Number);
    expect(year).toBeGreaterThanOrEqual(2020);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });
});

describe('canEditDelivery', () => {
  it('returns false for a past date', () => {
    expect(canEditDelivery('2020-01-01')).toBe(false);
  });

  it('returns false for a future date', () => {
    expect(canEditDelivery('2999-12-31')).toBe(false);
  });

  it('returns a boolean for today', () => {
    const today = getIstanbulToday();
    expect(typeof canEditDelivery(today)).toBe('boolean');
  });
});

describe('formatDateForDisplay', () => {
  it('formats a date in Turkish locale', () => {
    const formatted = formatDateForDisplay('2024-03-15');
    expect(formatted).toMatch(/15/);
    expect(formatted).toMatch(/03/);
    expect(formatted).toMatch(/2024/);
  });

  it('accepts full ISO timestamps (RPC response shape)', () => {
    const formatted = formatDateForDisplay('2026-08-22 13:52:04.356532+00');
    expect(formatted).toMatch(/22/);
    expect(formatted).toMatch(/08/);
    expect(formatted).toMatch(/2026/);
  });

  it('passes non-date strings through unchanged', () => {
    expect(formatDateForDisplay('not-a-date')).toBe('not-a-date');
    expect(formatDateForDisplay('')).toBe('');
  });
});

describe('parseIsoDate / formatIsoDate', () => {
  it('round-trips a normal date', () => {
    expect(formatIsoDate(parseIsoDate('2024-03-15'))).toBe('2024-03-15');
  });

  it('round-trips a leap day', () => {
    expect(formatIsoDate(parseIsoDate('2024-02-29'))).toBe('2024-02-29');
  });

  it('round-trips a year boundary', () => {
    expect(formatIsoDate(parseIsoDate('2023-12-31'))).toBe('2023-12-31');
  });
});
