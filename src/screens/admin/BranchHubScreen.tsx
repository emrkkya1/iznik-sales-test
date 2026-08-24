import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { Box } from '@/components/ui/box';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useBranchHubSummary } from '@/hooks';
import { formatDateForDisplay } from '@/utils/dates';
import { formatRelativeDate } from '@/utils/formatRelativeDate';

import { ActiveBadge } from '../../components/admin/ActiveBadge';
import { SummaryCard } from '../../components/admin/SummaryCard';

type TabKey = 'products' | 'movements' | 'details';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'products', label: 'Ürünler & Fiyatlar' },
  { key: 'movements', label: 'Hareketler' },
  { key: 'details', label: 'Detaylar' },
];

function pickFirst(v: string | string[] | undefined): string | null {
  if (v === undefined) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function BranchHubScreen() {
  const params = useLocalSearchParams<{ branchId: string | string[] }>();
  const branchId = pickFirst(params.branchId);

  const [activeTab, setActiveTab] = useState<TabKey>('products');

  const summary = useBranchHubSummary(branchId);

  if (!branchId) {
    return <ErrorState title="Şube bulunamadı" message="Geçersiz şube kimliği." />;
  }

  const data = summary.data;
  const isLoading = summary.isLoading;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 24,
        gap: 16,
      }}
    >
      <VStack space="xs">
        <Text size="2xl" bold className="text-foreground">
          {data?.name ?? '…'}
        </Text>
        <Text size="sm" className="text-muted-foreground">
          {data ? `${data.cityName} / ${data.districtName}` : '…'}
        </Text>
        {data ? <ActiveBadge isActive={data.isActive} /> : null}
      </VStack>

      <HStack space="md" className="items-stretch">
        <SummaryCard
          title="Güncel Bakiye"
          value={data?.currentBalance ?? null}
          format="currency"
          colorCoded
          isLoading={isLoading}
        />
        <SummaryCard
          title="Aktif Ürün"
          value={
            data
              ? `${data.activeProductCount} / ${data.totalProductCount}`
              : null
          }
          format="text"
          isLoading={isLoading}
        />
        <SummaryCard
          title="Son İşlem"
          value={formatRelativeDate(data?.lastMovementDate ?? null)}
          format="text"
          isLoading={isLoading}
        />
        <SummaryCard
          title="Açılış Bakiyesi"
          value={data?.openingBalance ?? null}
          format="currency"
          subtitle={
            typeof data?.branchCreatedAt === 'string' && data.branchCreatedAt
              ? `${formatDateForDisplay(data.branchCreatedAt)}'ten beri`
              : undefined
          }
          isLoading={isLoading}
        />
      </HStack>

      <Box className="flex-row border-b border-border">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className={`flex-1 items-center border-b-2 py-3 ${
                active ? 'border-primary' : 'border-transparent'
              }`}
            >
              <Text
                size="sm"
                bold={active}
                className={active ? 'text-primary' : 'text-muted-foreground'}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </Box>

      {activeTab === 'products' ? (
        <EmptyState
          title="Ürünler & Fiyatlar"
          subtitle="PR-6.2'de gelecek"
        />
      ) : null}
      {activeTab === 'movements' ? (
        <EmptyState
          title="Hareketler"
          subtitle="PR-6.2'de gelecek"
        />
      ) : null}
      {activeTab === 'details' ? (
        <EmptyState
          title="Detaylar"
          subtitle="PR-6.2'de gelecek"
        />
      ) : null}
    </ScrollView>
  );
}