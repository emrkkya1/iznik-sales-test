import { useState } from 'react';
import { RefreshControl } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Box } from '@/components/ui/box';
import { ScrollView } from '@/components/ui/scroll-view';
import { HStack } from '@/components/ui/hstack';
import { BanknoteIcon, PackageIcon, StoreIcon } from '@/components/ui/icon';
import {
  useBranchDistribution,
  useDailySeries,
  useProductDistribution,
  useSummaryKpis,
} from '@/hooks';
import type { SummaryRange } from '@/types';

import { DailyChartCard } from '../../components/admin/DailyChartCard';
import { DistributionCard } from '../../components/admin/DistributionCard';
import { KpiCard } from '../../components/admin/KpiCard';
import { RangeSelector } from '../../components/admin/RangeSelector';

// RangeSelector is rendered OUTSIDE the ScrollView so it is natively sticky
// on Android without stickyHeaderIndices gymnastics. Each card shows its own
// loading/error inline so the row never shifts height.
export function SummaryScreen() {
  const [range, setRange] = useState<SummaryRange>('week');
  const queryClient = useQueryClient();

  const kpis = useSummaryKpis(range);
  const productDist = useProductDistribution(range);
  const branchDist = useBranchDistribution(range);
  const dailySeries = useDailySeries(range);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  };

  const refreshing =
    (kpis.isFetching || productDist.isFetching || branchDist.isFetching || dailySeries.isFetching) &&
    (kpis.isPlaceholderData ||
      productDist.isPlaceholderData ||
      branchDist.isPlaceholderData ||
      dailySeries.isPlaceholderData);

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <RangeSelector value={range} onChange={setRange} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 24,
          gap: 16,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAll} />
        }
      >
        <HStack space="md" className="items-stretch">
          <KpiCard
            icon={BanknoteIcon}
            title="Toplam Satış"
            value={kpis.data?.totalSales ?? null}
            format="currency"
            isLoading={kpis.isLoading}
            isError={kpis.isError}
            onRetry={kpis.refetch}
          />
          <KpiCard
            icon={BanknoteIcon}
            title="Toplam Tahsilat"
            value={kpis.data?.totalCollection ?? null}
            format="currency"
            isLoading={kpis.isLoading}
            isError={kpis.isError}
            onRetry={kpis.refetch}
          />
          <KpiCard
            icon={StoreIcon}
            title="Aktif Şube"
            value={kpis.data?.activeBranchCount ?? null}
            format="count"
            isLoading={kpis.isLoading}
            isError={kpis.isError}
            onRetry={kpis.refetch}
          />
          <KpiCard
            icon={PackageIcon}
            title="Aktif Ürün"
            value={kpis.data?.activeProductCount ?? null}
            format="count"
            isLoading={kpis.isLoading}
            isError={kpis.isError}
            onRetry={kpis.refetch}
          />
        </HStack>

        <HStack space="md" className="items-stretch">
          <DistributionCard
            title="Ürün Dağılımı"
            rows={productDist.data ?? []}
            isLoading={productDist.isLoading}
            isError={productDist.isError}
            onRetry={productDist.refetch}
          />
          <DistributionCard
            title="Şube Dağılımı"
            rows={branchDist.data ?? []}
            isLoading={branchDist.isLoading}
            isError={branchDist.isError}
            onRetry={branchDist.refetch}
          />
        </HStack>

        <DailyChartCard
          series={dailySeries.data}
          isLoading={dailySeries.isLoading}
          isError={dailySeries.isError}
          onRetry={dailySeries.refetch}
        />
      </ScrollView>
    </Box>
  );
}