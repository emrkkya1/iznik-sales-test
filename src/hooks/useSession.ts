import { useQuery } from '@tanstack/react-query';

import { services } from '@/services';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => services.session.getCurrentUser(),
  });
}
