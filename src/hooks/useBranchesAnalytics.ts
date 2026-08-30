import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { services } from '@/services';
import type {
  BranchAnalyticsFilters,
  BranchAnalyticsPage,
  BranchAnalyticsRow,
} from '@/types';
import { instrumentQuery } from '@/utils/logger';
import { getNextBranchOffset } from '@/utils/branchesAnalytics';

const PAGE_SIZE = 50;

export const BRANCH_ANALYTICS_QUERY_KEY = ['analytics', 'branches'] as const;

type BranchesAnalyticsPage = {
  rows: BranchAnalyticsRow[];
  totalCount: number;
  nextOffset: number | null;
};

/**
 * Paginated, filterable, sortable branches list — drives the Şubeler tab table.
 *
 * `filters` is the source of truth; the query key is derived from it so any
 * filter / sort change refetches from offset 0. Sort is server-driven via
 * `p_sort_by` / `p_sort_dir`. PAGE_SIZE is fixed; pagination is offset-based
 * (Supabase RPC) not cursor-based.
 */
export function useBranchesAnalytics(filters: BranchAnalyticsFilters) {
  return useInfiniteQuery<BranchesAnalyticsPage, Error>({
    queryKey: [...BRANCH_ANALYTICS_QUERY_KEY, filters],
    queryFn: instrumentQuery(
      'list_branches_analytics',
      async ({ pageParam }) => {
        const offset = typeof pageParam === 'number' ? pageParam : 0;
        const page: BranchAnalyticsPage =
          await services.analytics.listBranches(filters, {
            limit: PAGE_SIZE,
            offset,
          });
        const nextOffset = getNextBranchOffset(
          offset,
          page.rows.length,
          page.totalCount,
        );
        return {
          rows: page.rows,
          totalCount: page.totalCount,
          nextOffset,
        };
      },
      (page) => ({ rows: page.rows.length, totalCount: page.totalCount }),
    ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
