import { useEffect } from 'react';
import { getThemeClass } from '~/utils/theme';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  // Apply theme class to document
  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    const themeClass = getThemeClass(theme as 'light' | 'dark' | 'system');
    
    // Remove existing theme classes
    document.documentElement.classList.remove('light', 'dark');
    
    // Add the appropriate theme class
    document.documentElement.classList.add(themeClass);
    
    // Set color scheme meta tag
    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme) {
      metaColorScheme.setAttribute('content', themeClass === 'dark' ? 'dark' : 'light');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {children}
    </div>
  );
}
