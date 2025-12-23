import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

export function formatDateInTimezone(
  date: Date | string,
  timezone: string,
  formatStr: string = 'MMM dd, HH:mm'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, timezone, formatStr);
}

export function formatDateWithTimezoneLabel(
  date: Date | string,
  timezone: string,
  formatStr: string = 'MMM dd, HH:mm'
): string {
  return formatDateInTimezone(date, timezone, formatStr);
}

/**
 * Creates a date/time in a specific timezone and returns a Date object
 * Useful for creating times like "9:30 AM ET" and then displaying them in other timezones
 */
export function createTimeInTimezone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  // Create a date string in the format that represents the local components
  // We'll treat this as if it's in the specified timezone
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  
  // Parse it as a local date (this gives us the right date components)
  const localDate = new Date(dateString);
  
  // fromZonedTime treats the date as if it's in the specified timezone and converts to UTC
  // We create a Date with the components we want, then convert from that timezone
  return fromZonedTime(localDate, timezone);
}

