import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

import type { DataTableColumn } from './index';

export type SortState = {
  columnKey: string;
  direction: 'asc' | 'desc';
} | null;

type DataTableHeaderProps<T> = {
  columns: ReadonlyArray<DataTableColumn<T>>;
  sort: SortState;
  onSortChange?: (columnKey: string, direction: 'asc' | 'desc') => void;
};

function flexStyleFor(flex: number | undefined) {
  return { flex: flex ?? 1 };
}

function alignClass(align: 'left' | 'right' | 'center' | undefined) {
  if (align === 'right') return 'items-end';
  if (align === 'center') return 'items-center';
  return 'items-start';
}

function indicatorFor(
  columnKey: string,
  sort: SortState,
): '▲' | '▼' | null {
  if (!sort || sort.columnKey !== columnKey) return null;
  return sort.direction === 'asc' ? '▲' : '▼';
}

export function DataTableHeader<T>({
  columns,
  sort,
  onSortChange,
}: DataTableHeaderProps<T>) {
  return (
    <Box className="border-b border-border bg-muted px-4 py-2">
      <HStack className="items-center">
        {columns.map((col) => {
          const indicator = indicatorFor(col.key, sort);
          const headerLabel = (
            <HStack space="xs" className="items-center">
              <Text size="xs" bold className="text-muted-foreground">
                {col.header}
              </Text>
              {indicator ? (
                <Text size="xs" className="text-muted-foreground">
                  {indicator}
                </Text>
              ) : null}
            </HStack>
          );

          return (
            <Box
              key={col.key}
              style={flexStyleFor(col.flex)}
              className={`${alignClass(col.align)} justify-center`}
            >
              {col.sortable && onSortChange ? (
                <Pressable
                  onPress={() => {
                    const nextDirection: 'asc' | 'desc' =
                      sort && sort.columnKey === col.key && sort.direction === 'asc'
                        ? 'desc'
                        : 'asc';
                    onSortChange(col.key, nextDirection);
                  }}
                  hitSlop={8}
                >
                  {headerLabel}
                </Pressable>
              ) : (
                headerLabel
              )}
            </Box>
          );
        })}
      </HStack>
    </Box>
  );
}