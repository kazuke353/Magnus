export type Theme = 'light' | 'dark' | 'system';

// Get theme from request cookie
export function getTheme(request: Request): Theme {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = parseCookies(cookieHeader);
  return (cookies["theme"] as Theme) || "light";
}

// Set theme in cookie
export function setTheme(theme: Theme): string {
  // Ensure theme is a valid string value
  const validTheme: Theme = theme && ['light', 'dark', 'system'].includes(theme) 
    ? theme 
    : 'light';
    
  return `theme=${validTheme}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

// Helper function to parse cookies
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}

export function getThemeClass(theme: Theme): string {
  if (!theme) return 'light'; // Default to light if theme is undefined
  
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

// Apply theme class to document
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  
  // Ensure theme is a valid value
  const validTheme: Theme = theme && ['light', 'dark', 'system'].includes(theme) 
    ? theme 
    : 'light';
    
  const themeClass = getThemeClass(validTheme);
  
  // Remove existing theme classes
  document.documentElement.classList.remove('light', 'dark');
  
  // Add the appropriate theme class
  document.documentElement.classList.add(themeClass);
  
  // Update color-scheme meta tag
  const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
  if (metaColorScheme) {
    metaColorScheme.setAttribute('content', themeClass);
  } else {
    const meta = document.createElement('meta');
    meta.name = 'color-scheme';
    meta.content = themeClass;
    document.head.appendChild(meta);
  }
}
