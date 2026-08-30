import { describe, expect, it } from 'vitest';

import { parseBranchAnalyticsPage } from '@/services/supabase/analyticsSchema';

const validPage = {
  rows: [
    {
      branchId: '6b40fe37-f2ad-4c8e-bb47-ffbdddba5e29',
      name: 'Merkez',
      cityName: 'İznik',
      districtName: 'Merkez',
      currentBalance: -125.5,
      deliveredQty: 20,
      returnedQty: 2,
      returnRate: 10,
      lastActivityDate: '2026-08-30',
      isActive: true,
    },
  ],
  totalCount: 1,
};

describe('parseBranchAnalyticsPage', () => {
  it('accepts the RPC contract', () => {
    expect(parseBranchAnalyticsPage(validPage)).toEqual(validPage);
  });

  it('accepts a null last activity and return rate', () => {
    const page = {
      ...validPage,
      rows: [
        {
          ...validPage.rows[0],
          deliveredQty: 0,
          returnedQty: 0,
          returnRate: null,
          lastActivityDate: null,
        },
      ],
    };
    expect(parseBranchAnalyticsPage(page)).toEqual(page);
  });

  it('rejects numeric strings instead of silently coercing them', () => {
    const malformed = {
      ...validPage,
      rows: [{ ...validPage.rows[0], currentBalance: '-125.50' }],
    };
    expect(() => parseBranchAnalyticsPage(malformed)).toThrow();
  });

  it('rejects malformed page metadata', () => {
    expect(() =>
      parseBranchAnalyticsPage({ rows: validPage.rows, totalCount: -1 }),
    ).toThrow();
  });
});
