import { useState } from 'react';
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';

import { Amount } from '@/components/ui/amount';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useMyDeliveries } from '@/hooks';
import { useReceiptDraftStore } from '@/store/receiptDraft';
import type { DeliveryWithBranch } from '@/types';
import { canEditDelivery } from '@/utils/dates';

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function StaffHistoryScreen() {
  const router = useRouter();
  const deliveries = useMyDeliveries();
  const setEditingDeliveryId = useReceiptDraftStore(
    (s) => s.setEditingDeliveryId,
  );
  const [pending, setPending] = useState<DeliveryWithBranch | null>(null);

  const startEdit = (delivery: DeliveryWithBranch) => {
    setPending(null);
    setEditingDeliveryId(delivery.id);
    router.push('/home');
  };

  if (deliveries.isLoading) {
    return <Spinner label="Yükleniyor…" />;
  }

  if (deliveries.isError) {
    return (
      <ErrorState
        message="Kayıtlar yüklenemedi."
        onRetry={() => deliveries.refetch()}
      />
    );
  }

  const items = deliveries.data ?? [];

  return (
    <Box style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <EmptyState
            title="Bugün kayıt yok"
            subtitle="Henüz bugüne ait teslimat kaydınız bulunmuyor."
          />
        }
        renderItem={({ item }) => {
          const editable = canEditDelivery(item.date);
          return (
            <HStack className="items-center justify-between rounded-xl border border-border bg-card p-4">
              <VStack space="xs">
                <Text size="sm" bold className="text-foreground">
                  {item.branchName}
                </Text>
                <Text size="xs" className="text-muted-foreground">
                  {formatTime(item.createdAt)}
                </Text>
              </VStack>

              <HStack space="lg" className="items-center">
                <VStack space="xs" className="items-end">
                  <Amount size="sm" bold value={item.totalSalesAmount} />
                  {editable ? null : (
                    <Text size="xs" className="text-muted-foreground">
                      Düzenleme kapandı
                    </Text>
                  )}
                </VStack>
                {editable ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => setPending(item)}
                  >
                    <ButtonText>Düzenle</ButtonText>
                  </Button>
                ) : null}
              </HStack>
            </HStack>
          );
        }}
      />

      <ConfirmDialog
        open={!!pending}
        title="Kaydı Düzenle"
        message="Bu kayıt düzenlenecek ve değişiklik denetim kaydına işlenecek. Devam etmek istiyor musunuz?"
        confirmLabel="Düzenle"
        onConfirm={() => pending && startEdit(pending)}
        onCancel={() => setPending(null)}
      />
    </Box>
  );
}
