import type { BranchRepository } from '@/services/contracts';

import { supabaseClient } from './supabaseClient';

export const supabaseBranchRepository: BranchRepository = {
  async list() {
    const { data, error } = await supabaseClient
      .from('branches')
      .select('id, name, created_at')
      .order('name');

    if (error) throw error;

    return data.map((branch) => ({
      id: branch.id,
      name: branch.name,
      createdAt: branch.created_at,
    }));
  },
};
