import { useQuery } from '@tanstack/react-query';

import { services } from '@/services';

export function useBranchProducts(branchId: string | null, date: string) {
  return useQuery({
    queryKey: ['branch-products', branchId, date],
    queryFn: () => services.products.listBranchProducts(branchId as string, date),
    enabled: !!branchId,
  });
}
