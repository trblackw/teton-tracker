import { useQuery } from '@tanstack/react-query';
import { preferencesApi } from '../api/client';

/**
 * Hook to get the user's timezone preference
 * Returns UTC as default if no preference is set
 */
export function useTimezone() {
  const { data: preferences } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => preferencesApi.getPreferences(),
    staleTime: 1000 * 60 * 5, // 5 minutes
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
