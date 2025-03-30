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
  let themeClass: 'light' | 'dark' = 'light'; // Default to light

  if (theme === 'dark') {
    themeClass = 'dark';
  } else if (theme === 'light') {
    themeClass = 'light';
  } else if (theme === 'system') {
    // Check system preference ONLY if theme is 'system'
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      themeClass = prefersDark ? 'dark' : 'light';
    } else {
      themeClass = 'light';
    }
  } else {
    // Handle unexpected theme value
     console.warn(`getThemeClass: Received unexpected theme value '${theme}', defaulting class to 'light'`);
     themeClass = 'light';
  }

  return themeClass;
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
  if (typeof document === 'undefined') {
      return;
  }

  const validTheme: Theme = theme && ['light', 'dark', 'system'].includes(theme)
    ? theme
    : 'light';

  const themeClass = getThemeClass(validTheme);
  const htmlElement = document.documentElement;

  // More robust class removal/addition
  const currentIsDark = htmlElement.classList.contains('dark');
  const currentIsLight = htmlElement.classList.contains('light');

  if (themeClass === 'dark') {
    if (currentIsLight) htmlElement.classList.remove('light');
    if (!currentIsDark) htmlElement.classList.add('dark');
  } else {
    if (currentIsDark) htmlElement.classList.remove('dark');
    if (!currentIsLight) htmlElement.classList.add('light');
  }

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
