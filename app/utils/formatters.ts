/**
 * Format a date string to a human-readable format
 * @param dateString ISO date string
 * @returns Formatted date string
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
 * Format a number as currency
 * @param amount Number to format
 * @param currency Currency symbol
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = '$'): string {
  try {
    return `${currency} ${amount.toFixed(2)}`;
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${currency} ${amount}`;
  }
}

/**
 * Format a percentage
 * @param value Number to format as percentage
 * @param decimals Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  try {
    return `${value.toFixed(decimals)}%`;
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return `${value}%`;
  }
}

/**
 * Format a number with thousands separators
 * @param value Number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  try {
    return new Intl.NumberFormat().format(value);
  } catch (error) {
    console.error('Error formatting number:', error);
    return value.toString();
  }
}
