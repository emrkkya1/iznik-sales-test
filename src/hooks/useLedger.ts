import { useQuery } from '@tanstack/react-query';

import { services } from '@/services';
import { instrumentQuery } from '@/utils/logger';

export function useBranchBalance(branchId: string | null) {
  return useQuery({
    queryKey: ['balance', branchId],
    queryFn: instrumentQuery(
      'get_branch_balance',
      () => services.ledger.getBranchBalance(branchId as string),
    ),
    enabled: !!branchId,
  });
}