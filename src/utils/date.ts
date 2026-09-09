export const YANGON_TIMEZONE = 'Asia/Yangon';

/**
 * Format a date/timestamp to Yangon Time (Myanmar Time, UTC+6:30)
 * Example output: "Sep 9, 2026, 11:01:36 PM"
 */
export function formatYangonDateTime(
  dateInput: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: YANGON_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };

  return date.toLocaleString('en-US', { ...defaultOptions, ...options });
}

/**
 * Format date only in Yangon Time
 * Example output: "Sep 9, 2026"
 */
export function formatYangonDate(
  dateInput: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-US', {
    timeZone: YANGON_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format time only in Yangon Time
 * Example output: "11:01:36 PM"
 */
export function formatYangonTime(
  dateInput?: string | number | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = dateInput
    ? typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput
    : new Date();
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleTimeString('en-US', {
    timeZone: YANGON_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    ...options,
  });
}

/**
 * Returns YYYY-MM-DD string in Yangon Time (for CSV export filenames, daily grouping)
 */
export function getYangonDateKey(dateInput?: string | number | Date | null): string {
  const date = dateInput
    ? typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput
    : new Date();
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-CA', { timeZone: YANGON_TIMEZONE });
}
