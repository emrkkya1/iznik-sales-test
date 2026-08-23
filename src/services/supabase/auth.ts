import type { Session } from '@supabase/supabase-js';

import type { AuthRepository } from '@/services/contracts';
import type { AuthSession } from '@/types';

import { supabaseClient } from './supabaseClient';

function toAuthSession(session: Session): AuthSession {
  return {
    accessToken: session.access_token,
    expiresAt: session.expires_at ?? null,
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
    },
  };
}

export const supabaseAuthRepository: AuthRepository = {
  async getSession() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    return data.session ? toAuthSession(data.session) : null;
  },
  async signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return toAuthSession(data.session);
  },
  async signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  },
  onAuthStateChange(callback) {
    const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      callback(session ? toAuthSession(session) : null);
    });
    return () => data.subscription.unsubscribe();
  },
};
