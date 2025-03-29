import { useEffect } from 'react';
import { useTheme } from '~/hooks/useTheme';

interface LayoutProps {
  children: React.ReactNode;
  initialTheme?: 'light' | 'dark' | 'system';
}

export default function Layout({ children, initialTheme }: LayoutProps) {
  // Use the theme hook to manage theme
  const { theme } = useTheme(initialTheme);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {children}
    </div>
  );
}
