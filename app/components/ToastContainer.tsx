import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ToastNotification, { ToastProps } from "./ToastNotification";

interface ToastContainerProps {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export default function ToastContainer({ position = "top-right" }: ToastContainerProps) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  // Create a container for the toasts if it doesn't exist
  useEffect(() => {
    let container = document.getElementById("toast-container");
    
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    
    setPortalContainer(container);
    
    // Clean up on unmount
    return () => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  }, []);

  // Subscribe to toast events
  useEffect(() => {
    const handleToastEvent = (event: CustomEvent<ToastProps>) => {
      const newToast = event.detail;
      setToasts(prev => [...prev, newToast]);
    };

    window.addEventListener("toast" as any, handleToastEvent as EventListener);
    
    return () => {
      window.removeEventListener("toast" as any, handleToastEvent as EventListener);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  if (!portalContainer) return null;

  const positionClasses = {
    "top-right": "fixed top-4 right-4 z-50",
    "top-left": "fixed top-4 left-4 z-50",
    "bottom-right": "fixed bottom-4 right-4 z-50",
    "bottom-left": "fixed bottom-4 left-4 z-50"
  };

  return createPortal(
    <div className={`${positionClasses[position]} max-w-md`}>
      {toasts.map(toast => (
        <ToastNotification
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={removeToast}
        />
      ))}
    </div>,
    portalContainer
  );
}

// Helper function to show toasts from anywhere in the app
export function showToast(props: Omit<ToastProps, "id">) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const event = new CustomEvent("toast", {
    detail: {
      id,
      ...props
    }
  });
  
  window.dispatchEvent(event);
}
