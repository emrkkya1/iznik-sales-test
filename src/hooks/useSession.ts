import { useQuery } from '@tanstack/react-query';

import { services } from '@/services';
import { instrumentQuery } from '@/utils/logger';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: instrumentQuery(
      'get_current_user',
      () => services.session.getCurrentUser(),
    ),
  });
}