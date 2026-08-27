import { useCallback, useMemo, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { Box } from '@/components/ui/box';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { DayOfWeekPicker } from '@/components/ui/day-of-week-picker';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { useBranchesAnalytics } from '@/hooks';
import { formatCount } from '@/utils/formatCount';
import { formatDateForDisplay, getIstanbulToday } from '@/utils/dates';
import { formatRelativeDate } from '@/utils/formatRelativeDate';
import { formatCurrency, getBalanceTone } from '@/utils/formatters';
import type {
  BranchAnalyticsFilters,
  BranchAnalyticsRow,
  BranchAnalyticsSortBy,
  BranchAnalyticsSortDir,
  BranchAnalyticsStatus,
  DayOfWeek,
} from '@/types';

// Date-range presets. `null` for both = no filter (Tüm Zamanlar).
// `null` for dateFrom with a fixed dateTo would be unbounded lower; we
// always pair presets as a from/to pair or both null.
type DatePreset = '7d' | '30d' | 'month' | 'all';

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: '7d', label: 'Son 7 Gün' },
  { value: '30d', label: 'Son 30 Gün' },
  { value: 'month', label: 'Bu Ay' },
  { value: 'all', label: 'Tüm Zamanlar' },
];

const STATUS_OPTIONS: { value: BranchAnalyticsStatus; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Pasif' },
];

function presetToRange(
  preset: DatePreset,
): { dateFrom: string | undefined; dateTo: string | undefined } {
  if (preset === 'all') return { dateFrom: undefined, dateTo: undefined };
  const today = getIstanbulToday();
  if (preset === 'month') {
    const todayParts = today.split('-').map(Number);
    const firstOfMonth = `${todayParts[0]}-${String(todayParts[1]).padStart(2, '0')}-01`;
    return { dateFrom: firstOfMonth, dateTo: today };
  }
  // 7d / 30d → subtract days from today (YYYY-MM-DD arithmetic).
  const days = preset === '7d' ? 7 : 30;
  const d = new Date(today);
  d.setDate(d.getDate() - (days - 1));
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { dateFrom: iso, dateTo: today };
}

function formatReturnRate(rate: number | null): string {
  if (rate === null) return '—';
  return `%${rate.toFixed(1).replace(/\.0$/, '')}`;
}

function balanceClass(value: number): string {
  const tone = getBalanceTone(value);
  if (tone === 'Borç') return 'text-destructive';
  if (tone === 'Alacak') return 'text-info';
  return 'text-foreground';
}

