import { useEffect, useState } from 'react';

import { services } from '@/services';
import { useAuthStore } from '@/store';
import type { AuthSession } from '@/types';
import { logQuery } from '@/utils/logger';

// Restores the session on launch and keeps the store in sync with auth events.
// An inactive or missing profile is treated as signed out (directed to sign-in).
export function useAuthBootstrap() {
  const [isRestoring, setIsRestoring] = useState(true);
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const reset = useAuthStore((s) => s.reset);

  useEffect(() => {
    let active = true;

    async function applySession(session: AuthSession | null) {
      if (!session) {
        reset();
        return;
      }

      setSession(session);

      try {
        const user = await services.session.getCurrentUser();
        if (!active) return;

        if (user && user.isActive) {
          setUser(user);
        } else {
          await services.auth.signOut();
          if (active) reset();
        }
      } catch (error) {
        if (!active) return;
        // If JWT validation fails (e.g., clock skew, expired token),
        // clear the session instead of crashing.
        logQuery('auth_bootstrap_get_user', 'error', error);
        await services.auth.signOut();
        reset();
      }
    }

    async function bootstrap() {
      try {
        const session = await services.auth.getSession();
        if (active) await applySession(session);
      } catch (error) {
        logQuery('auth_bootstrap_get_session', 'error', error);
        if (active) reset();
      }
      if (active) setIsRestoring(false);
    }

    bootstrap();

    const unsubscribe = services.auth.onAuthStateChange((session) => {
      void applySession(session);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [setSession, setUser, reset]);

  return { isRestoring };
}