import { useQuery } from '@tanstack/react-query';

import { services } from '@/services';
import { instrumentQuery } from '@/utils/logger';

export function useBranchProducts(branchId: string | null, date: string) {
  return useQuery({
    queryKey: ['branch-products', branchId, date],
    queryFn: instrumentQuery(
      'list_branch_products',
      () => services.products.listBranchProducts(branchId as string, date),
    ),
    enabled: !!branchId,
  });
}