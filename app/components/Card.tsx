import { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export default function Card({ title, children, className = "", footer }: CardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
      )}
      <div className="px-4 py-5 sm:p-6">{children}</div>
      {footer && (
        <div className="px-4 py-4 sm:px-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          {footer}
        </div>
      )}
    </div>
  );
}
