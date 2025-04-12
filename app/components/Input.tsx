import { InputHTMLAttributes, forwardRef } from "react";
import { IconType } from "react-icons"; // Import IconType

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: IconType; // Add icon prop
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, icon: Icon, className = "", ...props }, ref) => {
    const hasIcon = !!Icon;
    const paddingClass = hasIcon ? "pl-10" : "px-3"; // Adjust padding if icon exists

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
          )}
          <input
            ref={ref}
            className={`
                  w-full ${paddingClass} py-2 border rounded-md shadow-sm placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${error ? "border-red-500" : "border-gray-300 dark:border-gray-600"}
                  ${error ? "text-red-900" : "text-gray-900 dark:text-gray-100"}
                  ${error ? "focus:ring-red-500 focus:border-red-500" : ""}
                  ${error ? "bg-red-50 dark:bg-red-900 dark:bg-opacity-10" : "bg-white dark:bg-gray-800"}
                  ${className}
                `}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${props.id}-error` : helpText ? `${props.id}-help` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400" id={`${props.id}-error`}>
            {error}
          </p>
        )}
        {helpText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400" id={`${props.id}-help`}>
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
