/**
 * Formats a date string to a localized date format
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
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
 * Formats a number as currency
 * @param amount - Amount to format
 * @param currency - Currency code (default: USD)
 * @param showSign - Whether to show + sign for positive values
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD', showSign: boolean = false): string {
  if (amount === null || amount === undefined) return 'N/A';
  
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    const formattedAmount = formatter.format(amount);
    
    if (showSign && amount > 0) {
      return `+${formattedAmount}`;
    }
    
    return formattedAmount;
  } catch (error) {
    console.error("Error formatting currency:", error);
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Formats a number as a percentage
 * @param value - Value to format as percentage
 * @param showSign - Whether to show + sign for positive values
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, showSign: boolean = false): string {
  if (value === null || value === undefined) return 'N/A';
  
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Convert to decimal for percentage formatting
    const decimal = value / 100;
    const formattedValue = formatter.format(decimal);
    
    if (showSign && value > 0) {
      return `+${formattedValue}`;
    }
    
    return formattedValue;
  } catch (error) {
    console.error("Error formatting percentage:", error);
    return `${value.toFixed(2)}%`;
  }
}

/**
 * Truncates text to a specified length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Formats a file size in bytes to a human-readable format
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}
