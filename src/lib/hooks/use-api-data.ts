import { useQueries, useQuery } from '@tanstack/react-query';
import { queryKeys } from '../react-query-client';
import type { Run } from '../schema';
import { getFlightStatusWithRateLimit } from '../services/opensky-service';
import { getTrafficData } from '../services/tomtom-service';

// Hook for fetching flight status
export function useFlightStatus(flightNumber: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.flightStatus(flightNumber),
    queryFn: () => getFlightStatusWithRateLimit(flightNumber),
    enabled: enabled && !!flightNumber,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry if it's a rate limit error
      if (error instanceof Error && error.message.includes('rate limit')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    meta: {
      errorMessage: `Failed to fetch flight status for ${flightNumber}`,
    },
  });
}

// Hook for fetching traffic data
export function useTrafficData(
  origin: string, 
  destination: string, 
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.trafficData(origin, destination),
    queryFn: () => getTrafficData(origin, destination),
    enabled: enabled && !!origin && !!destination,
    staleTime: 3 * 60 * 1000, // 3 minutes (traffic changes more frequently)
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: (failureCount, error) => {
      // Don't retry on API key errors
      if (error instanceof Error && error.message.includes('API key')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    meta: {
      errorMessage: `Failed to fetch traffic data for ${origin} → ${destination}`,
    },
  });
}

// Hook for fetching multiple flight statuses
export function useMultipleFlightStatuses(flightNumbers: string[]) {
  return useQueries({
    queries: flightNumbers.map(flightNumber => ({
      queryKey: queryKeys.flightStatus(flightNumber),
      queryFn: () => getFlightStatusWithRateLimit(flightNumber),
      enabled: !!flightNumber,
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount: number, error: Error) => {
        if (error.message.includes('rate limit')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
    })),
  });
}

// Hook for fetching multiple traffic data
export function useMultipleTrafficData(routes: Array<{ origin: string; destination: string }>) {
  return useQueries({
    queries: routes.map(({ origin, destination }) => ({
      queryKey: queryKeys.trafficData(origin, destination),
      queryFn: () => getTrafficData(origin, destination),
      enabled: !!origin && !!destination,
      staleTime: 3 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: (failureCount: number, error: Error) => {
        if (error.message.includes('API key')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
    })),
  });
}

// Hook for fetching data for a specific run
export function useRunData(run: Run, enabled: boolean = true) {
  const flightQuery = useFlightStatus(run.flightNumber, enabled);
  const trafficQuery = useTrafficData(run.pickupLocation, run.dropoffLocation, enabled);

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

// Hook for fetching data for multiple runs
export function useMultipleRunsData(runs: Run[]) {
  const flightNumbers = runs.map(run => run.flightNumber);
  const routes = runs.map(run => ({ 
    origin: run.pickupLocation, 
    destination: run.dropoffLocation 
  }));

  const flightQueries = useMultipleFlightStatuses(flightNumbers);
  const trafficQueries = useMultipleTrafficData(routes);

  // Combine results
  const combinedData = runs.map((run, index) => ({
    run,
    flightStatus: flightQueries[index]?.data,
    trafficData: trafficQueries[index]?.data,
    isLoading: flightQueries[index]?.isLoading || trafficQueries[index]?.isLoading,
    isFetching: flightQueries[index]?.isFetching || trafficQueries[index]?.isFetching,
    isError: flightQueries[index]?.isError || trafficQueries[index]?.isError,
    error: flightQueries[index]?.error || trafficQueries[index]?.error,
  }));

  return {
    data: combinedData,
    isLoading: flightQueries.some(q => q.isLoading) || trafficQueries.some(q => q.isLoading),
    isFetching: flightQueries.some(q => q.isFetching) || trafficQueries.some(q => q.isFetching),
    isError: flightQueries.some(q => q.isError) || trafficQueries.some(q => q.isError),
    refetchAll: () => {
      flightQueries.forEach(q => q.refetch());
      trafficQueries.forEach(q => q.refetch());
    },
  };
}

// Hook for prefetching data when adding new runs
export function usePrefetchRunData() {
  const prefetchFlightStatus = (flightNumber: string) => {
    return queryKeys.flightStatus(flightNumber);
  };

  const prefetchTrafficData = (origin: string, destination: string) => {
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
export function useCachedApiData(flightNumber: string, origin: string, destination: string) {
  const flightQuery = useQuery({
    queryKey: queryKeys.flightStatus(flightNumber),
    queryFn: () => getFlightStatusWithRateLimit(flightNumber),
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