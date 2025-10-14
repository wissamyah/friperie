import { useState } from 'react';
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { DateRange } from '../../hooks/useReports';

interface DateRangeSelectorProps {
  selectedRange: DateRange | null;
  onRangeChange: (range: DateRange | null) => void;
}

type MonthPreset = 'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months' | 'ytd';

// Helper function to format date in local timezone as YYYY-MM-DD
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DateRangeSelector({
  selectedRange,
  onRangeChange,
}: DateRangeSelectorProps) {
  const [activeMonthPreset, setActiveMonthPreset] = useState<MonthPreset | null>('thisMonth');
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [currentViewMonth, setCurrentViewMonth] = useState<Date>(new Date());


  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onRangeChange({ start: customStart, end: customEnd });
      setActiveMonthPreset(null);
      setShowCustom(false);
    }
  };

  const handleClear = () => {
    onRangeChange(null);
    setActiveMonthPreset('thisMonth');
    setCustomStart('');
    setCustomEnd('');
    setShowCustom(false);
  };

  // Month navigation functions
  const getMonthPresetRange = (preset: MonthPreset): DateRange => {
    const now = new Date();
    const today = formatLocalDate(now);

    switch (preset) {
      case 'thisMonth': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          start: formatLocalDate(monthStart),
          end: today,
        };
      }

      case 'lastMonth': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          start: formatLocalDate(lastMonth),
          end: formatLocalDate(lastMonthEnd),
        };
      }

      case 'last3Months': {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        return {
          start: formatLocalDate(threeMonthsAgo),
          end: today,
        };
      }

      case 'last6Months': {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        return {
          start: formatLocalDate(sixMonthsAgo),
          end: today,
        };
      }

      case 'ytd': {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return {
          start: formatLocalDate(yearStart),
          end: today,
        };
      }
    }
  };

  const handleMonthPreset = (preset: MonthPreset) => {
    const range = getMonthPresetRange(preset);
    setActiveMonthPreset(preset);
    setShowCustom(false);
    onRangeChange(range);
  };

  const getSpecificMonthRange = (date: Date): DateRange => {
    const now = new Date();
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // If the month is the current month, end date should be today
    // Otherwise, use the last day of that month
    const isCurrentMonth = date.getFullYear() === now.getFullYear() &&
                           date.getMonth() === now.getMonth();

    return {
      start: formatLocalDate(monthStart),
      end: isCurrentMonth
        ? formatLocalDate(now)
        : formatLocalDate(monthEnd),
    };
  };

  const previousMonth = () => {
    const newMonth = new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth() - 1, 1);
    setCurrentViewMonth(newMonth);
    setActiveMonthPreset(null);
    const range = getSpecificMonthRange(newMonth);
    onRangeChange(range);
  };

  const nextMonth = () => {
    const newMonth = new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth() + 1, 1);
    setCurrentViewMonth(newMonth);
    setActiveMonthPreset(null);
    const range = getSpecificMonthRange(newMonth);
    onRangeChange(range);
  };

  const jumpToToday = () => {
    const today = formatLocalDate(new Date());
    setCurrentViewMonth(new Date());
    setActiveMonthPreset(null);
    setShowCustom(false);
    onRangeChange({ start: today, end: today });
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const monthPresets: { id: MonthPreset; label: string }[] = [
    { id: 'thisMonth', label: 'This Month' },
    { id: 'lastMonth', label: 'Last Month' },
    { id: 'last3Months', label: 'Last 3M' },
    { id: 'last6Months', label: 'Last 6M' },
    { id: 'ytd', label: 'YTD' },
  ];

  return (
    <div className="space-y-4">
      {/* Single-Row Calendar Navigation */}
      <div
        className="p-3 md:p-4 rounded-lg border"
        style={{
          backgroundColor: '#151a21',
          borderColor: '#2d3748',
          borderWidth: '1px',
        }}
      >
        {/* Mobile: Stacked Layout */}
        <div className="flex flex-col space-y-3 md:hidden">
          {/* Month Navigation Row */}
          <div className="flex items-center justify-between">
            <button
              onClick={previousMonth}
              className="p-2 rounded-lg text-creed-muted hover:text-creed-text hover:bg-creed-primary/10 transition-all active:scale-95"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 text-center">
              <span className="text-base font-semibold text-creed-text-bright">
                {formatMonthYear(currentViewMonth)}
              </span>
            </div>

            <button
              onClick={nextMonth}
              className="p-2 rounded-lg text-creed-muted hover:text-creed-text hover:bg-creed-primary/10 transition-all active:scale-95"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={jumpToToday}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-creed-primary border border-creed-primary hover:bg-creed-primary hover:text-white transition-all active:scale-95"
            >
              Today
            </button>
            <button
              onClick={() => setShowCustom(!showCustom)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-creed-text border border-creed-lighter hover:border-creed-primary hover:bg-creed-primary/10 transition-all active:scale-95"
              aria-label="Custom date range"
            >
              <Calendar className="w-4 h-4" />
            </button>
            {selectedRange && (
              <button
                onClick={handleClear}
                className="px-3 py-2 rounded-lg text-sm font-medium text-creed-danger border border-creed-lighter hover:border-creed-danger hover:bg-creed-danger/10 transition-all active:scale-95"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Month Preset Buttons - Mobile Grid */}
          <div className="grid grid-cols-2 gap-2">
            {monthPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleMonthPreset(preset.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border active:scale-95 ${
                  activeMonthPreset === preset.id
                    ? 'bg-creed-primary text-white border-creed-primary shadow-button-3d'
                    : 'text-creed-text border-creed-lighter hover:border-creed-primary hover:bg-creed-primary/10'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: Original Horizontal Layout */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={previousMonth}
                className="p-2 rounded-lg text-creed-muted hover:text-creed-text hover:bg-creed-primary/10 transition-all"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="min-w-[180px] text-center">
                <span className="text-lg font-semibold text-creed-text-bright">
                  {formatMonthYear(currentViewMonth)}
                </span>
              </div>

              <button
                onClick={nextMonth}
                className="p-2 rounded-lg text-creed-muted hover:text-creed-text hover:bg-creed-primary/10 transition-all"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={jumpToToday}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-creed-primary border border-creed-primary hover:bg-creed-primary hover:text-white transition-all"
              >
                Today
              </button>
              <button
                onClick={() => setShowCustom(!showCustom)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-creed-text border border-creed-lighter hover:border-creed-primary hover:bg-creed-primary/10 transition-all"
              >
                <Calendar className="w-4 h-4" />
              </button>
              {selectedRange && (
                <button
                  onClick={handleClear}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-creed-danger border border-creed-lighter hover:border-creed-danger hover:bg-creed-danger/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Month Preset Buttons - Desktop Flexbox */}
          <div className="flex flex-wrap gap-2">
            {monthPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleMonthPreset(preset.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  activeMonthPreset === preset.id
                    ? 'bg-creed-primary text-white border-creed-primary shadow-button-3d'
                    : 'text-creed-text border-creed-lighter hover:border-creed-primary hover:bg-creed-primary/10'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Date Range */}
      {showCustom && (
        <div
          className="p-3 md:p-4 rounded-lg border space-y-3 md:space-y-4"
          style={{
            backgroundColor: '#151a21',
            borderColor: '#2d3748',
            borderWidth: '1px',
          }}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-creed-primary" />
            <h4 className="text-sm font-semibold text-creed-text">Custom Date Range</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-xs font-medium text-creed-muted mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2.5 md:py-2 text-sm rounded-md border transition-all focus:ring-1 focus:ring-creed-primary focus:border-creed-primary outline-none text-creed-text"
                style={{
                  backgroundColor: '#0d1117',
                  borderColor: '#2d3748',
                  borderWidth: '1px',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-creed-muted mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                min={customStart}
                className="w-full px-3 py-2.5 md:py-2 text-sm rounded-md border transition-all focus:ring-1 focus:ring-creed-primary focus:border-creed-primary outline-none text-creed-text"
                style={{
                  backgroundColor: '#0d1117',
                  borderColor: '#2d3748',
                  borderWidth: '1px',
                }}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowCustom(false)}
              className="px-4 py-2 rounded-md text-sm font-medium text-creed-muted hover:text-creed-text hover:bg-creed-primary/5 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleCustomApply}
              disabled={!customStart || !customEnd}
              className="px-4 py-2 rounded-md text-sm font-medium text-white bg-creed-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-button-3d active:scale-95"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Selected Range Display */}
      {selectedRange && !showCustom && (
        <div className="text-xs text-creed-muted px-1">
          Showing data from <span className="text-creed-text font-medium">{selectedRange.start}</span> to{' '}
          <span className="text-creed-text font-medium">{selectedRange.end}</span>
        </div>
      )}
    </div>
  );
}
