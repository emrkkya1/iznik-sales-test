import type { SessionRepository } from '@/services/contracts';
import type { User } from '@/types';

import { supabaseClient } from './supabaseClient';

export const supabaseSessionRepository: SessionRepository = {
  async getCurrentUser() {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabaseClient
      .from('users')
      .select('id, full_name, username, role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    return {
      id: data.id,
      fullName: data.full_name,
      username: data.username,
      role: data.role,
      isActive: data.is_active,
    } satisfies User;
  },
};
