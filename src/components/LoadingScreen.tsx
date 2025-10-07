import { Database } from 'lucide-react';
import Spinner from './Spinner';

export default function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(to bottom, #0a0e14 0%, #0f1419 50%, #151a21 100%)'
      }}
    >
      <div className="text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 rounded-lg bg-creed-primary shadow-button-3d">
            <Database className="w-8 h-8 text-white" />
          </div>
          <span className="font-display font-bold text-3xl text-creed-text-bright">Friperie</span>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-creed-text-bright mb-4 font-display">
          Loading Application
        </h2>

        {/* Spinner and message */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <Spinner size="md" className="text-creed-primary" />
          <span className="text-creed-text font-medium">Syncing with GitHub</span>
        </div>

        {/* Subtext */}
        <p className="text-creed-muted text-sm">This will only take a moment</p>
      </div>
    </div>
  );
}
