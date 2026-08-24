import type { ReactNode } from 'react';
import { FlatList } from 'react-native';
import type { ListRenderItem } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { HStack } from '@/components/ui/hstack';
import { PlusIcon } from '@/components/ui/icon';
import { QueryError } from '@/components/ui/query-error';
import { Spinner } from '@/components/ui/spinner';
import { VStack } from '@/components/ui/vstack';

type GeographyListProps<T> = {
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  rows: readonly T[];
  renderRow: (item: T) => ReactNode;
  emptyTitle: string;
  emptySubtitle?: string;
  footerButton?: ReactNode;
  keyExtractor: (item: T) => string;
};

// List + empty state + footer button for cities/districts/branches.
// While loading we render a Spinner instead of an empty FlatList so the empty
// state doesn't briefly flash before data arrives. When the fetch errors we
// render QueryError so the admin sees a retry button (instead of a misleading
// "no data" empty state).
export function GeographyList<T>({
  isLoading,
  isError = false,
  onRetry,
  rows,
  renderRow,
  emptyTitle,
  emptySubtitle,
  footerButton,
  keyExtractor,
}: GeographyListProps<T>) {
  return (
    <Box style={{ flex: 1 }}>
      {isLoading ? (
        <Spinner label="Yükleniyor…" />
      ) : isError ? (
        <QueryError onRetry={onRetry} />
      ) : (
        <FlatList
          data={rows as T[]}
          keyExtractor={keyExtractor}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 128,
          }}
          ItemSeparatorComponent={null}
          ListEmptyComponent={
            <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
          }
          renderItem={(({ item, index }) => (
            <Box className={index === 0 ? 'border-t border-border' : ''}>
              {renderRow(item)}
            </Box>
          )) as ListRenderItem<T>}
          ListFooterComponent={
            footerButton ? (
              <Box className="mt-4">{footerButton}</Box>
            ) : null
          }
        />
      )}
    </Box>
  );
}

// Convenience: full-width + button used as the create-action at the bottom of
// each list. Caller supplies only the label and onPress.
type CreateButtonProps = {
  label: string;
  onPress: () => void;
};

export function CreateListButton({ label, onPress }: CreateButtonProps) {
  return (
    <Button onPress={onPress} className="w-full">
      <ButtonIcon as={PlusIcon} />
      <ButtonText>{label}</ButtonText>
    </Button>
  );
}

// Helper for footer stack — keeps "Yeni X" buttons visually grouped if multiple
// lists are rendered (they aren't currently, but keeps the import surface clean).
export function GeographyListFooter({ children }: { children: ReactNode }) {
  return (
    <VStack space="md">
      <HStack className="justify-center">{children}</HStack>
    </VStack>
  );
}