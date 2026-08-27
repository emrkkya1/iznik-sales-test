import { useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { FlatList, type ListRenderItem } from 'react-native';

import { Box } from '@/components/ui/box';
import { EmptyState } from '@/components/ui/empty-state';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';

import { DataTableHeader, type SortState } from './data-table-header';

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Flex weight (1 = equal share). Defaults to 1. */
  flex?: number;
  /** If true, tapping the header invokes `onSortChange` with this column. */
  sortable?: boolean;
};

export type DataTableProps<T> = {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  keyExtractor: (row: T) => string;
  onRowPress?: (row: T) => void;
  /** Server-driven sort state — used to paint up/down indicators on headers. */
  sort?: SortState;
  onSortChange?: (columnKey: string, direction: 'asc' | 'desc') => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  onEndReached?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
  /**
   * Rendered as the FlatList's ListHeaderComponent — typically the filter
   * bar / search input. Putting it inside the FlatList (instead of wrapping
   * the DataTable in a plain ScrollView) avoids the "VirtualizedLists nested
   * in plain ScrollViews" warning and keeps windowing working on Android.
   */
  header?: ReactNode;
  /** Extra content appended after the last row (e.g. load-more footer). */
  footer?: ReactNode;
  /** Pixel padding around the whole list (replaces the parent ScrollView). */
  contentPadding?: number;
};

function flexStyleFor(flex: number | undefined) {
  return { flex: flex ?? 1 };
}

function alignClass(align: 'left' | 'right' | 'center' | undefined) {
  if (align === 'right') return 'items-end';
  if (align === 'center') return 'items-center';
  return 'items-start';
}

// Generic virtualized data table. Renders a sticky-style header row at the
// top of a FlatList of body rows. Each cell uses the same flex layout
// defined by the column's `flex` weight so header + rows align perfectly.
//
// Sort is server-driven: the parent owns sort state and `onSortChange`
// re-queries the source. Indicator on the header is purely visual.
export const DataTable = (<T,>(props: DataTableProps<T>) => {
  const {
    columns,
    rows,
    keyExtractor,
    onRowPress,
    sort,
    onSortChange,
    isLoading = false,
    emptyTitle = 'Veri yok',
    emptySubtitle,
    onEndReached,
    refreshing = false,
    className,
    header,
    footer,
    contentPadding = 0,
  } = props;
  const renderRow: ListRenderItem<T> = useMemo(
    () =>
      function renderRow({ item }: { item: T }) {
        const content = (
          <HStack className="items-center border-b border-border px-4 py-3">
            {columns.map((col) => (
              <Box
                key={col.key}
                style={flexStyleFor(col.flex)}
                className={`${alignClass(col.align)} justify-center`}
              >
                {col.render(item)}
              </Box>
            ))}
          </HStack>
        );

        if (!onRowPress) return content;

        return (
          <Pressable
            onPress={() => onRowPress(item)}
            android_ripple={{ color: '#00000010' }}
          >
            {content}
          </Pressable>
        );
      },
    [columns, onRowPress],
  );

  return (
    <Box
      style={{ flex: 1 }}
      className={`overflow-hidden rounded-2xl border border-border bg-card ${
        className ?? ''
      }`}
    >
      <DataTableHeader
        columns={columns}
        sort={sort ?? null}
        onSortChange={onSortChange}
      />

      {isLoading ? (
        <Box className="items-center py-10">
          <Spinner label="Yükleniyor…" />
        </Box>
      ) : rows.length === 0 ? (
        <Box className="px-4 py-10">
          <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
        </Box>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={rows as unknown as T[]}
          keyExtractor={keyExtractor}
          renderItem={renderRow}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshing={refreshing}
          ListHeaderComponent={header as ReactElement | null}
          ListFooterComponent={footer as ReactElement | null}
          contentContainerStyle={
            contentPadding
              ? { padding: contentPadding }
              : undefined
          }
          removeClippedSubviews={false}
          initialNumToRender={20}
          windowSize={7}
        />
      )}
    </Box>
  );
}) as <T>(props: DataTableProps<T>) => ReactElement;

(DataTable as unknown as { displayName: string }).displayName = 'DataTable';

// Re-export the SortState type for parents.
export type { SortState };