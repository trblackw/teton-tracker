import { useQueries, useQuery } from '@tanstack/react-query';
import { queryKeys } from '../react-query-client';
import type { Run } from '../schema';
import { getFlightServiceWithConfig } from '../services/flight-service';
import {
  getTrafficData,
  planShuttleRoute,
  type ShuttleRouteResponse,
} from '../services/tomtom-service';
import { useNetworkAwareOptions, useNetworkStatus } from './use-network-status';

// Hook for fetching flight status with network awareness
export function useFlightStatus(flightNumber: string, enabled: boolean = true) {
  const networkOptions = useNetworkAwareOptions();
  const { isOffline } = useNetworkStatus();

  return useQuery({
    queryKey: queryKeys.flightStatus(flightNumber),
    queryFn: async () => {
      const flightService = await getFlightServiceWithConfig();
      return flightService.getFlightStatus({ flightNumber });
    },
    enabled: enabled && !!flightNumber && !isOffline,
    staleTime: networkOptions.staleTime,
    gcTime: networkOptions.gcTime,
    refetchOnWindowFocus: networkOptions.refetchOnWindowFocus,
    refetchOnReconnect: networkOptions.refetchOnReconnect,
    retry: networkOptions.retry,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Return cached data even when query is disabled (offline)
    placeholderData: previousData => previousData,
  });
}

// Hook for fetching traffic data with network awareness
export function useTrafficData(
  origin: string,
  destination: string,
  enabled: boolean = true
) {
  const networkOptions = useNetworkAwareOptions();
  const { isOffline } = useNetworkStatus();

  return useQuery({
    queryKey: queryKeys.trafficData(origin, destination),
    queryFn: () => getTrafficData(origin, destination),
    enabled: enabled && !!origin && !!destination && !isOffline,
    staleTime: networkOptions.staleTime,
    gcTime: networkOptions.gcTime,
    refetchOnWindowFocus: networkOptions.refetchOnWindowFocus,
    refetchOnReconnect: networkOptions.refetchOnReconnect,
    retry: networkOptions.retry,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Return cached data even when query is disabled (offline)
    placeholderData: previousData => previousData,
  });
}

// Enhanced hook for shuttle route planning with network awareness
export function useShuttleRoute(
  currentLocation: string,
  pickupLocation: string,
  dropoffLocation: string,
  departureTime?: string,
  enabled: boolean = true
) {
  const networkOptions = useNetworkAwareOptions();
  const { isOffline } = useNetworkStatus();

  return useQuery<ShuttleRouteResponse>({
    queryKey: [
      'shuttle-route',
      currentLocation,
      pickupLocation,
      dropoffLocation,
      departureTime,
    ],
    queryFn: () =>
      planShuttleRoute(
        currentLocation,
        pickupLocation,
        dropoffLocation,
        departureTime
      ),
    enabled:
      enabled &&
      !!currentLocation &&
      !!pickupLocation &&
      !!dropoffLocation &&
      !isOffline,
    staleTime: networkOptions.staleTime,
    gcTime: networkOptions.gcTime,
    refetchOnWindowFocus: networkOptions.refetchOnWindowFocus,
    refetchOnReconnect: networkOptions.refetchOnReconnect,
    retry: networkOptions.retry,
    // Return cached data even when query is disabled (offline)
    placeholderData: previousData => previousData,
  });
}

// Hook for fetching multiple flight statuses with optimized batching
export function useMultipleFlightStatuses(flightNumbers: string[]) {
  const networkOptions = useNetworkAwareOptions();
  const { isOffline } = useNetworkStatus();

  // Limit concurrent requests on slow connections
  const maxConcurrentRequests = networkOptions.retry < 3 ? 2 : 5;
  const batchedFlightNumbers = flightNumbers.slice(0, maxConcurrentRequests);

  return useQueries({
    queries: batchedFlightNumbers.map(flightNumber => ({
      queryKey: queryKeys.flightStatus(flightNumber),
      queryFn: () =>
        getFlightServiceWithConfig().then(service =>
          service.getFlightStatus({ flightNumber })
        ),
      enabled: !!flightNumber && !isOffline,
      staleTime: networkOptions.staleTime,
      gcTime: networkOptions.gcTime,
      refetchOnWindowFocus: networkOptions.refetchOnWindowFocus,
      refetchOnReconnect: networkOptions.refetchOnReconnect,
      retry: networkOptions.retry,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 10000),
      // Return cached data even when query is disabled (offline)
      placeholderData: (previousData: any) => previousData,
    })),
  });
}

