import { FiLoader } from "react-icons/fi";

interface LoadingIndicatorProps {
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  message?: string;
}

export default function LoadingIndicator({
  size = "md",
  fullScreen = false,
  message = "Loading..."
}: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };
  
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-50">
        <div className="text-center">
          <FiLoader className={`${sizeClasses[size]} animate-spin text-blue-600 dark:text-blue-400 mx-auto`} />
          {message && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center p-4">
      <FiLoader className={`${sizeClasses[size]} animate-spin text-blue-600 dark:text-blue-400`} />
      {message && (
        <span className="ml-2 text-gray-600 dark:text-gray-400">{message}</span>
      )}
    </div>
  );
}
