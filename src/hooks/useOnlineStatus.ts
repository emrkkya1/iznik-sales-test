import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

import { useConnectivityStore } from '@/store/connectivity';

export function useOnlineStatus() {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online =
        state.isConnected !== false && state.isInternetReachable !== false;
      useConnectivityStore.getState().setOnline(online);
    });

    return unsubscribe;
  }, []);
}
