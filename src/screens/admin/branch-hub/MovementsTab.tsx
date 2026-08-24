import { useState } from 'react';

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
import type { MovementRow } from '@/types';
import { formatDateForDisplay } from '@/utils/dates';
import { formatCurrency } from '@/utils/formatters';

import { MovementDetailSheet } from '../../../components/admin/MovementDetailSheet';

type MovementsTabProps = {
  branchId: string;
};

const LIMIT = 50;

function Row({
  item,
  onPress,
}: {
  item: MovementRow;
  onPress: () => void;
}) {
  const isDelivery = item.kind === 'delivery';
  const icon = isDelivery ? TruckIcon : BanknoteIcon;
  const title = isDelivery ? 'Teslimat' : 'Tahsilat';

  // Top amount (cash-flow convention, "+ means we got money"):
  //   Delivery  → NET = Alınan - Verilen. Positive when the customer paid
  //                more than the products were worth (overpayment — we have
  //                cash in hand); negative when products exceed payment
  //                (we're missing cash). No tone is applied; the leading "-"
  //                from formatCurrency tells the story on its own.
  //   Payment   → just the payment amount; standalone payments have no
  //                Verilen side, so NET would be a meaningless negative.
  const alinanForDelivery = isDelivery && item.payment ? item.payment.amount : 0;
  const netAmount = isDelivery ? alinanForDelivery - item.amount : item.amount;

  // Subtitle row:
  //   Delivery  → both labels visible when an embedded payment exists;
  //                "Verilen" alone when there is none.
  //   Payment   → only "Alınan" (it's the same number as the top amount,
  //                but it keeps the row's visual rhythm consistent).
  const verilenValue = isDelivery ? item.amount : null;
  const alinanValue =
    isDelivery && item.payment ? item.payment.amount : !isDelivery ? item.amount : null;

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
      <VStack space="xs" className="items-end">
        <Amount size="sm" value={netAmount} />
        {(verilenValue !== null || alinanValue !== null) ? (
          <HStack space="sm">
            {verilenValue !== null ? (
              <Text size="xs">
                <Text size="xs" className="text-muted-foreground">
                  Verilen:{' '}
                </Text>
                <Text size="xs" className="text-foreground">
                  {formatCurrency(verilenValue)}
                </Text>
              </Text>
            ) : null}
            {alinanValue !== null ? (
              <Text size="xs">
                <Text size="xs" className="text-muted-foreground">
                  Alınan:{' '}
                </Text>
                <Text size="xs" className="text-info">
                  {formatCurrency(alinanValue)}
                </Text>
              </Text>
            ) : null}
          </HStack>
        ) : null}
      </VStack>
    </Pressable>
  );
}

export function MovementsTab({ branchId }: MovementsTabProps) {
  const infinite = useBranchMovementsInfinite(branchId, LIMIT);

  const items: MovementRow[] = infinite.data?.pages.flat() ?? [];

  const [selected, setSelected] = useState<MovementRow | null>(null);

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
