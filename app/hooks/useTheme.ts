import { useState, useEffect } from 'react';
import { Theme, getThemeClass } from '~/utils/theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  
  useEffect(() => {
    // Get theme from localStorage on client side
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);
  
  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update document class
    const themeClass = getThemeClass(newTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(themeClass);
    
    // Update color-scheme meta tag
    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme) {
      metaColorScheme.setAttribute('content', themeClass === 'dark' ? 'dark' : 'light');
    }
  };
  
  return { theme, updateTheme };
}
