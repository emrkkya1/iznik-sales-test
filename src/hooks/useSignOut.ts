import { useMutation, useQueryClient } from '@tanstack/react-query';

import { services } from '@/services';
import { useAuthStore } from '@/store';
import { logMutation } from '@/utils/logger';

export function useSignOut() {
  const queryClient = useQueryClient();
  const reset = useAuthStore((s) => s.reset);

  return useMutation({
    mutationFn: async () => {
      await services.auth.signOut();
    },
    onMutate: () => {
      logMutation('signOut', 'start');
    },
    onSuccess: () => {
      logMutation('signOut', 'success');
      reset();
      queryClient.clear();
    },
    onError: (error) => {
      logMutation('signOut', 'error', error);
    },
  });
}
