import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { services } from '@/services';
import type {
  BranchHubDetails,
  CreateBranchInput,
  CreateCityInput,
  CreateDistrictInput,
} from '@/types';

import { useBranchBalance } from './useLedger';

const REFERENCE_STALE_MS = 5 * 60_000;
const TRANSACTIONAL_STALE_MS = 60_000;

// ---------- Queries ----------

export function useCitiesWithCounts() {
  return useQuery({
    queryKey: ['admin', 'cities', 'with-counts'],
    queryFn: () => services.adminLocations.listCitiesWithCounts(),
    staleTime: REFERENCE_STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useDistrictsWithCounts(cityId: string | null) {
  return useQuery({
    queryKey: ['admin', 'districts', 'with-counts', cityId],
    queryFn: () => services.adminLocations.listDistrictsWithCounts(cityId as string),
    enabled: !!cityId,
    staleTime: REFERENCE_STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useBranchesWithContext(districtId: string | null) {
  return useQuery({
    queryKey: ['admin', 'branches', 'with-context', districtId],
    queryFn: () =>
      services.adminLocations.listBranchesWithContext(districtId as string),
    enabled: !!districtId,
    staleTime: TRANSACTIONAL_STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useOpeningBalancesLocked() {
  return useQuery({
    queryKey: ['admin', 'app-config', 'opening-balances-locked'],
    queryFn: () => services.adminLocations.getOpeningBalancesLocked(),
    staleTime: TRANSACTIONAL_STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useBranchHubDetails(branchId: string | null | undefined) {
  return useQuery({
    queryKey: ['admin', 'branch-hub', 'details', branchId],
    queryFn: () =>
      services.adminLocations.getBranchHubDetails(branchId as string),
    enabled: !!branchId,
    staleTime: TRANSACTIONAL_STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useBranchMovements(
  branchId: string | null | undefined,
  limit = 50,
  offset = 0,
) {
  return useQuery({
    queryKey: ['admin', 'branch-movements', branchId, limit, offset],
    queryFn: () =>
      services.adminLocations.listBranchMovements(
        branchId as string,
        limit,
        offset,
      ),
    enabled: !!branchId,
    staleTime: TRANSACTIONAL_STALE_MS,
    placeholderData: keepPreviousData,
  });
}

// Composite for Branch Hub summary cards: details + current balance (via existing ledger hook).
export function useBranchHubSummary(branchId: string | null | undefined) {
  const details = useBranchHubDetails(branchId);
  const balance = useBranchBalance(branchId ?? null);

  if (!details.data || balance.data === undefined) {
    return {
      data: undefined,
      isLoading: details.isLoading || balance.isLoading,
      isError: details.isError || balance.isError,
      refetch: () => {
        details.refetch();
        balance.refetch();
      },
    };
  }

  return {
    data: {
      currentBalance: balance.data,
      ...(details.data as BranchHubDetails),
    },
    isLoading: false,
    isError: details.isError || balance.isError,
    refetch: () => {
      details.refetch();
      balance.refetch();
    },
  };
}

// ---------- Mutations ----------

function invalidateCities(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'cities'] });
}

function invalidateDistricts(
  queryClient: ReturnType<typeof useQueryClient>,
  cityId: string,
) {
  queryClient.invalidateQueries({
    queryKey: ['admin', 'districts', 'with-counts', cityId],
  });
  queryClient.invalidateQueries({ queryKey: ['admin', 'cities'] });
}

function invalidateBranches(
  queryClient: ReturnType<typeof useQueryClient>,
  districtId: string,
) {
  queryClient.invalidateQueries({
    queryKey: ['admin', 'branches', 'with-context', districtId],
  });
  queryClient.invalidateQueries({ queryKey: ['admin', 'districts'] });
}

function invalidateAppConfig(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'app-config'] });
}

export function useCreateCity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCityInput) =>
      services.adminLocations.createCity(input),
    onSuccess: () => {
      invalidateCities(queryClient);
    },
  });
}

export function useCreateDistrict() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDistrictInput) =>
      services.adminLocations.createDistrict(input),
    onSuccess: (_data, variables) => {
      invalidateDistricts(queryClient, variables.cityId);
    },
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBranchInput) =>
      services.adminLocations.createBranch(input),
    onSuccess: (_data, variables) => {
      invalidateBranches(queryClient, variables.districtId);
    },
  });
}

export function useSetCityActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      services.adminLocations.setCityActive(id, isActive),
    onSuccess: () => {
      invalidateCities(queryClient);
    },
  });
}

export function useSetDistrictActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      services.adminLocations.setDistrictActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'districts'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'cities'] });
    },
  });
}

export function useSetBranchActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      services.adminLocations.setBranchActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'branches'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'districts'] });
    },
  });
}

export function useSetOpeningBalancesLocked() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (locked: boolean) =>
      services.adminLocations.setOpeningBalancesLocked(locked),
    onSuccess: () => {
      invalidateAppConfig(queryClient);
    },
  });
}