import type { LedgerRepository } from '@/services/contracts';

import { supabaseClient } from './supabaseClient';

export const supabaseLedgerRepository: LedgerRepository = {
  async getBranchBalance(branchId) {
    const { data, error } = await supabaseClient.rpc('get_branch_balance', {
      p_branch_id: branchId,
    });

    if (error) throw error;

    return data;
  },
};
