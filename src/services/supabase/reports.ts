import type { ReportsRepository } from '@/services/contracts';
import type {
  DailySeriesResult,
  DistributionRow,
  SummaryKpis,
} from '@/types';

import { supabaseClient } from './supabaseClient';

export const supabaseReportsRepository: ReportsRepository = {
  async getKpis(range) {
    const { data, error } = await supabaseClient.rpc('report_kpis', {
      p_range: range,
    });
    if (error) throw error;
    return data as unknown as SummaryKpis;
  },

  async getProductDistribution(range) {
    const { data, error } = await supabaseClient.rpc(
      'report_product_distribution',
      { p_range: range, p_limit: 100 },
    );
    if (error) throw error;
    return (data ?? []) as unknown as DistributionRow[];
  },

  async getBranchDistribution(range) {
    const { data, error } = await supabaseClient.rpc(
      'report_branch_distribution',
      { p_range: range, p_limit: 100 },
    );
    if (error) throw error;
    return (data ?? []) as unknown as DistributionRow[];
  },

  async getDailySeries(range) {
    const { data, error } = await supabaseClient.rpc('report_daily_series', {
      p_range: range,
    });
    if (error) throw error;
    return data as unknown as DailySeriesResult;
  },
};