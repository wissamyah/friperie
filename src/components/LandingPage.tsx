import { useState } from 'react';
import { Database, Lock, ArrowRight, Loader2 } from 'lucide-react';

interface LandingPageProps {
  onAuthSuccess: (token: string) => void;
}

export default function LandingPage({ onAuthSuccess }: LandingPageProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      setError('Please enter your GitHub token');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validate token format (basic check)
      if (token.length < 20) {
        throw new Error('Invalid token format');
      }

      // Call the parent handler
      onAuthSuccess(token);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{
      background: 'linear-gradient(to bottom, #0a0e14 0%, #0f1419 50%, #151a21 100%)'
    }}>
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-xl mb-4" style={{
            backgroundColor: '#1a2129',
            border: '1px solid #2d3748'
          }}>
            <Database className="w-10 h-10 text-creed-primary" />
          </div>
          <h1 className="text-3xl font-bold text-creed-text-bright mb-2">Friperie</h1>
          <p className="text-creed-muted text-sm">Enter your GitHub token to continue</p>
        </div>

        {/* Auth Card */}
        <div className="rounded-xl border shadow-card overflow-hidden" style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px'
        }}>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Token Input */}
            <div>
              <label className="block text-xs font-medium text-creed-text mb-2">
                GitHub Personal Access Token
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-creed-muted" />
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text placeholder-creed-muted text-sm"
                  style={{
                    backgroundColor: '#151a21',
                    borderColor: '#2d3748',
                    borderWidth: '1px'
                  }}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-3 py-2 rounded-lg border text-sm" style={{
                backgroundColor: '#1f1206',
                borderColor: '#d97706',
                borderWidth: '1px',
                color: '#fbbf24'
              }}>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm text-white bg-creed-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-button-3d"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Access Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-creed-muted mt-6">
          Data Repo: <span className="font-mono text-creed-text">wissamyah/friperie-data</span>
        </p>
      </div>
    </div>
  );
}
