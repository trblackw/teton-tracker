import { useQueries, useQuery } from '@tanstack/react-query';
import { queryKeys } from '../react-query-client';
import type { Run } from '../schema';
import { getFlightServiceWithConfig } from '../services/flight-service';
import {
  getTrafficData,
  planShuttleRoute,
  type ShuttleRouteResponse,
} from '../services/tomtom-service';

// Hook for fetching flight status
export function useFlightStatus(flightNumber: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['flight-status', flightNumber],
    queryFn: async () => {
      const flightService = await getFlightServiceWithConfig();
      return flightService.getFlightStatus({ flightNumber });
    },
    enabled: enabled && !!flightNumber,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

// Hook for fetching traffic data
export function useTrafficData(
  origin: string,
  destination: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['traffic-data', origin, destination],
    queryFn: () => getTrafficData(origin, destination),
    enabled: enabled && !!origin && !!destination,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Enhanced hook for shuttle route planning
export function useShuttleRoute(
  currentLocation: string,
  pickupLocation: string,
  dropoffLocation: string,
  departureTime?: string,
  enabled: boolean = true
) {
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
      enabled && !!currentLocation && !!pickupLocation && !!dropoffLocation,
    staleTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
  });
}

// Hook for fetching multiple flight statuses
export function useMultipleFlightStatuses(flightNumbers: string[]) {
  return useQueries({
    queries: flightNumbers.map(flightNumber => ({
      queryKey: queryKeys.flightStatus(flightNumber),
      queryFn: () =>
        getFlightServiceWithConfig().then(service =>
          service.getFlightStatus({ flightNumber })
        ),
      enabled: !!flightNumber,
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount: number, error: Error) => {
        if (error.message.includes('rate limit')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 10000),
    })),
  });
}

// Hook for fetching multiple traffic data
export function useMultipleTrafficData(
  routes: Array<{ origin: string; destination: string }>
) {
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
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 10000),
    })),
  });
}

// Hook for fetching data for a specific run
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

// Hook for fetching multiple runs data
export function useMultipleRunsData(runs: Run[]) {
  const runDataQueries = useQueries({
    queries: runs.map(run => ({
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
      staleTime: 2 * 60 * 1000, // 2 minutes
    })),
  });

  const isLoading = runDataQueries.some(query => query.isLoading);
  const isError = runDataQueries.some(query => query.isError);
  const data = runDataQueries
    .map(query => query.data)
    .filter(data => data !== undefined);

  const refetchAll = () => {
    runDataQueries.forEach(query => query.refetch());
  };

  return {
    data,
    isLoading,
    isError,
    refetchAll,
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
