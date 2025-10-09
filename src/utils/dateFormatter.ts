/**
 * Format a date string or Date object to dd/mm/yyyy format
 * @param date - ISO date string or Date object
 * @returns Formatted date string in dd/mm/yyyy format
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format a date to a long format (e.g., "Monday, 1 January 2024")
 * Useful for headers and special displays
 */
export function formatDateLong(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format a date to month and year only (e.g., "January 2024")
 */
export function formatMonthYear(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format a date to short format for charts (e.g., "1 Jan")
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Format a date to weekday short format (e.g., "Mon")
 */
export function formatWeekday(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('en-GB', {
    weekday: 'short'
  });
}
