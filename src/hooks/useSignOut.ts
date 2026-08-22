import { useMutation, useQueryClient } from '@tanstack/react-query';

import { services } from '@/services';
import { useAuthStore } from '@/store';

export function useSignOut() {
  const queryClient = useQueryClient();
  const reset = useAuthStore((s) => s.reset);

  return useMutation({
    mutationFn: async () => {
      await services.auth.signOut();
    },
    onSuccess: () => {
      reset();
      queryClient.clear();
    },
  });
}