// Hook for fetching multiple traffic data with optimized batching
export function useMultipleTrafficData(
  routes: Array<{ origin: string; destination: string }>
) {
  const networkOptions = useNetworkAwareOptions();
  const { isOffline } = useNetworkStatus();

  // Limit concurrent requests on slow connections
  const maxConcurrentRequests = networkOptions.retry < 3 ? 2 : 3;
  const batchedRoutes = routes.slice(0, maxConcurrentRequests);

  return useQueries({
    queries: batchedRoutes.map(({ origin, destination }) => ({
      queryKey: queryKeys.trafficData(origin, destination),
      queryFn: () => getTrafficData(origin, destination),
      enabled: !!origin && !!destination && !isOffline,
      staleTime: networkOptions.staleTime,
      gcTime: networkOptions.gcTime,
      refetchOnWindowFocus: networkOptions.refetchOnWindowFocus,
      refetchOnReconnect: networkOptions.refetchOnReconnect,
      retry: networkOptions.retry,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 10000),
      // Return cached data even when query is disabled (offline)
      placeholderData: (previousData: any) => previousData,
    })),
  });
}

// Hook for fetching data for a specific run with network awareness
export function useRunData(run: Run, enabled: boolean = true) {
  const flightQuery = useFlightStatus(run.flightNumber, enabled);
  const trafficQuery = useTrafficData(
    run.pickupLocation,
    run.dropoffLocation,
    enabled
  );

  return {
    flightStatus: flightQuery.data,
    trafficData: trafficQuery.data,
    isLoading: flightQuery.isLoading || trafficQuery.isLoading,
    isFetching: flightQuery.isFetching || trafficQuery.isFetching,
    isError: flightQuery.isError || trafficQuery.isError,
    error: flightQuery.error || trafficQuery.error,
    refetch: () => {
      flightQuery.refetch();
      trafficQuery.refetch();
    },
  };
}

// Hook for fetching multiple runs data with smart batching
export function useMultipleRunsData(runs: Run[]) {
  const networkOptions = useNetworkAwareOptions();
  const { isOffline } = useNetworkStatus();

  // Limit concurrent requests based on network conditions
  const maxConcurrentRequests = networkOptions.retry < 3 ? 3 : 8;
  const batchedRuns = runs.slice(0, maxConcurrentRequests);

  const runDataQueries = useQueries({
    queries: batchedRuns.map(run => ({
      queryKey: queryKeys.runData(run.id),
      queryFn: async () => {
        // Fetch flight status with server config
        const flightService = await getFlightServiceWithConfig();
        const flightStatus = await flightService.getFlightStatus({
          flightNumber: run.flightNumber,
        });

        // Fetch traffic data
        const trafficData = await getTrafficData(
          run.pickupLocation,
          run.dropoffLocation
        );

        return {
          run,
          flightStatus,
          trafficData,
        };
      },
      enabled: !isOffline,
      staleTime: networkOptions.staleTime,
      gcTime: networkOptions.gcTime,
      refetchOnWindowFocus: networkOptions.refetchOnWindowFocus,
      refetchOnReconnect: networkOptions.refetchOnReconnect,
      retry: networkOptions.retry,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 20000),
      // Return cached data even when query is disabled (offline)
      placeholderData: (previousData: any) => previousData,
    })),
  });

  const isLoading = runDataQueries.some(query => query.isLoading);
  const isError = runDataQueries.some(query => query.isError);
  const data = runDataQueries
    .map(query => query.data)
    .filter(data => data !== undefined);

  const refetchAll = () => {
    if (!isOffline) {
      runDataQueries.forEach(query => query.refetch());
    }
  };

  return {
    data,
    isLoading,
    isError,
    refetchAll,
    hasMoreRuns: runs.length > maxConcurrentRequests,
    remainingRuns: Math.max(0, runs.length - maxConcurrentRequests),
  };
}

// Hook for prefetching data when adding new runs
export function usePrefetchRunData() {
  const { isOffline } = useNetworkStatus();

  const prefetchFlightStatus = (flightNumber: string) => {
    if (isOffline) return Promise.resolve();
    return queryKeys.flightStatus(flightNumber);
  };

  const prefetchTrafficData = (origin: string, destination: string) => {
    if (isOffline) return Promise.resolve();
    return queryKeys.trafficData(origin, destination);
  };

  return {
    prefetchFlightStatus,
    prefetchTrafficData,
  };
}

// Hook for managing active runs with automatic refetching
export function useActiveRunsData(runs: Run[]) {
  const activeRuns = runs.filter(run => run.status === 'active');
  return useMultipleRunsData(activeRuns);
}

// Hook for getting cached data without triggering fetch
export function useCachedApiData(
  flightNumber: string,
  origin: string,
  destination: string
) {
  const flightQuery = useQuery({
    queryKey: queryKeys.flightStatus(flightNumber),
    queryFn: () =>
      getFlightServiceWithConfig().then(service =>
        service.getFlightStatus({ flightNumber })
      ),
    enabled: false, // Don't fetch, just get cached data
  });

  const trafficQuery = useQuery({
    queryKey: queryKeys.trafficData(origin, destination),
    queryFn: () => getTrafficData(origin, destination),
    enabled: false, // Don't fetch, just get cached data
  });

  return {
    flightStatus: flightQuery.data,
    trafficData: trafficQuery.data,
    hasCachedFlightData: !!flightQuery.data,
    hasCachedTrafficData: !!trafficQuery.data,
  };
}
