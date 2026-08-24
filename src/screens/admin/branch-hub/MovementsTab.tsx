import { useMemo, useState } from 'react';

import { Amount } from '@/components/ui/amount';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { HStack } from '@/components/ui/hstack';
import { Icon, BanknoteIcon, TruckIcon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { QueryError } from '@/components/ui/query-error';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useBranchMovementsInfinite } from '@/hooks';
import { formatDateForDisplay } from '@/utils/dates';

import { MovementDetailSheet } from '../../../components/admin/MovementDetailSheet';

type MovementsTabProps = {
  branchId: string;
};

const LIMIT = 50;

type MovementItem = {
  id: string;
  kind: 'delivery' | 'payment';
  date: string;
  amount: number;
  paymentType: string | null;
  isDeleted: boolean;
  createdAt: string;
};

type MovementsPage = {
  deliveries: {
    id: string;
    date: string;
    amount: number;
    paymentType: string | null;
    isDeleted: boolean;
    createdAt: string;
  }[];
  payments: {
    id: string;
    date: string;
    amount: number;
    paymentType: string | null;
    isDeleted: boolean;
    createdAt: string;
  }[];
};

function Row({
  item,
  onPress,
}: {
  item: MovementItem;
  onPress: () => void;
}) {
  const isDelivery = item.kind === 'delivery';
  const icon = isDelivery ? TruckIcon : BanknoteIcon;
  const title = isDelivery ? 'Teslimat' : 'Tahsilat';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title} detayı`}
      className="flex-row items-center justify-between border-b border-border py-3 active:bg-accent"
    >
      <HStack space="sm" className="flex-1 items-center">
        <Box className="h-9 w-9 items-center justify-center rounded-full bg-accent">
          <Icon as={icon} size="sm" className="text-accent-foreground" />
        </Box>
        <VStack space="xs" className="flex-1 pr-3">
          <Text size="sm" bold className="text-foreground">
            {title}
            {item.isDeleted ? (
              <Text size="xs" className="text-muted-foreground">
                {' '}(silindi)
              </Text>
            ) : null}
          </Text>
          <Text size="xs" className="text-muted-foreground">
            {formatDateForDisplay(item.date)}
          </Text>
        </VStack>
      </HStack>
      <Amount
        size="sm"
        value={item.amount}
        tone={isDelivery ? 'default' : 'info'}
      />
    </Pressable>
  );
}

function flattenPages(pages: MovementsPage[]): MovementItem[] {
  const items: MovementItem[] = [];
  for (const page of pages) {
    for (const d of page.deliveries) {
      items.push({
        id: d.id,
        kind: 'delivery',
        date: d.date,
        amount: d.amount,
        paymentType: d.paymentType,
        isDeleted: d.isDeleted,
        createdAt: d.createdAt,
      });
    }
    for (const p of page.payments) {
      items.push({
        id: p.id,
        kind: 'payment',
        date: p.date,
        amount: p.amount,
        paymentType: p.paymentType,
        isDeleted: p.isDeleted,
        createdAt: p.createdAt,
      });
    }
  }
  return items.sort((a, b) => {
    const cmp = b.date.localeCompare(a.date);
    if (cmp !== 0) return cmp;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function MovementsTab({ branchId }: MovementsTabProps) {
  const infinite = useBranchMovementsInfinite(branchId, LIMIT);

  const items = useMemo(
    () => flattenPages(infinite.data?.pages ?? []),
    [infinite.data?.pages],
  );

  const [selected, setSelected] = useState<MovementItem | null>(null);

  if (infinite.isLoading) {
    return <Spinner label="Hareketler yükleniyor…" />;
  }

  if (infinite.isError) {
    return (
      <QueryError
        onRetry={() => infinite.refetch()}
        title="Hareketler yüklenemedi"
      />
    );
  }

  return (
    <Box className="px-6">
      {items.length === 0 ? (
        <EmptyState
          title="Hareket yok"
          subtitle="Bu şube için henüz teslimat veya tahsilat kaydı yok."
        />
      ) : (
        <VStack>
          {items.map((item) => (
            <Row
              key={`${item.kind}-${item.id}`}
              item={item}
              onPress={() => setSelected(item)}
            />
          ))}
        </VStack>
      )}

      {infinite.hasNextPage ? (
        <Box className="items-center pt-4">
          <Button
            variant="outline"
            onPress={() => infinite.fetchNextPage()}
            disabled={infinite.isFetchingNextPage}
          >
            <ButtonText>
              {infinite.isFetchingNextPage
                ? 'Yükleniyor…'
                : `Daha Fazla Yükle (${items.length})`}
            </ButtonText>
          </Button>
        </Box>
      ) : null}

      <MovementDetailSheet
        item={selected}
        onClose={() => setSelected(null)}
      />
    </Box>
  );
}