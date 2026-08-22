import { useQuery } from '@tanstack/react-query';

import { services } from '@/services';

export function useMyDeliveries() {
  return useQuery({
    queryKey: ['deliveries', 'mine'],
    queryFn: () => services.deliveries.listMyDeliveries(),
  });
}

export function useDelivery(id: string | null) {
  return useQuery({
    queryKey: ['deliveries', id],
    queryFn: () => services.deliveries.getDelivery(id as string),
    enabled: !!id,
  });
}
