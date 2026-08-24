import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Amount } from '@/components/ui/amount';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useDelivery } from '@/hooks';
import { formatDateForDisplay } from '@/utils/dates';
import { getBalanceTone } from '@/utils/formatters';

type MovementItem = {
  id: string;
  kind: 'delivery' | 'payment';
  date: string;
  amount: number;
  paymentType: string | null;
  isDeleted: boolean;
  createdAt: string;
};

type MovementDetailSheetProps = {
  item: MovementItem | null;
  onClose: () => void;
};

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  field_collection: 'Elden Tahsilat',
  bank_transfer: 'Banka Havalesi',
};

// Read-only bottom-anchored sheet for delivery / payment detail view.
// Uses the shared BottomSheet primitive for the chrome.
//
// Layout (top → bottom):
//   1. Big price + Kazanç/Zarar label
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

  return (
    <BottomSheet
      open={item !== null}
      title={title}
      onClose={onClose}
    >
      {item ? (
        <VStack space="md">
          <VStack space="xs">
            <Amount
              size="2xl"
              bold
              value={item.amount}
              tone={
                item.amount > 0
                  ? 'info'
                  : item.amount < 0
                    ? 'destructive'
                    : 'default'
              }
            />
            {getBalanceTone(item.amount) !== 'Bakiye' ? (
              <Text size="sm" className="text-muted-foreground">
                {getBalanceTone(item.amount)}
              </Text>
            ) : null}
          </VStack>

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

function formatDateTime(iso: string): string {
  const [datePart, timePart] = iso.split('T');
  const timeOnly = timePart ? timePart.split(/[+\-Z]/)[0] : '';
  const date = formatDateForDisplay(datePart ?? iso);
  return timeOnly ? `${date} ${timeOnly}` : date;
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