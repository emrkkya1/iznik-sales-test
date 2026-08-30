import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, type ListRenderItemInfo } from 'react-native';
import { useRouter } from 'expo-router';

import { Box } from '@/components/ui/box';
import { DayOfWeekPicker } from '@/components/ui/day-of-week-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { HStack } from '@/components/ui/hstack';
import { SearchIcon } from '@/components/ui/icon';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { QueryError } from '@/components/ui/query-error';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useBranchesAnalytics } from '@/hooks';
import type {
  BranchAnalyticsFilters,
  BranchAnalyticsRow,
  BranchAnalyticsSortBy,
  BranchAnalyticsSortDir,
  BranchAnalyticsStatus,
  DayOfWeek,
} from '@/types';
import {
  type DateRangePreset,
  formatDateForDisplay,
  getDatePresetRange,
} from '@/utils/dates';
import { formatCount } from '@/utils/formatCount';
import { formatCurrency, getBalanceTone } from '@/utils/formatters';
import { formatRelativeDate } from '@/utils/formatRelativeDate';

const DATE_PRESETS: readonly { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: 'Son 7 Gün' },
  { value: '30d', label: 'Son 30 Gün' },
  { value: 'month', label: 'Bu Ay' },
  { value: 'all', label: 'Tüm Zamanlar' },
];

const STATUS_OPTIONS: readonly {
  value: BranchAnalyticsStatus;
  label: string;
}[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Pasif' },
];

type ColumnKey =
  | BranchAnalyticsSortBy
  | 'city'
  | 'district';

type Column = {
  key: ColumnKey;
  label: string;
  flex: number;
  align?: 'left' | 'right';
  sortable?: boolean;
};

const COLUMNS: readonly Column[] = [
  { key: 'name', label: 'Şube', flex: 1.6, sortable: true },
  { key: 'city', label: 'Şehir', flex: 1.2 },
  { key: 'district', label: 'İlçe', flex: 1.2 },
  { key: 'balance', label: 'Bakiye', flex: 1.1, align: 'right', sortable: true },
  { key: 'return_rate', label: 'İade Oranı', flex: 1, align: 'right', sortable: true },
  { key: 'last_activity', label: 'Son İşlem', flex: 1.1, align: 'right', sortable: true },
];

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

function alignClass(align: Column['align']): string {
  return align === 'right' ? 'items-end' : 'items-start';
}

function Segment<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <HStack
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      space="xs"
      className="rounded-full border border-border bg-surface-muted p-0.5"
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            style={{ flex: 1 }}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={`min-h-11 items-center justify-center rounded-full px-3 ${
              selected ? 'bg-primary' : ''
            }`}
          >
            <Text
              size="xs"
              bold={selected}
              className={
                selected
                  ? 'text-primary-foreground'
                  : 'text-surface-muted-foreground'
              }
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </HStack>
  );
}

function BranchTableHeader({
  sort,
  onSortChange,
}: {
  sort: { columnKey: BranchAnalyticsSortBy; direction: BranchAnalyticsSortDir };
  onSortChange: (column: BranchAnalyticsSortBy) => void;
}) {
  return (
    <HStack className="mx-6 items-center rounded-t-xl border border-border bg-muted px-4 py-2">
      {COLUMNS.map((column) => {
        const active = column.key === sort.columnKey;
        const label = active
          ? `${column.label}, ${sort.direction === 'asc' ? 'artan' : 'azalan'} sıralama`
          : column.label;
        return (
          <Box
            key={column.key}
            style={{ flex: column.flex }}
            className={`${alignClass(column.align)} justify-center`}
          >
            {column.sortable ? (
              <Pressable
                onPress={() => onSortChange(column.key as BranchAnalyticsSortBy)}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityHint="Sıralama yönünü değiştirir"
                className="min-h-11 justify-center"
              >
                <HStack space="xs" className="items-center">
                  <Text size="xs" bold className="text-muted-foreground">
                    {column.label}
                  </Text>
                  {active ? (
                    <Text size="xs" className="text-muted-foreground">
                      {sort.direction === 'asc' ? '▲' : '▼'}
                    </Text>
                  ) : null}
                </HStack>
              </Pressable>
            ) : (
              <Text size="xs" bold className="text-muted-foreground">
                {column.label}
              </Text>
            )}
          </Box>
        );
      })}
    </HStack>
  );
}

