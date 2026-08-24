import { useEffect, useRef } from 'react';

import { useDelivery } from './useDeliveries';
import { useBranchLocation } from './useLocations';
import { useReceiptDraftStore } from '@/store/receiptDraft';

// Prefills the receipt draft from an existing delivery when the user opens it
// for editing (editingDeliveryId is set). Runs once per delivery id so user
// edits are never clobbered.
export function useEditPrefill(editingDeliveryId: string | null) {
  const applyPath = useReceiptDraftStore((s) => s.applyPath);
  const setDate = useReceiptDraftStore((s) => s.setDate);
  const setEntries = useReceiptDraftStore((s) => s.setEntries);
  const setPaymentAmount = useReceiptDraftStore((s) => s.setPaymentAmount);

  const delivery = useDelivery(editingDeliveryId);
  const branch = useBranchLocation(delivery.data?.branchId ?? null);

  const prefilledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!editingDeliveryId) {
      prefilledRef.current = null;
      return;
    }

    const deliveryData = delivery.data;
    const branchData = branch.data;
    if (!deliveryData || !branchData) return;
    if (prefilledRef.current === editingDeliveryId) return;
    prefilledRef.current = editingDeliveryId;

    applyPath({
      cityId: branchData.cityId,
      districtId: branchData.districtId,
      branchId: branchData.id,
    });
    setDate(deliveryData.date);

    const entries: Record<string, { delivered: number; returned: number }> = {};
    for (const item of deliveryData.items) {
      if (item.deliveredQuantity === 0 && item.returnedQuantity === 0) continue;
      entries[item.productId] = {
        delivered: item.deliveredQuantity,
        returned: item.returnedQuantity,
      };
    }
    setEntries(entries);

    const payment = deliveryData.payments.reduce((sum, p) => sum + p.amount, 0);
    setPaymentAmount(payment);
  }, [editingDeliveryId, delivery.data, branch.data, applyPath, setDate, setEntries, setPaymentAmount]);

  return { delivery, branch };
}
