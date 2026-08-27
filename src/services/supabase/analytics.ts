import type { AnalyticsRepository } from '@/services/contracts';
import type { BranchAnalyticsPage } from '@/types';

import { supabaseClient } from './supabaseClient';

function omitEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k as keyof T] = v as T[keyof T];
  }
  return out;
}

export const supabaseAnalyticsRepository: AnalyticsRepository = {
  async listBranches(filters, pagination) {
    // Supabase passes every provided arg over the wire. Postgres DATE
    // rejects empty strings (`invalid input syntax for type date: ""`),
    // so we omit unset string params instead of sending ''. Arrays are
    // omitted when empty so the RPC's NULL-default applies.
    const params = omitEmpty({
      p_search: filters.search,
      p_status: filters.status ?? 'all',
      p_date_from: filters.dateFrom,
      p_date_to: filters.dateTo,
      p_days_of_week: filters.daysOfWeek,
      p_sort_by: filters.sortBy ?? 'name',
      p_sort_dir: filters.sortDir ?? 'asc',
      p_limit: pagination.limit,
      p_offset: pagination.offset,
    });

    const { data, error } = await supabaseClient.rpc(
      'list_branches_analytics',
      params,
    );
    if (error) throw error;
    return data as unknown as BranchAnalyticsPage;
  },
};