export function BranchesTableScreen() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<BranchAnalyticsStatus>('all');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>([]);
  const [sort, setSort] = useState<{
    columnKey: BranchAnalyticsSortBy;
    direction: BranchAnalyticsSortDir;
  }>({ columnKey: 'name', direction: 'asc' });

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const filters: BranchAnalyticsFilters = useMemo(() => {
    const range = getDatePresetRange(datePreset);
    return {
      search: search || undefined,
      status,
      ...range,
      daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : undefined,
      sortBy: sort.columnKey,
      sortDir: sort.direction,
    };
  }, [datePreset, daysOfWeek, search, sort, status]);

  const query = useBranchesAnalytics(filters);
  const rows = useMemo(
    () => query.data?.pages.flatMap((page) => page.rows) ?? [],
    [query.data],
  );
  const totalCount = query.data?.pages[0]?.totalCount ?? 0;

  const changeSort = useCallback((columnKey: BranchAnalyticsSortBy) => {
    setSort((current) => ({
      columnKey,
      direction:
        current.columnKey === columnKey && current.direction === 'asc'
          ? 'desc'
          : 'asc',
    }));
  }, []);

  const openBranch = useCallback(
    (row: BranchAnalyticsRow) => {
      router.push({
        pathname: '/branches/[branchId]',
        params: { branchId: row.branchId },
      });
    },
    [router],
  );

  const renderRow = useCallback(
    ({ item }: ListRenderItemInfo<BranchAnalyticsRow>) => (
      <Pressable
        onPress={() => openBranch(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.cityName}, ${item.districtName}`}
        accessibilityHint="Şube detaylarını açar"
        className="mx-6 border-x border-b border-border bg-card data-[pressed=true]:bg-accent"
      >
        <HStack className="items-center px-4 py-3">
          <Box style={{ flex: 1.6 }} className="items-start justify-center">
            <VStack space="xs">
              <Text size="sm" bold numberOfLines={1} className="text-foreground">
                {item.name}
              </Text>
              {!item.isActive ? (
                <Text size="xs" className="text-muted-foreground">
                  Pasif
                </Text>
              ) : null}
            </VStack>
          </Box>
          <Box style={{ flex: 1.2 }} className="items-start justify-center">
            <Text size="sm" numberOfLines={1} className="text-foreground">
              {item.cityName}
            </Text>
          </Box>
          <Box style={{ flex: 1.2 }} className="items-start justify-center">
            <Text size="sm" numberOfLines={1} className="text-foreground">
              {item.districtName}
            </Text>
          </Box>
          <Box style={{ flex: 1.1 }} className="items-end justify-center">
            <VStack space="xs" className="items-end">
              <Text size="sm" bold className={balanceClass(item.currentBalance)}>
                {formatCurrency(item.currentBalance)}
              </Text>
              <Text size="xs" className="text-muted-foreground">
                {getBalanceTone(item.currentBalance)}
              </Text>
            </VStack>
          </Box>
          <Box style={{ flex: 1 }} className="items-end justify-center">
            <VStack space="xs" className="items-end">
              <Text size="sm" bold className="text-foreground">
                {formatReturnRate(item.returnRate)}
              </Text>
              <Text size="xs" className="text-muted-foreground">
                {formatCount(item.returnedQty)}/{formatCount(item.deliveredQty)}
              </Text>
            </VStack>
          </Box>
          <Box style={{ flex: 1.1 }} className="items-end justify-center">
            <VStack space="xs" className="items-end">
              <Text size="sm" className="text-foreground">
                {formatRelativeDate(item.lastActivityDate)}
              </Text>
              <Text size="xs" className="text-muted-foreground">
                {item.lastActivityDate
                  ? formatDateForDisplay(item.lastActivityDate)
                  : 'Veri yok'}
              </Text>
            </VStack>
          </Box>
        </HStack>
      </Pressable>
    ),
    [openBranch],
  );

  const header = useMemo(
    () => (
      <>
        <VStack space="md" className="px-6 pb-3 pt-4">
          <VStack space="xs">
            <Text size="xl" bold className="text-foreground">
              Şubeler
            </Text>
            <Text size="sm" className="text-muted-foreground">
              {query.isLoading
                ? 'Şubeler yükleniyor'
                : `${rows.length} / ${totalCount} şube`}
            </Text>
          </VStack>

          <Input className="bg-card">
            <InputSlot className="pl-1">
              <InputIcon as={SearchIcon} />
            </InputSlot>
            <InputField
              accessibilityLabel="Şube ara"
              placeholder="Şube ara…"
              value={searchInput}
              onChangeText={setSearchInput}
              returnKeyType="search"
            />
          </Input>

          <HStack space="md" className="items-start">
            <Box style={{ flex: 1 }}>
              <Segment
                label="Şube durumu"
                options={STATUS_OPTIONS}
                value={status}
                onChange={setStatus}
              />
            </Box>
            <Box style={{ flex: 1.5 }}>
              <Segment
                label="Metrik tarih aralığı"
                options={DATE_PRESETS}
                value={datePreset}
                onChange={setDatePreset}
              />
            </Box>
          </HStack>

          <HStack space="md" className="items-center justify-between">
            <VStack space="xs">
              <Text size="xs" className="text-muted-foreground">
                Metrik günleri
              </Text>
              <DayOfWeekPicker value={daysOfWeek} onChange={setDaysOfWeek} />
            </VStack>
            {query.isRefetching && !query.isFetchingNextPage ? (
              <Text size="xs" className="text-muted-foreground">
                Güncelleniyor…
              </Text>
            ) : null}
          </HStack>
        </VStack>
        <BranchTableHeader sort={sort} onSortChange={changeSort} />
      </>
    ),
    [
      changeSort,
      datePreset,
      daysOfWeek,
      query.isFetchingNextPage,
      query.isLoading,
      query.isRefetching,
      rows.length,
      searchInput,
      sort,
      status,
      totalCount,
    ],
  );

  const empty = query.isLoading ? (
    <Spinner label="Şubeler yükleniyor…" />
  ) : query.isError ? (
    <QueryError title="Şubeler yüklenemedi" onRetry={() => void query.refetch()} />
  ) : (
    <EmptyState
      title="Şube bulunamadı"
      subtitle="Filtreleri değiştirip tekrar deneyin."
    />
  );

  const footer = query.isFetchingNextPage ? (
    <Spinner size="small" label="Daha fazla şube yükleniyor…" />
  ) : query.isFetchNextPageError ? (
    <QueryError
      title="Diğer şubeler yüklenemedi"
      onRetry={() => void query.fetchNextPage()}
    />
  ) : (
    <Box className="h-6" />
  );

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <FlatList
        style={{ flex: 1 }}
        data={rows}
        keyExtractor={(row) => row.branchId}
        renderItem={renderRow}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        onRefresh={() => void query.refetch()}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        initialNumToRender={20}
        windowSize={7}
      />
    </Box>
  );
}
