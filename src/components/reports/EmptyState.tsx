import { LucideIcon, FileBarChart } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon: Icon = FileBarChart,
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
        style={{
          backgroundColor: '#151a21',
          borderColor: '#2d3748',
          borderWidth: '1px',
        }}
      >
        <Icon className="w-10 h-10 text-creed-muted" />
      </div>
      <h3 className="text-base font-semibold text-creed-text mb-2">{title}</h3>
      <p className="text-creed-muted max-w-md mb-6">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 rounded-lg font-medium text-white bg-creed-primary hover:opacity-90 transition-all shadow-button-3d"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
