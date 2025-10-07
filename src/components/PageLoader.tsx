import { Database } from 'lucide-react';
import Spinner from './Spinner';

interface PageLoaderProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}

export default function PageLoader({
  title = 'Loading',
  message = 'Please wait while we fetch your data',
  icon
}: PageLoaderProps) {
  return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="text-center max-w-md">
        {/* Icon or default */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            {icon || (
              <div className="p-4 rounded-xl border-2 border-creed-primary/20" style={{
                backgroundColor: '#151a21'
              }}>
                <Database className="w-12 h-12 text-creed-primary" />
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-creed-text-bright mb-3 font-display">
          {title}
        </h2>

        {/* Spinner and message */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <Spinner size="md" className="text-creed-primary" />
          <p className="text-creed-text font-medium">{message}</p>
        </div>

        {/* Subtext */}
        <p className="text-creed-muted text-sm">This will only take a moment</p>
      </div>
    </div>
  );
}
