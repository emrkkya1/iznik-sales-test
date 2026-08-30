import { describe, expect, it } from 'vitest';

import { getNextBranchOffset } from '@/utils/branchesAnalytics';

describe('getNextBranchOffset', () => {
  it('advances by the actual number of returned rows', () => {
    expect(getNextBranchOffset(50, 20, 83)).toBe(70);
  });

  it('stops after the total has been loaded', () => {
    expect(getNextBranchOffset(50, 33, 83)).toBeNull();
  });

  it('stops on an empty page even when the count is inconsistent', () => {
    expect(getNextBranchOffset(50, 0, 83)).toBeNull();
  });
});
