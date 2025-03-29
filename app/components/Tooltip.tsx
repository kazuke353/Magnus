import { useState, useRef, useEffect, ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
}

export default function Tooltip({ 
  children, 
  content, 
  position = 'top', 
  delay = 300 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  const updatePosition = () => {
    if (!targetRef.current || !tooltipRef.current) return;

    const targetRect = targetRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        y = targetRect.top - tooltipRect.height - 8;
        break;
      case 'right':
        x = targetRect.right + 8;
        y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        break;
      case 'bottom':
        x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        y = targetRect.bottom + 8;
        break;
      case 'left':
        x = targetRect.left - tooltipRect.width - 8;
        y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        break;
    }

    // Ensure tooltip stays within viewport
    const padding = 10;
    x = Math.max(padding, Math.min(x, window.innerWidth - tooltipRect.width - padding));
    y = Math.max(padding, Math.min(y, window.innerHeight - tooltipRect.height - padding));

    setCoords({ x, y });
  };

  useEffect(() => {
    // Clean up timer on unmount
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      // Update position when tooltip becomes visible
      updatePosition();
      
      // Update position on scroll and resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);

  // Calculate arrow position based on tooltip position
  const getArrowClass = () => {
    switch (position) {
      case 'top': return 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-gray-800 dark:border-t-gray-700 border-l-transparent border-r-transparent border-b-transparent';
      case 'right': return 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-r-gray-800 dark:border-r-gray-700 border-t-transparent border-b-transparent border-l-transparent';
      case 'bottom': return 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-gray-800 dark:border-b-gray-700 border-l-transparent border-r-transparent border-t-transparent';
      case 'left': return 'right-0 top-1/2 -translate-y-1/2 translate-x-full border-l-gray-800 dark:border-l-gray-700 border-t-transparent border-b-transparent border-r-transparent';
    }
  };

  return (
    <div 
      ref={targetRef}
      className="inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 max-w-xs pointer-events-none"
          style={{ 
            left: `${coords.x}px`, 
            top: `${coords.y}px`,
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out'
          }}
        >
          <div className="bg-gray-800 dark:bg-gray-700 text-white text-sm rounded px-2 py-1 shadow-lg">
            {content}
            <div className={`absolute w-0 h-0 border-4 ${getArrowClass()}`} />
          </div>
        </div>
      )}
    </div>
  );
}
