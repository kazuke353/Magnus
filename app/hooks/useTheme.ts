import { useState, useEffect, useCallback } from 'react';
import { Theme, applyTheme } from '~/utils/theme';

// Helper function to determine the initial theme on the client side
const getInitialClientTheme = (serverFallback: Theme): Theme => {
  if (typeof window === 'undefined') {
    return serverFallback || 'light';
  }

  const storedTheme = localStorage.getItem('theme') as Theme | null;

  if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
    return storedTheme;
  }

  if (serverFallback && ['light', 'dark', 'system'].includes(serverFallback)) {
    localStorage.setItem('theme', serverFallback);
    return serverFallback;
  }

  localStorage.setItem('theme', 'system');
  return 'system';
};


export function useTheme(initialThemeFromServer: Theme = 'light') {
  const [theme, setTheme] = useState<Theme>(() =>
    getInitialClientTheme(initialThemeFromServer)
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const updateTheme = useCallback((newTheme: Theme) => {
    const validTheme: Theme = ['light', 'dark', 'system'].includes(newTheme) ? newTheme : 'system';
    setTheme(validTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', validTheme);
    }
  }, []);

  return { theme, updateTheme };
}
