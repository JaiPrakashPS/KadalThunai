import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { syncAllPending } from '../db/sync';

const NetworkContext = createContext(null);

export const NetworkProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      setIsConnected(connected);

      // Trigger sync when coming back online
      if (connected && wasOffline.current) {
        wasOffline.current = false;
        triggerSync();
      } else if (!connected) {
        wasOffline.current = true;
      }
    });

    // Also sync when app comes to foreground
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        NetInfo.fetch().then((netState) => {
          if (netState.isConnected) triggerSync();
        });
      }
    });

    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, []);

  const triggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncAllPending();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <NetworkContext.Provider value={{ isConnected, isSyncing, triggerSync }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within NetworkProvider');
  return ctx;
};
