import { useState, useEffect } from "react";
import { FiX, FiCheck, FiInfo, FiAlertTriangle } from "react-icons/fi";

interface NotificationProps {
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
  onClose?: () => void;
}

export default function Notification({
  type,
  message,
  duration = 5000,
  onClose
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };
  
  if (!isVisible) return null;
  
  const typeClasses = {
    success: "bg-green-50 dark:bg-green-900 dark:bg-opacity-20 text-green-800 dark:text-green-300",
    error: "bg-red-50 dark:bg-red-900 dark:bg-opacity-20 text-red-800 dark:text-red-300",
    info: "bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 text-blue-800 dark:text-blue-300",
    warning: "bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 text-yellow-800 dark:text-yellow-300"
  };
  
  const icons = {
    success: <FiCheck className="h-5 w-5" />,
    error: <FiAlertTriangle className="h-5 w-5" />,
    info: <FiInfo className="h-5 w-5" />,
    warning: <FiAlertTriangle className="h-5 w-5" />
  };
  
  return (
    <div className={`rounded-md p-4 ${typeClasses[type]}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {icons[type]}
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={handleClose}
              className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                type === 'success' ? 'focus:ring-green-500' :
                type === 'error' ? 'focus:ring-red-500' :
                type === 'info' ? 'focus:ring-blue-500' :
                'focus:ring-yellow-500'
              }`}
            >
              <span className="sr-only">Dismiss</span>
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
