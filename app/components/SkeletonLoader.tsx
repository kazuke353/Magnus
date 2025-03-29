import React from "react";

interface SkeletonLoaderProps {
  width?: string;
  height?: string;
  className?: string;
  rounded?: boolean;
  circle?: boolean;
  count?: number;
  inline?: boolean;
}

export default function SkeletonLoader({
  width = "100%",
  height = "1rem",
  className = "",
  rounded = true,
  circle = false,
  count = 1,
  inline = false,
}: SkeletonLoaderProps) {
  const baseClasses = "animate-pulse bg-gray-200 dark:bg-gray-700";
  const roundedClasses = rounded ? "rounded-md" : "";
  const circleClasses = circle ? "rounded-full" : "";
  const inlineClasses = inline ? "inline-block mr-2" : "block";

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`${baseClasses} ${roundedClasses} ${circleClasses} ${inlineClasses} ${className}`}
          style={{ width, height }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
