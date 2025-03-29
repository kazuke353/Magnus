import React from "react";

interface LoadingIndicatorProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  fullScreen?: boolean;
  message?: string;
}

export default function LoadingIndicator({
  size = "md",
  color = "text-blue-600 dark:text-blue-400",
  fullScreen = false,
  message
}: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  const indicator = (
    <div className={`flex flex-col items-center justify-center ${fullScreen ? "fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-50" : ""}`}>
      <svg
        className={`animate-spin ${sizeClasses[size]} ${color}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      {message && (
        <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {message}
        </p>
      )}
    </div>
  );

  return indicator;
}
