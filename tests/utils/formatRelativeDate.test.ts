import { describe, it, expect } from 'vitest';

import { formatRelativeDate } from '@/utils/formatRelativeDate';

describe('formatRelativeDate', () => {
  const today = '2024-08-24';

  it('returns em dash for null (M1 from PR-6.0 review)', () => {
    expect(formatRelativeDate(null, today)).toBe('—');
  });

  it('returns "bugün" for today', () => {
    expect(formatRelativeDate(today, today)).toBe('bugün');
  });

  it('returns "dün" for yesterday', () => {
    expect(formatRelativeDate('2024-08-23', today)).toBe('dün');
  });

  it('returns N gün önce for 2-6 days', () => {
    expect(formatRelativeDate('2024-08-22', today)).toBe('2 gün önce');
    expect(formatRelativeDate('2024-08-20', today)).toBe('4 gün önce');
    expect(formatRelativeDate('2024-08-18', today)).toBe('6 gün önce');
  });

  it('returns "geçen hafta" for 7-13 days', () => {
    expect(formatRelativeDate('2024-08-17', today)).toBe('geçen hafta');
    expect(formatRelativeDate('2024-08-11', today)).toBe('geçen hafta');
  });

  it('returns N hafta önce for 14-29 days', () => {
    expect(formatRelativeDate('2024-08-10', today)).toBe('2 hafta önce');
    expect(formatRelativeDate('2024-08-03', today)).toBe('3 hafta önce');
  });

  it('returns N ay önce for 30-364 days', () => {
    expect(formatRelativeDate('2024-07-25', today)).toBe('1 ay önce');
    expect(formatRelativeDate('2023-09-24', today)).toBe('11 ay önce');
  });

  it('returns N yıl önce for 365+ days', () => {
    expect(formatRelativeDate('2023-08-24', today)).toBe('1 yıl önce');
    expect(formatRelativeDate('2022-08-24', today)).toBe('2 yıl önce');
  });

  it('returns em dash for future dates (no UX use in admin)', () => {
    expect(formatRelativeDate('2024-08-25', today)).toBe('—');
    expect(formatRelativeDate('2099-12-31', today)).toBe('—');
  });

  it('defaults to Istanbul today when no reference supplied', () => {
    expect(formatRelativeDate(null)).toBe('—');
  });
});