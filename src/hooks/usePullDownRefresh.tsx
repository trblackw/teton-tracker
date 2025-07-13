import { ChevronDown, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  threshold?: number;
  maxPull?: number;
  onRefresh: () => Promise<void> | void;
  isLoading?: boolean;
  includeIndicator?: boolean;
}

interface PullToRefreshReturn {
  isMobile: boolean;
  containerProps: {
    ref: React.RefObject<HTMLDivElement | null>;
    className: string;
    style: React.CSSProperties;
  };
  PullIndicator: React.ComponentType;
  StaticIndicator: React.ComponentType;
}

export function usePullToRefresh({
  threshold = 80,
  maxPull = 120,
  onRefresh,
  isLoading = false,
  includeIndicator = false,
}: PullToRefreshOptions): PullToRefreshReturn {
  // Pull-to-refresh state
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [isRefreshTriggered, setIsRefreshTriggered] = useState<boolean>(false);

  // Refs for performance optimization
  const touchStartRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Mobile detection
  useEffect(() => {
    const checkIsMobile = () => {
      const isTouchDevice =
        'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isTouchDevice && isSmallScreen);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Throttled update function using requestAnimationFrame
  const updatePullDistance = useCallback((distance: number) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const now = performance.now();
      // Throttle to ~60fps (16ms between updates)
      if (now - lastUpdateTimeRef.current >= 16) {
        setPullDistance(distance);
        lastUpdateTimeRef.current = now;
      }
    });
  }, []);

  // Touch event handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!scrollContainerRef.current) return;

    const scrollTop = scrollContainerRef.current.scrollTop;
    if (scrollTop === 0) {
      touchStartRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling || !scrollContainerRef.current) return;

      const scrollTop = scrollContainerRef.current.scrollTop;
      if (scrollTop > 0) {
        setIsPulling(false);
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - touchStartRef.current);
      const constrainedDistance = Math.min(distance * 0.5, maxPull);

      // Use throttled update for smooth animation
      updatePullDistance(constrainedDistance);

      // Prevent default scrolling when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    },
    [isPulling, maxPull, updatePullDistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullDistance >= threshold) {
      setIsRefreshTriggered(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshTriggered(false);
      }
    }

    // Smooth reset to 0
    updatePullDistance(0);
  }, [isPulling, pullDistance, threshold, onRefresh, updatePullDistance]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Set up touch event listeners for mobile
  useEffect(() => {
    if (!isMobile || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;

    container.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    container.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Static indicator component (shows when not pulling)
  const StaticIndicator = useCallback(() => {
    if (!isMobile || !includeIndicator || isPulling || isRefreshTriggered)
      return null;

    return (
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center py-2 bg-background/95 border-b border-border/20 animate-in fade-in-0 duration-300">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ChevronDown className="h-3 w-3" />
          <span>Pull down to refresh</span>
        </div>
      </div>
    );
  }, [isMobile, includeIndicator, isPulling, isRefreshTriggered]);

  // Pull-to-refresh indicator component (shows during pull)
  const PullIndicator = useCallback(() => {
    if (!isMobile || pullDistance === 0) return null;

    const rotation = Math.min(pullDistance * 4, 360);
    const opacity = pullDistance > 20 ? 1 : pullDistance / 20;

    return (
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-background/90"
        style={{
          height: `${Math.max(0, pullDistance)}px`,
          opacity,
          willChange: 'transform, opacity', // Optimize for animations
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <RefreshCw
            className={`h-5 w-5 text-muted-foreground ${
              isRefreshTriggered || isLoading ? 'animate-spin' : ''
            } ${pullDistance >= threshold ? 'text-primary' : ''}`}
            style={{
              transform:
                isRefreshTriggered || isLoading
                  ? undefined
                  : `rotate(${rotation}deg)`,
              willChange: 'transform', // Optimize for transform animations
            }}
          />
          {pullDistance > 40 && (
            <span className="text-xs text-muted-foreground">
              {pullDistance >= threshold
                ? isRefreshTriggered || isLoading
                  ? 'Refreshing...'
                  : 'Release to refresh'
                : 'Pull to refresh'}
            </span>
          )}
        </div>
      </div>
    );
  }, [isMobile, pullDistance, threshold, isRefreshTriggered, isLoading]);

  // Container props for the scrollable area
  const containerProps = {
    ref: scrollContainerRef,
    className: isMobile ? 'min-h-screen overflow-auto' : '',
    style: {
      transform:
        isMobile && (isPulling || isRefreshTriggered)
          ? `translate3d(0, ${pullDistance}px, 0)` // Use translate3d for hardware acceleration
          : undefined,
      transition: isPulling
        ? 'none'
        : 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), padding-top 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)', // Smooth transitions for both transform and padding
      willChange: isPulling ? 'transform' : 'auto', // Optimize during interaction
      // Add top padding when showing static indicator
      paddingTop:
        isMobile && includeIndicator && !isPulling && !isRefreshTriggered
          ? '2.5rem'
          : '0rem', // Use 0rem instead of undefined for smooth transition
    } as React.CSSProperties,
  };

  return {
    isMobile,
    containerProps,
    PullIndicator,
    StaticIndicator,
  };
}
