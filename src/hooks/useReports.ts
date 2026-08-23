import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { services } from '@/services';
import type { SummaryRange } from '@/types';

const STALE_TIME_MS = 60_000;

export function useSummaryKpis(range: SummaryRange) {
  return useQuery({
    queryKey: ['reports', 'kpis', range],
    queryFn: () => services.reports.getKpis(range),
    staleTime: STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

export function useProductDistribution(range: SummaryRange) {
  return useQuery({
    queryKey: ['reports', 'distribution', 'product', range],
    queryFn: () => services.reports.getProductDistribution(range),
    staleTime: STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

export function useBranchDistribution(range: SummaryRange) {
  return useQuery({
    queryKey: ['reports', 'distribution', 'branch', range],
    queryFn: () => services.reports.getBranchDistribution(range),
    staleTime: STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

export function useDailySeries(range: SummaryRange) {
  return useQuery({
    queryKey: ['reports', 'daily-series', range],
    queryFn: () => services.reports.getDailySeries(range),
    staleTime: STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}