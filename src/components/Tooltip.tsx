import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({
    top: 0,
    left: 0,
    placement: 'top'
  });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      // Check if tooltip would overflow above viewport
      const spaceAbove = triggerRect.top;
      const spaceBelow = window.innerHeight - triggerRect.bottom;

      // Calculate position
      let top: number;
      let placement: 'top' | 'bottom';

      if (spaceAbove < tooltipRect.height + 10 && spaceBelow > tooltipRect.height + 10) {
        // Position below
        top = triggerRect.bottom + 8;
        placement = 'bottom';
      } else {
        // Position above
        top = triggerRect.top - tooltipRect.height - 8;
        placement = 'top';
      }

      const left = triggerRect.left + triggerRect.width / 2;

      setPosition({ top, left, placement });
    }
  }, [isVisible]);

  return (
    <>
      <div className="inline-block">
        <div
          ref={triggerRef}
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          {children}
        </div>
      </div>

      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[9999] transform -translate-x-1/2"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            minWidth: '200px',
            maxWidth: '300px',
            pointerEvents: 'none'
          }}
        >
          <div
            className="backdrop-blur-sm rounded-lg border shadow-lg p-3"
            style={{
              backgroundColor: '#1a2129',
              borderColor: '#2d3748',
              borderWidth: '1px'
            }}
          >
            {content}
          </div>
          {/* Arrow */}
          <div
            className={`absolute left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 ${
              position.placement === 'top' ? 'bottom-[-5px]' : 'top-[-5px]'
            }`}
            style={{
              backgroundColor: '#1a2129',
              borderColor: '#2d3748',
              borderWidth: '1px',
              borderTop: position.placement === 'top' ? 'none' : '1px solid #2d3748',
              borderLeft: position.placement === 'top' ? 'none' : '1px solid #2d3748',
              borderBottom: position.placement === 'bottom' ? 'none' : '1px solid #2d3748',
              borderRight: position.placement === 'bottom' ? 'none' : '1px solid #2d3748',
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
}
