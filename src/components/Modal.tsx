import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
        style={{
          zIndex: 9998,
          margin: 0,
          padding: 0,
        }}
        onClick={handleBackdropClick}
      ></div>

      {/* Modal Container - Scrollable */}
      <div
        className="fixed inset-0 overflow-y-auto"
        style={{
          zIndex: 9999,
          margin: 0,
          padding: 0,
        }}
      >
        <div className="min-h-full flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-lg border shadow-card my-8"
            style={{
              backgroundColor: '#1a2129',
              borderColor: '#2d3748',
              borderWidth: '1px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#2d3748' }}>
              <h2 className="text-xl font-bold text-creed-text-bright">{title}</h2>
              <button
                onClick={onClose}
                className="text-creed-muted hover:text-creed-text transition-colors rounded-lg p-1 hover:bg-creed-primary/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
