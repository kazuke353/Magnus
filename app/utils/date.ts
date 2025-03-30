/**
 * Format a date for display
 * @param dateString ISO date string
 * @returns Formatted date string (e.g., "Jan 1, 2023")
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Format a date with day name for display
 * @param dateString ISO date string
 * @returns Formatted date string (e.g., "Mon, Jan 1, 2023")
 */
export function formatDateWithDay(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date with day:', error);
    return dateString;
  }
}

/**
 * Formats a date string to a localized date and time format
 * @param dateString - ISO date string
 * @returns Formatted date and time string
 */
export function formatDateTime(dateString: string): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    console.error("Error formatting date time:", error);
    return dateString;
  }
}

/**
 * Format a date for input[type="date"]
 * @param dateString ISO date string
 * @returns Formatted date string (YYYY-MM-DD)
 */
export function formatDateForInput(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
}

/**
 * Get the current date formatted for input[type="date"]
 * @returns Current date formatted as YYYY-MM-DD
 */
export function getCurrentDateForInput(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a date is today
 * @param dateString ISO date string
 * @returns Boolean indicating if the date is today
 */
export function isToday(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    const today = new Date();
    
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  } catch (error) {
    console.error('Error checking if date is today:', error);
    return false;
  }
}

/**
 * Check if a date is in the past
 * @param dateString ISO date string
 * @returns Boolean indicating if the date is in the past
 */
export function isPast(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return date < today;
  } catch (error) {
    console.error('Error checking if date is in the past:', error);
    return false;
  }
}

/**
 * Get the difference in days between two dates
 * @param dateString1 First ISO date string
 * @param dateString2 Second ISO date string (defaults to today)
 * @returns Number of days between the dates
 */
export function getDaysDifference(dateString1: string, dateString2?: string): number {
  try {
    const date1 = new Date(dateString1);
    const date2 = dateString2 ? new Date(dateString2) : new Date();
    
    // Set both dates to midnight to get accurate day difference
    date1.setHours(0, 0, 0, 0);
    date2.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    console.error('Error calculating days difference:', error);
    return 0;
  }
}

/**
 * Ensure consistent date formatting between server and client
 * This is a helper function to fix hydration mismatches
 * @param date Date object or date string
 * @param locale Locale to use for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export function getConsistentDateFormat(date: Date | string, locale: string = 'en-US'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(locale);
  } catch (error) {
    console.error('Error formatting date consistently:', error);
    return typeof date === 'string' ? date : date.toString();
  }
}
