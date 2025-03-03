export type Theme = 'light' | 'dark' | 'system';

export function getThemeClass(theme: Theme): string {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  
  // For system theme, check user preference
  if (typeof window !== 'undefined') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
  
  return 'light'; // Default to light if we can't determine
}

export function getThemeFromClass(): Theme {
  if (typeof document === 'undefined') return 'system';
  
  const isDark = document.documentElement.classList.contains('dark');
  const isLight = document.documentElement.classList.contains('light');
  
  if (isDark) return 'dark';
  if (isLight) return 'light';
  
  return 'system';
}
