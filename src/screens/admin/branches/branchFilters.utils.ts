import type { BranchAnalyticsFilters } from '@/types';

// Counts how many filters are currently active in the Şubeler tab.
// Used to render the active-filter count badge on the Filtrele button.
//
// Rules:
//   - search counts when non-empty.
//   - status counts when it differs from the default 'all'.
//   - dateFrom/dateTo share a single bucket (one OR the other).
//   - daysOfWeek counts when non-empty.
//   - cityId and districtId each count independently.
export function countActiveFilters(filters: BranchAnalyticsFilters): number {
  let count = 0;
  if (filters.search) count += 1;
  if (filters.status && filters.status !== 'all') count += 1;
  if (filters.dateFrom || filters.dateTo) count += 1;
  if (filters.daysOfWeek && filters.daysOfWeek.length > 0) count += 1;
  if (filters.cityId) count += 1;
  if (filters.districtId) count += 1;
  return count;
}
