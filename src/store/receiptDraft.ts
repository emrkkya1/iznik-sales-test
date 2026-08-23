import { create } from 'zustand';

import { getIstanbulToday } from '@/utils/dates';

export type BranchPath = {
  cityId: string | null;
  districtId: string | null;
  branchId: string | null;
};

type ReceiptDraftState = {
  cityId: string | null;
  districtId: string | null;
  branchId: string | null;
  date: string;
  quantities: Record<string, number>;
  paymentAmount: number;
  isSubmitting: boolean;
  editingDeliveryId: string | null;
  lastPath: BranchPath;
  lastDate: string;
  applyPath: (path: BranchPath) => void;
  setDate: (date: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setQuantities: (quantities: Record<string, number>) => void;
  setPaymentAmount: (amount: number) => void;
  setSubmitting: (submitting: boolean) => void;
  setEditingDeliveryId: (id: string | null) => void;
  rememberLast: () => void;
  reset: () => void;
};

const EMPTY_PATH: BranchPath = {
  cityId: null,
  districtId: null,
  branchId: null,
};

function initialState() {
  return {
    cityId: null as string | null,
    districtId: null as string | null,
    branchId: null as string | null,
    date: getIstanbulToday(),
    quantities: {} as Record<string, number>,
    paymentAmount: 0,
    isSubmitting: false,
    editingDeliveryId: null as string | null,
    lastPath: EMPTY_PATH,
    lastDate: getIstanbulToday(),
  };
}

export const useReceiptDraftStore = create<ReceiptDraftState>((set) => ({
  ...initialState(),
  applyPath: (path) =>
    set((state) => ({
      ...path,
      quantities:
        path.branchId !== state.branchId ? {} : state.quantities,
    })),
  setDate: (date) => set({ date, quantities: {} }),
  setQuantity: (productId, quantity) =>
    set((state) => {
      const quantities = { ...state.quantities };
      if (quantity <= 0) {
        delete quantities[productId];
      } else {
        quantities[productId] = quantity;
      }
      return { quantities };
    }),
  setQuantities: (quantities) => set({ quantities }),
  setPaymentAmount: (paymentAmount) => set({ paymentAmount }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setEditingDeliveryId: (editingDeliveryId) => set({ editingDeliveryId }),
  rememberLast: () =>
    set((state) => ({
      lastPath: {
        cityId: state.cityId,
        districtId: state.districtId,
        branchId: state.branchId,
      },
      lastDate: state.date,
    })),
  reset: () =>
    set((state) => ({
      ...initialState(),
      cityId: state.lastPath.cityId,
      districtId: state.lastPath.districtId,
      branchId: state.lastPath.branchId,
      date: state.lastDate,
      lastPath: state.lastPath,
      lastDate: state.lastDate,
    })),
}));
