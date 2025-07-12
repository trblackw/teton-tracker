import { parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Format a date/time string in a specific timezone with 24-hour format
 */
export function formatDateTimeInTimezone(
  dateTime: string | Date,
  timezone: string = 'UTC',
  includeDate: boolean = true
): string {
  try {
    const date = typeof dateTime === 'string' ? parseISO(dateTime) : dateTime;

    if (includeDate) {
      // Format: "Jan 15, 2024 2:30 PM" (12-hour with AM/PM)
      return formatInTimeZone(date, timezone, 'MMM d, yyyy h:mm a');
    } else {
      // Format: "2:30 PM" (12-hour with AM/PM)
      return formatInTimeZone(date, timezone, 'h:mm a');
    }
  } catch (error) {
    console.error('Error formatting date in timezone:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date string in a specific timezone (date only)
 */
export function formatDateInTimezone(
  date: string | Date,
  timezone: string = 'UTC',
  formatString: string = 'MMM d, yyyy'
): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatInTimeZone(dateObj, timezone, formatString);
  } catch (error) {
    console.error('Error formatting date in timezone:', error);
    return 'Invalid date';
  }
}

/**
 * Format a time string in a specific timezone (time only, 24-hour)
 */
export function formatTimeInTimezone(
  dateTime: string | Date,
  timezone: string = 'UTC'
): string {
  return formatDateTimeInTimezone(dateTime, timezone, false);
}

/**
 * Format a full date and time with timezone abbreviation
 */
export function formatFullDateTimeInTimezone(
  dateTime: string | Date,
  timezone: string = 'UTC'
): string {
  try {
    const date = typeof dateTime === 'string' ? parseISO(dateTime) : dateTime;
    // Format: "Jan 15, 2024 2:30 PM EST"
    return formatInTimeZone(date, timezone, 'MMM d, yyyy h:mm a zzz');
  } catch (error) {
    console.error('Error formatting full date in timezone:', error);
    return 'Invalid date';
  }
}

/**
 * Convert a local time to UTC for storage
 */
export function convertToUtc(
  dateTime: string | Date,
  fromTimezone: string
): Date {
  try {
    const date = typeof dateTime === 'string' ? parseISO(dateTime) : dateTime;
    // For now, just return the date as is since we're storing UTC times
    // This could be enhanced later if needed for timezone-aware input
    return date;
  } catch (error) {
    console.error('Error converting to UTC:', error);
    return new Date();
  }
}

/**
 * Get current time in a specific timezone
 */
export function getCurrentTimeInTimezone(timezone: string = 'UTC'): string {
  return formatTimeInTimezone(new Date(), timezone);
}

/**
 * Get current date and time in a specific timezone
 */
export function getCurrentDateTimeInTimezone(timezone: string = 'UTC'): string {
  return formatDateTimeInTimezone(new Date(), timezone);
}

/**
 * Format for schedule display (relative or absolute based on date)
 */
export function formatScheduleTime(
  scheduledTime: string,
  timezone: string = 'UTC'
): string {
  try {
    const scheduled = parseISO(scheduledTime);
    const now = new Date();
    const diffHours = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60);

    // If within 24 hours, show relative time with absolute time
    if (Math.abs(diffHours) < 24) {
      const relativeText =
        diffHours > 0
          ? `in ${Math.ceil(diffHours)} hours`
          : `${Math.abs(Math.floor(diffHours))} hours ago`;

      const absoluteTime = formatTimeInTimezone(scheduled, timezone);
      return `${absoluteTime} (${relativeText})`;
    }

    // Otherwise show full date and time
    return formatDateTimeInTimezone(scheduled, timezone);
  } catch (error) {
    console.error('Error formatting schedule time:', error);
    return formatDateTimeInTimezone(scheduledTime, timezone);
  }
}

/**
 * Get timezone abbreviation for display
 */
export function getTimezoneAbbreviation(
  timezone: string,
  date: Date = new Date()
): string {
  try {
    return formatInTimeZone(date, timezone, 'zzz');
  } catch (error) {
    console.error('Error getting timezone abbreviation:', error);
    return timezone;
  }
}
