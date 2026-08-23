import { create } from 'zustand';

type ConnectivityState = {
  isOnline: boolean;
  setOnline: (online: boolean) => void;
};

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: true,
  setOnline: (online) => set({ isOnline: online }),
}));
