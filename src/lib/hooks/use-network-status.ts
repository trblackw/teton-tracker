import { useEffect, useState } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  connectionType: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => {
    if (typeof navigator === 'undefined') {
      return {
        isOnline: true,
        isOffline: false,
        connectionType: null,
        effectiveType: null,
        downlink: null,
        rtt: null,
        saveData: false,
      };
    }

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    return {
      isOnline: navigator.onLine,
      isOffline: !navigator.onLine,
      connectionType: connection?.type || null,
      effectiveType: connection?.effectiveType || null,
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
      saveData: connection?.saveData || false,
    };
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      setNetworkStatus({
        isOnline: navigator.onLine,
        isOffline: !navigator.onLine,
        connectionType: connection?.type || null,
        effectiveType: connection?.effectiveType || null,
        downlink: connection?.downlink || null,
        rtt: connection?.rtt || null,
        saveData: connection?.saveData || false,
      });
    };

    const handleOnline = () => updateNetworkStatus();
    const handleOffline = () => updateNetworkStatus();
    const handleConnectionChange = () => updateNetworkStatus();

    // Listen to online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen to connection changes if supported
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return networkStatus;
}

// Hook to determine if connection is slow
export function useSlowConnection(): boolean {
  const { effectiveType, downlink, rtt, saveData } = useNetworkStatus();

  // Consider connection slow if:
  // 1. User has data saving enabled
  // 2. Effective type is slow-2g or 2g
  // 3. Downlink is less than 1 Mbps
  // 4. RTT is greater than 500ms
  return (
    saveData ||
    effectiveType === 'slow-2g' ||
    effectiveType === '2g' ||
    (downlink !== null && downlink < 1) ||
    (rtt !== null && rtt > 500)
  );
}

// Hook for network-aware data fetching
export function useNetworkAwareOptions() {
  const { isOffline } = useNetworkStatus();
  const isSlowConnection = useSlowConnection();

  return {
    enabled: !isOffline,
    staleTime: isSlowConnection ? 10 * 60 * 1000 : 5 * 60 * 1000, // Longer stale time for slow connections
    gcTime: isSlowConnection ? 60 * 60 * 1000 : 30 * 60 * 1000, // Longer cache time for slow connections
    refetchOnWindowFocus: !isSlowConnection, // Don't refetch on window focus for slow connections
    refetchOnReconnect: true,
    retry: isSlowConnection ? 2 : 3, // Fewer retries for slow connections
  };
}
