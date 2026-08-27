import type { AnalyticsRepository } from '@/services/contracts';
import type { BranchAnalyticsPage } from '@/types';

import { supabaseClient } from './supabaseClient';

function optional<T>(v: T | null | undefined): T | undefined {
  return v === null ? undefined : v;
}

export const supabaseAnalyticsRepository: AnalyticsRepository = {
  async listBranches(filters, pagination) {
    const { data, error } = await supabaseClient.rpc(
      'list_branches_analytics',
      {
        p_search: optional(filters.search) ?? '',
        p_status: filters.status ?? 'all',
        p_date_from: optional(filters.dateFrom) ?? '',
        p_date_to: optional(filters.dateTo) ?? '',
        p_days_of_week: optional(filters.daysOfWeek) ?? [],
        p_sort_by: filters.sortBy ?? 'name',
        p_sort_dir: filters.sortDir ?? 'asc',
        p_limit: pagination.limit,
        p_offset: pagination.offset,
      },
    );
    if (error) throw error;
    return data as unknown as BranchAnalyticsPage;
  },
};