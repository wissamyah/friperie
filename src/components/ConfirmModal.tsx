import { ReactNode, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Spinner from './Spinner';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  loadingText?: string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  loadingText,
}: ConfirmModalProps) {
  // Handle Enter key to confirm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Enter' && !isLoading) {
        e.preventDefault();
        onConfirm();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onConfirm]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <div className="p-1.5 rounded" style={{
            backgroundColor: '#151a21',
            borderColor: '#facc15',
            borderWidth: '1px'
          }}>
            <AlertTriangle className="w-4 h-4 text-creed-warning" />
          </div>
          <div className="flex-1 text-creed-text text-xs">
            {message}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-3 py-1.5 rounded-md text-sm font-medium text-creed-text hover:bg-creed-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-creed-danger hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Spinner size="sm" />
                {loadingText || 'Processing...'}
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
