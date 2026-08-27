import { useMemo } from 'react';
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
  columns: ReadonlyArray<DataTableColumn<T>>;
  rows: ReadonlyArray<T>;
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
export function DataTable<T>({
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
}: DataTableProps<T>) {
  const renderRow: ListRenderItem<T> = useMemo(
    () =>
      ({ item }) => {
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
          data={rows as unknown as T[]}
          keyExtractor={keyExtractor}
          renderItem={renderRow}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshing={refreshing}
          ListHeaderComponent={null}
          removeClippedSubviews={false}
          initialNumToRender={20}
          windowSize={7}
        />
      )}
    </Box>
  );
}

// Re-export the SortState type for parents.
export type { SortState };