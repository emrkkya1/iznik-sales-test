import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { services } from '@/services';
import { generateIdempotencyKey } from '@/utils/idempotency';
import { logMutation } from '@/utils/logger';
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
    onMutate: (input) => {
      logMutation('createDelivery', 'start', { input });
    },
    onSuccess: (data) => {
      logMutation('createDelivery', 'success', {
        idempotencyKey: idempotencyKeyRef.current,
        result: data,
      });
      idempotencyKeyRef.current = null;
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
    onError: (error) => {
      logMutation('createDelivery', 'error', error);
    },
  });
}

export function useUpdateDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateDeliveryInput) =>
      services.deliveries.updateDelivery(input),
    onMutate: (input) => {
      logMutation('updateDelivery', 'start', { input });
    },
    onSuccess: (data) => {
      logMutation('updateDelivery', 'success', { result: data });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
    onError: (error) => {
      logMutation('updateDelivery', 'error', error);
    },
  });
}

export function useSoftDeleteDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      services.deliveries.softDeleteDelivery(id, reason),
    onMutate: ({ id, reason }) => {
      logMutation('softDeleteDelivery', 'start', { id, reason });
    },
    onSuccess: (_data, { id }) => {
      logMutation('softDeleteDelivery', 'success', { id });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
    onError: (error) => {
      logMutation('softDeleteDelivery', 'error', error);
    },
  });
}

export function useRecordManualPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ManualPaymentInput) =>
      services.payments.recordManualPayment(input),
    onMutate: (input) => {
      logMutation('recordManualPayment', 'start', { input });
    },
    onSuccess: (data) => {
      logMutation('recordManualPayment', 'success', { result: data });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error) => {
      logMutation('recordManualPayment', 'error', error);
    },
  });
}
