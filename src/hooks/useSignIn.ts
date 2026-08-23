import { useMutation } from '@tanstack/react-query';

import { services } from '@/services';
import { useAuthStore } from '@/store';
import { logMutation } from '@/utils/logger';

interface SignInVariables {
  email: string;
  password: string;
}

export function useSignIn() {
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const reset = useAuthStore((s) => s.reset);

  return useMutation({
    mutationFn: async ({ email, password }: SignInVariables) => {
      const session = await services.auth.signIn(email, password);

      const user = await services.session.getCurrentUser();

      if (!user || !user.isActive) {
        await services.auth.signOut();
        reset();
        throw new InactiveAccountError();
      }

      return { session, user };
    },
    onMutate: ({ email }) => {
      // Never log the password.
      logMutation('signIn', 'start', { email });
    },
    onSuccess: ({ session, user }) => {
      logMutation('signIn', 'success', {
        userId: user.id,
        fullName: user.fullName,
        role: user.role,
        hasSession: !!session.accessToken,
      });
      setSession(session);
      setUser(user);
    },
    onError: (error) => {
      logMutation('signIn', 'error', error);
    },
  });
}

export class InactiveAccountError extends Error {
  constructor() {
    super('inactive account');
    this.name = 'InactiveAccountError';
  }
}
