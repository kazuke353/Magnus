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
