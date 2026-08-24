import { useState } from 'react';
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';

import { Amount } from '@/components/ui/amount';
import { Box } from '@/components/ui/box';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { HStack } from '@/components/ui/hstack';
import { Icon, ChevronRightIcon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
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
    <Box style={{ flex: 1 }} className="bg-background">
      <FlatList
        data={items}
        keyExtractor={(d) => d.id}
        style={{ backgroundColor: '#FFFFFF' }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 24,
          backgroundColor: '#FFFFFF',
        }}
        ItemSeparatorComponent={null}
        ListEmptyComponent={
          <EmptyState
            title="Bugün kayıt yok"
            subtitle="Henüz bugüne ait teslimat kaydınız bulunmuyor."
          />
        }
        renderItem={({ item }) => {
          const editable = canEditDelivery(item.date);
          return (
            <Pressable
              onPress={editable ? () => setPending(item) : undefined}
              disabled={!editable}
              accessibilityRole={editable ? 'button' : undefined}
              className="flex-row items-center justify-between border-b border-border py-4"
            >
              <VStack space="xs" className="flex-1 pr-3">
                <Text
                  size="md"
                  bold
                  numberOfLines={1}
                  className="text-foreground"
                >
                  {item.branchName}
                </Text>
                <HStack space="sm" className="items-center">
                  <Text size="xs" className="text-muted-foreground">
                    {formatTime(item.createdAt)}
                  </Text>
                  {editable ? null : (
                    <>
                      <Text size="xs" className="text-muted-foreground">
                        ·
                      </Text>
                      <Text size="xs" className="text-muted-foreground">
                        Düzenleme kapandı
                      </Text>
                    </>
                  )}
                </HStack>
              </VStack>

              <HStack space="sm" className="items-center">
                <Amount size="md" bold value={item.totalSalesAmount} />
                {editable ? (
                  <Icon
                    as={ChevronRightIcon}
                    size="md"
                    className="text-muted-foreground"
                  />
                ) : null}
              </HStack>
            </Pressable>
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
