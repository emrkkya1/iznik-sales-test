import type { BranchRepository } from '@/services/contracts';

import { supabaseClient } from './supabaseClient';

export const supabaseBranchRepository: BranchRepository = {
  async list() {
    const { data, error } = await supabaseClient
      .from('branches')
      .select('id, district_id, name, current_balance, opening_balance, is_active')
      .order('name');

    if (error) throw error;

    return data.map((branch) => ({
      id: branch.id,
      districtId: branch.district_id,
      name: branch.name,
      currentBalance: branch.current_balance,
      openingBalance: branch.opening_balance,
      isActive: branch.is_active,
    }));
  },
};
