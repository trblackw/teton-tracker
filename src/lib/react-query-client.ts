import { QueryClient } from '@tanstack/react-query';

// Create the query client with appropriate defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data stays fresh before being considered stale
      staleTime: 2 * 60 * 1000, // 2 minutes
      
      // How long data stays in cache
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      
      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && error.message.includes('4')) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      
      // Retry delay - exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch configuration
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch when component mounts
      
      // Background refetch interval (5 minutes)
      refetchInterval: 5 * 60 * 1000, // 5 minutes
      
      // Only refetch in background if window is focused
      refetchIntervalInBackground: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      
      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
});

// Query keys for consistent cache management
export const queryKeys = {
  // Flight status queries
  flightStatus: (flightNumber: string) => ['flight-status', flightNumber] as const,
  
  // Traffic data queries
  trafficData: (origin: string, destination: string) => 
    ['traffic-data', origin, destination] as const,
  
  // Combined data for a run
  runData: (runId: string) => ['run-data', runId] as const,
  
  // All flight statuses
  allFlightStatuses: () => ['flight-statuses'] as const,
  
  // All traffic data
  allTrafficData: () => ['traffic-data'] as const,
} as const;

// Helper function to invalidate all API data
export const invalidateAllApiData = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.allFlightStatuses() });
  queryClient.invalidateQueries({ queryKey: queryKeys.allTrafficData() });
};

// Helper function to clear all API data
export const clearAllApiData = () => {
  queryClient.clear();
};

// Helper function to get cached data
export const getCachedFlightStatus = (flightNumber: string) => {
  return queryClient.getQueryData(queryKeys.flightStatus(flightNumber));
};

export const getCachedTrafficData = (origin: string, destination: string) => {
  return queryClient.getQueryData(queryKeys.trafficData(origin, destination));
};

// Helper function to set cached data
export const setCachedFlightStatus = (flightNumber: string, data: any) => {
  queryClient.setQueryData(queryKeys.flightStatus(flightNumber), data);
};

export const setCachedTrafficData = (origin: string, destination: string, data: any) => {
  queryClient.setQueryData(queryKeys.trafficData(origin, destination), data);
};

// Helper function to prefetch data
export const prefetchFlightStatus = (flightNumber: string) => {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.flightStatus(flightNumber),
    queryFn: () => import('./services/opensky-service').then(({ getFlightStatusWithRateLimit }) => 
      getFlightStatusWithRateLimit(flightNumber)
    ),
  });
};

export const prefetchTrafficData = (origin: string, destination: string) => {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.trafficData(origin, destination),
    queryFn: () => import('./services/tomtom-service').then(({ getTrafficData }) => 
      getTrafficData(origin, destination)
    ),
  });
}; 