import { describe, it, expect, beforeEach } from 'vitest';

import { useReceiptDraftStore } from '@/store/receiptDraft';
import { getIstanbulToday } from '@/utils/dates';

function resetStore() {
  useReceiptDraftStore.setState({
    cityId: null,
    districtId: null,
    branchId: null,
    date: getIstanbulToday(),
    entries: {},
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
    expect(s.entries).toEqual({});
    expect(s.paymentAmount).toBe(0);
    expect(s.isSubmitting).toBe(false);
    expect(s.editingDeliveryId).toBeNull();
    expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('setDelivered adds, updates and removes entries when both counts reach 0', () => {
    const store = useReceiptDraftStore.getState();

    store.setDelivered('p1', 5);
    expect(useReceiptDraftStore.getState().entries).toEqual({
      p1: { delivered: 5, returned: 0 },
    });

    store.setDelivered('p1', 0);
    expect(useReceiptDraftStore.getState().entries).toEqual({});
  });

  it('setDelivered keeps entry when returned > 0', () => {
    const store = useReceiptDraftStore.getState();
    store.setReturned('p1', 3);
    store.setDelivered('p1', 0);

    expect(useReceiptDraftStore.getState().entries).toEqual({
      p1: { delivered: 0, returned: 3 },
    });
  });

  it('setReturned updates only the returned field', () => {
    const store = useReceiptDraftStore.getState();
    store.setDelivered('p1', 5);
    store.setReturned('p1', 2);

    expect(useReceiptDraftStore.getState().entries).toEqual({
      p1: { delivered: 5, returned: 2 },
    });
  });

  it('setEntries drops zero entries and clamps negatives', () => {
    const store = useReceiptDraftStore.getState();

    store.setEntries({
      p1: { delivered: 5, returned: 1 },
      p2: { delivered: 0, returned: 0 },
      p3: { delivered: -3, returned: 4 },
    });

    expect(useReceiptDraftStore.getState().entries).toEqual({
      p1: { delivered: 5, returned: 1 },
      p3: { delivered: 0, returned: 4 },
    });
  });

  it('applyPath clears entries when the branch changes', () => {
    const store = useReceiptDraftStore.getState();
    store.setDelivered('p1', 5);

    store.applyPath({ cityId: 'c1', districtId: 'd1', branchId: 'b1' });

    expect(useReceiptDraftStore.getState().branchId).toBe('b1');
    expect(useReceiptDraftStore.getState().entries).toEqual({});
  });

  it('applyPath keeps entries when the branch is unchanged', () => {
    const store = useReceiptDraftStore.getState();
    store.applyPath({ cityId: 'c1', districtId: 'd1', branchId: 'b1' });
    store.setDelivered('p1', 5);

    store.applyPath({ cityId: 'c2', districtId: 'd1', branchId: 'b1' });

    expect(useReceiptDraftStore.getState().entries).toEqual({
      p1: { delivered: 5, returned: 0 },
    });
  });

  it('setDate clears entries', () => {
    const store = useReceiptDraftStore.getState();
    store.setDelivered('p1', 5);

    store.setDate('2024-01-01');

    expect(useReceiptDraftStore.getState().date).toBe('2024-01-01');
    expect(useReceiptDraftStore.getState().entries).toEqual({});
  });

  it('reset clears everything including the editing id', () => {
    const store = useReceiptDraftStore.getState();
    store.applyPath({ cityId: 'c1', districtId: 'd1', branchId: 'b1' });
    store.setDelivered('p1', 5);
    store.setPaymentAmount(120);
    store.setEditingDeliveryId('delivery-1');

    store.reset();

    const s = useReceiptDraftStore.getState();
    expect(s.branchId).toBeNull();
    expect(s.entries).toEqual({});
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
    store.setDelivered('p1', 5);
    store.setPaymentAmount(120);
    store.rememberLast();

    store.reset();

    const s = useReceiptDraftStore.getState();
    expect(s.cityId).toBe('c1');
    expect(s.districtId).toBe('d1');
    expect(s.branchId).toBe('b1');
    expect(s.date).toBe('2024-03-15');
    expect(s.entries).toEqual({});
    expect(s.paymentAmount).toBe(0);
    expect(s.editingDeliveryId).toBeNull();
  });

  it('clear wipes the working draft but preserves lastPath and lastDate', () => {
    const store = useReceiptDraftStore.getState();
    store.applyPath({ cityId: 'c1', districtId: 'd1', branchId: 'b1' });
    store.setDate('2024-03-15');
    store.setDelivered('p1', 5);
    store.setPaymentAmount(120);
    store.setEditingDeliveryId('delivery-1');
    store.rememberLast();

    store.clear();

    const s = useReceiptDraftStore.getState();
    expect(s.cityId).toBeNull();
    expect(s.districtId).toBeNull();
    expect(s.branchId).toBeNull();
    expect(s.entries).toEqual({});
    expect(s.paymentAmount).toBe(0);
    expect(s.editingDeliveryId).toBeNull();
    expect(s.lastPath).toEqual({
      cityId: 'c1',
      districtId: 'd1',
      branchId: 'b1',
    });
    expect(s.lastDate).toBe('2024-03-15');
  });
});
