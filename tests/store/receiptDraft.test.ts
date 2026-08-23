import { describe, it, expect, beforeEach } from 'vitest';

import { useReceiptDraftStore } from '@/store/receiptDraft';
import { getIstanbulToday } from '@/utils/dates';

function resetStore() {
  useReceiptDraftStore.setState({
    cityId: null,
    districtId: null,
    branchId: null,
    date: getIstanbulToday(),
    quantities: {},
    paymentAmount: 0,
    isSubmitting: false,
    editingDeliveryId: null,
    lastPath: { cityId: null, districtId: null, branchId: null },
    lastDate: getIstanbulToday(),
  });
}

describe('receiptDraft store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('starts with default state', () => {
    const s = useReceiptDraftStore.getState();
    expect(s.cityId).toBeNull();
    expect(s.districtId).toBeNull();
    expect(s.branchId).toBeNull();
    expect(s.quantities).toEqual({});
    expect(s.paymentAmount).toBe(0);
    expect(s.isSubmitting).toBe(false);
    expect(s.editingDeliveryId).toBeNull();
    expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('setQuantity adds, updates and removes entries', () => {
    const store = useReceiptDraftStore.getState();

    store.setQuantity('p1', 5);
    expect(useReceiptDraftStore.getState().quantities).toEqual({ p1: 5 });

    store.setQuantity('p1', 0);
    expect(useReceiptDraftStore.getState().quantities).toEqual({});
  });

  it('applyPath clears quantities when the branch changes', () => {
    const store = useReceiptDraftStore.getState();
    store.setQuantity('p1', 5);

    store.applyPath({ cityId: 'c1', districtId: 'd1', branchId: 'b1' });

    expect(useReceiptDraftStore.getState().branchId).toBe('b1');
    expect(useReceiptDraftStore.getState().quantities).toEqual({});
  });

  it('applyPath keeps quantities when the branch is unchanged', () => {
    const store = useReceiptDraftStore.getState();
    store.applyPath({ cityId: 'c1', districtId: 'd1', branchId: 'b1' });
    store.setQuantity('p1', 5);

    store.applyPath({ cityId: 'c2', districtId: 'd1', branchId: 'b1' });

    expect(useReceiptDraftStore.getState().quantities).toEqual({ p1: 5 });
  });

  it('setDate clears quantities', () => {
    const store = useReceiptDraftStore.getState();
    store.setQuantity('p1', 5);

    store.setDate('2024-01-01');

    expect(useReceiptDraftStore.getState().date).toBe('2024-01-01');
    expect(useReceiptDraftStore.getState().quantities).toEqual({});
  });

  it('reset clears everything including the editing id', () => {
    const store = useReceiptDraftStore.getState();
    store.applyPath({ cityId: 'c1', districtId: 'd1', branchId: 'b1' });
    store.setQuantity('p1', 5);
    store.setPaymentAmount(120);
    store.setEditingDeliveryId('delivery-1');

    store.reset();

    const s = useReceiptDraftStore.getState();
    expect(s.branchId).toBeNull();
    expect(s.quantities).toEqual({});
    expect(s.paymentAmount).toBe(0);
    expect(s.editingDeliveryId).toBeNull();
  });

  it('rememberLast captures the current path and date', () => {
    const store = useReceiptDraftStore.getState();
    store.applyPath({ cityId: 'c1', districtId: 'd1', branchId: 'b1' });
    store.setDate('2024-03-15');

    store.rememberLast();

    const s = useReceiptDraftStore.getState();
    expect(s.lastPath).toEqual({
      cityId: 'c1',
      districtId: 'd1',
      branchId: 'b1',
    });
    expect(s.lastDate).toBe('2024-03-15');
  });

  it('reset restores the last remembered path and date', () => {
    const store = useReceiptDraftStore.getState();
    store.applyPath({ cityId: 'c1', districtId: 'd1', branchId: 'b1' });
    store.setDate('2024-03-15');
    store.setQuantity('p1', 5);
    store.setPaymentAmount(120);
    store.rememberLast();

    store.reset();

    const s = useReceiptDraftStore.getState();
    expect(s.cityId).toBe('c1');
    expect(s.districtId).toBe('d1');
    expect(s.branchId).toBe('b1');
    expect(s.date).toBe('2024-03-15');
    expect(s.quantities).toEqual({});
    expect(s.paymentAmount).toBe(0);
    expect(s.editingDeliveryId).toBeNull();
  });
});
