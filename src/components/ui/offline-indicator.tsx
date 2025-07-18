import { CloudOff, Globe, Signal, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  useNetworkStatus,
  useSlowConnection,
} from '../../lib/hooks/use-network-status';
import { Badge } from './badge';

export function OfflineIndicator() {
  const { isOnline, isOffline, effectiveType, downlink, saveData } =
    useNetworkStatus();
  const isSlowConnection = useSlowConnection();
  const [showIndicator, setShowIndicator] = useState(false);

  // Show indicator when offline or on slow connection
  useEffect(() => {
    setShowIndicator(isOffline || isSlowConnection);
  }, [isOffline, isSlowConnection]);

  // Auto-hide after coming back online
  useEffect(() => {
    if (isOnline && !isSlowConnection) {
      const timer = setTimeout(() => setShowIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSlowConnection]);

  if (!showIndicator) return null;

  const getStatusColor = () => {
    if (isOffline) return 'destructive';
    if (isSlowConnection) return 'secondary';
    return 'default';
  };

  const getStatusIcon = () => {
    if (isOffline) return <WifiOff className="h-3 w-3" />;
    if (isSlowConnection) return <Signal className="h-3 w-3" />;
    return <Wifi className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (isOffline) return 'Offline';
    if (saveData) return 'Data Saver Mode';
    if (effectiveType === 'slow-2g' || effectiveType === '2g')
      return 'Slow Connection';
    if (downlink && downlink < 1) return 'Limited Bandwidth';
    return 'Connected';
  };

  const getStatusDescription = () => {
    if (isOffline) return 'Using cached data only';
    if (isSlowConnection) return 'Reduced functionality for better performance';
    return 'All features available';
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <Badge
        variant={getStatusColor()}
        className="flex items-center gap-2 py-2 px-3 shadow-lg"
      >
        {getStatusIcon()}
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">{getStatusText()}</span>
          <span className="text-xs opacity-80">{getStatusDescription()}</span>
        </div>
      </Badge>
    </div>
  );
}

// Compact version for status bars
export function OfflineIndicatorCompact() {
  const { isOnline, isOffline } = useNetworkStatus();
  const isSlowConnection = useSlowConnection();

  if (isOnline && !isSlowConnection) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {isOffline ? (
        <>
          <CloudOff className="h-4 w-4 text-destructive" />
          <span className="text-muted-foreground">Offline</span>
        </>
      ) : isSlowConnection ? (
        <>
          <Signal className="h-4 w-4 text-yellow-600" />
          <span className="text-muted-foreground">Slow Connection</span>
        </>
      ) : (
        <>
          <Globe className="h-4 w-4 text-green-600" />
          <span className="text-muted-foreground">Online</span>
        </>
      )}
    </div>
  );
}
