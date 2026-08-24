import { useQuery } from '@tanstack/react-query';

import { services } from '@/services';
import { instrumentQuery } from '@/utils/logger';

export function useMyDeliveries() {
  return useQuery({
    queryKey: ['deliveries', 'mine'],
    queryFn: instrumentQuery(
      'list_my_deliveries',
      () => services.deliveries.listMyDeliveries(),
    ),
  });
}

export function useDelivery(id: string | null) {
  return useQuery({
    queryKey: ['deliveries', id],
    queryFn: instrumentQuery(
      'get_delivery',
      () => services.deliveries.getDelivery(id as string),
    ),
    enabled: !!id,
  });
}