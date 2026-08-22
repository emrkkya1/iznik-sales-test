import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { services } from '@/services';
import { generateIdempotencyKey } from '@/utils/idempotency';
import type {
  CreateDeliveryInput,
  ManualPaymentInput,
  UpdateDeliveryInput,
} from '@/types';

export function useCreateDelivery() {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string | null>(null);

  return useMutation({
    mutationFn: (input: CreateDeliveryInput) => {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = generateIdempotencyKey();
      }
      return services.deliveries.createDelivery(
        input,
        idempotencyKeyRef.current,
      );
    },
    onSuccess: () => {
      idempotencyKeyRef.current = null;
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
  });
}

export function useUpdateDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateDeliveryInput) =>
      services.deliveries.updateDelivery(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
  });
}

export function useSoftDeleteDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      services.deliveries.softDeleteDelivery(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
  });
}

export function useRecordManualPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ManualPaymentInput) =>
      services.payments.recordManualPayment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}
