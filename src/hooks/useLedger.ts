import { useQuery } from '@tanstack/react-query';

import { services } from '@/services';

export function useBranchBalance(branchId: string | null) {
  return useQuery({
    queryKey: ['balance', branchId],
    queryFn: () => services.ledger.getBranchBalance(branchId as string),
    enabled: !!branchId,
  });
}
