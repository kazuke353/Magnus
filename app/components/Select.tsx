import { forwardRef } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  options: SelectOption[];
  error?: string;
  className?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className = "", ...props }, ref) => {
    return (
      <div className={className}>
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" // Added dark mode class
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`
              block w-full rounded-md shadow-sm sm:text-sm appearance-none pr-10
              border ${error ? "border-red-500" : "border-gray-300 dark:border-gray-600"}
              focus:outline-none focus:ring-2 ${error ? "focus:ring-red-500 focus:border-red-500" : "focus:ring-blue-500 focus:border-blue-500"}
              ${error ? "bg-red-50 dark:bg-red-900/10" : "bg-white dark:bg-gray-800"}
              ${error ? "text-red-900 dark:text-red-300" : "text-gray-900 dark:text-gray-100"}
              px-3 py-2 // Ensure consistent padding
            `}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${props.id}-error` : undefined}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.value === ""}> {/* Disable placeholder */}
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 20 20" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7l3-3 3 3m0 6l-3 3-3-3" />
            </svg>
          </div>
        </div>
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400" id={`${props.id}-error`}>{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
export type { SelectOption };