// Flat, filterable, sortable branches table for the Şubeler tab. Drives the
// list_branches_analytics RPC via useBranchesAnalytics.
export function BranchesTableScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<BranchAnalyticsStatus>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>([]);
  const [sort, setSort] = useState<{
    columnKey: BranchAnalyticsSortBy;
    direction: BranchAnalyticsSortDir;
  }>({ columnKey: 'name', direction: 'asc' });

  // Map UI sort column key to RPC sort key.
  const sortColumnKey = sort.columnKey as BranchAnalyticsSortBy;

  const filters: BranchAnalyticsFilters = useMemo(() => {
    const { dateFrom, dateTo } = presetToRange(datePreset);
    return {
      search: searchInput.trim() ? searchInput.trim() : undefined,
      status,
      dateFrom,
      dateTo,
      daysOfWeek: daysOfWeek.length ? daysOfWeek : undefined,
      sortBy: sortColumnKey,
      sortDir: sort.direction,
    };
  }, [searchInput, status, datePreset, daysOfWeek, sortColumnKey, sort.direction]);

  const query = useBranchesAnalytics(filters);

  const allRows: BranchAnalyticsRow[] = useMemo(
    () =>
      query.data?.pages.flatMap((p) => p.rows) ?? [],
    [query.data],
  );
  const totalCount = query.data?.pages[0]?.totalCount ?? 0;

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['analytics', 'branches'] });
    void query.refetch();
  }, [queryClient, query]);

  const onSortChange = useCallback(
    (columnKey: string, direction: 'asc' | 'desc') => {
      setSort({
        columnKey: columnKey as BranchAnalyticsSortBy,
        direction,
      });
    },
    [],
  );

  const columns: ReadonlyArray<DataTableColumn<BranchAnalyticsRow>> =
    useMemo(
      () => [
        {
          key: 'name',
          header: 'Şube',
          flex: 1.6,
          sortable: true,
          render: (row) => (
            <VStack space="xs">
              <Text size="sm" bold className="text-foreground">
                {row.name}
              </Text>
              {!row.isActive ? (
                <Text size="xs" className="text-muted-foreground">
                  Pasif
                </Text>
              ) : null}
            </VStack>
          ),
        },
        {
          key: 'city',
          header: 'Şehir',
          flex: 1.2,
          render: (row) => (
            <Text size="sm" className="text-foreground" numberOfLines={1}>
              {row.cityName}
            </Text>
          ),
        },
        {
          key: 'district',
          header: 'İlçe',
          flex: 1.2,
          render: (row) => (
            <Text size="sm" className="text-foreground" numberOfLines={1}>
              {row.districtName}
            </Text>
          ),
        },
        {
          key: 'balance',
          header: 'Bakiye',
          flex: 1.1,
          align: 'right',
          sortable: true,
          render: (row) => (
            <VStack space="xs" className="items-end">
              <Text size="sm" bold className={balanceClass(row.currentBalance)}>
                {formatCurrency(row.currentBalance)}
              </Text>
              <Text size="xs" className="text-muted-foreground">
                {getBalanceTone(row.currentBalance)}
              </Text>
            </VStack>
          ),
        },
        {
          key: 'return_rate',
          header: 'İade Oranı',
          flex: 1,
          align: 'right',
          sortable: true,
          render: (row) => (
            <VStack space="xs" className="items-end">
              <Text size="sm" bold className="text-foreground">
                {formatReturnRate(row.returnRate)}
              </Text>
              <Text size="xs" className="text-muted-foreground">
                {formatCount(row.returnedQty)}/{formatCount(row.deliveredQty)}
              </Text>
            </VStack>
          ),
        },
        {
          key: 'last_activity',
          header: 'Son İşlem',
          flex: 1.1,
          align: 'right',
          sortable: true,
          render: (row) => (
            <VStack space="xs" className="items-end">
              <Text size="sm" className="text-foreground">
                {row.lastActivityDate
                  ? formatRelativeDate(row.lastActivityDate)
                  : '—'}
              </Text>
              <Text size="xs" className="text-muted-foreground">
                {row.lastActivityDate
                  ? formatDateForDisplay(row.lastActivityDate)
                  : 'Veri yok'}
              </Text>
            </VStack>
          ),
        },
      ],
      [],
    );

  const onRowPress = useCallback(
    (row: BranchAnalyticsRow) => {
      router.push({
        pathname: '/branches/[branchId]',
        params: { branchId: row.branchId },
      });
    },
    [router],
  );

  const refreshing = query.isFetching;

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <VStack space="md" className="px-6 pt-4">
          <HStack space="sm" className="items-end justify-between">
            <VStack space="xs">
              <Text size="xl" bold className="text-foreground">
                Şubeler
              </Text>
              <Text size="sm" className="text-muted-foreground">
                {totalCount > 0
                  ? `${allRows.length} / ${totalCount} şube`
                  : 'Şube yok'}
              </Text>
            </VStack>
          </HStack>

          {/* Search */}
          <Input className="bg-card">
            <InputSlot className="pl-3">
              <InputIcon />
            </InputSlot>
            <InputField
              placeholder="Şube ara…"
              value={searchInput}
              onChangeText={setSearchInput}
              returnKeyType="search"
            />
          </Input>

          {/* Status segmented */}
          <HStack
            space="xs"
            className="rounded-full border border-border bg-surface-muted p-0.5"
          >
            {STATUS_OPTIONS.map((opt) => {
              const active = status === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setStatus(opt.value)}
                  className={`flex-1 items-center justify-center rounded-full px-3 py-1.5 ${
                    active ? 'bg-primary' : ''
                  }`}
                >
                  <Text
                    size="xs"
                    bold={active}
                    className={
                      active
                        ? 'text-primary-foreground'
                        : 'text-surface-muted-foreground'
                    }
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </HStack>

          {/* Date preset segmented */}
          <HStack
            space="xs"
            className="rounded-full border border-border bg-surface-muted p-0.5"
          >
            {DATE_PRESETS.map((opt) => {
              const active = datePreset === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setDatePreset(opt.value)}
                  className={`flex-1 items-center justify-center rounded-full px-3 py-1.5 ${
                    active ? 'bg-primary' : ''
                  }`}
                >
                  <Text
                    size="xs"
                    bold={active}
                    className={
                      active
                        ? 'text-primary-foreground'
                        : 'text-surface-muted-foreground'
                    }
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </HStack>

          {/* Day-of-week picker */}
          <VStack space="xs">
            <Text size="xs" className="text-muted-foreground">
              Günler
            </Text>
            <DayOfWeekPicker value={daysOfWeek} onChange={setDaysOfWeek} />
          </VStack>
        </VStack>

        <Box className="px-6 pt-4">
          <DataTable
            columns={columns}
            rows={allRows}
            keyExtractor={(row) => row.branchId}
            onRowPress={onRowPress}
            sort={
              sort
                ? {
                    columnKey: sort.columnKey,
                    direction: sort.direction,
                  }
                : null
            }
            onSortChange={onSortChange}
            isLoading={query.isLoading}
            emptyTitle="Şube bulunamadı"
            emptySubtitle="Filtreleri değiştirip tekrar deneyin."
            onEndReached={() => {
              if (query.hasNextPage && !query.isFetchingNextPage) {
                void query.fetchNextPage();
              }
            }}
          />
        </Box>
      </ScrollView>
    </Box>
  );
}