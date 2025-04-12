/**
 * Formats a number as a percentage
 * @param value Number to format
 * @param includeSymbol Whether to include the % symbol
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, includeSymbol: boolean = true): string {
  if (value === null || value === undefined || isNaN(value)) {
    return includeSymbol ? '0%' : '0';
  }
  
  const formattedValue = value.toFixed(2);
  return includeSymbol ? `${formattedValue}%` : formattedValue;
}

/**
 * Formats a number as currency
 * @param value Number to format
 * @param currency Currency code (default: USD)
 * @param minimumFractionDigits Minimum fraction digits (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number, 
  currency: string = 'USD', 
  minimumFractionDigits: number = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits
    }).format(0);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits
  }).format(value);
}

/**
 * Formats a date string
 * @param dateString Date string to format
 * @param includeTime Whether to include time
 * @returns Formatted date string
 */
export function formatDate(dateString: string, includeTime: boolean = false): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return '';
  }
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Truncates text to a specified length
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + '...';
}

/**
 * Formats a number with commas
 * @param value Number to format
 * @param decimalPlaces Number of decimal places
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimalPlaces: number = 0): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  });
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
