import { format, parseISO, isValid } from 'date-fns';

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '';
    
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    return '';
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '';
    
    return format(date, 'MMM d, yyyy h:mm a');
  } catch (error) {
    return '';
  }
}

export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '';
    
    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    return '';
  }
}

export function getCurrentDateForInput(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
