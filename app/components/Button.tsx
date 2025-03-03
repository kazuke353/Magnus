import { Link } from "@remix-run/react";

interface ButtonProps {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  to?: string;
  fullWidth?: boolean;
}

export default function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  onClick,
  to,
  fullWidth = false,
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors";
  
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm",
    secondary: "bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500 border border-gray-300 shadow-sm",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm",
  };
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";
  const widthClass = fullWidth ? "w-full" : "";
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${widthClass} ${className}`;
  
  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    );
  }
  
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
