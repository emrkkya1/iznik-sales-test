import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { services } from '@/services';
import type { SummaryRange } from '@/types';
import { instrumentQuery, summarizeResult } from '@/utils/logger';

const STALE_TIME_MS = 60_000;

export function useSummaryKpis(range: SummaryRange) {
  return useQuery({
    queryKey: ['reports', 'kpis', range],
    queryFn: instrumentQuery(
      'report_kpis',
      () => services.reports.getKpis(range),
      summarizeResult,
    ),
    staleTime: STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

export function useProductDistribution(range: SummaryRange) {
  return useQuery({
    queryKey: ['reports', 'distribution', 'product', range],
    queryFn: instrumentQuery(
      'report_product_distribution',
      () => services.reports.getProductDistribution(range),
      summarizeResult,
    ),
    staleTime: STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

export function useBranchDistribution(range: SummaryRange) {
  return useQuery({
    queryKey: ['reports', 'distribution', 'branch', range],
    queryFn: instrumentQuery(
      'report_branch_distribution',
      () => services.reports.getBranchDistribution(range),
      summarizeResult,
    ),
    staleTime: STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

export function useDailySeries(range: SummaryRange) {
  return useQuery({
    queryKey: ['reports', 'daily-series', range],
    queryFn: instrumentQuery(
      'report_daily_series',
      () => services.reports.getDailySeries(range),
      summarizeResult,
    ),
    staleTime: STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}