import { ReactNode } from 'react';
import { Info } from 'lucide-react';
import Tooltip from '../Tooltip';

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  height?: number;
}

export default function ChartCard({
  title,
  description,
  children,
  actions,
  height = 300,
}: ChartCardProps) {
  return (
    <div
      className="backdrop-blur-sm rounded-lg border shadow-card"
      style={{
        backgroundColor: '#1a2129',
        borderColor: '#2d3748',
        borderWidth: '1px',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: '#2d3748' }}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-creed-text-bright">
            {title}
          </h3>
          {description && (
            <Tooltip content={description}>
              <Info className="w-4 h-4 text-creed-muted cursor-help" />
            </Tooltip>
          )}
        </div>
        {actions && <div>{actions}</div>}
      </div>

      {/* Chart Content */}
      <div className="p-4" style={{ height: `${height}px` }}>
        {children}
      </div>
    </div>
  );
}
