import type { SessionRepository } from '@/services/contracts';
import type { User } from '@/types';

import { supabaseClient } from './supabaseClient';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isJwtTimingError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code === 'PGRST303';
  }
  return false;
}

export const supabaseSessionRepository: SessionRepository = {
  async getCurrentUser() {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) return null;

    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const { data, error } = await supabaseClient
        .from('users')
        .select('id, full_name, username, role, is_active')
        .eq('id', user.id)
        .maybeSingle();

      if (!error) {
        if (!data) return null;

        return {
          id: data.id,
          fullName: data.full_name,
          username: data.username,
          role: data.role,
          isActive: data.is_active,
        } satisfies User;
      }

      lastError = error;

      if (!isJwtTimingError(error)) {
        throw error;
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
      }
    }

    throw lastError;
  },
};
