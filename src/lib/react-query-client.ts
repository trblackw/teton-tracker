import { QueryClient } from '@tanstack/react-query';

// Create the query client with appropriate defaults optimized for low connectivity
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data stays fresh before being considered stale
      // Increased for low connectivity scenarios
      staleTime: 5 * 60 * 1000, // 5 minutes (was 2 minutes)

      // How long data stays in cache - increased significantly for offline usage
      gcTime: 30 * 60 * 1000, // 30 minutes (was 10 minutes)

      // Retry configuration - smarter for network issues
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();

          // Don't retry on authentication or permission errors
          if (
            errorMessage.includes('401') ||
            errorMessage.includes('403') ||
            errorMessage.includes('unauthorized')
          ) {
            return false;
          }

          // Don't retry on not found errors
          if (
            errorMessage.includes('404') ||
            errorMessage.includes('not found')
          ) {
            return false;
          }

          // More aggressive retry for network errors
          if (
            errorMessage.includes('network') ||
            errorMessage.includes('fetch') ||
            errorMessage.includes('timeout')
          ) {
            return failureCount < 5; // Retry up to 5 times for network issues
          }
        }

        // Retry up to 3 times for other errors
        return failureCount < 3;
      },

      // Retry delay - exponential backoff with jitter for network congestion
      retryDelay: attemptIndex => {
        const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000);
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.3 * baseDelay;
        return baseDelay + jitter;
      },

      // Refetch configuration optimized for low connectivity
      refetchOnWindowFocus: false, // Don't refetch on window focus to save bandwidth
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: 'always', // Always refetch when component mounts with fresh data

      // Background refetch interval - reduced frequency to save bandwidth
      refetchInterval: false, // Disable automatic background refetching

      // Only refetch in background if window is focused
      refetchIntervalInBackground: false,

      // Network mode for better offline handling
      networkMode: 'online', // Only fetch when online, but return cached data when offline
    },
    mutations: {
      // Retry mutations more aggressively for network issues
      retry: (failureCount, error) => {
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();

          // Don't retry on client errors
          if (
            errorMessage.includes('400') ||
            errorMessage.includes('401') ||
            errorMessage.includes('403') ||
            errorMessage.includes('422')
          ) {
            return false;
          }

          // More aggressive retry for network errors
          if (
            errorMessage.includes('network') ||
            errorMessage.includes('fetch') ||
            errorMessage.includes('timeout')
          ) {
            return failureCount < 3;
          }
        }

        return failureCount < 2;
      },

      // Retry delay for mutations with jitter
      retryDelay: attemptIndex => {
        const baseDelay = Math.min(1000 * 2 ** attemptIndex, 10000);
        const jitter = Math.random() * 0.3 * baseDelay;
        return baseDelay + jitter;
      },

      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

// Query keys for consistent cache management
export const queryKeys = {
  // User data queries - longer cache for stable data
  user: (userId?: string) => ['user', userId] as const,
  userPreferences: (userId?: string) => ['preferences', userId] as const,

  // Flight status queries
  flightStatus: (flightNumber: string) =>
    ['flight-status', flightNumber] as const,

  // Traffic data queries
  trafficData: (origin: string, destination: string) =>
    ['traffic-data', origin, destination] as const,

  // Combined data for a run
  runData: (runId: string) => ['run-data', runId] as const,

  // All flight statuses
  allFlightStatuses: () => ['flight-statuses'] as const,

  // All traffic data
  allTrafficData: () => ['traffic-data'] as const,

  // Organization queries
  organizations: () => ['organizations'] as const,
  organizationMembers: (orgId: string) =>
    ['organization-members', orgId] as const,
  userRole: (orgId: string) => ['user-role', orgId] as const,
  userPermissions: () => ['user-permissions'] as const,

  // Runs queries
  runs: () => ['runs'] as const,

  // Notifications queries
  notifications: (params?: any) => ['notifications', params] as const,
  notificationStats: () => ['notification-stats'] as const,
} as const;

// Helper function to invalidate all API data
export const invalidateAllApiData = () => {
  queryClient.invalidateQueries();
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

export const setCachedTrafficData = (
  origin: string,
  destination: string,
  data: any
) => {
  queryClient.setQueryData(queryKeys.trafficData(origin, destination), data);
};

// Helper function to prefetch data - with network awareness
export const prefetchFlightStatus = (flightNumber: string) => {
  // Only prefetch if online
  if (!navigator.onLine) {
    return Promise.resolve();
  }

  return queryClient.prefetchQuery({
    queryKey: queryKeys.flightStatus(flightNumber),
    queryFn: () =>
      import('./services/flight-service').then(
        async ({ getFlightServiceWithConfig }) => {
          const flightService = await getFlightServiceWithConfig();
          return flightService.getFlightStatus({ flightNumber });
        }
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const prefetchTrafficData = (origin: string, destination: string) => {
  // Only prefetch if online
  if (!navigator.onLine) {
    return Promise.resolve();
  }

  return queryClient.prefetchQuery({
    queryKey: queryKeys.trafficData(origin, destination),
    queryFn: () =>
      import('./services/tomtom-service').then(({ getTrafficData }) =>
        getTrafficData(origin, destination)
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Helper function to check if we have cached data
export const hasCachedData = (queryKey: any) => {
  const data = queryClient.getQueryData(queryKey);
  return data !== undefined;
};

// Helper function to get network-aware query options
export const getNetworkAwareQueryOptions = (options: any = {}) => ({
  ...options,
  enabled: options.enabled !== false && navigator.onLine,
  retry: (failureCount: number, error: Error) => {
    // If offline, don't retry
    if (!navigator.onLine) {
      return false;
    }

    // Use custom retry logic if provided, otherwise use default
    if (options.retry) {
      return options.retry(failureCount, error);
    }

    // Default network-aware retry logic
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return failureCount < 3;
    }

    return failureCount < 2;
  },
});
