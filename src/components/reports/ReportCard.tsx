import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ReportCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  loading?: boolean;
  colorScheme?: 'default' | 'success' | 'danger' | 'warning' | 'primary';
}

export default function ReportCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  loading = false,
  colorScheme = 'default',
}: ReportCardProps) {
  const getColorClasses = () => {
    switch (colorScheme) {
      case 'success':
        return {
          bg: 'bg-creed-success/10',
          border: 'border-creed-success/30',
          icon: 'text-creed-success',
        };
      case 'danger':
        return {
          bg: 'bg-creed-danger/10',
          border: 'border-creed-danger/30',
          icon: 'text-creed-danger',
        };
      case 'warning':
        return {
          bg: 'bg-creed-warning/10',
          border: 'border-creed-warning/30',
          icon: 'text-creed-warning',
        };
      case 'primary':
        return {
          bg: 'bg-creed-primary/10',
          border: 'border-creed-primary/30',
          icon: 'text-creed-primary',
        };
      default:
        return {
          bg: 'bg-creed-base',
          border: 'border-creed-lighter',
          icon: 'text-creed-accent',
        };
    }
  };

  const colors = getColorClasses();

  if (loading) {
    return (
      <div
        className="backdrop-blur-sm rounded-lg border p-4 shadow-card animate-pulse"
        style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg ${colors.bg}`} />
          <div className="w-14 h-5 bg-creed-lighter rounded" />
        </div>
        <div className="h-4 bg-creed-lighter rounded w-20 mb-2" />
        <div className="h-7 bg-creed-lighter rounded w-28" />
      </div>
    );
  }

  return (
    <div
      className="backdrop-blur-sm rounded-lg border p-4 shadow-card hover:shadow-card-hover transition-all duration-300 group"
      style={{
        backgroundColor: '#1a2129',
        borderColor: '#2d3748',
        borderWidth: '1px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div
          className={`p-2 rounded-lg border ${colors.bg}`}
          style={{
            borderColor: '#2d3748',
            borderWidth: '1px',
          }}
        >
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>

        {/* Trend Indicator */}
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded border ${
              trend.isPositive
                ? 'text-creed-success border-creed-success/30 bg-creed-success/10'
                : 'text-creed-danger border-creed-danger/30 bg-creed-danger/10'
            }`}
          >
            {trend.value === 0 ? (
              <Minus className="w-3 h-3" />
            ) : trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(trend.value).toFixed(1)}%
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-creed-muted text-sm font-medium mb-1">{title}</h3>

      {/* Value */}
      <p className="text-2xl font-bold text-creed-text-bright mb-1">{value}</p>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-creed-muted">{subtitle}</p>
      )}
    </div>
  );
}
