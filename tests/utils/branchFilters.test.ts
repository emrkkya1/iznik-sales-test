import { describe, expect, it } from 'vitest';

import type { BranchAnalyticsFilters } from '@/types';

import {
  countActiveFilters,
} from '@/screens/admin/branches/branchFilters.utils';

describe('branchFilters.utils', () => {
  describe('countActiveFilters', () => {
    it('returns 0 for an empty filter set', () => {
      expect(countActiveFilters({})).toBe(0);
    });

    it('counts search', () => {
      expect(countActiveFilters({ search: 'izmir' })).toBe(1);
    });

    it('counts status when not all', () => {
      expect(countActiveFilters({ status: 'active' })).toBe(1);
      expect(countActiveFilters({ status: 'all' })).toBe(0);
    });

    it('counts dateFrom/dateTo as a single bucket', () => {
      expect(countActiveFilters({ dateFrom: '2026-01-01' })).toBe(1);
      expect(countActiveFilters({ dateTo: '2026-12-31' })).toBe(1);
      expect(
        countActiveFilters({
          dateFrom: '2026-01-01',
          dateTo: '2026-12-31',
        }),
      ).toBe(1);
    });

    it('counts daysOfWeek only when non-empty', () => {
      expect(countActiveFilters({ daysOfWeek: [] })).toBe(0);
      expect(countActiveFilters({ daysOfWeek: [1, 2] })).toBe(1);
    });

    it('counts cityId and districtId separately', () => {
      expect(countActiveFilters({ cityId: 'a' })).toBe(1);
      expect(countActiveFilters({ districtId: 'b' })).toBe(1);
      expect(
        countActiveFilters({ cityId: 'a', districtId: 'b' }),
      ).toBe(2);
    });

    it('counts multiple fields independently', () => {
      const filters: BranchAnalyticsFilters = {
        search: 'x',
        status: 'active',
        dateFrom: '2026-01-01',
        daysOfWeek: [1],
        cityId: 'a',
        districtId: 'b',
      };
      expect(countActiveFilters(filters)).toBe(6);
    });
  });
});
