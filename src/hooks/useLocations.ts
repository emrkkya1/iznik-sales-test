import { useQuery } from '@tanstack/react-query';

import { services } from '@/services';

export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: () => services.locations.listCities(),
    staleTime: 5 * 60_000,
  });
}

export function useDistricts(cityId: string | null) {
  return useQuery({
    queryKey: ['districts', cityId],
    queryFn: () => services.locations.listDistricts(cityId as string),
    enabled: !!cityId,
  });
}

export function useBranches(districtId: string | null) {
  return useQuery({
    queryKey: ['branches', districtId],
    queryFn: () => services.locations.listBranches(districtId ?? undefined),
    enabled: !!districtId,
  });
}
