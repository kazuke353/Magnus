import { useState, useEffect } from 'react';
import { Theme, getThemeClass, applyTheme } from '~/utils/theme';

export function useTheme(initialTheme: Theme = 'light') {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  
  useEffect(() => {
    // Get theme from localStorage on client side
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
      applyTheme(storedTheme);
    } else if (initialTheme) {
      // Use the server-provided theme if no localStorage value
      setTheme(initialTheme);
      applyTheme(initialTheme);
      localStorage.setItem('theme', initialTheme);
    } else {
      // Default to system preference if no theme is provided
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const defaultTheme = prefersDark ? 'dark' : 'light';
      setTheme(defaultTheme);
      applyTheme(defaultTheme);
      localStorage.setItem('theme', defaultTheme);
    }
  }, [initialTheme]);
  
  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    
    // We don't set the cookie here because that requires a server action
    // The cookie will be set when the form is submitted in the settings page
  };
  
  return { theme, updateTheme };
}
