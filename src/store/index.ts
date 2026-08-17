import { create } from 'zustand';

import type { AuthSession } from '@/types';

type AuthState = {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
}));
