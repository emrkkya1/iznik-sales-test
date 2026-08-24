import { useQuery } from '@tanstack/react-query';

import { services } from '@/services';
import { instrumentQuery, summarizeResult } from '@/utils/logger';

export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: instrumentQuery(
      'list_cities',
      () => services.locations.listCities(),
      summarizeResult,
    ),
    staleTime: 5 * 60_000,
  });
}

export function useDistricts(cityId: string | null) {
  return useQuery({
    queryKey: ['districts', cityId],
    queryFn: instrumentQuery(
      'list_districts',
      () => services.locations.listDistricts(cityId as string),
      summarizeResult,
    ),
    enabled: !!cityId,
  });
}

export function useBranches(districtId: string | null) {
  return useQuery({
    queryKey: ['branches', districtId],
    queryFn: instrumentQuery(
      'list_branches',
      () => services.locations.listBranches(districtId ?? undefined),
      summarizeResult,
    ),
    enabled: !!districtId,
  });
}

export function useBranchLocation(branchId: string | null) {
  return useQuery({
    queryKey: ['branch-location', branchId],
    queryFn: instrumentQuery(
      'get_branch',
      () => services.locations.getBranch(branchId as string),
    ),
    enabled: !!branchId,
  });
}