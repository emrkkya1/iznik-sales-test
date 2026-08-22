import { create } from 'zustand';

import type { AuthSession, User } from '@/types';

type AuthState = {
  session: AuthSession | null;
  user: User | null;
  setSession: (session: AuthSession | null) => void;
  setUser: (user: User | null) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  reset: () => set({ session: null, user: null }),
}));
