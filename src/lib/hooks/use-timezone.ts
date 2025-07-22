import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../react-query-client';
import { useOrgPreferencesApi } from './index';
import { useNetworkAwareOptions } from './use-network-status';
import { useCurrentOrgId } from './use-org-navigation';

/**
 * Hook to get the user's timezone preference
 * Returns UTC as default if no preference is set
 */
export function useTimezone() {
  const networkOptions = useNetworkAwareOptions();
  const organizationId = useCurrentOrgId();
  const preferencesApi = useOrgPreferencesApi();

  const { data: preferences } = useQuery({
    queryKey: queryKeys.userPreferences(organizationId),
    queryFn: () => preferencesApi.getPreferences(),
    enabled: !!organizationId, // Only run if we have an organization
    staleTime: networkOptions.staleTime,
    gcTime: 60 * 60 * 1000, // 1 hour cache time
    refetchOnWindowFocus: false, // Don't refetch timezone on window focus
    refetchOnReconnect: networkOptions.refetchOnReconnect,
    retry: networkOptions.retry,
    // Return cached data even when offline
    placeholderData: previousData => previousData,
  });

  return preferences?.timezone || 'UTC';
}

/**
 * Hook that provides timezone-aware formatting functions
 * automatically using the user's timezone preference
 */
export function useTimezoneFormatters() {
  const timezone = useTimezone();

  return {
    timezone,
    formatDateTime: (dateTime: string | Date, includeDate: boolean = true) => {
      const { formatDateTimeInTimezone } = require('../timezone');
      return formatDateTimeInTimezone(dateTime, timezone, includeDate);
    },
    formatDate: (date: string | Date, formatString?: string) => {
      const { formatDateInTimezone } = require('../timezone');
      return formatDateInTimezone(date, timezone, formatString);
    },
    formatTime: (dateTime: string | Date) => {
      const { formatTimeInTimezone } = require('../timezone');
      return formatTimeInTimezone(dateTime, timezone);
    },
    formatFullDateTime: (dateTime: string | Date) => {
      const { formatFullDateTimeInTimezone } = require('../timezone');
      return formatFullDateTimeInTimezone(dateTime, timezone);
    },
    formatScheduleTime: (scheduledTime: string) => {
      const { formatScheduleTime } = require('../timezone');
      return formatScheduleTime(scheduledTime, timezone);
    },
  };
}
