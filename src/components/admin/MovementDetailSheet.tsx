import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Amount } from '@/components/ui/amount';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useDelivery } from '@/hooks';
import type { MovementRow } from '@/types';
import { formatDateForDisplay, formatDateTime } from '@/utils/dates';

type MovementDetailSheetProps = {
  item: MovementRow | null;
  onClose: () => void;
};

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  field_collection: 'Elden Tahsilat',
  bank_transfer: 'Banka Havalesi',
};

// Read-only bottom-anchored sheet for delivery / manual payment detail view.
// Uses the shared BottomSheet primitive for the chrome.
//
// Layout (top → bottom):
//   1. Big amount — NET (Alınan - Verilen) for deliveries, payment amount
//      for standalone payments. Cash-flow convention: positive = we have
//      cash in hand from this movement; negative = cash is missing. No tone
//      is applied so the leading "-" tells the story on its own. The
//      Verilen / Alınan breakdown lives in the list row (Hareketler tab).
//   2. Teslim Edilen Ürünler list (deliveries only) — indented rows, no
//      card chrome, no dividers between rows
//   3. Meta rows (Tarih, Tür, …, Durum) — with subtle dividers between them
//
// For deliveries, we lazy-fetch the full record via useDelivery(id) so the
// individual product items (quantity × unit price) are visible.
export function MovementDetailSheet({ item, onClose }: MovementDetailSheetProps) {
  const deliveryId =
    item?.kind === 'delivery' && !item.isDeleted ? item.id : null;
  const deliveryQuery = useDelivery(deliveryId);

  const title = item
    ? item.kind === 'delivery'
      ? 'Teslimat Detayı'
      : 'Tahsilat Detayı'
    : '';

  // Big amount follows the cash-flow convention ("+ means we got money"):
  //   Delivery  → NET = Alınan - Verilen. Positive on overpayment (cash
  //                in hand), negative when products exceed payment (cash
  //                missing).
  //   Payment   → the payment amount itself (cash in hand, no offset).
  const bigAmount = item
    ? item.kind === 'delivery' && item.payment
      ? item.payment.amount - item.amount
      : item.amount
    : 0;

  return (
    <BottomSheet
      open={item !== null}
      title={title}
      onClose={onClose}
    >
      {item ? (
        <VStack space="md">
          <Amount size="2xl" bold value={bigAmount} />

          {item.kind === 'delivery' && !item.isDeleted ? (
            <DeliveryItemsList query={deliveryQuery} />
          ) : null}

          <VStack className="mt-3">
            <DetailRow
              label="Tarih"
              value={formatDateForDisplay(item.date)}
              isFirst
            />
            <DetailRow
              label="Tür"
              value={item.kind === 'delivery' ? 'Teslimat' : 'Tahsilat'}
            />
            {item.kind === 'payment' && item.paymentType ? (
              <DetailRow
                label="Tahsilat Şekli"
                value={
                  PAYMENT_TYPE_LABEL[item.paymentType] ?? item.paymentType
                }
              />
            ) : null}
            <DetailRow
              label="Kayıt Zamanı"
              value={formatDateTime(item.createdAt)}
            />
            {item.isDeleted ? (
              <DetailRow label="Durum" value="Silindi" tone="destructive" />
            ) : (
              <DetailRow label="Durum" value="Aktif" />
            )}
          </VStack>
        </VStack>
      ) : null}
    </BottomSheet>
  );
}

function DeliveryItemsList({
  query,
}: {
  query: ReturnType<typeof useDelivery>;
}) {
  if (query.isLoading) {
    return <Spinner label="Ürünler yükleniyor…" />;
  }

  if (query.isError) {
    return (
      <Text size="sm" className="text-destructive">
        Ürünler yüklenemedi.
      </Text>
    );
  }

  const items = query.data?.items ?? [];

  if (items.length === 0) {
    return (
      <Text size="sm" className="text-muted-foreground">
        Bu teslimatte ürün kaydı bulunamadı.
      </Text>
    );
  }

  return (
    <VStack space="xs">
      <Text size="sm" bold className="text-foreground">
        Teslim Edilen Ürünler
      </Text>
      <VStack space="xs" className="pl-4">
        {items.map((line, idx) => (
          <HStack
            key={line.id ?? `${line.productId}-${idx}`}
            className="items-center justify-between"
          >
            <VStack className="flex-1 pr-3">
              <Text size="sm" className="text-foreground">
                {line.productName}
              </Text>
              <Text size="xs" className="text-muted-foreground">
                {line.netQuantity} adet × {formatUnitPriceLine(line.unitPrice)}
              </Text>
            </VStack>
            <Amount
              size="sm"
              value={line.netQuantity * line.unitPrice}
            />
          </HStack>
        ))}
      </VStack>
    </VStack>
  );
}

function formatUnitPriceLine(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

type DetailRowProps = {
  label: string;
  value: string;
  tone?: 'default' | 'destructive';
  isFirst?: boolean;
};

function DetailRow({ label, value, tone = 'default', isFirst = false }: DetailRowProps) {
  return (
    <HStack
      className={`items-center justify-between py-2 ${
        isFirst ? '' : 'border-t border-border'
      }`}
    >
      <Text size="sm" bold className="text-foreground">
        {label}
      </Text>
      <Text
        size="sm"
        className={tone === 'destructive' ? 'text-destructive' : 'text-foreground'}
      >
        {value}
      </Text>
    </HStack>
  );
}
